"""
Calendar/Date grouping API routes
"""
from datetime import date
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import TaskResponse
from services.calendar_service import (
    get_dates_with_tasks,
    get_tasks_by_date,
    get_tasks_by_date_range,
    get_all_tasks_grouped_by_date,
    get_today_tasks,
    get_upcoming_tasks,
)

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/dates")
async def list_dates_with_tasks(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: AsyncSession = Depends(get_db)
):
    """Get all dates that have tasks due"""
    dates = await get_dates_with_tasks(db, year=year, month=month)
    return {
        "success": True,
        "data": {
            "dates": [d.isoformat() for d in dates],
            "count": len(dates)
        }
    }


@router.get("/by-date")
async def get_tasks_grouped_by_date(
    date_str: Optional[str] = Query(None, description="Specific date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db)
):
    """Get tasks grouped by date, or for a specific date"""
    if date_str:
        target_date = date.fromisoformat(date_str)
        tasks = await get_tasks_by_date(db, target_date)
        return {
            "success": True,
            "data": {
                date_str: tasks
            }
        }
    
    # Return all tasks grouped by date
    grouped = await get_all_tasks_grouped_by_date(db)
    return {
        "success": True,
        "data": grouped
    }


@router.get("/range")
async def get_tasks_in_range(
    start: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end: str = Query(..., description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db)
):
    """Get tasks within a date range"""
    start_date = date.fromisoformat(start)
    end_date = date.fromisoformat(end)
    
    grouped = await get_tasks_by_date_range(db, start_date, end_date)
    return {
        "success": True,
        "data": {k.isoformat(): v for k, v in grouped.items()}
    }


@router.get("/today")
async def get_todays_tasks(
    db: AsyncSession = Depends(get_db)
):
    """Get tasks due today"""
    tasks = await get_today_tasks(db)
    return {
        "success": True,
        "data": {
            "date": date.today().isoformat(),
            "tasks": tasks
        }
    }


@router.get("/upcoming")
async def get_upcoming_tasks_endpoint(
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db)
):
    """Get upcoming tasks for the next N days"""
    grouped = await get_upcoming_tasks(db, days)
    return {
        "success": True,
        "data": {k.isoformat(): v for k, v in grouped.items()}
    }
