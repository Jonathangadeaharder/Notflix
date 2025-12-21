from typing import Optional
import torch
from faster_whisper import WhisperModel
from .interfaces import ITranscriber, TranscriptionResult, Segment

class WhisperTranscriber(ITranscriber):
    def __init__(self, model_size="tiny", device=None, compute_type="float32"):
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)

    def transcribe(
        self, 
        file_path: str, 
        language: Optional[str] = None
    ) -> TranscriptionResult:
        segments, info = self.model.transcribe(
            file_path, 
            language=language, 
            beam_size=5
        )

        result_segments = []
        for s in segments:
            result_segments.append(Segment(start=s.start, end=s.end, text=s.text))

        print(f"Detected language '{info.language}' "
              f"with probability {info.language_probability}")

        return TranscriptionResult(
            segments=result_segments,
            language=info.language,
            language_probability=info.language_probability
        )

    def transcribe_stream(self, file_path: str, language: Optional[str] = None):
        segments, info = self.model.transcribe(
            file_path, 
            language=language, 
            beam_size=5
        )

        print(f"Stream: Detected language '{info.language}' "
              f"with probability {info.language_probability}")

        # Yield initial info
        yield {"language": info.language, "probability": info.language_probability}

        for segment in segments:
            yield {
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            }