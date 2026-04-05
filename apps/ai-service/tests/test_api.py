from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

headers = {"X-API-Key": "dev_secret_key"}


def test_health():
    response = client.get("/health", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "ai_service_active"


def test_transcribe_missing_file():
    # Test validation
    response = client.post(
        "/transcribe",
        json={"file_path": "non_existent.mp3", "language": "en"},
        headers=headers,
    )
    assert response.status_code in [400, 500]
