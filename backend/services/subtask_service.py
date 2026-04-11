"""
Subtask business logic
"""
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, update, asc
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import Subtask, Task
from models.schemas import SubtaskCreate, SubtaskUpdate


async def create_subtask(db: AsyncSession, task_id: int, subtask_data: SubtaskCreate) -> Optional[Subtask]:
    """Create a new subtask for a task"""
    # Verify task exists
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    task = task_result.scalar_one_or_none()
    if not task:
        return None
    
    subtask = Subtask(
        task_id=task_id,
        content=subtask_data.content,
        description=subtask_data.description,
        due_date=subtask_data.due_date,
        priority=subtask_data.priority,
        order_index=subtask_data.order_index,
    )
    db.add(subtask)
    await db.commit()
    await db.refresh(subtask)
    return subtask


async def get_subtask(db: AsyncSession, subtask_id: int) -> Optional[Subtask]:
    """Get a single subtask by ID"""
    result = await db.execute(select(Subtask).where(Subtask.id == subtask_id))
    return result.scalar_one_or_none()


async def get_subtasks_by_task(db: AsyncSession, task_id: int) -> List[Subtask]:
    """Get all subtasks for a task"""
    result = await db.execute(
        select(Subtask)
        .where(Subtask.task_id == task_id)
        .order_by(asc(Subtask.order_index))
    )
    return result.scalars().all()


async def update_subtask(db: AsyncSession, subtask_id: int, subtask_data: SubtaskUpdate) -> Optional[Subtask]:
    """Update a subtask"""
    subtask = await get_subtask(db, subtask_id)
    if not subtask:
        return None
    
    update_data = subtask_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subtask, field, value)
    
    subtask.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(subtask)
    return subtask


async def delete_subtask(db: AsyncSession, subtask_id: int) -> bool:
    """Delete a subtask"""
    subtask = await get_subtask(db, subtask_id)
    if not subtask:
        return False
    
    await db.delete(subtask)
    await db.commit()
    return True


async def update_subtask_order(db: AsyncSession, subtask_id: int, new_order: int) -> Optional[Subtask]:
    """Update subtask order index within its parent task"""
    subtask = await get_subtask(db, subtask_id)
    if not subtask:
        return None
    
    old_order = subtask.order_index
    task_id = subtask.task_id
    
    if new_order == old_order:
        return subtask
    
    if new_order > old_order:
        # Moving down
        await db.execute(
            update(Subtask)
            .where(
                Subtask.task_id == task_id,
                Subtask.order_index > old_order,
                Subtask.order_index <= new_order
            )
            .values(order_index=Subtask.order_index - 1)
        )
    else:
        # Moving up
        await db.execute(
            update(Subtask)
            .where(
                Subtask.task_id == task_id,
                Subtask.order_index >= new_order,
                Subtask.order_index < old_order
            )
            .values(order_index=Subtask.order_index + 1)
        )
    
    subtask.order_index = new_order
    await db.commit()
    await db.refresh(subtask)
    return subtask
