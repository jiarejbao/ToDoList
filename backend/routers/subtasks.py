"""
Subtask API routes
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import (
    SubtaskCreate, SubtaskUpdate, SubtaskResponse, TaskResponse, APIResponse
)
from services import subtask_service, task_service
from services.completed_service import complete_task
from services.trash_service import move_to_trash

router = APIRouter(prefix="/subtasks", tags=["subtasks"])


@router.post("/tasks/{task_id}/subtasks", response_model=SubtaskResponse, status_code=201)
async def create_subtask(
    task_id: int,
    subtask_data: SubtaskCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new subtask for a task"""
    subtask = await subtask_service.create_subtask(db, task_id, subtask_data)
    if not subtask:
        raise HTTPException(status_code=404, detail="Task not found")
    return subtask


@router.get("/{subtask_id}", response_model=SubtaskResponse)
async def get_subtask(
    subtask_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a single subtask by ID"""
    subtask = await subtask_service.get_subtask(db, subtask_id)
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return subtask


@router.put("/{subtask_id}", response_model=SubtaskResponse)
async def update_subtask(
    subtask_id: int,
    subtask_data: SubtaskUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a subtask"""
    subtask = await subtask_service.update_subtask(db, subtask_id, subtask_data)
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return subtask


@router.patch("/{subtask_id}/order", response_model=SubtaskResponse)
async def update_subtask_order(
    subtask_id: int,
    order_data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Update subtask order (for drag-and-drop sorting)"""
    from services.subtask_service import update_subtask_order
    subtask = await update_subtask_order(db, subtask_id, order_data.get("order_index", 0))
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return subtask


@router.post("/{subtask_id}/complete", response_model=APIResponse)
async def complete_subtask(
    subtask_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Mark a subtask as complete (deletes it - subtasks are simple)"""
    subtask = await subtask_service.get_subtask(db, subtask_id)
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    # For subtasks, we just delete them when completed
    # If you want to track completed subtasks, you'd need a separate table
    await subtask_service.delete_subtask(db, subtask_id)
    return APIResponse(success=True, message="Subtask completed")


@router.delete("/{subtask_id}", response_model=APIResponse)
async def delete_subtask(
    subtask_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a subtask"""
    success = await subtask_service.delete_subtask(db, subtask_id)
    if not success:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return APIResponse(success=True, message="Subtask deleted")
