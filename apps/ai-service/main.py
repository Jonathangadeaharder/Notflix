import os
import sys
import asyncio
import logging
import shlex
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, List

import json
import structlog
import torch
import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request, Security
from fastapi.responses import JSONResponse
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel, field_validator
from sse_starlette.sse import EventSourceResponse
from core.filter import SpacyFilter
from core.models import Segment, TokenAnalysis
from core.transcriber import WhisperTranscriber
from core.translator import OpusTranslator

# Silence TensorFlow oneDNN warnings
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"


def get_default_media_root() -> Path:
    """Prefer Docker path, then local repo media path for development."""
    docker_media = Path("/app/media")
    if docker_media.exists():
        return docker_media
    repo_media = Path(__file__).resolve().parents[2] / "media"
    return repo_media


def get_media_root() -> Path:
    """Resolve the shared media root from environment."""
    configured = os.environ.get("MEDIA_ROOT")
    if configured:
        return Path(configured).resolve()
    return get_default_media_root().resolve()


def get_audio_base_dir() -> Path:
    """Resolve the current transcribe base directory from environment."""
    configured = os.environ.get("AUDIO_BASE_DIR")
    if configured:
        return Path(configured).resolve()
    return get_media_root()


# --- Security ---
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


def get_api_key(
    api_key_header_val: str = Security(api_key_header),
):
    expected_api_key = os.getenv("AI_SERVICE_API_KEY")
    if not expected_api_key:
        return None

    if api_key_header_val == expected_api_key:
        return api_key_header_val

    raise HTTPException(
        status_code=403,
        detail="Could not validate API Key",
    )


# --- Logging ---
LOGS_DIR = Path(os.getenv("LOGS_DIR", "logs")).resolve()
LOGS_DIR.mkdir(exist_ok=True, parents=True)

logging.root.handlers = []


def rename_event_to_message(logger, method_name, event_dict):
    if "event" in event_dict:
        event_dict["message"] = event_dict.pop("event")
    return event_dict


structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,  # Added for Request ID
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        rename_event_to_message,
        structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

std_logger = logging.getLogger()
std_logger.setLevel(logging.INFO)
std_logger.addHandler(logging.StreamHandler(sys.stdout))
std_logger.addHandler(logging.FileHandler(LOGS_DIR / "ai-service.log"))

logger = structlog.get_logger()

class EndpointFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return record.args and len(record.args) >= 3 and record.args[2] != "/health"

logging.getLogger("uvicorn.access").addFilter(EndpointFilter())


# --- State ---
brain_state = {
    "transcriber": None,
    "filter": None,
    "translator": None,
}


# --- Dependencies ---
def get_transcriber():
    return brain_state["transcriber"]


def get_filter():
    return brain_state["filter"]


def get_translator():
    return brain_state["translator"]


TranscriberDep = Annotated[WhisperTranscriber, Depends(get_transcriber)]
FilterDep = Annotated[SpacyFilter, Depends(get_filter)]
TranslatorDep = Annotated[OpusTranslator, Depends(get_translator)]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("startup_models_loading")
    if os.getenv("AI_SERVICE_TEST_MODE") == "1":
        brain_state["transcriber"] = WhisperTranscriber(model_size="tiny", device="cpu")
        brain_state["filter"] = SpacyFilter()
        brain_state["translator"] = OpusTranslator(device="cpu")
    else:
        brain_state["transcriber"] = WhisperTranscriber(model_size="tiny")
        brain_state["filter"] = SpacyFilter()
        brain_state["translator"] = OpusTranslator()
    logger.info("startup_models_loaded")
    print("[AI Service] Models loaded. Ready to accept requests.", flush=True)
    yield
    logger.info("shutdown_cleanup")


# --- App ---
_secured = [Depends(get_api_key)]

app = FastAPI(
    title="AI Service",
    version="1.0.0",
    description=(
        "Stateless AI worker for transcription, translation and linguistic analysis."
    ),
    lifespan=lifespan,
    servers=[
        {"url": "http://ai-service:8000", "description": "Internal Docker Network"}
    ],
    openapi_tags=[
        {
            "name": "AI",
            "description": "AI-powered linguistic services (Whisper, SpaCy, MarianMT).",
        },
        {"name": "Media", "description": "Media processing services (FFmpeg)."},
        {"name": "System", "description": "Infrastructure and health check endpoints."},
    ],
)


# --- Middleware ---
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("global_error", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal AI Service Error", "message": str(exc)},
    )


# --- Models ---
class ThumbnailRequest(BaseModel):
    file_path: str

    @field_validator("file_path")
    @classmethod
    def path_must_be_safe(cls, v: str) -> str:
        return str(resolve_candidate_path(v, get_media_root()))


class ThumbnailResponse(BaseModel):
    thumbnail_path: str


class TranscriptionRequest(BaseModel):
    file_path: str
    language: str = "es"

    @field_validator("file_path")
    @classmethod
    def path_must_be_safe(cls, v: str) -> str:
        # Route-level logic applies strict path policy and canonicalization.
        # Keep model-level validation lightweight to avoid duplicate/conflicting checks.
        if not v or not str(v).strip():
            raise ValueError("Empty file path")
        return str(v)


class TranscriptionResponse(BaseModel):
    segments: List[Segment]
    language: str
    language_probability: float


class TranslationRequest(BaseModel):
    texts: List[str]
    source_lang: str = "es"
    # Added fallback logic in core/translator.py handles pair validity,
    # but here we allow "es", "en" etc.
    target_lang: str = "en"


class TranslationResponse(BaseModel):
    translations: List[str]


class FilterRequest(BaseModel):
    texts: List[str]
    language: str = "es"


class FilterResponse(BaseModel):
    results: List[List[TokenAnalysis]]


# --- Endpoints ---


@app.post(
    "/generate_thumbnail",
    response_model=ThumbnailResponse,
    tags=["Media"],
    description="Generates a thumbnail from a video file using FFmpeg.",
    dependencies=_secured,
)
async def generate_thumbnail(req: ThumbnailRequest):
    logger.info(
        "request_received", endpoint="/generate_thumbnail", file_path=req.file_path
    )

    # Manual check for 500
    if not os.path.exists(req.file_path):
        logger.error("file_not_found_system_error", path=req.file_path)
        raise HTTPException(
            status_code=500, detail=f"File not found on disk: {req.file_path}"
        )

    base, _ = os.path.splitext(req.file_path)
    thumb_path = f"{base}.jpg"

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        req.file_path,
        "-ss",
        "00:00:01",
        "-vframes",
        "1",
        thumb_path,
    ]
    logger.info("running_ffmpeg_async", command=shlex.join(cmd))

    # Async execution to prevent event loop blocking
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        _stdout, stderr = await process.communicate()

        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown ffmpeg error"
            raise RuntimeError(f"ffmpeg failed: {error_msg}")

    except Exception as e:
        logger.error("ffmpeg_execution_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e)) from e

    return ThumbnailResponse(thumbnail_path=thumb_path)


@app.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    tags=["AI"],
    description="Transcribes an audio file using Faster-Whisper.",
    dependencies=_secured,
)
def transcribe(req: TranscriptionRequest, transcriber: TranscriberDep):
    logger.info("request_received", endpoint="/transcribe", file_path=req.file_path)

    # Validate and normalize the requested file path to prevent directory traversal.
    try:
        candidate_path = resolve_candidate_audio_path(
            req.file_path, get_audio_base_dir()
        )
    except ValueError as e:
        reason = classify_path_error(e)
        logger.error(
            "invalid_file_path", path=req.file_path, reason=reason, error=str(e)
        )

        raise HTTPException(status_code=400, detail="Invalid file path.") from e
    except (TypeError, OSError) as e:
        logger.error(
            "invalid_file_path",
            path=req.file_path,
            reason="filesystem_error",
            error=str(e),
        )
        raise HTTPException(status_code=400, detail="Invalid file path.") from e

    # Manual check for 500
    if not os.path.exists(candidate_path):
        logger.error("file_not_found_system_error", path=str(candidate_path))
        raise HTTPException(
            status_code=500, detail=f"File not found on disk: {candidate_path}"
        )

    result = transcriber.transcribe(str(candidate_path), req.language)
    return TranscriptionResponse(
        segments=result.segments,
        language=result.language,
        language_probability=result.language_probability,
    )


@app.post(
    "/transcribe/stream",
    tags=["AI"],
    description="Streams transcription progress via SSE. Yields info then segment events.",
    dependencies=_secured,
)
async def transcribe_stream(req: TranscriptionRequest, transcriber: TranscriberDep):
    logger.info(
        "request_received", endpoint="/transcribe/stream", file_path=req.file_path
    )

    try:
        candidate_path = resolve_candidate_audio_path(
            req.file_path, get_audio_base_dir()
        )
    except ValueError as e:
        reason = classify_path_error(e)
        logger.error(
            "invalid_file_path", path=req.file_path, reason=reason, error=str(e)
        )
        raise HTTPException(status_code=400, detail="Invalid file path.") from e
    except (TypeError, OSError) as e:
        logger.error(
            "invalid_file_path",
            path=req.file_path,
            reason="filesystem_error",
            error=str(e),
        )
        raise HTTPException(status_code=400, detail="Invalid file path.") from e

    if not os.path.exists(candidate_path):
        logger.error("file_not_found_system_error", path=str(candidate_path))
        raise HTTPException(
            status_code=500, detail=f"File not found on disk: {candidate_path}"
        )

    async def event_generator():
        loop = asyncio.get_running_loop()
        gen = transcriber.transcribe_stream(str(candidate_path), req.language)
        _done = object()
        try:
            while True:
                # Use next(gen, _done) to avoid StopIteration leaking into the
                # asyncio Future, where Python converts it to RuntimeError
                item = await loop.run_in_executor(None, next, gen, _done)
                if item is _done:
                    break
                event_type = item.get("type", "segment")
                yield {"event": event_type, "data": json.dumps(item)}
        finally:
            close = getattr(gen, "close", None)
            if callable(close):
                try:
                    close()
                except ValueError:
                    pass

    return EventSourceResponse(event_generator())


@app.post(
    "/translate",
    response_model=TranslationResponse,
    tags=["AI"],
    description="Translates a batch of texts using MarianMT models.",
    dependencies=_secured,
)
def translate(req: TranslationRequest, translator: TranslatorDep):
    # Translator logic handles missing models with error logs now
    translations = translator.translate(req.texts, req.source_lang, req.target_lang)
    return TranslationResponse(translations=translations)


@app.post(
    "/filter",
    response_model=FilterResponse,
    tags=["AI"],
    description="Analyzes a batch of texts using SpaCy for linguistic filtering.",
    dependencies=_secured,
)
def filter_text(req: FilterRequest, text_filter: FilterDep):
    results = text_filter.analyze_batch(req.texts, req.language)
    return FilterResponse(results=results)


@app.get("/health", tags=["System"], description="Health check endpoint.")
async def health():
    return {"status": "ai_service_active", "gpu": torch.cuda.is_available()}


def resolve_candidate_path(raw_path: str, allowed_root: Path) -> Path:
    if not raw_path or not str(raw_path).strip():
        raise ValueError("Empty file path")
    if "\x00" in str(raw_path):
        raise ValueError("Invalid file path")

    base_path = os.path.abspath(str(allowed_root))
    user_path = str(raw_path)

    if os.path.isabs(user_path):
        fullpath = os.path.normpath(user_path)
    else:
        fullpath = os.path.normpath(os.path.join(base_path, user_path))

    if not fullpath.startswith(base_path):
        raise ValueError("Path traversal detected")

    return Path(fullpath)


def resolve_candidate_audio_path(raw_path: str, audio_base_dir: Path) -> Path:
    return resolve_candidate_path(raw_path, audio_base_dir)


def classify_path_error(error: Exception) -> str:
    error_msg = str(error).lower()
    if "empty" in error_msg:
        return "empty_path"
    if "absolute" in error_msg:
        return "absolute_path"
    return "path_traversal"


if __name__ == "__main__":
    host = os.getenv("UVICORN_HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=8000)
