import logging
import httpx
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from fastapi import HTTPException
from backend.db.models import Task
from backend.core.config import settings

logger = logging.getLogger(__name__)

NOTION_API_URL = "https://api.notion.com/v1/pages"
NOTION_VERSION = "2022-06-28"
TRELLO_API_BASE = "https://api.trello.com/1"


async def export_to_notion(tasks: List[Task], db: AsyncSession):
    """
    Export tasks to Notion as pages in a database.
    Requires NOTION_API_KEY and NOTION_DATABASE_ID in .env
    """
    api_key = settings.NOTION_API_KEY
    database_id = settings.NOTION_DATABASE_ID

    if not api_key or api_key == "your_notion_api_key_here":
        raise HTTPException(status_code=400, detail="NOTION_API_KEY is not configured.")
    if not database_id or database_id == "your_notion_database_id_here":
        raise HTTPException(status_code=400, detail="NOTION_DATABASE_ID is not configured.")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        for task in tasks:
            if task.external_ticket_url:
                continue  # already exported, skip

            properties: dict = {
                "Name": {
                    "title": [{"text": {"content": task.description or "Untitled task"}}]
                },
                "Status": {
                    "status": {"name": {
                        "pending": "Not started",
                        "in_progress": "In progress",
                        "completed": "Done",
                    }.get(task.status or "pending", "Not started")}
                },
                "Priority": {
                    "rich_text": [{"text": {"content": (task.priority or "medium").title()}}]
                },
            }

            if task.raw_assignee_name:
                properties["Assignee"] = {
                    "rich_text": [{"text": {"content": task.raw_assignee_name}}]
                }

            payload = {
                "parent": {"database_id": database_id},
                "properties": properties,
            }

            try:
                response = await client.post(NOTION_API_URL, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                task.external_ticket_url = data.get("url", "")
            except httpx.HTTPStatusError as e:
                error_body = e.response.text
                logger.error(f"Notion API error for task {task.id}: {error_body}")
                raise HTTPException(
                    status_code=502,
                    detail=f"Notion API error: {e.response.status_code} — {error_body}"
                )
            except Exception as e:
                logger.error(f"Unexpected error exporting task {task.id} to Notion: {e}")
                raise HTTPException(status_code=502, detail=f"Could not reach Notion: {str(e)}")

    await db.commit()


def _check_trello_config():
    if not settings.TRELLO_API_KEY or settings.TRELLO_API_KEY == "your_trello_api_key_here":
        raise HTTPException(status_code=400, detail="TRELLO_API_KEY is not configured. Get it from https://trello.com/power-ups/admin")
    if not settings.TRELLO_TOKEN or settings.TRELLO_TOKEN == "your_trello_token_here":
        raise HTTPException(status_code=400, detail="TRELLO_TOKEN is not configured. Generate it at https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key={YOUR_KEY}")


async def get_trello_boards() -> list:
    """Return the list of boards accessible by the configured Trello token."""
    _check_trello_config()
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{TRELLO_API_BASE}/members/me/boards",
            params={"key": settings.TRELLO_API_KEY, "token": settings.TRELLO_TOKEN, "fields": "id,name"},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Trello API error: {resp.text}")
        return [{"id": b["id"], "name": b["name"]} for b in resp.json()]


async def get_board_lists(board_id: str) -> list:
    """Return the lists (columns) on a Trello board."""
    _check_trello_config()
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{TRELLO_API_BASE}/boards/{board_id}/lists",
            params={"key": settings.TRELLO_API_KEY, "token": settings.TRELLO_TOKEN, "fields": "id,name"},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Trello API error: {resp.text}")
        return [{"id": lst["id"], "name": lst["name"]} for lst in resp.json()]


async def lookup_trello_member_id(username: str) -> str:
    """Look up a Trello member's permanent ID by their username."""
    _check_trello_config()
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{TRELLO_API_BASE}/members/{username}",
            params={"key": settings.TRELLO_API_KEY, "token": settings.TRELLO_TOKEN},
        )
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Trello user '{username}' not found. Check the username.")
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Trello API error: {resp.text}")
        return resp.json()["id"]


async def export_to_trello(tasks: List[Task], db: AsyncSession, list_id: str, meeting_title: str):
    """
    Create one Trello card per task in the specified list.
    Assigns the card to the team member if their trello_member_id is set.
    Saves the card shortUrl to task.external_ticket_url.
    """
    _check_trello_config()

    # Reload tasks with their assigned user to access trello_member_id
    task_ids = [t.id for t in tasks]
    from backend.db.models import Task as TaskModel
    stmt = select(TaskModel).where(TaskModel.id.in_(task_ids)).options(selectinload(TaskModel.assigned_to))
    result = await db.execute(stmt)
    tasks_with_users = result.scalars().all()

    async with httpx.AsyncClient(timeout=15.0) as client:
        for task in tasks_with_users:
            # Skip tasks already synced to Trello
            if task.external_ticket_url and "trello.com" in task.external_ticket_url:
                continue

            params: dict = {
                "key": settings.TRELLO_API_KEY,
                "token": settings.TRELLO_TOKEN,
                "idList": list_id,
                "name": task.description,
                "desc": f"Extracted via AI from meeting: **{meeting_title}**\n\nAssignee: {task.raw_assignee_name or 'Unassigned'}",
            }

            # Deadline → Trello due date (ISO format)
            if task.deadline:
                params["due"] = f"{task.deadline}T10:00:00.000Z"

            # Assign to Trello member if the user has a trello_member_id linked
            if task.assigned_to and task.assigned_to.trello_member_id:
                params["idMembers"] = task.assigned_to.trello_member_id

            try:
                resp = await client.post(f"{TRELLO_API_BASE}/cards", params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    task.external_ticket_url = data.get("shortUrl", "")
                    logger.info(f"Trello card created for task {task.id}: {task.external_ticket_url}")
                else:
                    err = resp.text
                    logger.error(f"Trello API error for task {task.id}: {err}")
                    raise HTTPException(status_code=502, detail=f"Trello API error: {err}")
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Failed to create Trello card for task {task.id}: {e}")
                raise HTTPException(status_code=502, detail=f"Could not reach Trello: {str(e)}")

    await db.commit()

