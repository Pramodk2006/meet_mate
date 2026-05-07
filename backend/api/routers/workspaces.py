from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID

from backend.db.database import get_db
from backend.db.models import Workspace, WorkspaceMember, User, Role
from backend.schemas.pydantic_models import (
    WorkspaceCreate, WorkspaceResponse,
    InviteMemberRequest, WorkspaceMemberResponse,
    SetTrelloRequest,
)
from backend.services.auth import get_current_user
from backend.services.integrations import lookup_trello_member_id

router = APIRouter()


@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_workspace = Workspace(name=workspace.name, owner_id=current_user.id)
    db.add(new_workspace)
    await db.commit()
    await db.refresh(new_workspace)

    # Auto-add creator as manager member
    member = WorkspaceMember(workspace_id=new_workspace.id, user_id=current_user.id, role=Role.manager)
    db.add(member)
    await db.commit()
    return new_workspace


@router.get("/", response_model=List[WorkspaceResponse])
async def list_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return workspaces the current user is a member of."""
    stmt = (
        select(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == current_user.id)
        .order_by(Workspace.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalars().first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.post("/{workspace_id}/invite", response_model=WorkspaceMemberResponse)
async def invite_member(
    workspace_id: UUID,
    invite_req: InviteMemberRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    if not ws_result.scalars().first():
        raise HTTPException(status_code=404, detail="Workspace not found")

    u_result = await db.execute(select(User).where(User.email == invite_req.email))
    user = u_result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail=f"No user found with email '{invite_req.email}'. They must register first.")

    mem_result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user.id
        )
    )
    if mem_result.scalars().first():
        raise HTTPException(status_code=400, detail="User is already a member of this workspace")

    requested_role = Role.manager if invite_req.role == "manager" else Role.member
    new_member = WorkspaceMember(workspace_id=workspace_id, user_id=user.id, role=requested_role)
    db.add(new_member)
    await db.commit()

    stmt = (
        select(WorkspaceMember)
        .options(selectinload(WorkspaceMember.user))
        .where(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user.id)
    )
    result = await db.execute(stmt)
    return result.scalars().first()


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberResponse])
async def list_members(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    if not ws_result.scalars().first():
        raise HTTPException(status_code=404, detail="Workspace not found")

    stmt = (
        select(WorkspaceMember)
        .options(selectinload(WorkspaceMember.user))
        .where(WorkspaceMember.workspace_id == workspace_id)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.patch("/{workspace_id}/members/{user_id}/trello")
async def set_member_trello_id(
    workspace_id: UUID,
    user_id: UUID,
    req: SetTrelloRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Look up the Trello member ID for a given Trello username and store it
    on the user record so cards can be auto-assigned when syncing to Trello.
    """
    mem_result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    if not mem_result.scalars().first():
        raise HTTPException(status_code=404, detail="User not found in this workspace")

    trello_id = await lookup_trello_member_id(req.trello_username)

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.trello_member_id = trello_id
    await db.commit()

    return {
        "user_id": str(user_id),
        "full_name": user.full_name,
        "trello_username": req.trello_username,
        "trello_member_id": trello_id,
    }

