import joblib

from ..config import INTENT_MODEL
from ..schemas import Intent

MODEL_NAME = "TF-IDF + Regresión Logística"


class IntentClassifier:
    def __init__(self):
        if not INTENT_MODEL.is_file():
            raise FileNotFoundError(
                f"No se encontró el modelo entrenado en {INTENT_MODEL}. "
                "Entrénalo con `.venv\\Scripts\\python.exe scripts\\train_intent_model.py`."
            )
        self.pipeline = joblib.load(INTENT_MODEL)
        if not all(hasattr(self.pipeline, name) for name in ("predict", "predict_proba", "classes_")):
            raise ValueError(
                f"El artefacto {INTENT_MODEL} no es un clasificador compatible. "
                "Vuelve a entrenarlo con `scripts/train_intent_model.py`."
            )
        self.name = MODEL_NAME

    def predict(self, query: str) -> Intent:
        probabilities = self.pipeline.predict_proba([query])[0]
        distribution = {
            str(label): float(probability)
            for label, probability in zip(self.pipeline.classes_, probabilities, strict=True)
        }
        return Intent(label=max(distribution, key=distribution.__getitem__), probabilities=distribution)
