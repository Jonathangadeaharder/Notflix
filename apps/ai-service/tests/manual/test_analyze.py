import json
import os
import requests

base_url = os.getenv("AI_SERVICE_URL", "http://localhost:8000")
url = f"{base_url}/filter"
payload = {
    "texts": ["El gato corre rapido en la casa."],
    "language": "es"
}
response = requests.post(url, json=payload, timeout=30)
print(json.dumps(response.json(), indent=2))
