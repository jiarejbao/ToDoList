"""
Trash/Deleted tasks business logic
"""
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy import select, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.database import Task, Subtask, DeletedTask, DeletedSubtask
from config import TRASH_CONFIG


async def move_to_trash(db: AsyncSession, task_id: int) -> Optional[DeletedTask]:
    """Move a task to trash (soft delete)"""
    # Get task with subtasks
    result = await db.execute(
        select(Task).where(Task.id == task_id).options(selectinload(Task.subtasks))
    )
    task = result.scalar_one_or_none()
    if not task:
        return None
    
    # Calculate expiration date
    expire_days = TRASH_CONFIG["expire_days"]
    expires_at = datetime.utcnow() + timedelta(days=expire_days)
    
    # Create deleted task record
    deleted_task = DeletedTask(
        original_id=task.id,
        content=task.content,
        description=task.description,
        due_date=task.due_date,
        priority=task.priority,
        expires_at=expires_at,
        created_at=task.created_at,
    )
    db.add(deleted_task)
    await db.flush()
    
    # Move subtasks
    for subtask in task.subtasks:
        deleted_subtask = DeletedSubtask(
            deleted_task_id=deleted_task.id,
            original_id=subtask.id,
            content=subtask.content,
            description=subtask.description,
            due_date=subtask.due_date,
            priority=subtask.priority,
            created_at=subtask.created_at,
        )
        db.add(deleted_subtask)
    
    # Delete original task
    await db.delete(task)
    await db.commit()
    await db.refresh(deleted_task)
    return deleted_task


async def get_deleted_task(db: AsyncSession, deleted_id: int) -> Optional[DeletedTask]:
    """Get a deleted task by ID"""
    result = await db.execute(
        select(DeletedTask)
        .where(DeletedTask.id == deleted_id)
        .options(selectinload(DeletedTask.subtasks))
    )
    return result.scalar_one_or_none()


async def get_deleted_tasks(
    db: AsyncSession,
    limit: int = 100,
    offset: int = 0
) -> List[DeletedTask]:
    """Get all deleted tasks with pagination"""
    result = await db.execute(
        select(DeletedTask)
        .options(selectinload(DeletedTask.subtasks))
        .order_by(desc(DeletedTask.deleted_at))
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


async def get_deleted_tasks_count(db: AsyncSession) -> int:
    """Get total count of deleted tasks"""
    result = await db.execute(select(DeletedTask))
    return len(result.scalars().all())


async def restore_deleted_task(db: AsyncSession, deleted_id: int) -> Optional[Task]:
    """Restore a deleted task back to active tasks"""
    result = await db.execute(
        select(DeletedTask)
        .where(DeletedTask.id == deleted_id)
        .options(selectinload(DeletedTask.subtasks))
    )
    deleted_task = result.scalar_one_or_none()
    if not deleted_task:
        return None
    
    # Create new task from deleted
    task = Task(
        content=deleted_task.content,
        description=deleted_task.description,
        due_date=deleted_task.due_date,
        priority=deleted_task.priority or 2,
        order_index=0,
        created_at=datetime.utcnow(),
    )
    db.add(task)
    await db.flush()
    
    # Restore subtasks
    for deleted_subtask in deleted_task.subtasks:
        subtask = Subtask(
            task_id=task.id,
            content=deleted_subtask.content,
            description=deleted_subtask.description,
            due_date=deleted_subtask.due_date,
            priority=deleted_subtask.priority or 2,
            order_index=0,
        )
        db.add(subtask)
    
    # Delete deleted record
    await db.delete(deleted_task)
    await db.commit()
    await db.refresh(task)
    return task


async def permanently_delete_trash(db: AsyncSession, deleted_id: int) -> bool:
    """Permanently delete a task from trash"""
    deleted_task = await get_deleted_task(db, deleted_id)
    if not deleted_task:
        return False
    
    await db.delete(deleted_task)
    await db.commit()
    return True


async def cleanup_expired_tasks(db: AsyncSession) -> int:
    """Clean up tasks that have been in trash for more than 30 days"""
    cutoff_date = datetime.utcnow() - timedelta(days=TRASH_CONFIG["expire_days"])
    
    # Delete expired subtasks first (cascade should handle this, but being explicit)
    await db.execute(
        delete(DeletedSubtask).where(
            DeletedSubtask.deleted_task_id.in_(
                select(DeletedTask.id).where(DeletedTask.expires_at < cutoff_date)
            )
        )
    )
    
    # Delete expired tasks
    result = await db.execute(
        delete(DeletedTask).where(DeletedTask.expires_at < cutoff_date)
    )
    
    await db.commit()
    return result.rowcount


async def empty_trash(db: AsyncSession) -> int:
    """Empty the entire trash (permanently delete all)"""
    result = await db.execute(select(DeletedTask))
    tasks = result.scalars().all()
    count = len(tasks)
    
    for task in tasks:
        await db.delete(task)
    
    await db.commit()
    return count
