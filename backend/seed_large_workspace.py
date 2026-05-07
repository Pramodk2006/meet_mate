"""
One-shot script: creates a new workspace with 1 manager + 20 members.
Run from project root:  python -m backend.seed_large_workspace
"""
import asyncio
from sqlalchemy import select
from backend.db.database import AsyncSessionLocal
from backend.db.models import User, Workspace, WorkspaceMember, Role
from backend.services.auth import hash_password

MANAGER = {
    "email": "marcus.reed@meetmate.app",
    "full_name": "Marcus Reed",
    "password": "Manager@2026",
    "role": Role.manager,
    "department": "Engineering",
    "title": "Engineering Manager",
}

MEMBERS = [
    {"email": "olivia.scott@meetmate.app",    "full_name": "Olivia Scott",    "title": "Senior Frontend Engineer"},
    {"email": "ethan.brooks@meetmate.app",    "full_name": "Ethan Brooks",    "title": "Backend Engineer"},
    {"email": "sophia.turner@meetmate.app",   "full_name": "Sophia Turner",   "title": "Full-Stack Developer"},
    {"email": "liam.nguyen@meetmate.app",     "full_name": "Liam Nguyen",     "title": "DevOps Engineer"},
    {"email": "ava.martinez@meetmate.app",    "full_name": "Ava Martinez",    "title": "QA Engineer"},
    {"email": "noah.campbell@meetmate.app",   "full_name": "Noah Campbell",   "title": "Backend Engineer"},
    {"email": "isabella.clark@meetmate.app",  "full_name": "Isabella Clark",  "title": "Data Engineer"},
    {"email": "mason.lewis@meetmate.app",     "full_name": "Mason Lewis",     "title": "Site Reliability Engineer"},
    {"email": "mia.robinson@meetmate.app",    "full_name": "Mia Robinson",    "title": "Frontend Engineer"},
    {"email": "logan.walker@meetmate.app",    "full_name": "Logan Walker",    "title": "Mobile Engineer"},
    {"email": "amelia.hall@meetmate.app",     "full_name": "Amelia Hall",     "title": "Security Engineer"},
    {"email": "james.allen@meetmate.app",     "full_name": "James Allen",     "title": "Platform Engineer"},
    {"email": "harper.young@meetmate.app",    "full_name": "Harper Young",    "title": "ML Engineer"},
    {"email": "elijah.king@meetmate.app",     "full_name": "Elijah King",     "title": "Backend Engineer"},
    {"email": "evelyn.wright@meetmate.app",   "full_name": "Evelyn Wright",   "title": "Technical Lead"},
    {"email": "oliver.lopez@meetmate.app",    "full_name": "Oliver Lopez",    "title": "Cloud Engineer"},
    {"email": "abigail.hill@meetmate.app",    "full_name": "Abigail Hill",    "title": "API Engineer"},
    {"email": "lucas.green@meetmate.app",     "full_name": "Lucas Green",     "title": "Database Engineer"},
    {"email": "charlotte.adams@meetmate.app", "full_name": "Charlotte Adams", "title": "Frontend Engineer"},
    {"email": "henry.baker@meetmate.app",     "full_name": "Henry Baker",     "title": "Infrastructure Engineer"},
]

WORKSPACE_NAME = "Product Engineering — Q1 2026"
MEMBER_PASSWORD = "Employee@2026"


async def main():
    async with AsyncSessionLocal() as db:
        # --- Create / fetch manager ---
        result = await db.execute(select(User).where(User.email == MANAGER["email"]))
        manager = result.scalars().first()
        if not manager:
            manager = User(
                email=MANAGER["email"],
                full_name=MANAGER["full_name"],
                password_hash=hash_password(MANAGER["password"]),
            )
            db.add(manager)
            await db.commit()
            await db.refresh(manager)
            print(f"[+] Created manager: {manager.full_name}")
        else:
            print(f"[=] Manager already exists: {manager.full_name}")

        # --- Create / fetch members ---
        member_users = []
        for m in MEMBERS:
            result = await db.execute(select(User).where(User.email == m["email"]))
            user = result.scalars().first()
            if not user:
                user = User(
                    email=m["email"],
                    full_name=m["full_name"],
                    password_hash=hash_password(MEMBER_PASSWORD),
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)
                print(f"[+] Created member: {user.full_name}")
            else:
                print(f"[=] Member already exists: {user.full_name}")
            member_users.append(user)

        # --- Create workspace ---
        result = await db.execute(
            select(Workspace).where(Workspace.name == WORKSPACE_NAME)
        )
        ws = result.scalars().first()
        if not ws:
            ws = Workspace(name=WORKSPACE_NAME, owner_id=manager.id)
            db.add(ws)
            await db.commit()
            await db.refresh(ws)
            print(f"\n[+] Created workspace: '{ws.name}' (id={ws.id})")
        else:
            print(f"\n[=] Workspace already exists: '{ws.name}' (id={ws.id})")

        # --- Add manager membership ---
        result = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == ws.id,
                WorkspaceMember.user_id == manager.id,
            )
        )
        if not result.scalars().first():
            db.add(WorkspaceMember(workspace_id=ws.id, user_id=manager.id, role=Role.manager))
            await db.commit()

        # --- Add member memberships ---
        for user in member_users:
            result = await db.execute(
                select(WorkspaceMember).where(
                    WorkspaceMember.workspace_id == ws.id,
                    WorkspaceMember.user_id == user.id,
                )
            )
            if not result.scalars().first():
                db.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role=Role.member))
        await db.commit()

        print("\n✅ Done! Workspace fully seeded.\n")
        print(f"Workspace : {WORKSPACE_NAME}")
        print(f"{'─'*60}")
        print(f"{'Role':<10} {'Full Name':<25} {'Email':<40} {'Password'}")
        print(f"{'─'*60}")
        print(f"{'MANAGER':<10} {MANAGER['full_name']:<25} {MANAGER['email']:<40} {MANAGER['password']}")
        for m in MEMBERS:
            print(f"{'member':<10} {m['full_name']:<25} {m['email']:<40} {MEMBER_PASSWORD}")
        print(f"{'─'*60}")


if __name__ == "__main__":
    asyncio.run(main())
