"""
Pydantic schemas for request/response validation
"""
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict


# ==================== Subtask Schemas ====================

class SubtaskBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    due_date: Optional[date] = None
    priority: int = Field(default=2, ge=1, le=4)
    order_index: int = 0


class SubtaskCreate(SubtaskBase):
    pass


class SubtaskUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[int] = Field(None, ge=1, le=4)
    order_index: Optional[int] = None


class SubtaskResponse(SubtaskBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    task_id: int
    created_at: datetime
    updated_at: datetime


# ==================== Task Schemas ====================

class TaskBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    due_date: Optional[date] = None
    priority: int = Field(default=2, ge=1, le=4)
    order_index: int = 0


class TaskCreate(TaskBase):
    subtasks: List[SubtaskCreate] = []


class TaskUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[int] = Field(None, ge=1, le=4)


class TaskOrderUpdate(BaseModel):
    order_index: int = Field(..., ge=0)


class TaskResponse(TaskBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    subtasks: List[SubtaskResponse] = []
    created_at: datetime
    updated_at: datetime


# ==================== Calendar Schemas ====================

class TaskByDateResponse(BaseModel):
    date: date
    tasks: List[TaskResponse]


class CalendarDatesResponse(BaseModel):
    dates: List[date]


# ==================== Completed Task Schemas ====================

class CompletedSubtaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    original_id: Optional[int]
    content: str
    description: Optional[str]
    due_date: Optional[date]
    priority: Optional[int]
    created_at: Optional[datetime]


class CompletedTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    original_id: Optional[int]
    content: str
    description: Optional[str]
    due_date: Optional[date]
    priority: Optional[int]
    completed_at: datetime
    created_at: Optional[datetime]
    subtasks: List[CompletedSubtaskResponse] = []


class CompletedTaskListResponse(BaseModel):
    items: List[CompletedTaskResponse]
    total: int


# ==================== Deleted Task Schemas ====================

class DeletedSubtaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    original_id: Optional[int]
    content: str
    description: Optional[str]
    due_date: Optional[date]
    priority: Optional[int]
    created_at: Optional[datetime]


class DeletedTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    original_id: Optional[int]
    content: str
    description: Optional[str]
    due_date: Optional[date]
    priority: Optional[int]
    deleted_at: datetime
    expires_at: Optional[datetime]
    created_at: Optional[datetime]
    subtasks: List[DeletedSubtaskResponse] = []


class DeletedTaskListResponse(BaseModel):
    items: List[DeletedTaskResponse]
    total: int


# ==================== Common Response ====================

class APIResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[dict] = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: dict


# ==================== Note Schemas ====================

class NoteCreate(BaseModel):
    content: str = Field(default="", description="Markdown/HTML content")


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: Optional[int] = None
    task_id: Optional[int] = None
    subtask_id: Optional[int] = None
    content: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ==================== Workflow Schemas ====================

class DependencyCreate(BaseModel):
    from_subtask_id: int = Field(..., description="Source subtask ID")
    to_subtask_id: int = Field(..., description="Target subtask ID")
    dependency_type: Optional[str] = Field(default="BLOCKS", pattern="^(BLOCKS|REQUIRES|TRIGGERS)$")


class DependencyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    task_id: int
    from_subtask_id: int
    to_subtask_id: int
    dependency_type: str
    created_at: datetime


class WorkflowNode(BaseModel):
    data: dict


class WorkflowEdge(BaseModel):
    data: dict


class WorkflowResponse(BaseModel):
    task_id: int
    task_name: str
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
