"""
One-shot script: creates manager pramodk3132006@gmail.com + 4 members workspace.
Run from project root:  python -m backend.seed_pramod_workspace
"""
import asyncio
from sqlalchemy import select
from backend.db.database import AsyncSessionLocal
from backend.db.models import User, Workspace, WorkspaceMember, Role
from backend.services.auth import hash_password

MANAGER = {
    "email": "pramodk3132006@gmail.com",
    "full_name": "Pramod K",
    "password": "Manager@2026",
    "role": Role.manager,
}

MEMBERS = [
    {"email": "thozhamairaj@gmail.com",  "full_name": "Thozhamairaj"},
    {"email": "kpremkumar1522@gmail.com", "full_name": "Premkumar K"},
    {"email": "pramod3132006@gmail.com",  "full_name": "Promod"},
    {"email": "lokeshpramod@gmail.com",   "full_name": "Lokesh"},
]

WORKSPACE_NAME = "Pramod's Team Workspace"
MEMBER_PASSWORD = "Employee@2026"


async def main():
    async with AsyncSessionLocal() as db:
        # --- Manager ---
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
            print(f"[+] Created manager: {manager.full_name} <{manager.email}>")
        else:
            print(f"[=] Manager already exists: {manager.full_name} <{manager.email}>")

        # --- Members ---
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
                print(f"[+] Created member: {user.full_name} <{user.email}>")
            else:
                print(f"[=] Member already exists: {user.full_name} <{user.email}>")
            member_users.append(user)

        # --- Workspace ---
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

        # --- Manager membership ---
        result = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == ws.id,
                WorkspaceMember.user_id == manager.id,
            )
        )
        if not result.scalars().first():
            db.add(WorkspaceMember(workspace_id=ws.id, user_id=manager.id, role=Role.manager))
            await db.commit()

        # --- Member memberships ---
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

        print("\n✅ Done!\n")
        print(f"Workspace : {WORKSPACE_NAME}")
        print(f"{'─'*65}")
        print(f"{'Role':<10} {'Full Name':<18} {'Email':<35} {'Password'}")
        print(f"{'─'*65}")
        print(f"{'MANAGER':<10} {MANAGER['full_name']:<18} {MANAGER['email']:<35} {MANAGER['password']}")
        for m in MEMBERS:
            print(f"{'member':<10} {m['full_name']:<18} {m['email']:<35} {MEMBER_PASSWORD}")
        print(f"{'─'*65}")


if __name__ == "__main__":
    asyncio.run(main())
