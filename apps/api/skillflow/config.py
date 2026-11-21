import json
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data"
MODELS = ROOT / "models"
INTENT_MODEL = MODELS / "intent_classifier.joblib"
load_dotenv(ROOT / ".env")

CATEGORIES = ("Atención al cliente", "Devoluciones", "Envíos", "Herramientas digitales")
LABELS = ("devoluciones", "envios", "informacion_general", "reclamaciones")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def cors_origins() -> list[str]:
    origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return [origin.strip() for origin in origins.split(",") if origin.strip()]
