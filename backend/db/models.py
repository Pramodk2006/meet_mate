from datetime import datetime, date
from uuid import uuid4, UUID
from typing import List, Optional, Any
from enum import Enum as PyEnum

from sqlalchemy import String, ForeignKey, DateTime, Text, Date, Boolean, JSON, Enum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.database import Base

# Enums
class Role(str, PyEnum):
    manager = "manager"
    member = "member"

class MeetingStatus(str, PyEnum):
    processing = "processing"
    completed = "completed"
    failed = "failed"

class TaskStatus(str, PyEnum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"

class TaskPriority(str, PyEnum):
    low = "low"
    medium = "medium"
    high = "high"

# Models
class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    owned_workspaces: Mapped[List["Workspace"]] = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")
    memberships: Mapped[List["WorkspaceMember"]] = relationship("WorkspaceMember", back_populates="user", cascade="all, delete-orphan")
    assigned_tasks: Mapped[List["Task"]] = relationship("Task", back_populates="assigned_to")

class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="owned_workspaces")
    members: Mapped[List["WorkspaceMember"]] = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    meetings: Mapped[List["Meeting"]] = relationship("Meeting", back_populates="workspace", cascade="all, delete-orphan")

class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.member)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="memberships")

class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    meeting_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    raw_transcript: Mapped[str] = mapped_column(Text, nullable=False)

    # AI Outputs
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_key_points: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    status: Mapped[MeetingStatus] = mapped_column(Enum(MeetingStatus), default=MeetingStatus.processing)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="meetings")
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="meeting", cascade="all, delete-orphan")
    embeddings: Mapped[List["MeetingEmbedding"]] = relationship("MeetingEmbedding", back_populates="meeting", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    meeting_id: Mapped[UUID] = mapped_column(ForeignKey("meetings.id"), nullable=False)
    assigned_to_user_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)

    # Fallback name if user not in system
    raw_assignee_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    description: Mapped[str] = mapped_column(Text, nullable=False)
    deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.pending)
    priority: Mapped[TaskPriority] = mapped_column(Enum(TaskPriority), default=TaskPriority.medium)
    external_ticket_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Relationships
    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="tasks")
    assigned_to: Mapped[Optional["User"]] = relationship("User", back_populates="assigned_tasks")

class MeetingEmbedding(Base):
    __tablename__ = "meeting_embeddings"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    meeting_id: Mapped[UUID] = mapped_column(ForeignKey("meetings.id"), nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)

    # Fallback to JSON storage since pgvector extension is not available
    embedding: Mapped[List[float]] = mapped_column(JSON)

    # Relationships
    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="embeddings")
