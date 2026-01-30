# Code Review Report

**Date:** 2026-01-02
**Project:** Notflix
**Reviewer:** Antigravity (Agent)

## 1. Executive Summary

The project is well-architected, following a "Local Sovereign" (KISS) philosophy. The separation of concerns between the SvelteKit Platform (Orchestration/UI) and the Python AI Service (Compute) is clean and effective. The codebases generally adhere to the drafted Architecture Decision Records (ADRs).

**Key Strengths:**

- **Architecture:** Strong separation of concerns. The "Ports and Adapters" pattern in SvelteKit facilitates testing.
- **Dependencies:** Modern and consistent stack (Svelte 5, Tailwind 4, Drizzle, FastAPI, Pydantic).
- **Type Safety:** Excellent use of TypeScript and Pydantic for end-to-end type safety.

**Critical Issues:**

- **AI Service Bug:** Incorrect usage of the `translator` and `filter` in `main.py` causing potential crashes and significant performance degradation.

## 2. Critical Findings (High Priority)

### 2.1. AI Service: Translation and Filter Logic Errors (`apps/ai-service/main.py`)

**Issue:** In `main.py`, the `/translate` and `/filter` endpoints iterate over the input list and call the core services item-by-item. However, the core services (`OpusTranslator`, `SpacyFilter`) and `main.py` logic have mismatched expectations, leading to inefficient processing and incorrect return types.

**Location:** `apps/ai-service/main.py`

**Details:**

1.  **Translation:**

    ```python
    # main.py
    translations = [
        translator.translate(text, req.source_lang, req.target_lang)
        for text in req.texts
    ]
    ```

    `translator.translate` returns a `List[str]`. The list comprehension results in `List[List[str]]`. The Pydantic model `TranslationResponse` expects `translations: List[str]`. This will likely cause a validation error or unexpected nested JSON structure.
    _Correction:_ Pass the entire list to `translate` once.

    ```python
    translations = translator.translate(req.texts, req.source_lang, req.target_lang)
    ```

2.  **Filtering:**
    ```python
    # main.py
    results = [
        text_filter.analyze(text, req.language)
        for text in req.texts
    ]
    ```
    While functionally correct (returns `List[List[TokenAnalysis]]`), it bypasses the optimized `analyze_batch` method available in `SpacyFilter` (which uses `nlp.pipe`). This is a significant performance miss.
    _Correction:_ Use `analyze_batch`.
    ```python
    results = text_filter.analyze_batch(req.texts, req.language)
    ```

## 3. Platform Review (`apps/platform`)

### 3.1. Architecture & DI

The Dependency Injection container (`lib/server/infrastructure/container.ts`) is well implemented. It correctly toggles between Real and Mock adapters based on environment variables, enabling reliable E2E tests without spinning up heavy AI models.

### 3.2. Task Registry

The `TaskRegistry` (`lib/server/services/task-registry.service.ts`) provides a safeguard for fire-and-forget background tasks. This is a good implementation for a node-based environment where unhandled promise rejections can crash the process.

### 3.3. Orchestrator Service

The properties of `enrichWithTranslations` in `video-orchestrator.service.ts` correctly implement the business logic:

- **Guest Mode:** Simple translation.
- **User Mode:** Smart filtering of known words before translation to save compute.
- **Logic Check:** The logic correctly separates identification of unknown lemmas from the translation step, ensuring we don't translate known words.

### 3.4. Configuration

`resolvedUploadDir` in `config.ts` uses `path.resolve` to handle relative paths robustly, addressing the "Docker vs Local" pathing issues common in such setups.

## 4. AI Service Review (`apps/ai-service`)

### 4.1. Core Modules

- **Transcriber:** Uses `faster-whisper`. _Observation:_ Currently prints to `stdout` (`print(...)`). It should use the configured `structlog` logger for consistency.
- **Filter:** `SpacyFilter` implements lazy loading of models, which improves startup time if models aren't immediately needed.
- **Translator:** `OpusTranslator` implements batching (batch size 32), which is excellent.

### 4.2. Security

Authentication is handled via a simple API Key check. Given the services run in a private Docker network, this is sufficient.

## 5. Database Review (`packages/database`)

### 5.1. Schema

The Drizzle schema is clean. Using `jsonb` for `vttJson` is appropriate for storing variable-length subtitle data that doesn't need complex relational querying. `onConflictDoUpdate` logic in the Orchestrator for `videoProcessing` ensures idempotency.

### 5.2. Seeding

The seed script skips Account creation due to hashing dependencies. This is acceptable for a dev seed script but means the "Test User" cannot log in via password immediately.

## 6. Recommendations

1.  **Fix AI Service API:** Immediately refactor `apps/ai-service/main.py` to use batch processing for `/translate` and `/filter`.
2.  **Logging Standard:** Replace `print` statements in `apps/ai-service/core` with `structlog`.
3.  **Optimization:** In `Orchestrator`, consider verifying if `processedVideo` needs to handle potential partial failures (currently it marks the whole video as ERROR).
4.  **Testing:** Add a unit test in `apps/ai-service/tests` that specifically sends a batch of 2+ texts to verify the list handling logic.
