import hashlib
from math import isclose

import pytest

from skillflow.config import DATA, INTENT_MODEL, LABELS, MODELS, read_json
from skillflow.services.catalog import MIN_SCORE, Catalog
from skillflow.services.nlp import IntentClassifier


def test_model_artifacts_match_the_dataset_and_split():
    rows = read_json(DATA / "intents.json")
    metrics = read_json(MODELS / "metrics.json")
    assert INTENT_MODEL.is_file()
    assert len(rows) == metrics["samples"] == 200
    assert {row["label"] for row in rows} == set(LABELS)
    assert len({row["text"].strip().casefold() for row in rows}) == len(rows)
    assert {label: sum(row["label"] == label for row in rows) for label in LABELS} == {label: 50 for label in LABELS}
    assert metrics["dataset_sha256"] == hashlib.sha256((DATA / "intents.json").read_bytes()).hexdigest()
    assert metrics["train_size"] + metrics["test_size"] == len(rows)
    matrix = metrics["confusion_matrix"]
    assert [sum(row) for row in matrix] == [10, 10, 10, 10]
    assert metrics["accuracy"] == sum(matrix[i][i] for i in range(len(matrix))) / metrics["test_size"]
    assert metrics["baseline"]["model"] == "DummyClassifier(strategy='most_frequent')"
    assert metrics["baseline"]["accuracy"] < metrics["accuracy"]
    assert metrics["macro_f1"] == metrics["f1"]
    assert all(label in metrics["report"] for label in LABELS)


def test_missing_model_reports_training_command(monkeypatch, tmp_path):
    from skillflow.services import nlp

    monkeypatch.setattr(nlp, "INTENT_MODEL", tmp_path / "missing.joblib")
    with pytest.raises(FileNotFoundError, match="train_intent_model.py"):
        nlp.IntentClassifier()


@pytest.mark.parametrize(
    ("query", "expected"),
    [
        ("Necesito tramitar una devolución por una compra de 20 días", "devoluciones"),
        ("¿Dónde rastreo la guía del paquete en tránsito?", "envios"),
        ("La clienta quiere dejar una queja por mala atención", "reclamaciones"),
        ("Olvidé mi contraseña del portal de empleados", "informacion_general"),
    ],
)
def test_model_predictions(query, expected):
    result = IntentClassifier().predict(query)
    assert result.label == expected
    assert set(result.probabilities) == set(LABELS)
    assert all(0 <= score <= 1 for score in result.probabilities.values())
    assert isclose(sum(result.probabilities.values()), 1)


@pytest.mark.parametrize("case", read_json(DATA / "retrieval_eval.json"), ids=lambda case: case["expected"] or case["query"])
def test_retrieval_relevance(case):
    hits = Catalog().search(case["query"])
    if case["expected"] is None:
        assert not hits
    else:
        assert hits[0].id == case["expected"]
        assert [hit.score for hit in hits] == sorted((hit.score for hit in hits), reverse=True)
        assert all(MIN_SCORE <= hit.score <= 1.00000001 for hit in hits)
