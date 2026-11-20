from fastapi import APIRouter, Request

from ..schemas import ClassificationResult, CoachResult, Query
from ..services.coach import respond

router = APIRouter(prefix="/api", tags=["Inteligencia"])


@router.post("/classify", response_model=ClassificationResult)
def classify(payload: Query, request: Request):
    classifier = request.app.state.classifier
    intent = classifier.predict(payload.query)
    return ClassificationResult(
        query=payload.query,
        label=intent.label,
        probabilities=intent.probabilities,
        model=classifier.name,
    )


@router.post("/coach", response_model=CoachResult)
async def coach(payload: Query, request: Request):
    state = request.app.state
    return await respond(payload.query, state.classifier, state.catalog)


@router.get("/model/metrics")
def model_metrics(request: Request):
    return request.app.state.metrics
