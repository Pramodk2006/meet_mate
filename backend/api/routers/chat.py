from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import List
from pgvector.sqlalchemy import Vector

from backend.db.database import get_db
from backend.db.models import Meeting, MeetingEmbedding
from backend.schemas.pydantic_models import ChatRequest, ChatResponse
from backend.services.rag_pipeline import get_rag_pipeline
from backend.core.config import settings

from anthropic import AsyncAnthropic

router = APIRouter()

@router.post("/{meeting_id}", response_model=ChatResponse)
async def chat_with_meeting(
    meeting_id: UUID,
    chat_request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Check if meeting exists
    meeting_result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = meeting_result.scalars().first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not settings.GROQ_API_KEY:
         raise HTTPException(status_code=500, detail="LLM API Key (Groq) not configured")

    # 2. Embed the question
    # generate_embeddings expects a list, returns a generator
    rag_pipeline = get_rag_pipeline()
    question_embedding_gen = rag_pipeline.generate_embeddings([chat_request.question])
    question_embedding = list(question_embedding_gen)[0]
    question_embedding_list = [float(x) for x in question_embedding]

    # 3. Vector Search (Manual Cosine Similarity)
    # Since pgvector is not available, we fetch all embeddings and calculate similarity in Python
    # This is fine for a small MVP prototype
    result = await db.execute(select(MeetingEmbedding).where(MeetingEmbedding.meeting_id == meeting_id))
    all_chunks = result.scalars().all()
    
    import numpy as np
    
    def cosine_similarity(a, b):
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    scored_chunks = []
    for chunk in all_chunks:
        # chunk.embedding is now a list of floats (JSON)
        score = cosine_similarity(question_embedding_list, chunk.embedding)
        scored_chunks.append((score, chunk))
    
    # Sort by score descending (highest similarity first)
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    
    top_chunks = [chunk for score, chunk in scored_chunks[:3]]
    
    # 4. Construct Context
    context_text = "\n\n".join([chunk.chunk_text for chunk in top_chunks])
    
    # 5. Generate Answer with Groq (Llama 3 70B)
    from groq import AsyncGroq
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    
    system_prompt = "You are a helpful assistant answering questions about a meeting transcript based strictly on the provided context."
    user_prompt = f"""
    Context:
    {context_text}
    
    Question: 
    {chat_request.question}
    
    Answer concisely based on the context.
    """
    
    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=500
        )
        answer = response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Generation Failed: {str(e)}")

    return ChatResponse(
        answer=answer,
        sources=[chunk.chunk_text[:100] + "..." for chunk in top_chunks]
    )
