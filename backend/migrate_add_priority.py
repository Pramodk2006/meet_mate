import asyncio
from sqlalchemy import text
from backend.db.database import AsyncSessionLocal

async def migrate():
    async with AsyncSessionLocal() as db:
        try:
            # Add priority column to tasks
            await db.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR DEFAULT 'medium'"))
            await db.commit()
            print("Migration successful: priority column added to tasks")
        except Exception as e:
            await db.rollback()
            print(f"Migration note: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
