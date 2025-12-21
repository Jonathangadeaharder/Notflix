from typing import List
import torch
from transformers import MarianMTModel, MarianTokenizer
from .interfaces import ITranslator

class OpusTranslator(ITranslator):
    def __init__(self, device=None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._models = {}

    def _get_model(self, source_lang: str, target_lang: str):
        model_name = f"Helsinki-NLP/opus-mt-{source_lang}-{target_lang}"
        if model_name not in self._models:
            tokenizer = MarianTokenizer.from_pretrained(model_name)
            model = MarianMTModel.from_pretrained(model_name).to(self.device)
            self._models[model_name] = (tokenizer, model)
        return self._models[model_name]

    def translate(
        self, 
        texts: List[str], 
        source_lang: str, 
        target_lang: str
    ) -> List[str]:
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

        return translated_texts