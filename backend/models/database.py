"""
SQLAlchemy database models for ToDoList
"""
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy import (
    Column, Integer, String, Text, Date, DateTime, ForeignKey, Index, create_engine
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, relationship

from config import DATABASE_URL

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()


# ==================== Active Tasks ====================

class Task(Base):
    """Active tasks table"""
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=True)
    priority = Column(Integer, default=2)  # 1-4
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subtasks = relationship("Subtask", back_populates="task", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_task_due_date', 'due_date'),
        Index('idx_task_order', 'order_index'),
    )


class Subtask(Base):
    """Active subtasks table"""
    __tablename__ = "subtasks"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    content = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=True)
    priority = Column(Integer, default=2)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    task = relationship("Task", back_populates="subtasks")
    
    __table_args__ = (
        Index('idx_subtask_task_id', 'task_id'),
        Index('idx_subtask_order', 'order_index'),
    )


# ==================== Completed Tasks ====================

class CompletedTask(Base):
    """Completed tasks archive"""
    __tablename__ = "completed_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    original_id = Column(Integer, nullable=True)  # Reference to original task ID
    content = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=True)
    priority = Column(Integer, nullable=True)
    completed_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=True)  # Original creation time
    
    # Relationships
    subtasks = relationship("CompletedSubtask", back_populates="task", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_completed_task_date', 'completed_at'),
    )


class CompletedSubtask(Base):
    """Completed subtasks archive"""
    __tablename__ = "completed_subtasks"
    
    id = Column(Integer, primary_key=True, index=True)
    completed_task_id = Column(Integer, ForeignKey("completed_tasks.id", ondelete="CASCADE"), nullable=False)
    original_id = Column(Integer, nullable=True)
    content = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=True)
    priority = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=True)
    
    # Relationships
    task = relationship("CompletedTask", back_populates="subtasks")


# ==================== Deleted Tasks (Trash) ====================

class DeletedTask(Base):
    """Deleted tasks trash bin with auto-expiration"""
    __tablename__ = "deleted_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    original_id = Column(Integer, nullable=True)
    content = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=True)
    priority = Column(Integer, nullable=True)
    deleted_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # Auto cleanup after 30 days
    created_at = Column(DateTime, nullable=True)
    
    # Relationships
    subtasks = relationship("DeletedSubtask", back_populates="task", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_deleted_task_expires', 'expires_at'),
        Index('idx_deleted_task_date', 'deleted_at'),
    )


class DeletedSubtask(Base):
    """Deleted subtasks in trash"""
    __tablename__ = "deleted_subtasks"
    
    id = Column(Integer, primary_key=True, index=True)
    deleted_task_id = Column(Integer, ForeignKey("deleted_tasks.id", ondelete="CASCADE"), nullable=False)
    original_id = Column(Integer, nullable=True)
    content = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=True)
    priority = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=True)
    
    # Relationships
    task = relationship("DeletedTask", back_populates="subtasks")


# ==================== Task Notes ====================

class TaskNote(Base):
    """Task-level notes (1:1 with tasks)"""
    __tablename__ = "task_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_task_note_task_id', 'task_id'),
    )


# ==================== Subtask Notes ====================

class SubtaskNote(Base):
    """Subtask-level notes (1:1 with subtasks)"""
    __tablename__ = "subtask_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    subtask_id = Column(Integer, ForeignKey("subtasks.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_subtask_note_subtask_id', 'subtask_id'),
    )


# ==================== Subtask Dependencies (Workflow) ====================

class SubtaskDependency(Base):
    """Subtask dependency edges for workflow visualization"""
    __tablename__ = "subtask_dependencies"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    from_subtask_id = Column(Integer, ForeignKey("subtasks.id", ondelete="CASCADE"), nullable=False)
    to_subtask_id = Column(Integer, ForeignKey("subtasks.id", ondelete="CASCADE"), nullable=False)
    dependency_type = Column(String(20), default="BLOCKS")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_dep_task_id', 'task_id'),
        Index('idx_dep_from', 'from_subtask_id'),
        Index('idx_dep_to', 'to_subtask_id'),
    )


# Database dependency
async def get_db():
    """Async database session dependency"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
