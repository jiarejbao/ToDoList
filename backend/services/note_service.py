"""
Note business logic for Task and Subtask notes
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import TaskNote, SubtaskNote


async def get_task_note(db: AsyncSession, task_id: int) -> Optional[TaskNote]:
    result = await db.execute(select(TaskNote).where(TaskNote.task_id == task_id))
    return result.scalar_one_or_none()


async def upsert_task_note(db: AsyncSession, task_id: int, content: str) -> TaskNote:
    note = await get_task_note(db, task_id)
    if note:
        note.content = content
        note.updated_at = datetime.utcnow()
    else:
        note = TaskNote(task_id=task_id, content=content)
        db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


async def delete_task_note(db: AsyncSession, task_id: int) -> bool:
    note = await get_task_note(db, task_id)
    if note:
        await db.delete(note)
        await db.commit()
        return True
    return False


async def get_subtask_note(db: AsyncSession, subtask_id: int) -> Optional[SubtaskNote]:
    result = await db.execute(select(SubtaskNote).where(SubtaskNote.subtask_id == subtask_id))
    return result.scalar_one_or_none()


async def upsert_subtask_note(db: AsyncSession, subtask_id: int, content: str) -> SubtaskNote:
    note = await get_subtask_note(db, subtask_id)
    if note:
        note.content = content
        note.updated_at = datetime.utcnow()
    else:
        note = SubtaskNote(subtask_id=subtask_id, content=content)
        db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


async def delete_subtask_note(db: AsyncSession, subtask_id: int) -> bool:
    note = await get_subtask_note(db, subtask_id)
    if note:
        await db.delete(note)
        await db.commit()
        return True
    return False
