import asyncio
import asyncpg
from backend.core.config import settings

async def create_database():
    # Connect to default 'postgres' database to create new db
    # Construct DSN manually to override DB name
    sys_dsn = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/postgres"
    
    try:
        conn = await asyncpg.connect(sys_dsn)
        # Check if database exists
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", settings.POSTGRES_DB)
        
        if not exists:
            print(f"Creating database '{settings.POSTGRES_DB}'...")
            await conn.execute(f'CREATE DATABASE "{settings.POSTGRES_DB}"')
            print("Database created successfully!")
        else:
            print(f"Database '{settings.POSTGRES_DB}' already exists.")
            
        await conn.close()
    except Exception as e:
        print(f"Error creating database: {e}")

if __name__ == "__main__":
    asyncio.run(create_database())
