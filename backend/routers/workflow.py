"""
Workflow API routes for subtask dependency visualization
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import WorkflowResponse, DependencyCreate, DependencyResponse, APIResponse
from services import workflow_service

router = APIRouter(tags=["workflow"])


@router.get("/tasks/{task_id}/workflow", response_model=WorkflowResponse)
async def get_task_workflow(task_id: int, db: AsyncSession = Depends(get_db)):
    """Get workflow graph data for a task: nodes (subtasks) and edges (dependencies)"""
    workflow = await workflow_service.get_workflow(db, task_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return workflow


@router.get("/tasks/{task_id}/dependencies", response_model=List[DependencyResponse])
async def list_task_dependencies(task_id: int, db: AsyncSession = Depends(get_db)):
    """Get all subtask dependencies for a task"""
    deps = await workflow_service.get_dependencies_by_task(db, task_id)
    return deps


@router.post("/tasks/{task_id}/dependencies", response_model=DependencyResponse, status_code=201)
async def create_dependency(task_id: int, dep_data: DependencyCreate, db: AsyncSession = Depends(get_db)):
    """Create a subtask dependency relationship"""
    dep = await workflow_service.create_dependency(db, task_id, dep_data)
    if not dep:
        raise HTTPException(status_code=400, detail="Invalid dependency: self-loop or duplicate edge")
    return dep


@router.delete("/dependencies/{dep_id}", response_model=APIResponse)
async def delete_dependency(dep_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a dependency relationship"""
    success = await workflow_service.delete_dependency(db, dep_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dependency not found")
    return APIResponse(success=True, message="Dependency removed")


@router.get("/subtasks/{subtask_id}/upstream", response_model=List[DependencyResponse])
async def get_upstream_dependencies(subtask_id: int, db: AsyncSession = Depends(get_db)):
    """Get upstream dependencies (which subtasks block the current subtask)"""
    deps = await workflow_service.get_upstream(db, subtask_id)
    return deps


@router.get("/subtasks/{subtask_id}/downstream", response_model=List[DependencyResponse])
async def get_downstream_dependencies(subtask_id: int, db: AsyncSession = Depends(get_db)):
    """Get downstream dependencies (which subtasks are blocked by the current subtask)"""
    deps = await workflow_service.get_downstream(db, subtask_id)
    return deps
