from fastapi import FastAPI, HTTPException, Security, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel, field_validator
from typing import List
import uvicorn
import os
import structlog
import torch
from contextlib import asynccontextmanager
import subprocess

from core.interfaces import Segment, TokenAnalysis
from core.transcriber import WhisperTranscriber
from core.filter import SpacyFilter
from core.translator import OpusTranslator

# --- Security ---
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

def get_api_key(
    api_key_header: str = Security(api_key_header),
):
    expected_api_key = os.getenv("AI_SERVICE_API_KEY")
    if not expected_api_key:
        return None
    
    if api_key_header == expected_api_key:
        return api_key_header
    else:
        raise HTTPException(
            status_code=403,
            detail="Could not validate API Key",
        )

# --- Logging ---
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.PrintLoggerFactory(),
)
logger = structlog.get_logger()

# --- Models ---
class ThumbnailRequest(BaseModel):
    file_path: str

    @field_validator('file_path')
    @classmethod
    def path_must_exist(cls, v: str) -> str:
        if not os.path.exists(v):
            raise ValueError(f"File not found: {v}")
        return v

class ThumbnailResponse(BaseModel):
    thumbnail_path: str

class TranscriptionRequest(BaseModel):
    file_path: str
    language: str = "es"

    @field_validator('file_path')
    @classmethod
    def path_must_exist(cls, v: str) -> str:
        if not os.path.exists(v):
            raise ValueError(f"File not found: {v}")
        return v

class TranscriptionResponse(BaseModel):
    segments: List[Segment]
    language: str
    language_probability: float

class TranslationRequest(BaseModel):
    texts: List[str]
    source_lang: str = "es"
    target_lang: str = "en"

class TranslationResponse(BaseModel):
    translations: List[str]

class FilterRequest(BaseModel):
    texts: List[str]
    language: str = "es"

class FilterResponse(BaseModel):
    results: List[List[TokenAnalysis]]

# --- State ---
class BrainState:
    def __init__(self):
        self.transcriber = None
        self.filter = None
        self.translator = None

brain_state = BrainState()

# --- Dependencies ---
def get_transcriber():
    return brain_state.transcriber

def get_filter():
    return brain_state.filter

def get_translator():
    return brain_state.translator

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup_models_loading")
    brain_state.transcriber = WhisperTranscriber(model_size="tiny")
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

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("global_error", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal AI Service Error", "message": str(exc)},
    )

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
    
    base, _ = os.path.splitext(req.file_path)
    thumb_path = f"{base}.jpg"
    
    cmd = [
        "ffmpeg", "-y", "-i", req.file_path, 
        "-ss", "00:00:01", "-vframes", "1", thumb_path
    ]
    logger.info("running_ffmpeg", command=" ".join(cmd))
    
    process = subprocess.run(
        cmd, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE,
        check=False
    )
    if process.returncode != 0:
            raise Exception(f"ffmpeg failed: {process.stderr.decode()}")
    return ThumbnailResponse(thumbnail_path=thumb_path)

@app.post(
    "/transcribe", 
    response_model=TranscriptionResponse, 
    tags=["AI"], 
    description="Transcribes an audio file using Faster-Whisper."
)
async def transcribe(
    req: TranscriptionRequest,
    transcriber = Depends(get_transcriber)
):
    logger.info(
        "request_received", 
        endpoint="/transcribe", 
        file_path=req.file_path
    )
    result = transcriber.transcribe(req.file_path, req.language)
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
async def translate(
    req: TranslationRequest,
    translator = Depends(get_translator)
):
    translations = [
        translator.translate(text, req.source_lang, req.target_lang)
        for text in req.texts
    ]
    return TranslationResponse(translations=translations)

@app.post(
    "/filter", 
    response_model=FilterResponse, 
    tags=["AI"], 
    description="Analyzes a batch of texts using SpaCy for linguistic filtering."
)
async def filter_text(
    req: FilterRequest,
    text_filter = Depends(get_filter)
):
    results = [
        text_filter.analyze(text, req.language)
        for text in req.texts
    ]
    return FilterResponse(results=results)

@app.get("/health", tags=["System"], description="Health check endpoint.")
async def health():
    return {"status": "ai_service_active", "gpu": torch.cuda.is_available()}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)