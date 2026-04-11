"""
Trash/Deleted tasks API routes
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import DeletedTaskResponse, DeletedTaskListResponse, APIResponse
from services.trash_service import (
    get_deleted_tasks,
    get_deleted_task,
    restore_deleted_task,
    permanently_delete_trash,
    cleanup_expired_tasks,
    empty_trash,
    get_deleted_tasks_count,
)

router = APIRouter(prefix="/trash", tags=["trash"])


@router.get("", response_model=DeletedTaskListResponse)
async def list_deleted_tasks(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get all deleted tasks (trash bin)"""
    tasks = await get_deleted_tasks(db, limit=limit, offset=offset)
    total = await get_deleted_tasks_count(db)
    return DeletedTaskListResponse(items=tasks, total=total)


@router.get("/{deleted_id}", response_model=DeletedTaskResponse)
async def get_deleted_task_endpoint(
    deleted_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a deleted task by ID"""
    task = await get_deleted_task(db, deleted_id)
    if not task:
        raise HTTPException(status_code=404, detail="Deleted task not found")
    return task


@router.post("/{deleted_id}/restore", response_model=APIResponse)
async def restore_deleted(
    deleted_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Restore a deleted task back to active tasks"""
    restored = await restore_deleted_task(db, deleted_id)
    if not restored:
        raise HTTPException(status_code=404, detail="Deleted task not found")
    return APIResponse(
        success=True,
        message="Task restored from trash",
        data={"id": restored.id, "content": restored.content}
    )


@router.delete("/{deleted_id}/permanent", response_model=APIResponse)
async def permanent_delete(
    deleted_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Permanently delete a task from trash"""
    success = await permanently_delete_trash(db, deleted_id)
    if not success:
        raise HTTPException(status_code=404, detail="Deleted task not found")
    return APIResponse(success=True, message="Task permanently deleted")


@router.delete("/cleanup", response_model=APIResponse)
async def cleanup_trash(
    db: AsyncSession = Depends(get_db)
):
    """Clean up expired tasks (older than 30 days)"""
    count = await cleanup_expired_tasks(db)
    return APIResponse(
        success=True,
        message=f"Cleaned up {count} expired tasks",
        data={"deleted_count": count}
    )


@router.delete("/empty", response_model=APIResponse)
async def empty_trash_endpoint(
    confirm: bool = Query(False, description="Set to true to confirm emptying trash"),
    db: AsyncSession = Depends(get_db)
):
    """Empty the entire trash (permanently delete all)"""
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Please set confirm=true to empty trash"
        )
    
    count = await empty_trash(db)
    return APIResponse(
        success=True,
        message=f"Trash emptied. {count} tasks permanently deleted.",
        data={"deleted_count": count}
    )
