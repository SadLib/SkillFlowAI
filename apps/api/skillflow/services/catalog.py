from __future__ import annotations

from threading import Lock

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ..config import DATA, read_json
from ..schemas import Document, Recipe

MIN_SCORE = 0.16
STOP_WORDS = sorted(set("""
a al algo ante como con cual cuando cuanto de del desde donde el ella en entre es esa esta este
ha hacer hago hay la las le les lo los me mi mis no nos o para por porque puedo que se si sobre
su sus te tiene tu un una unos y ya
""".split()))


class Retriever:
    def __init__(self, recipes: list[Recipe]):
        self.recipes = recipes
        self.vectorizer = TfidfVectorizer(
            strip_accents="unicode", ngram_range=(1, 2), stop_words=STOP_WORDS
        )
        texts = [
            " ".join((recipe.title, recipe.title, recipe.keywords, recipe.excerpt, *recipe.steps))
            for recipe in recipes
        ]
        self.matrix = self.vectorizer.fit_transform(texts)

    def search(self, query: str, limit: int = 3) -> list[Document]:
        scores = cosine_similarity(self.vectorizer.transform([query]), self.matrix)[0]
        ranking = sorted(range(len(scores)), key=lambda index: -scores[index])
        return [
            Document(
                id=self.recipes[index].id,
                title=self.recipes[index].title,
                category=self.recipes[index].category,
                content=" ".join((self.recipes[index].excerpt, *self.recipes[index].steps)),
                source=self.recipes[index].source,
                score=float(scores[index]),
                excerpt=self.recipes[index].excerpt,
            )
            for index in ranking[:limit]
            if scores[index] >= MIN_SCORE
        ]


class Catalog:
    def __init__(self):
        recipes = {row["id"]: Recipe.model_validate(row) for row in read_json(DATA / "recipes.json")}
        self._snapshot = (recipes, Retriever(list(recipes.values())))
        self._lock = Lock()

    def list(self) -> list[Recipe]:
        return list(self._snapshot[0].values())

    def get(self, recipe_id: str) -> Recipe | None:
        return self._snapshot[0].get(recipe_id)

    def search(self, query: str) -> list[Document]:
        return self._snapshot[1].search(query)

    def add(self, recipe: Recipe) -> None:
        with self._lock:
            recipes = {**self._snapshot[0], recipe.id: recipe}
            self._snapshot = (recipes, Retriever(list(recipes.values())))
