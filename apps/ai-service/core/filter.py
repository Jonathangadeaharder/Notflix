import spacy
import structlog
from .interfaces import IFilter, TokenAnalysis
from typing import List, Dict

logger = structlog.get_logger()

class SpacyFilter(IFilter):
    def __init__(self):
        self._models: Dict[str, spacy.language.Language] = {}

    def _get_model(self, lang: str):
        if lang not in self._models:
            model_name = "es_core_news_lg" if lang == "es" else "en_core_web_sm"
            logger.info("loading_spacy_model", model=model_name)
            try:
                self._models[lang] = spacy.load(model_name)
            except OSError as e:
                logger.error("model_not_found", model=model_name)
                raise RuntimeError(
                    f"Spacy model {model_name} not found. "
                    "Ensure it is installed in the container image."
                ) from e
        return self._models[lang]

    def analyze(self, text: str, language: str) -> List[TokenAnalysis]:
        nlp = self._get_model(language)
        doc = nlp(text)
        
        tokens = []
        for token in doc:
            tokens.append(TokenAnalysis(
                text=token.text,
                lemma=token.lemma_,
                pos=token.pos_,
                is_stop=token.is_stop
            ))
        return tokens

    def analyze_batch(
        self, 
        texts: List[str], 
        language: str
    ) -> List[List[TokenAnalysis]]:
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