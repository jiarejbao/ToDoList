"""
Completed tasks archive API routes
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import CompletedTaskResponse, CompletedTaskListResponse, APIResponse
from services.completed_service import (
    get_completed_tasks,
    get_completed_task,
    restore_completed_task,
    permanently_delete_completed,
    get_completed_tasks_count,
)

router = APIRouter(prefix="/completed", tags=["completed"])


@router.get("", response_model=CompletedTaskListResponse)
async def list_completed_tasks(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get all completed tasks"""
    tasks = await get_completed_tasks(db, limit=limit, offset=offset)
    total = await get_completed_tasks_count(db)
    return CompletedTaskListResponse(items=tasks, total=total)


@router.get("/{completed_id}", response_model=CompletedTaskResponse)
async def get_completed_task_endpoint(
    completed_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a completed task by ID"""
    task = await get_completed_task(db, completed_id)
    if not task:
        raise HTTPException(status_code=404, detail="Completed task not found")
    return task


@router.post("/{completed_id}/restore", response_model=APIResponse)
async def restore_task(
    completed_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Restore a completed task back to active tasks"""
    restored = await restore_completed_task(db, completed_id)
    if not restored:
        raise HTTPException(status_code=404, detail="Completed task not found")
    return APIResponse(
        success=True,
        message="Task restored successfully",
        data={"id": restored.id, "content": restored.content}
    )


@router.delete("/{completed_id}", response_model=APIResponse)
async def delete_completed_task(
    completed_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Permanently delete a completed task record"""
    success = await permanently_delete_completed(db, completed_id)
    if not success:
        raise HTTPException(status_code=404, detail="Completed task not found")
    return APIResponse(success=True, message="Completed task permanently deleted")
