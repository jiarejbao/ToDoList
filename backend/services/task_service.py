"""
Task business logic
"""
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, update, delete, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.database import Task, Subtask
from models.schemas import TaskCreate, TaskUpdate, TaskOrderUpdate


async def create_task(db: AsyncSession, task_data: TaskCreate) -> Task:
    """Create a new task with optional subtasks"""
    # Create task
    task = Task(
        content=task_data.content,
        description=task_data.description,
        due_date=task_data.due_date,
        priority=task_data.priority,
        order_index=task_data.order_index,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    # Create subtasks if provided
    if task_data.subtasks:
        for i, subtask_data in enumerate(task_data.subtasks):
            subtask = Subtask(
                task_id=task.id,
                content=subtask_data.content,
                description=subtask_data.description,
                due_date=subtask_data.due_date,
                priority=subtask_data.priority,
                order_index=subtask_data.order_index or i,
            )
            db.add(subtask)
        await db.commit()
    
    # Refresh and reload with subtasks
    result = await db.execute(
        select(Task).where(Task.id == task.id).options(selectinload(Task.subtasks))
    )
    return result.scalar_one()


async def get_task(db: AsyncSession, task_id: int) -> Optional[Task]:
    """Get a single task by ID with subtasks"""
    result = await db.execute(
        select(Task).where(Task.id == task_id).options(selectinload(Task.subtasks))
    )
    return result.scalar_one_or_none()


async def get_tasks(
    db: AsyncSession,
    priority: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> List[Task]:
    """Get all active tasks with optional filters"""
    query = select(Task).options(selectinload(Task.subtasks)).order_by(asc(Task.order_index))
    
    if priority:
        query = query.where(Task.priority == priority)
    
    if date_from:
        query = query.where(Task.due_date >= date_from)
    
    if date_to:
        query = query.where(Task.due_date <= date_to)
    
    result = await db.execute(query)
    return result.scalars().all()


async def update_task(db: AsyncSession, task_id: int, task_data: TaskUpdate) -> Optional[Task]:
    """Update a task and its subtasks"""
    from models.database import SubtaskNote, SubtaskDependency
    
    task = await get_task(db, task_id)
    if not task:
        return None
    
    # Update task fields (excluding subtasks)
    update_data = task_data.model_dump(exclude_unset=True)
    subtasks_data = update_data.pop('subtasks', None)
    
    for field, value in update_data.items():
        setattr(task, field, value)
    
    task.updated_at = datetime.utcnow()
    
    # Handle subtasks diff if provided
    if subtasks_data is not None:
        existing_subtasks = {s.id: s for s in task.subtasks}
        incoming_ids = set()
        
        for sub_data in subtasks_data:
            # sub_data is a dict (from model_dump or JSON)
            subtask_id = sub_data.get('id')
            
            if subtask_id and subtask_id in existing_subtasks:
                # Update existing subtask
                existing = existing_subtasks[subtask_id]
                existing.content = sub_data['content']
                if sub_data.get('description') is not None:
                    existing.description = sub_data['description']
                if sub_data.get('due_date') is not None:
                    existing.due_date = sub_data['due_date']
                if sub_data.get('priority') is not None:
                    existing.priority = sub_data['priority']
                existing.updated_at = datetime.utcnow()
                incoming_ids.add(subtask_id)
            else:
                # Create new subtask
                new_subtask = Subtask(
                    task_id=task_id,
                    content=sub_data['content'],
                    description=sub_data.get('description'),
                    due_date=sub_data.get('due_date'),
                    priority=sub_data.get('priority') or 2,
                    order_index=sub_data.get('order_index') or len(task.subtasks),
                )
                db.add(new_subtask)
        
        # Delete subtasks not in the incoming list
        for sub_id, subtask in existing_subtasks.items():
            if sub_id not in incoming_ids:
                # Cascade delete related notes and dependencies
                await db.execute(
                    delete(SubtaskNote).where(SubtaskNote.subtask_id == sub_id)
                )
                await db.execute(
                    delete(SubtaskDependency).where(
                        (SubtaskDependency.from_subtask_id == sub_id) |
                        (SubtaskDependency.to_subtask_id == sub_id)
                    )
                )
                await db.delete(subtask)
    
    await db.commit()
    
    # Refresh task and its subtasks relationship
    await db.refresh(task, attribute_names=['subtasks'])
    return task


async def delete_task(db: AsyncSession, task_id: int) -> bool:
    """Delete a task (move to trash)"""
    task = await get_task(db, task_id)
    if not task:
        return False
    
    await db.delete(task)
    await db.commit()
    return True


async def update_task_order(db: AsyncSession, task_id: int, new_order: int) -> Optional[Task]:
    """Update task order index with reordering of affected tasks"""
    task = await get_task(db, task_id)
    if not task:
        return None
    
    old_order = task.order_index
    
    if new_order == old_order:
        return task
    
    if new_order > old_order:
        # Moving down: decrement tasks between old+1 and new
        await db.execute(
            update(Task)
            .where(Task.order_index > old_order, Task.order_index <= new_order)
            .values(order_index=Task.order_index - 1)
        )
    else:
        # Moving up: increment tasks between new and old-1
        await db.execute(
            update(Task)
            .where(Task.order_index >= new_order, Task.order_index < old_order)
            .values(order_index=Task.order_index + 1)
        )
    
    task.order_index = new_order
    await db.commit()
    await db.refresh(task)
    return task


async def get_max_order(db: AsyncSession) -> int:
    """Get the maximum order index for tasks"""
    result = await db.execute(select(Task.order_index).order_by(desc(Task.order_index)).limit(1))
    max_order = result.scalar()
    return max_order if max_order is not None else -1
