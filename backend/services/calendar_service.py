"""
Calendar/Date grouping business logic
"""
from datetime import date, datetime
from typing import List, Dict, Optional
from collections import defaultdict

from sqlalchemy import select, extract, asc
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import Task


async def get_dates_with_tasks(
    db: AsyncSession,
    year: Optional[int] = None,
    month: Optional[int] = None
) -> List[date]:
    """Get all dates that have tasks due"""
    query = select(Task.due_date).where(Task.due_date != None).distinct()
    
    if year:
        query = query.where(extract('year', Task.due_date) == year)
    
    if month:
        query = query.where(extract('month', Task.due_date) == month)
    
    query = query.order_by(asc(Task.due_date))
    
    result = await db.execute(query)
    dates = result.scalars().all()
    return [d for d in dates if d is not None]


async def get_tasks_by_date(
    db: AsyncSession,
    target_date: date
) -> List[Task]:
    """Get all tasks for a specific date"""
    result = await db.execute(
        select(Task)
        .where(Task.due_date == target_date)
        .order_by(asc(Task.order_index))
    )
    return result.scalars().all()


async def get_tasks_by_date_range(
    db: AsyncSession,
    start_date: date,
    end_date: date
) -> Dict[date, List[Task]]:
    """Get tasks grouped by date within a range"""
    result = await db.execute(
        select(Task)
        .where(Task.due_date >= start_date, Task.due_date <= end_date)
        .order_by(asc(Task.due_date), asc(Task.order_index))
    )
    tasks = result.scalars().all()
    
    # Group by date
    grouped = defaultdict(list)
    for task in tasks:
        if task.due_date:
            grouped[task.due_date].append(task)
    
    return dict(grouped)


async def get_all_tasks_grouped_by_date(db: AsyncSession) -> Dict[str, List[Task]]:
    """Get all tasks grouped by date (for UI display)"""
    result = await db.execute(
        select(Task).order_by(asc(Task.due_date), asc(Task.order_index))
    )
    tasks = result.scalars().all()
    
    # Group by date
    grouped = defaultdict(list)
    no_date_tasks = []
    
    for task in tasks:
        if task.due_date:
            grouped[task.due_date.isoformat()].append(task)
        else:
            no_date_tasks.append(task)
    
    # Add "no_date" group if there are tasks without dates
    if no_date_tasks:
        grouped["no_date"] = no_date_tasks
    
    return dict(grouped)


async def get_today_tasks(db: AsyncSession) -> List[Task]:
    """Get tasks due today"""
    today = date.today()
    return await get_tasks_by_date(db, today)


async def get_upcoming_tasks(db: AsyncSession, days: int = 7) -> Dict[date, List[Task]]:
    """Get upcoming tasks for the next N days"""
    today = date.today()
    end_date = date.fromordinal(today.toordinal() + days)
    return await get_tasks_by_date_range(db, today, end_date)
