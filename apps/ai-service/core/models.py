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
    whitespace: str
    translation: Optional[str] = None


class TranscriptionResult(BaseModel):
    segments: List[Segment]
    language: str
    language_probability: float
