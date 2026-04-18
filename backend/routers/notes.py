"""
Note API routes for Task and Subtask notes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import NoteCreate, NoteResponse, APIResponse
from services import note_service

router = APIRouter(tags=["notes"])


# ========== Task Notes ==========

@router.get("/tasks/{task_id}/note", response_model=NoteResponse)
async def get_task_note(task_id: int, db: AsyncSession = Depends(get_db)):
    """Get task note, return empty content if not exists"""
    note = await note_service.get_task_note(db, task_id)
    if not note:
        return NoteResponse(id=None, task_id=task_id, content="", created_at=None, updated_at=None)
    return note


@router.put("/tasks/{task_id}/note", response_model=NoteResponse)
async def upsert_task_note(task_id: int, note_data: NoteCreate, db: AsyncSession = Depends(get_db)):
    """Create or update task note (UPSERT)"""
    note = await note_service.upsert_task_note(db, task_id, note_data.content)
    return note


@router.delete("/tasks/{task_id}/note", response_model=APIResponse)
async def delete_task_note(task_id: int, db: AsyncSession = Depends(get_db)):
    """Clear task note"""
    success = await note_service.delete_task_note(db, task_id)
    return APIResponse(success=success, message="Task note cleared")


# ========== Subtask Notes ==========

@router.get("/subtasks/{subtask_id}/note", response_model=NoteResponse)
async def get_subtask_note(subtask_id: int, db: AsyncSession = Depends(get_db)):
    """Get subtask note"""
    note = await note_service.get_subtask_note(db, subtask_id)
    if not note:
        return NoteResponse(id=None, subtask_id=subtask_id, content="", created_at=None, updated_at=None)
    return note


@router.put("/subtasks/{subtask_id}/note", response_model=NoteResponse)
async def upsert_subtask_note(subtask_id: int, note_data: NoteCreate, db: AsyncSession = Depends(get_db)):
    """Create or update subtask note (UPSERT)"""
    note = await note_service.upsert_subtask_note(db, subtask_id, note_data.content)
    return note


@router.delete("/subtasks/{subtask_id}/note", response_model=APIResponse)
async def delete_subtask_note(subtask_id: int, db: AsyncSession = Depends(get_db)):
    """Clear subtask note"""
    success = await note_service.delete_subtask_note(db, subtask_id)
    return APIResponse(success=success, message="Subtask note cleared")
