import requests
import json

url = "http://localhost:8000/translate"
payload = {
    "texts": ["Hallo Welt", "Wie geht es dir?"],
    "source_lang": "de",
    "target_lang": "en"
}
response = requests.post(url, json=payload, timeout=30)
print(json.dumps(response.json(), indent=2))
