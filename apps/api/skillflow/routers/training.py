from fastapi import APIRouter, HTTPException, Request, status
from starlette.concurrency import run_in_threadpool

from ..schemas import AssessmentInput, AssessmentResult, CreatedRecipe, NewRecipe, Question, Recipe
from ..services.admin import structure_recipe

router = APIRouter(prefix="/api", tags=["Capacitación"])


@router.get("/recipes", response_model=list[Recipe])
def list_recipes(request: Request):
    return request.app.state.catalog.list()


@router.get("/recipes/{recipe_id}", response_model=Recipe)
def get_recipe(recipe_id: str, request: Request):
    recipe = request.app.state.catalog.get(recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="El procedimiento no está disponible.")
    return recipe


@router.post("/recipes", response_model=CreatedRecipe, status_code=status.HTTP_201_CREATED)
async def add_recipe(payload: NewRecipe, request: Request):
    state = request.app.state
    created = structure_recipe(payload)
    await run_in_threadpool(state.catalog.add, created.recipe)
    return created


@router.get("/assessment", response_model=list[Question])
def assessment_questions(request: Request):
    return request.app.state.assessment.questions


@router.post("/assessment", response_model=AssessmentResult)
def evaluate_assessment(payload: AssessmentInput, request: Request):
    state = request.app.state
    try:
        return state.assessment.evaluate(payload.answers, state.catalog)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
