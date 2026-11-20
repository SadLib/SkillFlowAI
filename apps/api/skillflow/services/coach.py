import re

from ..schemas import CoachResult, Document, RecipeLink
from .catalog import Catalog
from .nlp import IntentClassifier

NO_CONTEXT = (
    "No encontré un procedimiento de NovaRetail suficientemente relacionado con tu pregunta. "
    "Prueba reformularla con el tipo de trámite o consulta la biblioteca de Smart Recipes."
)
INTENT_CATEGORIES = {
    "devoluciones": "Devoluciones",
    "reclamaciones": "Atención al cliente",
    "envios": "Envíos",
    "informacion_general": "Herramientas digitales",
}


def answer_for_days(query: str, source: Document) -> str | None:
    if source.id != "devolucion-plazo":
        return None
    days = set(re.findall(r"\b(\d{1,4})\s+d[ií]as?\b", query, re.IGNORECASE))
    limit = re.search(r"hasta (\d+) días", source.excerpt)
    if len(days) != 1 or limit is None:
        return None
    requested, maximum = int(next(iter(days))), int(limit[1])
    elapsed = "ha pasado 1 día" if requested == 1 else f"han pasado {requested} días"
    if requested > maximum:
        return (
            f"Si {elapsed} desde la compra, la solicitud está fuera del plazo estándar "
            f"de {maximum} días. Explica al cliente que la devolución estándar no procede y registra la decisión."
        )
    return (
        f"Si {elapsed} desde la compra, la solicitud está dentro del plazo estándar "
        f"de {maximum} días. Verifica la fecha de compra antes de registrar la solicitud."
    )


async def respond(query: str, classifier: IntentClassifier, catalog: Catalog) -> CoachResult:
    intent = classifier.predict(query)
    documents = catalog.search(query)
    if not documents:
        return CoachResult(
            query=query,
            intent=intent,
            documents=[],
            answer=NO_CONTEXT,
            sources=[],
            model=classifier.name,
            mode="insufficient_context",
            recommended_recipe=None,
        )

    source = documents[0]
    recommendation = source
    for doc in documents:
        recipe = catalog.get(doc.id)
        if source.score - doc.score <= 0.025 and recipe and recipe.category == INTENT_CATEGORIES[intent.label]:
            recommendation = doc
            break

    answer = answer_for_days(query, source)
    if answer is None:
        answer = f"Según el procedimiento «{source.title}»: {source.excerpt}"

    return CoachResult(
        query=query,
        intent=intent,
        documents=documents,
        answer=f"{answer}\n\nFuente: {source.source}.",
        sources=[source.source],
        model=classifier.name,
        mode="local_template",
        recommended_recipe=RecipeLink(id=recommendation.id, title=recommendation.title),
    )
