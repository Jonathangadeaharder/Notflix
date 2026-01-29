import json
import os
import requests

base_url = os.getenv("AI_SERVICE_URL", "http://localhost:8000")
url = f"{base_url}/translate"
payload = {
    "texts": ["Hallo Welt", "Wie geht es dir?"],
    "source_lang": "de",
    "target_lang": "en"
}
response = requests.post(url, json=payload, timeout=180)
print(json.dumps(response.json(), indent=2))
