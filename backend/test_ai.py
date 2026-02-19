import asyncio
import os
from backend.core.config import settings
from anthropic import AsyncAnthropic
from backend.services.rag_pipeline import rag_pipeline

async def test_components():
    print(f"Checking API Key: {settings.CLAUDE_API_KEY[:10]}..." if settings.CLAUDE_API_KEY else "API Key NOT found!")

    if settings.CLAUDE_API_KEY:
        print("Testing Claude API...")
        client = AsyncAnthropic(api_key=settings.CLAUDE_API_KEY)
        try:
            response = await client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hello"}]
            )
            print(f"Claude Response: {response.content[0].text}")
        except Exception as e:
            print(f"Claude API Error: {e}")

    print("Testing RAG Pipeline (FastEmbed)...")
    try:
        chunks = ["This is a test chunk."]
        embeddings = list(rag_pipeline.generate_embeddings(chunks))
        print(f"Generated {len(embeddings)} embedding(s). Vector length: {len(embeddings[0])}")
    except Exception as e:
        print(f"RAG Pipeline Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_components())
