from typing import Optional
import os
import torch
import structlog
import threading
from faster_whisper import WhisperModel
from .interfaces import ITranscriber, TranscriptionResult, Segment

logger = structlog.get_logger()

class WhisperTranscriber(ITranscriber):
    def __init__(self, model_size="tiny", device=None, compute_type="float32"):
        self._test_mode = os.getenv("AI_SERVICE_TEST_MODE") == "1"
        if self._test_mode:
            self.model = None
        else:
            if device is None:
                device = "cuda" if torch.cuda.is_available() else "cpu"
            self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        self._lock = threading.Lock()

    def transcribe(
        self, 
        file_path: str, 
        language: Optional[str] = None
    ) -> TranscriptionResult:
        with self._lock:
            if self._test_mode:
                return TranscriptionResult(
                    segments=[Segment(start=0, end=1, text="test")],
                    language=language or "en",
                    language_probability=1.0
                )
            segments, info = self.model.transcribe(
                file_path, 
                language=language, 
                beam_size=5
            )

            result_segments = []
            for s in segments:
                result_segments.append(Segment(start=s.start, end=s.end, text=s.text))

        logger.info(
            "whisper_detected_language",
            language=info.language,
            probability=info.language_probability
        )

        return TranscriptionResult(
            segments=result_segments,
            language=info.language,
            language_probability=info.language_probability
        )

    def transcribe_stream(self, file_path: str, language: Optional[str] = None):
         # Streaming might need careful locking or a different approach if it blocks iterator
         # For now, we lock the initialization of the stream
         with self._lock:
            segments, info = self.model.transcribe(
                file_path, 
                language=language, 
                beam_size=5
            )

            logger.info(
                "whisper_stream_detected_language",
                language=info.language,
                probability=info.language_probability
            )

            # Yield initial info
            yield {"language": info.language, "probability": info.language_probability}

            for segment in segments:
                yield {
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text
                }
