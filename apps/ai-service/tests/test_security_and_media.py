from contextlib import asynccontextmanager

import pytest
from fastapi.testclient import TestClient

import main


@asynccontextmanager
async def noop_lifespan(_app):
    yield


@pytest.fixture
def test_app():
    original = main.app.router.lifespan_context
    main.app.router.lifespan_context = noop_lifespan
    main.app.dependency_overrides = {}
    try:
        yield main.app
    finally:
        main.app.router.lifespan_context = original
        main.app.dependency_overrides = {}


@pytest.fixture
def client(test_app, monkeypatch):
    monkeypatch.setenv("AI_SERVICE_API_KEY", "test_key")
    with TestClient(test_app) as test_client:
        yield test_client


def test_requires_api_key(client):
    response = client.get("/health")
    assert response.status_code == 403

    response = client.get("/health", headers={"X-API-Key": "test_key"})
    assert response.status_code == 200
    assert "X-Request-ID" in response.headers


def test_generate_thumbnail_path_traversal_blocked(client, monkeypatch, tmp_path):
    media_root = tmp_path / "media"
    media_root.mkdir()
    monkeypatch.setenv("MEDIA_ROOT", str(media_root))

    response = client.post(
        "/generate_thumbnail",
        headers={"X-API-Key": "test_key"},
        json={"file_path": str(tmp_path / "outside.mp4")}
    )

    assert response.status_code == 422


def test_generate_thumbnail_missing_file_returns_500(client, monkeypatch, tmp_path):
    media_root = tmp_path / "media"
    media_root.mkdir()
    missing_file = media_root / "missing.mp4"
    monkeypatch.setenv("MEDIA_ROOT", str(media_root))

    response = client.post(
        "/generate_thumbnail",
        headers={"X-API-Key": "test_key"},
        json={"file_path": str(missing_file)}
    )

    assert response.status_code == 500


def test_generate_thumbnail_success(client, monkeypatch, tmp_path):
    class DummyProcess:
        returncode = 0

        async def communicate(self):
            return b"", b""

    async def fake_create_subprocess_exec(*_args, **_kwargs):
        return DummyProcess()

    media_root = tmp_path / "media"
    media_root.mkdir()
    video_path = media_root / "sample.mp4"
    video_path.write_bytes(b"fake")
    monkeypatch.setenv("MEDIA_ROOT", str(media_root))
    monkeypatch.setattr(main.asyncio, "create_subprocess_exec", fake_create_subprocess_exec)

    response = client.post(
        "/generate_thumbnail",
        headers={"X-API-Key": "test_key"},
        json={"file_path": str(video_path)}
    )

    assert response.status_code == 200
    assert response.json()["thumbnail_path"].endswith(".jpg")


def test_translate_and_filter_with_mocks(client):
    class DummyTranslator:
        def translate(self, texts, _source, _target):
            return [f"{text}-ok" for text in texts]

    class DummyFilter:
        def analyze_batch(self, texts, _language):
            return [[{"text": text, "lemma": text, "pos": "NOUN", "is_stop": False}] for text in texts]

    main.brain_state.translator = DummyTranslator()
    main.brain_state.filter = DummyFilter()

    translate_response = client.post(
        "/translate",
        headers={"X-API-Key": "test_key"},
        json={"texts": ["hola"], "source_lang": "es", "target_lang": "en"}
    )
    assert translate_response.status_code == 200
    assert translate_response.json()["translations"] == ["hola-ok"]

    filter_response = client.post(
        "/filter",
        headers={"X-API-Key": "test_key"},
        json={"texts": ["hola"], "language": "es"}
    )
    assert filter_response.status_code == 200
    assert filter_response.json()["results"][0][0]["lemma"] == "hola"
