from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ai_service_active"

def test_transcribe_missing_file():
    # Test validation
    response = client.post("/transcribe", json={"file_path": "non_existent.mp3"})
    assert response.status_code == 422 # Pydantic validation error for missing path
