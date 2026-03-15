import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
MEDIA_DIR = BASE_DIR / "media"

os.environ.setdefault("MEDIA_ROOT", str(MEDIA_DIR))
os.environ.setdefault("AUDIO_BASE_DIR", str(MEDIA_DIR))
