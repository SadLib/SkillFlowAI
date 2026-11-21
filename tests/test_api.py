import pytest
from fastapi.testclient import TestClient

from skillflow.config import DATA, read_json
from skillflow.main import app

DEMO_QUERY = "Un cliente quiere devolver un producto después de 20 días, ¿qué hago?"


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


def test_health_and_openapi(client):
    assert client.get("/health").json() == {"status": "ok", "model": "loaded"}
    assert "/api/coach" in client.get("/openapi.json").json()["paths"]
    assert client.get("/api/model/metrics").json()["test_size"] == 40


def test_coach_cites_policy_for_twenty_days(client):
    response = client.post("/api/coach", json={"query": DEMO_QUERY})
    assert response.status_code == 200
    result = response.json()
    assert result["query"] == DEMO_QUERY
    assert result["intent"]["label"] == "devoluciones"
    assert result["documents"][0]["id"] == result["recommended_recipe"]["id"] == "devolucion-plazo"
    assert {"id", "title", "category", "content", "source", "score"} <= set(result["documents"][0])
    assert result["documents"][0]["category"] == "Devoluciones"
    assert result["documents"][0]["content"]
    assert all(value in result["answer"] for value in ("20 días", "14 días", "fuera del plazo", "NR-DEV-01"))
    assert result["sources"] == ["NR-DEV-01 · Política de devoluciones"]
    assert result["model"] == "TF-IDF + Regresión Logística"
    assert result["mode"] == "local_template"
    classification = client.post("/api/classify", json={"query": DEMO_QUERY}).json()
    assert classification["query"] == DEMO_QUERY
    assert classification["label"] == result["intent"]["label"]
    assert classification["probabilities"] == result["intent"]["probabilities"]
    assert classification["model"] == result["model"]
    assert client.post("/api/classify", json={"query": "    "}).status_code == 422


@pytest.mark.parametrize(("query", "label"), [
    ("Un cliente quiere devolver un producto que compró hace 10 días", "devoluciones"),
    ("El pedido todavía no llega y ya pasó la fecha estimada", "envios"),
    ("El cliente recibió un producto dañado", "reclamaciones"),
    ("¿Cómo puedo consultar mis datos de empleado?", "informacion_general"),
])
def test_classify_returns_model_output_for_all_categories(client, query, label):
    result = client.post("/api/classify", json={"query": query})
    assert result.status_code == 200
    data = result.json()
    assert data["label"] == label
    assert set(data["probabilities"]) == {
        "devoluciones", "envios", "informacion_general", "reclamaciones"
    }
    assert abs(sum(data["probabilities"].values()) - 1) < 1e-9
    assert data["model"] == "TF-IDF + Regresión Logística"


def test_coach_abstains_without_documentary_support(client):
    result = client.post("/api/coach", json={"query": "¿Cómo afino una guitarra clásica?"}).json()
    assert result["mode"] == "insufficient_context"
    assert result["documents"] == []
    assert result["sources"] == []
    assert result["recommended_recipe"] is None


@pytest.mark.parametrize(("days", "position"), [(14, "dentro"), (15, "fuera")])
def test_return_policy_boundary(client, days, position):
    query = f"¿Puedo devolver la compra después de {days} días? ¿Cuál es el plazo?"
    result = client.post("/api/coach", json={"query": query}).json()
    assert result["mode"] == "local_template"
    assert result["documents"][0]["id"] == "devolucion-plazo"
    assert f"{position} del plazo estándar de 14 días" in result["answer"]


def test_recipes_create_read_and_index(client):
    assert len(client.get("/api/recipes").json()) == 8
    assert client.get("/api/recipes/no-existe").status_code == 404
    response = client.post("/api/recipes", json={
        "title": "Calibrar visor biométrico",
        "category": "Herramientas digitales",
        "text": "Abre el panel de calibración del visor biométrico. Ejecuta la prueba de enfoque.",
    })
    assert response.status_code == 201
    result = response.json()
    assert result["mode"] == "deterministic"
    recipe = result["recipe"]
    assert len(recipe["steps"]) == 2
    assert client.get(f"/api/recipes/{recipe['id']}").json() == recipe
    docs = client.post("/api/coach", json={"query": "calibración visor biométrico"}).json()["documents"]
    assert docs[0]["id"] == recipe["id"]


def test_assessment_scores_and_recommends_using_rules(client):
    questions = client.get("/api/assessment").json()
    assert len(questions) == 9
    assert all("correct" not in question for question in questions)
    answers = {question["id"]: question["correct"] for question in read_json(DATA / "assessment.json")}

    perfect = client.post("/api/assessment", json={"answers": answers}).json()
    assert perfect["percent"] == 100
    assert perfect["recommendations"] == []
    answers["q2"] = 1
    result = client.post("/api/assessment", json={"answers": answers}).json()
    assert result["correct"] == 8
    assert result["percent"] == 89
    assert result["weaknesses"] == ["Devoluciones"]
    assert [recipe["id"] for recipe in result["recommendations"]] == ["devolucion-plazo"]
    assert result["recommendation_engine"] == "rules"
    assert client.post("/api/assessment", json={"answers": {"q1": 0}}).status_code == 422
    assert client.post("/api/assessment", json={"answers": {**answers, "q2": True}}).status_code == 422
