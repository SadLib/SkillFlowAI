from collections import Counter

from ..config import CATEGORIES, DATA, read_json
from ..schemas import AssessmentResult, CategoryScore, RecipeLink
from .catalog import Catalog

WEAKNESS_THRESHOLD = 70


class Assessment:
    def __init__(self):
        self.questions = read_json(DATA / "assessment.json")
        self.ids = {question["id"] for question in self.questions}

    def evaluate(self, answers: dict[str, int], catalog: Catalog) -> AssessmentResult:
        if answers.keys() != self.ids:
            raise ValueError("Envía exactamente una respuesta para cada pregunta del diagnóstico.")

        totals = Counter(question["category"] for question in self.questions)
        missed = [
            question for question in self.questions if answers[question["id"]] != question["correct"]
        ]
        errors = Counter(question["category"] for question in missed)
        scores = [
            CategoryScore(
                category=category,
                correct=totals[category] - errors[category],
                total=totals[category],
                percent=round(100 * (1 - errors[category] / totals[category])),
            )
            for category in CATEGORIES
        ]
        weak_scores = sorted(
            (row for row in scores if row.percent < WEAKNESS_THRESHOLD), key=lambda row: row.percent
        )
        weaknesses = [row.category for row in weak_scores]
        recipe_ids = dict.fromkeys(
            question["recipe_id"]
            for category in weaknesses
            for question in missed
            if question["category"] == category
        )
        recommendations = [
            RecipeLink(id=recipe.id, title=recipe.title)
            for recipe_id in recipe_ids
            if (recipe := catalog.get(recipe_id))
        ]
        total = len(self.questions)
        correct = total - len(missed)
        return AssessmentResult(
            correct=correct,
            total=total,
            percent=round(100 * correct / total),
            categories=scores,
            weaknesses=weaknesses,
            recommendations=recommendations,
        )
