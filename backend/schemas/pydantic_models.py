from datetime import datetime, date
from uuid import UUID
from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr, ConfigDict

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# --- Workspace Schemas ---
class WorkspaceCreate(BaseModel):
    name: str

class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    owner_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class WorkspaceMemberResponse(BaseModel):
    user_id: UUID
    role: str
    joined_at: datetime
    user: UserResponse
    model_config = ConfigDict(from_attributes=True)

class InviteMemberRequest(BaseModel):
    email: EmailStr

# --- Task Schemas ---
class TaskBase(BaseModel):
    description: str
    deadline: Optional[date] = None
    status: str = "pending"
    priority: str = "medium"
    raw_assignee_name: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    description: Optional[str] = None
    deadline: Optional[date] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_user_id: Optional[UUID] = None
    external_ticket_url: Optional[str] = None

class TaskResponse(TaskBase):
    id: UUID
    meeting_id: UUID
    assigned_to_user_id: Optional[UUID] = None
    external_ticket_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# --- Meeting Schemas ---
class MeetingResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    title: str
    meeting_date: datetime
    status: str
    ai_summary: Optional[str] = None
    ai_key_points: Optional[Any] = None
    created_at: datetime
    tasks: List[TaskResponse] = []
    model_config = ConfigDict(from_attributes=True)

# --- Chat Schemas ---
class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str
    sources: List[str]
