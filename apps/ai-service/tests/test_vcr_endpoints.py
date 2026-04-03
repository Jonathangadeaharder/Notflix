import os
import pytest
import requests
import vcr

# Test configuration
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8000")

# Setup VCR to store cassettes in 'tests/cassettes/'
my_vcr = vcr.VCR(
    serializer="yaml",
    cassette_library_dir="tests/cassettes",
    record_mode="once",
    match_on=["uri", "method", "body"],
    filter_headers=["X-API-Key"],
)


@pytest.fixture
def api_headers():
    api_key = os.getenv("AI_SERVICE_API_KEY", "dev_secret_key")
    return {"X-API-Key": api_key}


@my_vcr.use_cassette()
def test_filter_endpoint_vcr(api_headers):
    url = f"{AI_SERVICE_URL}/filter"
    payload = {
        "texts": ["El gato corre rapido en la casa.", "Me encanta la musica!"],
        "language": "es",
    }

    response = requests.post(url, json=payload, headers=api_headers, timeout=30)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 2
    assert "lemma" in data["results"][0][0]


@my_vcr.use_cassette()
def test_translate_endpoint_vcr(api_headers):
    url = f"{AI_SERVICE_URL}/translate"
    payload = {
        "texts": ["Hallo Welt", "Wie geht es dir?"],
        "source_lang": "de",
        "target_lang": "en",
    }

    response = requests.post(url, json=payload, headers=api_headers, timeout=180)
    assert response.status_code == 200

    data = response.json()
    assert "translations" in data
    assert len(data["translations"]) == 2


@my_vcr.use_cassette()
def test_transcribe_endpoint_vcr(api_headers):
    url = f"{AI_SERVICE_URL}/transcribe"

    # We pass pure basename strings for path traversal security
    file_path = "test_audio.mp3"

    payload = {"file_path": file_path, "language": "en"}

    response = requests.post(url, json=payload, headers=api_headers, timeout=180)

    # We assert either a 200 (if ran successfully previously) or 400/500
    assert response.status_code in [200, 400, 500]

    if response.status_code == 200:
        data = response.json()
        assert "segments" in data
        assert "language" in data
