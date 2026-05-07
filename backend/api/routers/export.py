from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID

from backend.db.database import get_db
from backend.db.models import Meeting, User, Task
from backend.schemas.pydantic_models import TaskResponse, TrelloExportRequest
from backend.services.auth import get_current_user
from backend.services.integrations import (
    export_to_notion, export_to_trello,
    get_trello_boards, get_board_lists,
)
from backend.services.email_service import send_task_emails

router = APIRouter()


# ─── Trello helper endpoints ──────────────────────────────────────────────────

@router.get("/trello/boards")
async def list_trello_boards(current_user: User = Depends(get_current_user)):
    """Return boards visible to the configured Trello token."""
    return await get_trello_boards()


@router.get("/trello/boards/{board_id}/lists")
async def list_trello_board_lists(
    board_id: str,
    current_user: User = Depends(get_current_user),
):
    """Return the lists (columns) on a specific Trello board."""
    return await get_board_lists(board_id)


# ─── Notion export ────────────────────────────────────────────────────────────

@router.post("/{meeting_id}/notion", status_code=status.HTTP_200_OK)
async def export_meeting_notion(
    meeting_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify meeting exists
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    tasks_result = await db.execute(select(Task).where(Task.meeting_id == meeting_id))
    tasks = tasks_result.scalars().all()
    
    if not tasks:
        raise HTTPException(status_code=400, detail="No tasks to export")

    await export_to_notion(tasks, db)
    return {"status": "success", "message": f"{len(tasks)} tasks exported to Notion."}

@router.post("/{meeting_id}/trello-tasks", status_code=status.HTTP_200_OK)
async def sync_tasks_to_trello(
    meeting_id: UUID,
    req: TrelloExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a Trello card for every task in this meeting on the specified list.
    Tasks already synced (external_ticket_url contains trello.com) are skipped.
    """
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalars().first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    tasks_result = await db.execute(select(Task).where(Task.meeting_id == meeting_id))
    tasks = tasks_result.scalars().all()

    if not tasks:
        raise HTTPException(status_code=400, detail="No tasks to export")

    await export_to_trello(tasks, db, req.list_id, meeting.title)

    # Refresh to get updated external_ticket_urls
    tasks_result2 = await db.execute(select(Task).where(Task.meeting_id == meeting_id))
    synced_tasks = tasks_result2.scalars().all()
    synced = [t for t in synced_tasks if t.external_ticket_url and "trello.com" in t.external_ticket_url]

    return {
        "status": "success",
        "message": f"{len(synced)} task(s) synced to Trello.",
        "synced_count": len(synced),
    }



@router.post("/{meeting_id}/email-tasks", status_code=status.HTTP_200_OK)
async def email_tasks_to_assignees(
    meeting_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send an email to every assigned workspace member with their task list for this meeting.
    Tasks must already have assigned_to_user_id set.
    """
    # Load meeting
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalars().first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.status != "completed":
        raise HTTPException(status_code=400, detail="Meeting is still processing. Please wait until AI extraction is complete.")

    # Load tasks with their assigned users (eager-load)
    tasks_result = await db.execute(
        select(Task).where(Task.meeting_id == meeting_id).options(selectinload(Task.assigned_to))
    )
    tasks = tasks_result.scalars().all()

    if not tasks:
        raise HTTPException(status_code=400, detail="No tasks found for this meeting.")

    # Group tasks by assignee email
    assignments: dict = {}
    unassigned_count = 0
    for task in tasks:
        user = task.assigned_to
        if not user:
            unassigned_count += 1
            continue
        if user.email not in assignments:
            assignments[user.email] = {"name": user.full_name, "tasks": []}
        assignments[user.email]["tasks"].append({
            "description": task.description,
            "priority": task.priority.value if hasattr(task.priority, 'value') else task.priority,
            "status": task.status.value if hasattr(task.status, 'value') else task.status,
            "deadline": str(task.deadline) if task.deadline else None,
        })

    if not assignments:
        raise HTTPException(
            status_code=400,
            detail=f"No tasks have an assigned user yet. {unassigned_count} task(s) are unassigned."
        )

    try:
        results = await send_task_emails(meeting.title, assignments)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    sent = [e for e, r in results.items() if r == "ok"]
    failed = {e: r for e, r in results.items() if r != "ok"}

    return {
        "status": "success" if not failed else "partial",
        "message": f"Emails sent to {len(sent)} assignee(s).",
        "sent_to": sent,
        "failed": failed,
        "unassigned_tasks": unassigned_count,
    }
