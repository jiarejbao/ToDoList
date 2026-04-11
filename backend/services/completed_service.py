"""
Completed tasks archive business logic
"""
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.database import Task, Subtask, CompletedTask, CompletedSubtask


async def complete_task(db: AsyncSession, task_id: int) -> Optional[CompletedTask]:
    """Move a task to completed archive"""
    # Get task with subtasks
    result = await db.execute(
        select(Task).where(Task.id == task_id).options(selectinload(Task.subtasks))
    )
    task = result.scalar_one_or_none()
    if not task:
        return None
    
    # Create completed task record
    completed_task = CompletedTask(
        original_id=task.id,
        content=task.content,
        description=task.description,
        due_date=task.due_date,
        priority=task.priority,
        created_at=task.created_at,
    )
    db.add(completed_task)
    await db.flush()  # Get the ID
    
    # Move subtasks
    for subtask in task.subtasks:
        completed_subtask = CompletedSubtask(
            completed_task_id=completed_task.id,
            original_id=subtask.id,
            content=subtask.content,
            description=subtask.description,
            due_date=subtask.due_date,
            priority=subtask.priority,
            created_at=subtask.created_at,
        )
        db.add(completed_subtask)
    
    # Delete original task (cascades to subtasks)
    await db.delete(task)
    await db.commit()
    await db.refresh(completed_task)
    return completed_task


async def get_completed_task(db: AsyncSession, completed_id: int) -> Optional[CompletedTask]:
    """Get a completed task by ID"""
    result = await db.execute(
        select(CompletedTask)
        .where(CompletedTask.id == completed_id)
        .options(selectinload(CompletedTask.subtasks))
    )
    return result.scalar_one_or_none()


async def get_completed_tasks(
    db: AsyncSession,
    limit: int = 100,
    offset: int = 0
) -> List[CompletedTask]:
    """Get all completed tasks with pagination"""
    result = await db.execute(
        select(CompletedTask)
        .options(selectinload(CompletedTask.subtasks))
        .order_by(desc(CompletedTask.completed_at))
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


async def get_completed_tasks_count(db: AsyncSession) -> int:
    """Get total count of completed tasks"""
    result = await db.execute(select(CompletedTask))
    return len(result.scalars().all())


async def restore_completed_task(db: AsyncSession, completed_id: int) -> Optional[Task]:
    """Restore a completed task back to active tasks"""
    result = await db.execute(
        select(CompletedTask)
        .where(CompletedTask.id == completed_id)
        .options(selectinload(CompletedTask.subtasks))
    )
    completed_task = result.scalar_one_or_none()
    if not completed_task:
        return None
    
    # Create new task from completed
    task = Task(
        content=completed_task.content,
        description=completed_task.description,
        due_date=completed_task.due_date,
        priority=completed_task.priority or 2,
        order_index=0,
        created_at=datetime.utcnow(),
    )
    db.add(task)
    await db.flush()
    
    # Restore subtasks
    for completed_subtask in completed_task.subtasks:
        subtask = Subtask(
            task_id=task.id,
            content=completed_subtask.content,
            description=completed_subtask.description,
            due_date=completed_subtask.due_date,
            priority=completed_subtask.priority or 2,
            order_index=0,
        )
        db.add(subtask)
    
    # Delete completed record
    await db.delete(completed_task)
    await db.commit()
    await db.refresh(task)
    return task


async def permanently_delete_completed(db: AsyncSession, completed_id: int) -> bool:
    """Permanently delete a completed task record"""
    completed_task = await get_completed_task(db, completed_id)
    if not completed_task:
        return False
    
    await db.delete(completed_task)
    await db.commit()
    return True


async def clear_all_completed(db: AsyncSession) -> int:
    """Clear all completed tasks (use with caution)"""
    result = await db.execute(select(CompletedTask))
    tasks = result.scalars().all()
    count = len(tasks)
    
    for task in tasks:
        await db.delete(task)
    
    await db.commit()
    return count
