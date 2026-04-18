"""
Workflow business logic for subtask dependency visualization
"""
from typing import List, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import Task, Subtask, SubtaskDependency
from models.schemas import WorkflowResponse, DependencyCreate


async def get_workflow(db: AsyncSession, task_id: int) -> Optional[WorkflowResponse]:
    """Build workflow graph data: nodes as subtasks, edges as dependencies"""
    # Verify task exists
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    task = task_result.scalar_one_or_none()
    if not task:
        return None
    
    # Get all subtasks as nodes
    subtasks_result = await db.execute(
        select(Subtask).where(Subtask.task_id == task_id).order_by(Subtask.order_index)
    )
    subtasks = subtasks_result.scalars().all()
    
    # Build node list
    nodes = []
    for st in subtasks:
        nodes.append({
            "data": {
                "id": f"subtask_{st.id}",
                "label": st.content,
                "priority": st.priority,
                "due_date": st.due_date.isoformat() if st.due_date else None,
                "description": st.description,
            }
        })
    
    # Get all dependency relationships as edges
    deps_result = await db.execute(
        select(SubtaskDependency).where(SubtaskDependency.task_id == task_id)
    )
    dependencies = deps_result.scalars().all()
    
    edges = []
    for dep in dependencies:
        edges.append({
            "data": {
                "id": f"edge_{dep.id}",
                "source": f"subtask_{dep.from_subtask_id}",
                "target": f"subtask_{dep.to_subtask_id}",
                "type": dep.dependency_type,
            }
        })
    
    return WorkflowResponse(
        task_id=task_id,
        task_name=task.content,
        nodes=nodes,
        edges=edges
    )


async def get_dependencies_by_task(db: AsyncSession, task_id: int) -> List[SubtaskDependency]:
    result = await db.execute(
        select(SubtaskDependency).where(SubtaskDependency.task_id == task_id)
    )
    return result.scalars().all()


async def create_dependency(
    db: AsyncSession, task_id: int, dep_data: DependencyCreate
) -> Optional[SubtaskDependency]:
    """Create dependency relationship, prevent self-loop and duplicate edges"""
    if dep_data.from_subtask_id == dep_data.to_subtask_id:
        return None  # Self-loop
    
    # Check for duplicate edge
    existing = await db.execute(
        select(SubtaskDependency).where(
            and_(
                SubtaskDependency.from_subtask_id == dep_data.from_subtask_id,
                SubtaskDependency.to_subtask_id == dep_data.to_subtask_id,
            )
        )
    )
    if existing.scalar_one_or_none():
        return None  # Duplicate edge
    
    dep = SubtaskDependency(
        task_id=task_id,
        from_subtask_id=dep_data.from_subtask_id,
        to_subtask_id=dep_data.to_subtask_id,
        dependency_type=dep_data.dependency_type or "BLOCKS",
    )
    db.add(dep)
    await db.commit()
    await db.refresh(dep)
    return dep


async def delete_dependency(db: AsyncSession, dep_id: int) -> bool:
    dep_result = await db.execute(select(SubtaskDependency).where(SubtaskDependency.id == dep_id))
    dep = dep_result.scalar_one_or_none()
    if not dep:
        return False
    await db.delete(dep)
    await db.commit()
    return True


async def get_upstream(db: AsyncSession, subtask_id: int) -> List[SubtaskDependency]:
    """Get upstream dependencies (which subtasks point to current subtask)"""
    result = await db.execute(
        select(SubtaskDependency).where(SubtaskDependency.to_subtask_id == subtask_id)
    )
    return result.scalars().all()


async def get_downstream(db: AsyncSession, subtask_id: int) -> List[SubtaskDependency]:
    """Get downstream dependencies (which subtasks current subtask points to)"""
    result = await db.execute(
        select(SubtaskDependency).where(SubtaskDependency.from_subtask_id == subtask_id)
    )
    return result.scalars().all()
