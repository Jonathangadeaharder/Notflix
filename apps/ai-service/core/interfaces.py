from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel


class Segment(BaseModel):
    """Segment class for transcription results."""

    # pylint: disable=too-few-public-methods
    start: float
    end: float
    text: str


class TokenAnalysis(BaseModel):
    """TokenAnalysis class for analyzed tokens."""

    # pylint: disable=too-few-public-methods
    text: str
    lemma: str
    pos: str
    is_stop: bool
    whitespace: str = ""
    translation: Optional[str] = None


class TranscriptionResult(BaseModel):
    """TranscriptionResult class for transcription results."""

    # pylint: disable=too-few-public-methods
    segments: List[Segment]
    language: str
    language_probability: float


class ITranscriber(ABC):
    """ITranscriber interface for transcription services."""

    @abstractmethod
    def transcribe(
        self, file_path: str, language: Optional[str] = None
    ) -> TranscriptionResult:
        pass

    @abstractmethod
    def supports_language(self, language: str) -> bool:
        """Return True if the requested language can be transcribed."""
        raise NotImplementedError


class IFilter(ABC):
    @abstractmethod
    def analyze(self, text: str, language: str) -> List[TokenAnalysis]:
        pass

    @abstractmethod
    def analyze_batch(
        self, texts: List[str], language: str
    ) -> List[List[TokenAnalysis]]:
        pass


class ITranslator(ABC):
    """ITranslator interface for translation services."""

    @abstractmethod
    def translate(
        self, texts: List[str], source_lang: str, target_lang: str
    ) -> List[str]:
        pass

    @abstractmethod
    def supports_pair(self, source_lang: str, target_lang: str) -> bool:
        """Return True if the translation pair is supported."""
        raise NotImplementedError
