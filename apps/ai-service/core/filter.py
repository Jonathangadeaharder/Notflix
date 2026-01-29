import os
import spacy
import structlog
import threading
from .interfaces import IFilter, TokenAnalysis
from typing import List, Dict

logger = structlog.get_logger()

class SpacyFilter(IFilter):
    def __init__(self):
        self._models: Dict[str, spacy.language.Language] = {}
        self._lock = threading.Lock()

    def _get_model(self, lang: str):
        # Double checked locking optimization or just lock the whole method
        # Since this is lazy loading, locking the whole method is safer and simple enough
        if lang not in self._models:
             if os.getenv("AI_SERVICE_TEST_MODE") == "1":
                 blank_lang = lang if lang in ["en", "es"] else "en"
                 self._models[lang] = spacy.blank(blank_lang)
                 return self._models[lang]
             model_candidates = (
                 ["es_core_news_lg", "es_core_news_sm"]
                 if lang == "es"
                 else ["en_core_web_lg", "en_core_web_sm"]
             )
             loaded = False
             last_error = None
             for model_name in model_candidates:
                 logger.info("loading_spacy_model", model=model_name)
                 try:
                     self._models[lang] = spacy.load(model_name)
                     loaded = True
                     break
                 except OSError as e:
                     last_error = e
                     logger.error("model_not_found", model=model_name)
             if not loaded:
                 raise RuntimeError(
                     f"Spacy model for language '{lang}' not found. "
                     "Ensure it is installed in the container image."
                 ) from last_error
        return self._models[lang]

    def analyze(self, text: str, language: str) -> List[TokenAnalysis]:
        with self._lock:
            nlp = self._get_model(language)
            doc = nlp(text)
        
        tokens = []
        for token in doc:
            tokens.append(TokenAnalysis(
                text=token.text,
                lemma=token.lemma_,
                pos=token.pos_,
                is_stop=token.is_stop,
                whitespace=token.whitespace_
            ))
        return tokens

    def analyze_batch(
        self, 
        texts: List[str], 
        language: str
    ) -> List[List[TokenAnalysis]]:
        with self._lock:
            nlp = self._get_model(language)
            # Using nlp.pipe for efficient batch processing
            docs = list(nlp.pipe(texts))
        
        results = []
        for doc in docs:
            tokens = []
            for token in doc:
                tokens.append(TokenAnalysis(
                    text=token.text,
                    lemma=token.lemma_,
                    pos=token.pos_,
                    is_stop=token.is_stop
                ))
            results.append(tokens)
        return results
