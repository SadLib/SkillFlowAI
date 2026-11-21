"""Entrena y evalúa el clasificador local de intenciones."""
import hashlib
import json
import sys
import unicodedata
from pathlib import Path

import joblib
import pandas as pd
import sklearn
from sklearn.dummy import DummyClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps/api"))
from skillflow.config import DATA, INTENT_MODEL, LABELS, MODELS  # noqa: E402

SEED = 42


def normalized(text: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", text).casefold().split())


def summarize(labels: pd.Series, predictions, expected_labels: tuple[str, ...]) -> dict:
    report = classification_report(
        labels, predictions, labels=expected_labels, output_dict=True, zero_division=0
    )
    macro = report["macro avg"]
    return {
        "accuracy": accuracy_score(labels, predictions),
        "precision": macro["precision"],
        "recall": macro["recall"],
        "f1": macro["f1-score"],
        "macro_f1": macro["f1-score"],
        "report": report,
        "confusion_matrix": confusion_matrix(
            labels, predictions, labels=expected_labels
        ).tolist(),
    }


def main() -> None:
    dataset = DATA / "intents.json"
    frame = pd.read_json(dataset)
    if set(frame.columns) != {"text", "label"} or frame.empty:
        raise ValueError("El dataset debe contener filas y exactamente las columnas text y label.")
    if not frame["text"].map(lambda value: isinstance(value, str) and bool(value.strip())).all():
        raise ValueError("El dataset contiene textos vacíos o inválidos.")
    if not frame["label"].map(lambda value: isinstance(value, str)).all():
        raise ValueError("Todas las etiquetas deben ser texto.")
    if set(frame["label"]) != set(LABELS):
        raise ValueError(f"El dataset debe usar estas cuatro etiquetas: {', '.join(LABELS)}.")
    if (frame["label"].value_counts() < 2).any():
        raise ValueError("Cada etiqueta necesita al menos dos ejemplos para la división estratificada.")
    if frame["text"].map(normalized).duplicated().any():
        raise ValueError("El dataset contiene consultas duplicadas tras normalizar.")

    train, test = train_test_split(
        frame, test_size=0.20, random_state=SEED, stratify=frame["label"]
    )
    train_keys = set(train["text"].map(normalized))
    if train_keys.intersection(test["text"].map(normalized)):
        raise ValueError("Hay consultas compartidas entre entrenamiento y prueba.")

    model = Pipeline([
        ("tfidf", TfidfVectorizer(
            strip_accents="unicode", ngram_range=(1, 2), max_features=5000,
            sublinear_tf=True,
        )),
        ("classifier", LogisticRegression(
            C=4, max_iter=1000, class_weight="balanced", random_state=SEED,
        )),
    ])
    model.fit(train["text"], train["label"])
    predictions = model.predict(test["text"])
    baseline = DummyClassifier(strategy="most_frequent")
    baseline.fit(train["text"], train["label"])
    baseline_predictions = baseline.predict(test["text"])

    metrics = {
        "model": "TF-IDF + LogisticRegression",
        "learning_type": "supervised",
        "labels": list(LABELS),
        "samples": len(frame),
        "train_size": len(train),
        "test_size": len(test),
        "seed": SEED,
        "sklearn_version": sklearn.__version__,
        "dataset_sha256": hashlib.sha256(dataset.read_bytes()).hexdigest(),
        **summarize(test["label"], predictions, LABELS),
        "baseline": {
            "model": "DummyClassifier(strategy='most_frequent')",
            **summarize(test["label"], baseline_predictions, LABELS),
        },
    }
    MODELS.mkdir(exist_ok=True)
    joblib.dump(model, INTENT_MODEL, compress=3)
    (MODELS / "metrics.json").write_text(
        json.dumps(metrics, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(json.dumps({
        "model": metrics["model"],
        "samples": metrics["samples"],
        "train_size": metrics["train_size"],
        "test_size": metrics["test_size"],
        "accuracy": metrics["accuracy"],
        "precision_macro": metrics["precision"],
        "recall_macro": metrics["recall"],
        "macro_f1": metrics["macro_f1"],
        "baseline_accuracy": metrics["baseline"]["accuracy"],
        "baseline_macro_f1": metrics["baseline"]["macro_f1"],
        "report": metrics["report"],
        "confusion_matrix": metrics["confusion_matrix"],
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
