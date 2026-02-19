import asyncio
import traceback
from sqlalchemy import select
from backend.db.database import AsyncSessionLocal
from backend.db.models import Meeting
from backend.services.llm_extractor import process_meeting_transcript 

async def debug_latest_meeting():
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Meeting).order_by(Meeting.created_at.desc()).limit(1))
            meeting = result.scalars().first()
            
            if not meeting:
                print("DEBUG: No meetings found.")
                return

            print(f"DEBUG: Found Meeting ID: {meeting.id}")
            print(f"DEBUG: Status: {meeting.status}")
            print(f"DEBUG: Transcript Length: {len(meeting.raw_transcript)}")
            
            # Now call the function we want to debug
            print("DEBUG: Calling process_meeting_transcript...")
            await process_meeting_transcript(meeting.id, meeting.raw_transcript)
            print("DEBUG: Function returned.")
            
            # Check status again
            await db.refresh(meeting)
            print(f"DEBUG: New Status: {meeting.status}")

    except Exception:
        print("DEBUG: Crash in debug script wrapper:")
        traceback.print_exc()

if __name__ == "__main__":
    # Ensure logging prints to console
    import logging
    logging.getLogger("backend").setLevel(logging.DEBUG)
    logging.getLogger("backend.services.llm_extractor").addHandler(logging.StreamHandler())
    
    asyncio.run(debug_latest_meeting())
