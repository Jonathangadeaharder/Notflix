import requests
import json

url = "http://localhost:8000/analyze"
payload = {
    "text": "El gato corre rápido en la casa.",
    "language": "es"
}
response = requests.post(url, json=payload, timeout=10)
print(json.dumps(response.json(), indent=2))
