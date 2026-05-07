from uuid import UUID
import json
import logging
from datetime import datetime
from groq import AsyncGroq
from sqlalchemy import select

from backend.db.database import AsyncSessionLocal
from backend.db.models import Meeting, Task, MeetingStatus, MeetingEmbedding
from backend.core.config import settings
from backend.services.rag_pipeline import get_rag_pipeline

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def process_meeting_transcript(meeting_id: UUID, transcript_text: str):
    """
    Background task to process meeting transcript:
    1. Extract Summary, Key Points, Tasks using Claude.
    2. Generate Embeddings for RAG.
    3. Save everything to DB.
    """
    async with AsyncSessionLocal() as db:
        try:
            # Check for API Key
            if not settings.GROQ_API_KEY:
                logger.error("GROQ_API_KEY is not set. Skipping AI processing.")
                return

            client = AsyncGroq(api_key=settings.GROQ_API_KEY)

            # --- 1. Extraction via Groq (Llama 3 70B is good for this) ---
            prompt = f"""
            You are an expert meeting analyst. Parse the following meeting transcript.
            
            Transcript:
            \"\"\"{transcript_text}\"\"\"
            
            Return a valid JSON object ONLY, with the following schema:
            {{
                "ai_summary": "A concise executive summary (approx 3-5 sentences).",
                "ai_key_points": ["Key point 1", "Key point 2", ...],
                "tasks": [
                    {{
                        "description": "Action item description",
                        "assignee": "Name of assignee if mentioned, else null",
                        "deadline": "YYYY-MM-DD if mentioned, else null",
                        "priority": "high | medium | low based on urgency and importance"
                    }}
                ]
            }}
            
            Do not output any text before or after the JSON. The response must be raw JSON.
            """

            try:
                response = await client.chat.completions.create(
                    model="llama-3.3-70b-versatile", # Powerful & fast open model
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"}
                )
                
                content_text = response.choices[0].message.content
                extracted_data = json.loads(content_text.strip())
                
            except Exception as e:
                logger.error(f"Groq API Extraction Failed: {e}")
                import traceback
                traceback.print_exc()
                # Update status to failed
                stmt = select(Meeting).where(Meeting.id == meeting_id)
                result = await db.execute(stmt)
                meeting = result.scalars().first()
                if meeting:
                    meeting.status = MeetingStatus.failed
                    await db.commit()
                return

            # --- 2. Update DB with Extracted Data ---
            stmt = select(Meeting).where(Meeting.id == meeting_id)
            result = await db.execute(stmt)
            meeting = result.scalars().first()
            
            if meeting:
                meeting.ai_summary = extracted_data.get("ai_summary")
                meeting.ai_key_points = extracted_data.get("ai_key_points")
                meeting.status = MeetingStatus.completed
                
                # Add Tasks
                tasks = extracted_data.get("tasks", [])
                for task_item in tasks:
                    deadline_str = task_item.get("deadline")
                    deadline = None
                    if deadline_str:
                        try:
                            # Try parsing the ISO date format
                            deadline = datetime.strptime(deadline_str, "%Y-%m-%d").date()
                        except ValueError:
                            pass
                            
                    new_task = Task(
                        meeting_id=meeting.id,
                        description=task_item.get("description"),
                        raw_assignee_name=task_item.get("assignee"),
                        deadline=deadline,
                        status="pending",
                        priority=task_item.get("priority", "medium"),
                    )
                    db.add(new_task)
            
            # --- 3. RAG Embeddings ---
            rag_pipeline = get_rag_pipeline()
            chunks = rag_pipeline.chunk_text(transcript_text, chunk_size=300) 
            # generate_embeddings returns a generator
            embeddings_generator = rag_pipeline.generate_embeddings(chunks)
            embeddings_list = list(embeddings_generator)

            # Convert numpy arrays (if generic) to python lists
            for i, chunk_text in enumerate(chunks):
                if i < len(embeddings_list):
                    emb_vector = [float(x) for x in embeddings_list[i]]
                    new_emb = MeetingEmbedding(
                        meeting_id=meeting_id,
                        chunk_text=chunk_text,
                        embedding=emb_vector
                    )
                    db.add(new_emb)

            await db.commit()
            logger.info(f"Meeting {meeting_id} fully processed.")
            
        except Exception as e:
            logger.error(f"Error in background task: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()
