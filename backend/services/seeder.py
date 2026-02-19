"""
Seed demo users for MeetMate.
Demo accounts (all pre-created):

MANAGER:
  sarah.johnson@meetmate.app  /  Manager@2026

EMPLOYEES:
  alex.chen@meetmate.app      /  Employee@2026
  priya.sharma@meetmate.app   /  Employee@2026
  james.wilson@meetmate.app   /  Employee@2026
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.db.models import User, Workspace, WorkspaceMember, Role
from backend.services.auth import hash_password

DEMO_USERS = [
    {
        "email": "sarah.johnson@meetmate.app",
        "full_name": "Sarah Johnson",
        "password": "Manager@2026",
        "avatar_url": None,
        "role": "manager",
    },
    {
        "email": "alex.chen@meetmate.app",
        "full_name": "Alex Chen",
        "password": "Employee@2026",
        "avatar_url": None,
        "role": "employee",
    },
    {
        "email": "priya.sharma@meetmate.app",
        "full_name": "Priya Sharma",
        "password": "Employee@2026",
        "avatar_url": None,
        "role": "employee",
    },
    {
        "email": "james.wilson@meetmate.app",
        "full_name": "James Wilson",
        "password": "Employee@2026",
        "avatar_url": None,
        "role": "employee",
    },
]


async def seed_demo_users(db: AsyncSession) -> dict[str, User]:
    """Create demo users if they don't exist. Returns dict of email -> User."""
    created = {}
    for data in DEMO_USERS:
        result = await db.execute(select(User).where(User.email == data["email"]))
        user = result.scalars().first()
        if not user:
            user = User(
                email=data["email"],
                full_name=data["full_name"],
                password_hash=hash_password(data["password"]),
                avatar_url=data["avatar_url"],
            )
            db.add(user)
        created[data["email"]] = user
    await db.commit()
    # Refresh all
    for email in created:
        result = await db.execute(select(User).where(User.email == email))
        created[email] = result.scalars().first()
    return created


async def seed_demo_workspace(db: AsyncSession, users: dict[str, User]) -> None:
    """Create a demo workspace owned by the manager with all users as members."""
    manager = users.get("sarah.johnson@meetmate.app")
    if not manager:
        return

    # Check if demo workspace exists already
    result = await db.execute(
        select(Workspace).where(Workspace.owner_id == manager.id)
    )
    if result.scalars().first():
        return  # Already seeded

    # Create workspace
    ws = Workspace(name="Engineering Team", owner_id=manager.id)
    db.add(ws)
    await db.commit()
    await db.refresh(ws)

    # Add manager
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=manager.id, role=Role.manager))

    # Add employees
    for email, user in users.items():
        if email != "sarah.johnson@meetmate.app":
            db.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role=Role.member))

    await db.commit()
