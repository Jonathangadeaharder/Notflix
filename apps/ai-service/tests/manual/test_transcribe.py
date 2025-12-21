import requests
import json
import os

url = "http://localhost:8000/transcribe"
# Use absolute path relative to project root
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "../../../.."))
file_path = os.path.join(project_root, "media", "test_audio.mp3")

payload = {
    "file_path": file_path
}
response = requests.post(url, json=payload, timeout=60)
print(json.dumps(response.json(), indent=2))
