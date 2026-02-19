import asyncio
from sqlalchemy import select
from backend.db.database import AsyncSessionLocal
from backend.db.models import Meeting

async def list_meetings():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Meeting))
        meetings = result.scalars().all()
        print(f"Found {len(meetings)} meetings:")
        for m in meetings:
            print(f"- ID: {m.id} | Title: {m.title} | Status: {m.status}")

if __name__ == "__main__":
    asyncio.run(list_meetings())
