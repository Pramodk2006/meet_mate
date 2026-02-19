from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from uuid import UUID
from typing import List

from backend.db.database import get_db
from backend.db.models import Meeting, MeetingStatus, Workspace, User
from backend.schemas.pydantic_models import MeetingResponse
from backend.services.llm_extractor import process_meeting_transcript
from backend.services.auth import get_current_user

router = APIRouter()


@router.post("/{workspace_id}/upload", response_model=MeetingResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_transcript(
    workspace_id: UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = "Untitled Meeting",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    if not workspace_result.scalars().first():
        raise HTTPException(status_code=404, detail="Workspace not found")

    try:
        content = await file.read()
        transcript_text = content.decode("utf-8")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a valid UTF-8 text file.")

    new_meeting = Meeting(
        workspace_id=workspace_id,
        title=title,
        raw_transcript=transcript_text,
        status=MeetingStatus.processing,
    )
    db.add(new_meeting)
    await db.commit()

    background_tasks.add_task(process_meeting_transcript, new_meeting.id, transcript_text)

    stmt = select(Meeting).options(selectinload(Meeting.tasks)).where(Meeting.id == new_meeting.id)
    result = await db.execute(stmt)
    return result.scalars().first()


# IMPORTANT: /workspace/ routes BEFORE /{meeting_id}
@router.get("/workspace/{workspace_id}", response_model=List[MeetingResponse])
async def list_workspace_meetings(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Meeting)
        .options(selectinload(Meeting.tasks))
        .where(Meeting.workspace_id == workspace_id)
        .order_by(Meeting.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/workspace/{workspace_id}/search", response_model=List[MeetingResponse])
async def search_meetings(
    workspace_id: UUID,
    q: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Meeting)
        .options(selectinload(Meeting.tasks))
        .where(
            Meeting.workspace_id == workspace_id,
            or_(
                Meeting.title.ilike(f"%{q}%"),
                Meeting.ai_summary.ilike(f"%{q}%"),
                Meeting.raw_transcript.ilike(f"%{q}%"),
            )
        )
        .order_by(Meeting.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    meeting_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Meeting).options(selectinload(Meeting.tasks)).where(Meeting.id == meeting_id)
    result = await db.execute(stmt)
    meeting = result.scalars().first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting
