from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import MODELS, cors_origins, read_json
from .routers import intelligence, training, workflows
from .services.assessment import Assessment
from .services.catalog import Catalog
from .services.nlp import IntentClassifier
from .services.workflows import Workflows


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.classifier = IntentClassifier()
    app.state.metrics = read_json(MODELS / "metrics.json")
    app.state.catalog = Catalog()
    app.state.workflows = Workflows()
    for workflow in app.state.workflows.get_all(published_only=True):
        app.state.catalog.add(workflow.recipe())
    app.state.assessment = Assessment()
    yield


app = FastAPI(
    title="SkillFlow AI · NovaRetail",
    description="API para la demostración académica de capacitación y recuperación documental.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=cors_origins(), allow_methods=["GET", "POST"],
                   allow_headers=["Content-Type"])
app.include_router(intelligence.router)
app.include_router(training.router)
app.include_router(workflows.router)


@app.get("/health", tags=["Operación"])
def health():
    return {"status": "ok", "model": "loaded"}
