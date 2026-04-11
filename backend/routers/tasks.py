"""
Task API routes
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import (
    TaskCreate, TaskUpdate, TaskResponse, TaskOrderUpdate, APIResponse
)
from services import task_service
from services.completed_service import complete_task
from services.trash_service import move_to_trash

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    priority: Optional[int] = Query(None, ge=1, le=4),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all active tasks with optional filters"""
    tasks = await task_service.get_tasks(db, priority=priority, date_from=date_from, date_to=date_to)
    return tasks


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new task"""
    # If order not specified, append to end
    if task_data.order_index == 0:
        max_order = await task_service.get_max_order(db)
        task_data.order_index = max_order + 1
    
    task = await task_service.create_task(db, task_data)
    return task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a single task by ID"""
    task = await task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a task"""
    task = await task_service.update_task(db, task_id, task_data)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}/order", response_model=TaskResponse)
async def update_task_order(
    task_id: int,
    order_data: TaskOrderUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update task order (for drag-and-drop sorting)"""
    task = await task_service.update_task_order(db, task_id, order_data.order_index)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/{task_id}/complete", response_model=APIResponse)
async def complete_task_endpoint(
    task_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Mark a task as complete (moves to completed table)"""
    completed = await complete_task(db, task_id)
    if not completed:
        raise HTTPException(status_code=404, detail="Task not found")
    return APIResponse(success=True, message="Task completed successfully", data={"id": completed.id})


@router.delete("/{task_id}", response_model=APIResponse)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a task (moves to trash)"""
    deleted = await move_to_trash(db, task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return APIResponse(success=True, message="Task moved to trash", data={"id": deleted.id})
