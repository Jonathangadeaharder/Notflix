import json
import os
import requests

base_url = os.getenv("AI_SERVICE_URL", "http://localhost:8000")
url = f"{base_url}/transcribe"
# Use absolute path relative to project root
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "../../../.."))
file_path = os.path.join(project_root, "media", "test_audio.mp3")

payload = {
    "file_path": file_path
}
response = requests.post(url, json=payload, timeout=180)
print(json.dumps(response.json(), indent=2))
