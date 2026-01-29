import pytest
from pathlib import Path
import os
from fastapi.testclient import TestClient
from main import app
from core.transcriber import WhisperTranscriber
from core.filter import SpacyFilter

# Assets
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
MEDIA_DIR = BASE_DIR / "media"
AUDIO_FILE = MEDIA_DIR / "test_audio.mp3"
os.environ.setdefault("MEDIA_ROOT", str(MEDIA_DIR))

@pytest.mark.skipif(not AUDIO_FILE.exists(), reason="Test audio file not found")
def test_transcriber_real():
    """Integration test using real Whisper model (tiny) on CPU."""
    # Use tiny model for speed
    transcriber = WhisperTranscriber(model_size="tiny", device="cpu")
    result = transcriber.transcribe(str(AUDIO_FILE))
    
    assert result is not None
    assert len(result.segments) > 0
    # Basic sanity check on content if known, or just structure
    assert result.language is not None

@pytest.mark.skipif(not AUDIO_FILE.exists(), reason="Test audio file not found")
def test_api_transcribe_with_real_file():
    """Integration test for /transcribe endpoint with real file."""
    with TestClient(app) as client:
        # Service expects a path to a file on disk (shared volume pattern)
        response = client.post("/transcribe", json={"file_path": str(AUDIO_FILE)})
    
    assert response.status_code == 200
    data = response.json()
    assert "segments" in data
    assert len(data["segments"]) > 0

def test_spacy_filter_real():
    """Integration test for SpacyFilter with real model."""
    # SpacyFilter loads en_core_web_sm by default/configured
    spacy_filter = SpacyFilter()
    text = "The quick brown fox jumps over the lazy dog."
    analysis = spacy_filter.analyze(text, language="en")
    
    assert len(analysis) > 0
    if os.getenv("AI_SERVICE_TEST_MODE") != "1":
        assert analysis[0].lemma == "the" # roughly check lemma
