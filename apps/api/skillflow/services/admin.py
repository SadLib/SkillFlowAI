import re
from uuid import uuid4

from ..schemas import CreatedRecipe, NewRecipe, Recipe


def structure_recipe(payload: NewRecipe) -> CreatedRecipe:
    fields = {
        "id": f"demo-{uuid4().hex[:12]}",
        "title": payload.title,
        "category": payload.category,
        "difficulty": "Básico",
        "minutes": min(120, max(2, round(len(payload.text.split()) / 40) + 1)),
        "source": "NovaRetail · Texto ingresado en la demo",
        "excerpt": payload.text,
    }
    parts = re.split(r"\n+|(?<=[.!?])\s+", payload.text)
    steps = [part.strip() for part in parts if part.strip()]
    if len(steps) > 12:
        steps = [*steps[:11], " ".join(steps[11:])]
    objective = f"Aplicar el procedimiento «{payload.title}»."
    return CreatedRecipe(
        recipe=Recipe(**fields, description=objective, objective=objective, steps=steps, examples=[]),
        mode="deterministic",
    )
