import requests
import sys

WS_ID = "43505cd9-09ac-4913-ae8b-f08bd61b1d1a"
URL = f"http://localhost:8000/api/v1/meetings/{WS_ID}/upload?title=Test+Meeting"

transcript = """Alice: Good morning everyone. Let's get started.
Bob: Sure. I need to finish the API documentation by end of this week.
Alice: Great. Also, Charlie should set up the CI/CD pipeline by next Monday.
Charlie: Sure, I'll have it done.
Alice: Let's schedule a follow-up on Friday at 3pm."""

files = {"file": ("test.txt", transcript.encode(), "text/plain")}

try:
    resp = requests.post(URL, files=files)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.json()}")
except Exception as e:
    print(f"Error: {e}")
