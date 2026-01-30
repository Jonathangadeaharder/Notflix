import os
import pytest
from unittest.mock import MagicMock
from core.interfaces import TokenAnalysis
from core.filter import SpacyFilter
from core.translator import OpusTranslator

# --- Fixtures ---

@pytest.fixture
def mock_spacy(monkeypatch):
    """Mocks spacy.load and the nlp object."""
    mock_nlp = MagicMock()
    
    # Mock pipe to return a generator of docs
    def mock_pipe(texts):
        for text in texts:
            # Create a simple mock doc
            mock_doc = MagicMock()
            # Mock iteration over doc
            mock_token = MagicMock()
            mock_token.text = text
            mock_token.lemma_ = f"lemma_{text}"
            mock_token.pos_ = "NOUN"
            mock_token.is_stop = False
            mock_doc.__iter__.return_value = [mock_token]
            yield mock_doc
            
    mock_nlp.pipe.side_effect = mock_pipe
    
    # Mock single call
    def mock_call(text):
         mock_doc = MagicMock()
         mock_token = MagicMock()
         mock_token.text = text
         mock_token.lemma_ = f"lemma_{text}"
         mock_token.pos_ = "NOUN"
         mock_token.is_stop = False
         mock_doc.__iter__.return_value = [mock_token]
         return mock_doc
    
    mock_nlp.side_effect = mock_call

    mock_load = MagicMock(return_value=mock_nlp)
    monkeypatch.setattr("spacy.load", mock_load)
    return mock_nlp

@pytest.fixture
def mock_transformers(monkeypatch):
    """Mocks transformers library."""
    mock_tokenizer = MagicMock()
    # Mock tokenizer call to return dict with input_ids
    mock_tokenizer.return_value = {"input_ids": "mock_tensors"}
    # Mock batch_decode
    mock_tokenizer.batch_decode.side_effect = lambda x, skip_special_tokens: [f"trans_{i}" for i in range(len(x))]

    mock_model = MagicMock()
    mock_model.generate.return_value = ["gen_1", "gen_2"] # Dummy return

    monkeypatch.setattr("transformers.MarianTokenizer.from_pretrained", MagicMock(return_value=mock_tokenizer))
    monkeypatch.setattr("transformers.MarianMTModel.from_pretrained", MagicMock(return_value=mock_model))
    
    return mock_tokenizer

# --- Tests ---

def test_filter_analyze_batch_real():
    """Verifies that analyze_batch returns a list of lists of TokenAnalysis using Real Spacy (en_core_web_sm)."""
    spacy_filter = SpacyFilter()
    texts = ["I run", "They ran"]
    
    # We use 'en' because we confirmed 'en_core_web_sm' is installed.
    results = spacy_filter.analyze_batch(texts, "en")
    
    assert isinstance(results, list)
    assert len(results) == 2
    assert isinstance(results[0], list)
    assert isinstance(results[0][0], TokenAnalysis)
    
    if os.getenv("AI_SERVICE_TEST_MODE") != "1":
        # "run" should have lemma "run"
        lemmas_0 = [t.lemma.lower() for t in results[0]]
        assert "run" in lemmas_0

        # "ran" should have lemma "run"
        lemmas_1 = [t.lemma.lower() for t in results[1]]
        assert "run" in lemmas_1


def test_translate_batch():
    """Verifies that translate returns a flat list of strings."""
    # We need to monkeypatch the models dict directly or the class logic will try to load real models
    # But since we mocked from_pretrained, it should be fine.
    
    texts = ["hola", "mundo"]
    
    # We need to override the batch_decode behavior to match our input length for this test to be meaningful
    # logic-wise, effectively mocking the model "generate" output.
    # In the real code: 
    #   batch_texts = texts[i : i + batch_size]
    #   generated = model.generate(...)
    #   batch_translations = tokenizer.batch_decode(generated)
    
    # Let's ensure our mock tokenizer returns the right number of items
    with pytest.MonkeyPatch.context() as m:
         # Refine the mock for this specific test
         mock_tokenizer = MagicMock()
         mock_tokenizer.return_value = MagicMock() # inputs
         mock_tokenizer.batch_decode.side_effect = lambda gens, skip_special_tokens: ["trans_hola", "trans_mundo"]
         
         mock_model = MagicMock()
         mock_model.generate.return_value = "dummy_tensors"

         m.setattr("transformers.MarianTokenizer.from_pretrained", MagicMock(return_value=mock_tokenizer))
         m.setattr("transformers.MarianMTModel.from_pretrained", MagicMock(return_value=mock_model))
         
         translator = OpusTranslator(device="cpu")
         translations = translator.translate(texts, "es", "en")
         
         assert isinstance(translations, list)
         assert len(translations) == 2
         assert isinstance(translations[0], str)
         assert translations[0] == "trans_hola"
         assert translations[1] == "trans_mundo"
