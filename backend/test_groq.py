import asyncio
import os
from backend.core.config import settings
from groq import AsyncGroq
import json

async def test_groq():
    print(f"Checking Groq Key: {settings.GROQ_API_KEY[:10]}..." if settings.GROQ_API_KEY else "API Key NOT found!")

    if settings.GROQ_API_KEY:
        print("Testing Groq API...")
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        try:
            response = await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": "Return a JSON object with one key 'message' and value 'Hello JSON'"}],
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            print(f"Groq Response: {content}")
            json_data = json.loads(content)
            print("JSON Parsed Successfully!")
        except Exception as e:
            print(f"Groq API Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_groq())
