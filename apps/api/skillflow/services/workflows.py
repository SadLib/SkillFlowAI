import os
import re
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from ..config import ROOT
from ..schemas import Recipe, Text

Employee = Literal["employee", "valeria", "diego"]
IntentLabel = Literal["devoluciones", "envios", "informacion_general", "reclamaciones"]

PEOPLE = {
    "employee": ("María López", "Atención en tienda"),
    "valeria": ("Valeria Cruz", "Soporte"),
    "diego": ("Diego Torres", "Logística"),
}
LABELS = {
    "devoluciones": "Devoluciones",
    "envios": "Envíos",
    "informacion_general": "Información general",
    "reclamaciones": "Reclamaciones",
}
ROLE_ADAPTATIONS = {
    "employee": "Empieza con solicitudes de mostrador. Usa el motivo confirmado para elegir la guía de tienda.",
    "valeria": "Empieza con tickets de soporte. Usa la categoría confirmada para decidir a qué equipo enviar el caso.",
    "diego": "Empieza con incidencias de envío. Si confirmas la categoría Envíos, revisa la guía del pedido y deriva el caso al equipo de Logística.",
}


class Draft(BaseModel):
    id: UUID
    author: Employee
    title: Text = Field(max_length=110)
    objective: Text = Field(min_length=8, max_length=280)
    sample: Text = Field(min_length=8, max_length=500)
    category: IntentLabel
    outcome: Text = Field(min_length=8, max_length=500)


class Reuse(BaseModel):
    employee: Employee
    sample: Text = Field(min_length=8, max_length=500)
    category: IntentLabel
    outcome: Text = Field(min_length=8, max_length=500)


class Application(BaseModel):
    employee_name: str
    team: str
    sample: str
    category: IntentLabel
    outcome: str


class Workflow(BaseModel):
    id: str
    author: Employee
    author_name: str
    team: str
    status: Literal["pending", "published"]
    title: str
    objective: str
    sample: str
    category: IntentLabel
    outcome: str
    steps: list[str]
    applications: list[Application]

    def recipe(self) -> Recipe:
        return Recipe(
            id=self.id, title=self.title, description=self.objective,
            category="Envíos" if self.author == "diego" else "Atención al cliente",
            difficulty="Básico", minutes=4, objective=self.objective,
            source=f"NovaRetail · Sesión de {self.author_name}",
            excerpt=f"{self.objective}\nResultado registrado por {self.author_name}: {self.outcome}",
            keywords="clasificar organizar priorizar solicitudes tickets incidencias equipo canalizar",
            steps=self.steps,
            examples=[f"Ejemplo de práctica: {self.sample} · Categoría confirmada: {LABELS[self.category]}"],
        )


class Recommendation(BaseModel):
    workflow: Workflow
    adaptation: str


class Workflows:
    def __init__(self):
        path = Path(os.getenv("SKILLFLOW_DB_PATH") or ROOT / ".skillflow" / "workflows.sqlite3")
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        with closing(self._connect()) as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS workflows (
                    id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'published'))
                );
                CREATE TABLE IF NOT EXISTS workflow_reuse (
                    workflow_id TEXT REFERENCES workflows(id),
                    employee TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    PRIMARY KEY (workflow_id, employee)
                );
            """)

    def _connect(self):
        db = sqlite3.connect(self.path)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
        return db

    def _load(self, db: sqlite3.Connection, row: sqlite3.Row) -> Workflow:
        draft = Draft.model_validate_json(row["payload"])
        name, team = PEOPLE[draft.author]
        uses = db.execute(
            "SELECT payload FROM workflow_reuse WHERE workflow_id = ? ORDER BY employee", (row["id"],)
        )
        applied = [Reuse.model_validate_json(use["payload"]) for use in uses]
        return Workflow(
            id=row["id"], author=draft.author, author_name=name, team=team, status=row["status"],
            title=draft.title, objective=draft.objective, sample=draft.sample, category=draft.category,
            outcome=draft.outcome,
            applications=[
                Application(employee_name=PEOPLE[use.employee][0], team=PEOPLE[use.employee][1],
                            sample=use.sample, category=use.category, outcome=use.outcome)
                for use in applied
            ],
            steps=[
                "Elige un ticket de práctica con el problema descrito en una o dos frases.",
                "Pide al clasificador una categoría para el ticket.",
                "Confirma o corrige la sugerencia antes de asignar el ticket al equipo correspondiente.",
                "Registra la decisión y conserva un ejemplo revisado para que otros puedan repetir el proceso.",
            ],
        )

    def get_all(self, *, published_only: bool = False) -> list[Workflow]:
        with closing(self._connect()) as db:
            rows = db.execute(
                "SELECT * FROM workflows WHERE (status = 'published' OR ? = 0) ORDER BY rowid DESC",
                (published_only,),
            )
            return [self._load(db, row) for row in rows]

    def submit(self, draft: Draft) -> Workflow:
        workflow_id = f"equipo-{draft.id}"
        payload = draft.model_dump_json()
        with closing(self._connect()) as db, db:
            db.execute("INSERT OR IGNORE INTO workflows (id, payload) VALUES (?, ?)", (workflow_id, payload))
            row = db.execute("SELECT * FROM workflows WHERE id = ?", (workflow_id,)).fetchone()
            if row["payload"] != payload:
                raise ValueError("Esta sesión ya está guardada con otros datos.")
            return self._load(db, row)

    def publish(self, workflow_id: str) -> Workflow | None:
        with closing(self._connect()) as db, db:
            db.execute("UPDATE workflows SET status = 'published' WHERE id = ?", (workflow_id,))
            row = db.execute("SELECT * FROM workflows WHERE id = ?", (workflow_id,)).fetchone()
            return self._load(db, row) if row else None

    def suggestions(self, employee: Employee, need: str) -> list[Recommendation]:
        words = need.casefold()
        if not re.search(r"\b(?:tickets?|solicitud(?:es)?|incidencias?|casos?|bandeja)\b", words):
            return []
        if not re.search(r"\b(?:clasific\w*|organiz\w*|separ\w*|deriv\w*|asign\w*|prioriz\w*|satur\w*)", words):
            return []
        return [
            Recommendation(workflow=workflow, adaptation=ROLE_ADAPTATIONS[employee])
            for workflow in self.get_all(published_only=True) if workflow.author != employee
        ]

    def reuse(self, workflow_id: str, application: Reuse) -> Workflow | None:
        with closing(self._connect()) as db, db:
            row = db.execute("SELECT * FROM workflows WHERE id = ? AND status = 'published'", (workflow_id,)).fetchone()
            if row is None:
                return None
            if Draft.model_validate_json(row["payload"]).author == application.employee:
                raise ValueError("El uso compartido se registra para otros compañeros.")
            db.execute(
                """INSERT INTO workflow_reuse (workflow_id, employee, payload) VALUES (?, ?, ?)
                   ON CONFLICT (workflow_id, employee) DO UPDATE SET payload = excluded.payload""",
                (workflow_id, application.employee, application.model_dump_json()),
            )
            return self._load(db, row)
