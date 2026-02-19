from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import List

from backend.db.database import get_db
from backend.db.models import Task, Meeting, User
from backend.schemas.pydantic_models import TaskUpdate, TaskResponse
from backend.services.auth import get_current_user

router = APIRouter()


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    task_update: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_update.model_dump(exclude_unset=True)

    if "assigned_to_user_id" in update_data and update_data["assigned_to_user_id"] is not None:
        user_result = await db.execute(select(User).where(User.id == update_data["assigned_to_user_id"]))
        if not user_result.scalars().first():
            raise HTTPException(status_code=404, detail="Assignee user not found")

    for key, value in update_data.items():
        setattr(task, key, value)

    try:
        await db.commit()
        await db.refresh(task)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return task


@router.get("/workspace/{workspace_id}", response_model=List[TaskResponse])
async def list_workspace_tasks(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Task)
        .join(Task.meeting)
        .where(Meeting.workspace_id == workspace_id)
        .order_by(Task.deadline.asc().nullslast())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/my", response_model=List[TaskResponse])
async def list_my_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all tasks assigned to the currently logged-in user."""
    stmt = (
        select(Task)
        .where(Task.assigned_to_user_id == current_user.id)
        .order_by(Task.deadline.asc().nullslast())
    )
    result = await db.execute(stmt)
    return result.scalars().all()
