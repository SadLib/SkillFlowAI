"""Evalúa recuperación sin utilizar el clasificador ni servicios externos de IA."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps/api"))
from skillflow.config import DATA, MODELS, read_json  # noqa: E402
from skillflow.services.catalog import MIN_SCORE, Catalog  # noqa: E402


def main() -> None:
    catalog = Catalog()
    results = []
    for case in read_json(DATA / "retrieval_eval.json"):
        docs = catalog.search(case["query"])
        expected = case["expected"]
        top = docs[0].id if docs else None
        results.append({**case, "top": top, "score": docs[0].score if docs else None,
                        "correct": top == expected,
                        "hit_at_3": any(doc.id == expected for doc in docs) if expected else not docs})
    in_scope = [item for item in results if item["expected"]]
    out_of_scope = [item for item in results if item["expected"] is None]
    report = {
        "threshold": MIN_SCORE,
        "top1_accuracy": sum(item["correct"] for item in in_scope) / len(in_scope),
        "recall_at_3": sum(item["hit_at_3"] for item in in_scope) / len(in_scope),
        "abstention_accuracy": sum(item["correct"] for item in out_of_scope) / len(out_of_scope),
        "results": results,
    }
    output = json.dumps(report, ensure_ascii=False, indent=2)
    (MODELS / "retrieval_metrics.json").write_text(output + "\n", encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
