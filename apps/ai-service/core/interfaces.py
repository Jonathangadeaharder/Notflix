from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel


class Segment(BaseModel):
    start: float
    end: float
    text: str


class TokenAnalysis(BaseModel):
    text: str
    lemma: str
    pos: str
    is_stop: bool
    whitespace: str = ""
    translation: Optional[str] = None


class TranscriptionResult(BaseModel):
    segments: List[Segment]
    language: str
    language_probability: float


class ITranscriber(ABC):  # pylint: disable=too-few-public-methods
    """
    Interface for transcription services.
    """

    @abstractmethod
    def transcribe(
        self, file_path: str, language: Optional[str] = None
    ) -> TranscriptionResult:
        """
        Transcribes an audio file.
        """


class IFilter(ABC):
    """
    Interface for linguistic filtering services.
    """

    @abstractmethod
    def analyze(self, text: str, language: str) -> List[TokenAnalysis]:
        """
        Analyzes a single text.
        """

    @abstractmethod
    def analyze_batch(
        self, texts: List[str], language: str
    ) -> List[List[TokenAnalysis]]:
        """
        Analyzes a batch of texts.
        """


class ITranslator(ABC):  # pylint: disable=too-few-public-methods
    """
    Interface for translation services.
    """

    @abstractmethod
    def translate(
        self, texts: List[str], source_lang: str, target_lang: str
    ) -> List[str]:
        """
        Translates a list of texts.
        """
