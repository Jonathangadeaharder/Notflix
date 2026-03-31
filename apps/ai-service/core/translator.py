from typing import List
import threading
import torch
import structlog
from transformers import MarianMTModel, MarianTokenizer
from .interfaces import ITranslator

logger = structlog.get_logger()

FALLBACK_MAPPING = {
    # Example fallbacks; in production this would be more comprehensive
    # Direct mapping for known "group" models or alternative pairs
    "fr-es": "es-fr",  # Just an example, actually opus models are directional.
    # If a specific pair is missing, we might not have a direct fallback without chaining.
    # We will just log available pairs or fail gracefully.
}


class OpusTranslator(ITranslator):
    """OpusTranslator class for translation using MarianMT models."""

    def __init__(self, device=None):
        """Initializes the OpusTranslator with a computation device."""
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._models = {}
        self._lock = threading.RLock()

    def _get_model(self, source_lang: str, target_lang: str):
        """Internal helper to load or retrieve a translation model."""
        # Normalize
        pair = f"{source_lang}-{target_lang}"

        # Simple fallback check
        if pair in FALLBACK_MAPPING:
            logger.info(
                "using_fallback_pair", original=pair, fallback=FALLBACK_MAPPING[pair]
            )
            # In reality, swapping src/tgt isn't a fallback for translation,
            # but creating a pivot is hard.
            # We'll just stick to trying usage.

        model_name = f"Helsinki-NLP/opus-mt-{source_lang}-{target_lang}"

        with self._lock:
            if model_name not in self._models:
                logger.info("loading_marian_model", model_name=model_name)
                try:
                    tokenizer = MarianTokenizer.from_pretrained(model_name)  # nosec B615
                    model = MarianMTModel.from_pretrained(model_name).to(self.device)  # nosec B615
                    self._models[model_name] = (tokenizer, model)
                except Exception as e:
                    logger.error(
                        "marian_model_load_failed", model=model_name, error=str(e)
                    )
                    raise ValueError(
                        f"Translation model for {source_lang}->{target_lang} "
                        "not found or failed to load."
                    ) from e
            return self._models[model_name]

    def translate(
        self, texts: List[str], source_lang: str, target_lang: str
    ) -> List[str]:
        """Translates a list of texts from source language to target language."""
        # pylint: disable=too-many-locals
        # Lock during inference to prevent OOM/Concurrency issues
        # MarianMT inference is relatively heavy.
        with self._lock:
            tokenizer, model = self._get_model(source_lang, target_lang)

            # Batch size for translation
            batch_size = 32
            translated_texts = []

            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i : i + batch_size]

                inputs = tokenizer(
                    batch_texts, return_tensors="pt", padding=True, truncation=True
                ).to(self.device)

                with torch.no_grad():
                    generated = model.generate(**inputs)

                batch_translations = tokenizer.batch_decode(
                    generated, skip_special_tokens=True
                )
                translated_texts.extend(batch_translations)

        logger.info(
            "translation_complete",
            count=len(translated_texts),
            source=source_lang,
            target=target_lang,
        )
        return translated_texts

    def supports_pair(self, source_lang: str, target_lang: str) -> bool:
        """Opus models cover many pairs; gate only on non-empty inputs."""
        return bool(source_lang) and bool(target_lang)
