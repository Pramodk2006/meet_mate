from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.api.routers import workspaces, meetings, chat, tasks
from backend.api.routers import auth as auth_router
from backend.db.database import engine, Base, AsyncSessionLocal
from backend.services.seeder import seed_demo_users, seed_demo_workspace

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://meetmate.vercel.app", "https://meetmate-ai.vercel.app"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed demo users and workspace
    async with AsyncSessionLocal() as db:
        users = await seed_demo_users(db)
        await seed_demo_workspace(db, users)


# Routers
app.include_router(auth_router.router, prefix="/api/v1/auth",       tags=["auth"])
app.include_router(workspaces.router, prefix="/api/v1/workspaces",  tags=["workspaces"])
app.include_router(meetings.router,   prefix="/api/v1/meetings",    tags=["meetings"])
app.include_router(chat.router,       prefix="/api/v1/chat",        tags=["chat"])
app.include_router(tasks.router,      prefix="/api/v1/tasks",       tags=["tasks"])
from backend.api.routers import export
app.include_router(export.router,     prefix="/api/v1/export",      tags=["export"])


@app.get("/health")
def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME}
