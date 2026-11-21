from fastapi import APIRouter, HTTPException, Query, Request

from ..services.workflows import Draft, Employee, Recommendation, Reuse, Workflow

router = APIRouter(prefix="/api/workflows", tags=["Aprendizaje entre compañeros"])


@router.get("", response_model=list[Workflow])
def list_workflows(request: Request):
    return request.app.state.workflows.get_all()


@router.get("/suggestions", response_model=list[Recommendation])
def suggest(employee: Employee, request: Request, need: str = Query(min_length=8, max_length=280)):
    return request.app.state.workflows.suggestions(employee, need)


@router.post("", response_model=Workflow, status_code=201)
def submit(data: Draft, request: Request):
    try:
        return request.app.state.workflows.submit(data)
    except ValueError as error:
        raise HTTPException(409, str(error)) from error


@router.post("/{workflow_id}/publish", response_model=Workflow)
def publish(workflow_id: str, request: Request):
    workflow = request.app.state.workflows.publish(workflow_id)
    if workflow is None:
        raise HTTPException(404, "No encontramos esta aportación.")
    request.app.state.catalog.add(workflow.recipe())
    return workflow


@router.post("/{workflow_id}/reuse", response_model=Workflow)
def reuse(workflow_id: str, data: Reuse, request: Request):
    try:
        workflow = request.app.state.workflows.reuse(workflow_id, data)
    except ValueError as error:
        raise HTTPException(409, str(error)) from error
    if workflow is None:
        raise HTTPException(404, "Esta guía todavía no está disponible.")
    return workflow
