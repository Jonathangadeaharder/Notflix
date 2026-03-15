# ADR-003: AI Service Security Model

**Status:** Accepted
**Date:** 2026-03-07
**Context:** The AI Service runs as an internal FastAPI microservice on a private Docker network. It must enforce a simple but explicit trust boundary between the platform and filesystem-backed media processing.

## 1. Decision

Security is layered across three concerns:

- **API key authentication** for platform-to-AI calls
- **Canonical path containment** for all media inputs
- **`X-Request-ID` propagation** for cross-service traceability

## 2. Canonical Media Path Contract

The platform-to-AI media path contract is architectural, not incidental:

- The platform should send media-root-relative POSIX paths when the file lives under the shared media root (for example `uploads/example.mp4`).
- Absolute paths are accepted only when they still resolve inside the allowed root.
- The AI Service must canonicalize any incoming relative or absolute path through the same containment rule before touching the filesystem.

This keeps local and Docker execution consistent without relaxing traversal protections.

## 3. API Key Authentication

A global FastAPI dependency validates the `X-API-Key` header on every request.

- **Env:** `AI_SERVICE_API_KEY`
- **Dev mode:** if the key is unset, auth is disabled for local convenience
- **Scope:** the AI Service trusts the platform as the caller; it does not perform per-user authorization

## 4. Path Security

Both `/generate_thumbnail` and `/transcribe` must resolve file paths through the same containment rule.

```python
def resolve_candidate_path(raw_path: str, allowed_root: Path) -> Path:
    if not raw_path or not str(raw_path).strip():
        raise ValueError("Empty file path")
    if "\x00" in str(raw_path):
        raise ValueError("Invalid file path")

    input_path = Path(str(raw_path))
    if input_path.is_absolute():
        candidate_path = input_path.resolve()
    else:
        candidate_path = (allowed_root / input_path).resolve()

    candidate_path.relative_to(allowed_root)
    return candidate_path
```

### `/generate_thumbnail`

- Canonicalization happens at model-validation time through `ThumbnailRequest.path_must_be_safe`.
- The allowed root is `MEDIA_ROOT`.

### `/transcribe`

- The request model performs only lightweight empty-path validation.
- The route canonicalizes the file path through `resolve_candidate_audio_path(...)`, which delegates to the same shared containment rule as `/generate_thumbnail`.
- The effective root is the current audio base directory, which defaults to the shared media root.

## 5. Request Tracing

The AI Service propagates `X-Request-ID` through middleware so logs can be correlated across the platform and AI service for a single request flow.

## 6. Model Loading

Models load once at startup through FastAPI lifespan management and are reused across requests.

| Mode | Whisper Model | Device | Notes |
| :--- | :------------ | :----- | :---- |
| **Test** | `tiny` | `cpu` | `AI_SERVICE_TEST_MODE=1` |
| **Production** | `base` | Auto (GPU) | Better non-English performance |

## 7. Consequences

- **Positive:** simple shared-secret auth is enough for the current internal network model; path traversal protection is uniform across media endpoints; the path contract is stable across local and Docker execution
- **Negative:** the AI Service still trusts the platform as a single caller; a compromised internal component with the shared secret retains broad access
