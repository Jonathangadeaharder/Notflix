import asyncio
import uuid
import os
import shlex
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from typing import List, Annotated

from fastapi import FastAPI, HTTPException, Security, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel, field_validator
import uvicorn
import structlog
import torch

# Silence TensorFlow oneDNN warnings
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

# Base directory for audio files used by the transcribe endpoint.
# This constrains user-supplied paths to a safe root.
AUDIO_BASE_DIR = Path(os.environ.get("AUDIO_BASE_DIR", "/data/audio")).resolve()

from core.interfaces import Segment, TokenAnalysis, TranscriptionResult
from core.transcriber import WhisperTranscriber
from core.filter import SpacyFilter
from core.translator import OpusTranslator

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
    else:
        raise HTTPException(
            status_code=403,
            detail="Could not validate API Key",
        )

# --- Logging ---
LOGS_DIR = Path(os.getenv("LOGS_DIR", "logs")).resolve()
LOGS_DIR.mkdir(exist_ok=True, parents=True)

logging.root.handlers = []

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars, # Added for Request ID
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

std_logger = logging.getLogger()
std_logger.setLevel(logging.INFO)
std_logger.addHandler(logging.StreamHandler())
std_logger.addHandler(logging.FileHandler(LOGS_DIR / "ai-service.log"))

logger = structlog.get_logger()

# --- State ---
class BrainState:
    def __init__(self):
        self.transcriber: WhisperTranscriber | None = None
        self.filter: SpacyFilter | None = None
        self.translator: OpusTranslator | None = None

brain_state = BrainState()

# --- Dependencies ---
def get_transcriber():
    return brain_state.transcriber

def get_filter():
    return brain_state.filter

def get_translator():
    return brain_state.translator

TranscriberDep = Annotated[WhisperTranscriber, Depends(get_transcriber)]
FilterDep = Annotated[SpacyFilter, Depends(get_filter)]
TranslatorDep = Annotated[OpusTranslator, Depends(get_translator)]

@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("startup_models_loading")
    if os.getenv("AI_SERVICE_TEST_MODE") == "1":
        class DummyTranscriber:
            def transcribe(self, _file_path: str, language: str = "es"):
                return TranscriptionResult(
                    segments=[Segment(start=0, end=1, text="test")],
                    language=language,
                    language_probability=1.0
                )

        class DummyFilter:
            def analyze(self, text: str, _language: str):
                return [TokenAnalysis(text=text, lemma=text, pos="NOUN", is_stop=False)]

            def analyze_batch(self, texts: list[str], _language: str):
                return [[TokenAnalysis(text=t, lemma=t, pos="NOUN", is_stop=False)] for t in texts]

        class DummyTranslator:
            def translate(self, texts: list[str], _source_lang: str, _target_lang: str):
                return [text for text in texts]

        brain_state.transcriber = DummyTranscriber()
        brain_state.filter = DummyFilter()
        brain_state.translator = DummyTranslator()
    else:
        # Using 'base' model for better non-English performance as requested
        brain_state.transcriber = WhisperTranscriber(model_size="base")
        brain_state.filter = SpacyFilter()
        brain_state.translator = OpusTranslator()
    logger.info("startup_models_loaded")
    yield
    logger.info("shutdown_cleanup")

# --- App ---
app = FastAPI(
    title="AI Service", 
    version="1.0.0",
    description=(
        "Stateless AI worker for transcription, translation "
        "and linguistic analysis."
    ),
    dependencies=[Depends(get_api_key)],
    lifespan=lifespan,
    servers=[{
        "url": "http://ai-service:8000", 
        "description": "Internal Docker Network"
    }],
    openapi_tags=[
        {
            "name": "AI", 
            "description": "AI-powered linguistic services (Whisper, SpaCy, MarianMT)."
        },
        {
            "name": "Media", 
            "description": "Media processing services (FFmpeg)."
        },
        {
            "name": "System", 
            "description": "Infrastructure and health check endpoints."
        }
    ]
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

    @field_validator('file_path')
    @classmethod
    def path_must_be_safe(cls, v: str) -> str:
        # Security: Prevent path traversal
        media_root = Path(os.getenv("MEDIA_ROOT", "/app/media")).resolve()
        requested_path = Path(v).resolve()
        
        if not str(requested_path).startswith(str(media_root)):
             raise ValueError(f"Security: Path {v} is outside allowed media root {media_root}")
        
        # NOTE: Existence check moved to route logic to return 500 instead of 422
        return str(requested_path)

class ThumbnailResponse(BaseModel):
    thumbnail_path: str

class TranscriptionRequest(BaseModel):
    file_path: str
    language: str = "es"

    @field_validator('file_path')
    @classmethod
    def path_must_be_safe(cls, v: str) -> str:
        media_root = Path(os.getenv("MEDIA_ROOT", "/app/media")).resolve()
        requested_path = Path(v).resolve()
        
        if not str(requested_path).startswith(str(media_root)):
             raise ValueError(f"Security: Path {v} is outside allowed media root {media_root}")
        return str(requested_path)

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
    description="Generates a thumbnail from a video file using FFmpeg."
)
async def generate_thumbnail(req: ThumbnailRequest):
    logger.info(
        "request_received", 
        endpoint="/generate_thumbnail", 
        file_path=req.file_path
    )

    # Manual check for 500
    if not os.path.exists(req.file_path):
        logger.error("file_not_found_system_error", path=req.file_path)
        raise HTTPException(status_code=500, detail=f"File not found on disk: {req.file_path}")
    
    base, _ = os.path.splitext(req.file_path)
    thumb_path = f"{base}.jpg"
    
    cmd = [
        "ffmpeg", "-y", "-i", req.file_path, 
        "-ss", "00:00:01", "-vframes", "1", thumb_path
    ]
    logger.info("running_ffmpeg_async", command=shlex.join(cmd))
    
    # Async execution to prevent event loop blocking
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown ffmpeg error"
            raise Exception(f"ffmpeg failed: {error_msg}")
            
    except Exception as e:
        logger.error("ffmpeg_execution_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e)) from e

    return ThumbnailResponse(thumbnail_path=thumb_path)

@app.post(
    "/transcribe", 
    response_model=TranscriptionResponse, 
    tags=["AI"], 
    description="Transcribes an audio file using Faster-Whisper."
)
def transcribe(
    req: TranscriptionRequest,
    transcriber: TranscriberDep
):
    logger.info(
        "request_received", 
        endpoint="/transcribe", 
        file_path=req.file_path
    )

    # Validate and normalize the requested file path to prevent directory traversal.
    # We must sanitize user input before using it in any path operations.
    try:
        # Validate non-empty input
        if not req.file_path:
            logger.error("invalid_file_path", path=req.file_path, reason="empty_path")
            raise ValueError("Empty file path")

        # Work with a Path object for safer inspection of components
        input_path = Path(req.file_path)

        # Reject absolute paths
        if input_path.is_absolute():
            logger.error("invalid_file_path", path=req.file_path, reason="absolute_path")
            raise ValueError("Absolute paths not allowed")

        # Only allow simple filenames, no directory components or traversal segments.
        # This ensures the user cannot influence directory structure under AUDIO_BASE_DIR.
        if input_path.name != req.file_path:
            logger.error("invalid_file_path", path=req.file_path, reason="invalid_components")
            raise ValueError("Only simple filenames are allowed")

        # Construct the full path using the sanitized filename and resolve it
        candidate_path = (AUDIO_BASE_DIR / input_path.name).resolve()

        # Final verification: ensure the resolved path is within AUDIO_BASE_DIR
        # This will raise ValueError if the path escapes AUDIO_BASE_DIR
        candidate_path.relative_to(AUDIO_BASE_DIR)
    except ValueError as e:
        # Determine the specific reason for better security monitoring
        error_msg = str(e).lower()
        if "empty" in error_msg:
            reason = "empty_path"
        elif "filename" in error_msg or "component" in error_msg:
            reason = "invalid_components"
        elif "absolute" in error_msg:
            reason = "absolute_path"
        elif "parent" in error_msg or "traversal" in error_msg:
            reason = "path_traversal"
        else:
            # relative_to raises ValueError when path is not within base
            reason = "path_traversal"
            logger.error("invalid_file_path", path=req.file_path, reason=reason, error=str(e))

        raise HTTPException(
            status_code=400,
            detail="Invalid file path."
        )
    except (TypeError, OSError) as e:
        logger.error("invalid_file_path", path=req.file_path, reason="filesystem_error", error=str(e))
        raise HTTPException(
            status_code=400,
            detail="Invalid file path."
        )

    # Manual check for 500
    if not os.path.exists(candidate_path):
        logger.error("file_not_found_system_error", path=str(candidate_path))
        raise HTTPException(
            status_code=500,
            detail=f"File not found on disk: {candidate_path}"
        )

    result = transcriber.transcribe(str(candidate_path), req.language)
    return TranscriptionResponse(
        segments=result.segments,
        language=result.language,
        language_probability=result.language_probability
    )

@app.post(
    "/translate", 
    response_model=TranslationResponse, 
    tags=["AI"], 
    description="Translates a batch of texts using MarianMT models."
)
def translate(
    req: TranslationRequest,
    translator: TranslatorDep
):
    # Translator logic handles missing models with error logs now
    translations = translator.translate(req.texts, req.source_lang, req.target_lang)
    return TranslationResponse(translations=translations)

@app.post(
    "/filter", 
    response_model=FilterResponse, 
    tags=["AI"], 
    description="Analyzes a batch of texts using SpaCy for linguistic filtering."
)
def filter_text(
    req: FilterRequest,
    text_filter: FilterDep
):
    results = text_filter.analyze_batch(req.texts, req.language)
    return FilterResponse(results=results)

@app.get("/health", tags=["System"], description="Health check endpoint.")
async def health():
    return {"status": "ai_service_active", "gpu": torch.cuda.is_available()}

if __name__ == "__main__":
    # S104: Binding to all interfaces is required for Docker containerization
    uvicorn.run(app, host="0.0.0.0", port=8000) # noqa: S104
