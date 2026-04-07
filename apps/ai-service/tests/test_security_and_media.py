from contextlib import asynccontextmanager
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

import main


@asynccontextmanager
async def noop_lifespan(_app):
    yield


@pytest.fixture(name="app_fixture")
def _app_fixture():
    original = main.app.router.lifespan_context
    main.app.router.lifespan_context = noop_lifespan
    main.app.dependency_overrides = {}
    try:
        yield main.app
    finally:
        main.app.router.lifespan_context = original
        main.app.dependency_overrides = {}


@pytest.fixture(name="api_client")
def _api_client(app_fixture, monkeypatch):
    monkeypatch.setenv("AI_SERVICE_API_KEY", "test_key")
    with TestClient(app_fixture) as test_client:
        yield test_client


def test_requires_api_key(api_client):
    response = api_client.post(
        "/filter",
        json={"texts": ["hello"], "language": "en"},
    )
    assert response.status_code == 403

    response = api_client.get("/health")
    assert response.status_code == 200
    assert "X-Request-ID" in response.headers


def test_generate_thumbnail_path_traversal_blocked(api_client, monkeypatch, tmp_path):
    media_root = tmp_path / "media"
    media_root.mkdir()
    monkeypatch.setenv("MEDIA_ROOT", str(media_root))

    response = api_client.post(
        "/generate_thumbnail",
        headers={"X-API-Key": "test_key"},
        json={"file_path": str(tmp_path / "outside.mp4")},
    )

    assert response.status_code == 422


def test_generate_thumbnail_missing_file_returns_500(api_client, monkeypatch, tmp_path):
    media_root = tmp_path / "media"
    media_root.mkdir()
    missing_file = media_root / "missing.mp4"
    monkeypatch.setenv("MEDIA_ROOT", str(media_root))

    response = api_client.post(
        "/generate_thumbnail",
        headers={"X-API-Key": "test_key"},
        json={"file_path": str(missing_file)},
    )

    assert response.status_code == 500


def test_generate_thumbnail_success(api_client, monkeypatch, tmp_path):
    async def fake_communicate():
        return b"", b""

    async def fake_create_subprocess_exec(*_args, **_kwargs):
        process = MagicMock()
        process.returncode = 0
        process.communicate = fake_communicate
        return process

    media_root = tmp_path / "media"
    media_root.mkdir()
    video_path = media_root / "sample.mp4"
    video_path.write_bytes(b"fake")
    monkeypatch.setenv("MEDIA_ROOT", str(media_root))
    monkeypatch.setattr(
        main.asyncio, "create_subprocess_exec", fake_create_subprocess_exec
    )

    response = api_client.post(
        "/generate_thumbnail",
        headers={"X-API-Key": "test_key"},
        json={"file_path": str(video_path)},
    )

    assert response.status_code == 200
    assert response.json()["thumbnail_path"].endswith(".jpg")


def test_generate_thumbnail_relative_media_path_success(
    api_client, monkeypatch, tmp_path
):
    async def fake_communicate():
        return b"", b""

    async def fake_create_subprocess_exec(*_args, **_kwargs):
        process = MagicMock()
        process.returncode = 0
        process.communicate = fake_communicate
        return process

    media_root = tmp_path / "media"
    uploads_dir = media_root / "uploads"
    uploads_dir.mkdir(parents=True)
    video_path = uploads_dir / "sample.mp4"
    video_path.write_bytes(b"fake")
    monkeypatch.setenv("MEDIA_ROOT", str(media_root))
    monkeypatch.setattr(
        main.asyncio, "create_subprocess_exec", fake_create_subprocess_exec
    )

    response = api_client.post(
        "/generate_thumbnail",
        headers={"X-API-Key": "test_key"},
        json={"file_path": "uploads/sample.mp4"},
    )

    assert response.status_code == 200
    assert response.json()["thumbnail_path"] == str(uploads_dir / "sample.jpg")


def test_generate_thumbnail_relative_path_traversal_blocked(
    api_client, monkeypatch, tmp_path
):
    media_root = tmp_path / "media"
    media_root.mkdir()
    monkeypatch.setenv("MEDIA_ROOT", str(media_root))

    response = api_client.post(
        "/generate_thumbnail",
        headers={"X-API-Key": "test_key"},
        json={"file_path": "../outside.mp4"},
    )

    assert response.status_code == 422


def test_transcribe_relative_media_path_success(api_client, monkeypatch, tmp_path):
    media_root = tmp_path / "media"
    uploads_dir = media_root / "uploads"
    uploads_dir.mkdir(parents=True)
    audio_path = uploads_dir / "sample.mp3"
    audio_path.write_bytes(b"fake")
    monkeypatch.setenv("MEDIA_ROOT", str(media_root))
    monkeypatch.setenv("AUDIO_BASE_DIR", str(media_root))

    mock_transcriber = MagicMock()
    mock_transcriber.transcribe.return_value = MagicMock(
        segments=[{"start": 0.0, "end": 1.0, "text": "hola"}],
        language="es",
        language_probability=0.99,
    )
    main.app.dependency_overrides[main.get_transcriber] = lambda: mock_transcriber

    response = api_client.post(
        "/transcribe",
        headers={"X-API-Key": "test_key"},
        json={"file_path": "uploads/sample.mp3", "language": "es"},
    )

    assert response.status_code == 200
    mock_transcriber.transcribe.assert_called_once_with(str(audio_path), "es")
    assert response.json()["language"] == "es"


def test_transcribe_relative_path_traversal_blocked(api_client, monkeypatch, tmp_path):
    media_root = tmp_path / "media"
    media_root.mkdir()
    monkeypatch.setenv("MEDIA_ROOT", str(media_root))
    monkeypatch.setenv("AUDIO_BASE_DIR", str(media_root))

    response = api_client.post(
        "/transcribe",
        headers={"X-API-Key": "test_key"},
        json={"file_path": "../outside.mp3", "language": "es"},
    )

    assert response.status_code == 400


def test_translate_and_filter_with_mocks(api_client):
    translator = MagicMock()
    translator.translate.side_effect = lambda texts, _source, _target: [
        f"{text}-ok" for text in texts
    ]
    filter_service = MagicMock()
    filter_service.analyze_batch.side_effect = lambda texts, _language: [
        [
            {
                "text": text,
                "lemma": text,
                "pos": "NOUN",
                "is_stop": False,
                "whitespace": " ",
            }
        ]
        for text in texts
    ]
    main.app.dependency_overrides[main.get_translator] = lambda: translator
    main.app.dependency_overrides[main.get_filter] = lambda: filter_service

    translate_response = api_client.post(
        "/translate",
        headers={"X-API-Key": "test_key"},
        json={"texts": ["hola"], "source_lang": "es", "target_lang": "en"},
    )
    assert translate_response.status_code == 200
    assert translate_response.json()["translations"] == ["hola-ok"]

    filter_response = api_client.post(
        "/filter",
        headers={"X-API-Key": "test_key"},
        json={"texts": ["hola"], "language": "es"},
    )
    assert filter_response.status_code == 200
    assert filter_response.json()["results"][0][0]["lemma"] == "hola"
