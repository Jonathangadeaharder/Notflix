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
    translation: Optional[str] = None

class TranscriptionResult(BaseModel):
    segments: List[Segment]
    language: str
    language_probability: float

class ITranscriber(ABC):
    @abstractmethod
    def transcribe(
        self, 
        file_path: str, 
        language: Optional[str] = None
    ) -> TranscriptionResult:
        pass

class IFilter(ABC):
    @abstractmethod
    def analyze(self, text: str, language: str) -> List[TokenAnalysis]:
        pass

    @abstractmethod
    def analyze_batch(
        self, 
        texts: List[str], 
        language: str
    ) -> List[List[TokenAnalysis]]:
        pass

class ITranslator(ABC):
    @abstractmethod
    def translate(
        self, 
        texts: List[str], 
        source_lang: str, 
        target_lang: str
    ) -> List[str]:
        pass