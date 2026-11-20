from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Category = Literal["Atención al cliente", "Devoluciones", "Envíos", "Herramientas digitales"]
Difficulty = Literal["Básico", "Intermedio", "Avanzado"]
CoachMode = Literal["local_template", "insufficient_context"]
Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
Option = Annotated[int, Field(strict=True, ge=0, le=2)]


class Query(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: Text = Field(max_length=500)


class Intent(BaseModel):
    label: str
    probabilities: dict[str, float]


class ClassificationResult(BaseModel):
    query: str
    label: str
    probabilities: dict[str, float]
    model: str


class Recipe(BaseModel):
    id: str
    title: Text
    description: Text
    category: Category
    difficulty: Difficulty
    minutes: int = Field(ge=1, le=120)
    objective: Text
    source: Text
    excerpt: Text
    keywords: str = ""
    steps: list[Text] = Field(min_length=1, max_length=12)
    examples: list[Text]


class RecipeLink(BaseModel):
    id: str
    title: str


class Document(RecipeLink):
    category: Category
    content: str
    source: str
    score: float
    excerpt: str


class CoachResult(BaseModel):
    query: str
    intent: Intent
    documents: list[Document]
    answer: str
    sources: list[str]
    model: str
    mode: CoachMode
    recommended_recipe: RecipeLink | None


class NewRecipe(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Text = Field(max_length=120)
    category: Category
    text: Text = Field(min_length=15, max_length=3000)


class CreatedRecipe(BaseModel):
    recipe: Recipe
    mode: Literal["deterministic"]


class Question(BaseModel):
    id: str
    category: Category
    prompt: str
    options: list[str]


class AssessmentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answers: dict[str, Option] = Field(min_length=1, max_length=20)


class CategoryScore(BaseModel):
    category: Category
    correct: int
    total: int
    percent: int


class AssessmentResult(BaseModel):
    correct: int
    total: int
    percent: int
    categories: list[CategoryScore]
    weaknesses: list[Category]
    recommendations: list[RecipeLink]
    recommendation_engine: Literal["rules"] = "rules"
