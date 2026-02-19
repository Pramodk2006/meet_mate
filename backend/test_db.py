import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from backend.core.config import settings
from backend.db.models import Base

async def test_setup():
    try:
        engine = create_async_engine(settings.async_database_url)
        print("Connecting...")
        async with engine.begin() as conn:
            print("Creating extension...")
            # Wrapping SQL in try/except to diagnose specifically
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            except Exception as e:
                with open("error_log.txt", "w") as f:
                    f.write(f"EXTENSION ERROR: {str(e)}")
                raise

            print("Creating tables...")
            try:
                await conn.run_sync(Base.metadata.create_all) 
            except Exception as e:
                with open("error_log.txt", "w") as f:
                    f.write(f"TABLE ERROR: {str(e)}")
                raise

        print("Setup successful!")
        
    except Exception as e:
        print(f"Overall failed: {e}")
        # Write generic error if not caught above
        with open("error_log.txt", "a") as f:
             f.write(f"\nOVERALL ERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_setup())
