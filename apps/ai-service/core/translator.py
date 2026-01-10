from typing import List
import torch
import structlog
import threading
from transformers import MarianMTModel, MarianTokenizer
from .interfaces import ITranslator

logger = structlog.get_logger()

FALLBACK_MAPPING = {
    # Example fallbacks; in production this would be more comprehensive
    # Direct mapping for known "group" models or alternative pairs
    "fr-es": "es-fr", # Just an example, actually opus models are directional.
    # If a specific pair is missing, we might not have a direct fallback without chaining.
    # We will just log available pairs or fail gracefully.
}

class OpusTranslator(ITranslator):
    def __init__(self, device=None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._models = {}
        self._lock = threading.Lock()

    def _get_model(self, source_lang: str, target_lang: str):
        # Normalize
        pair = f"{source_lang}-{target_lang}"
        
        # Simple fallback check
        if pair in FALLBACK_MAPPING:
             logger.info("using_fallback_pair", original=pair, fallback=FALLBACK_MAPPING[pair])
             # In reality, swapping src/tgt isn't a fallback for translation, but creating a pivot is hard.
             # We'll just stick to trying usage.
             pass

        model_name = f"Helsinki-NLP/opus-mt-{source_lang}-{target_lang}"
        
        with self._lock:
            if model_name not in self._models:
                logger.info("loading_marian_model", model_name=model_name)
                try:
                    tokenizer = MarianTokenizer.from_pretrained(model_name)
                    model = MarianMTModel.from_pretrained(model_name).to(self.device)
                    self._models[model_name] = (tokenizer, model)
                except Exception as e:
                    logger.error("marian_model_load_failed", model=model_name, error=str(e))
                    raise ValueError(f"Translation model for {source_lang}->{target_lang} not found or failed to load.") from e
            return self._models[model_name]

    def translate(
        self, 
        texts: List[str], 
        source_lang: str, 
        target_lang: str
    ) -> List[str]:
        # Lock during inference to prevent OOM/Concurrency issues if multiple requests hit this worker
        # MarianMT inference is relatively heavy.
        with self._lock:
            tokenizer, model = self._get_model(source_lang, target_lang)

            # Batch size for translation
            batch_size = 32
            translated_texts = []

            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i : i + batch_size]

                inputs = tokenizer(
                    batch_texts, 
                    return_tensors="pt", 
                    padding=True, 
                    truncation=True
                ).to(self.device)

                with torch.no_grad():
                    generated = model.generate(**inputs)

                batch_translations = tokenizer.batch_decode(
                    generated, 
                    skip_special_tokens=True
                )
                translated_texts.extend(batch_translations)

        logger.info(
            "translation_complete", 
            count=len(translated_texts), 
            source=source_lang, 
            target=target_lang
        )
        return translated_texts