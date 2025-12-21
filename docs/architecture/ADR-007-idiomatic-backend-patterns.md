# ADR-007: Idiomatic Backend Patterns (Tasks, Errors, and DI)

**Status:** Accepted
**Date:** 2025-12-20
**Context:** Need for consistent, observable, and maintainable patterns for background processing, error handling, and dependency management across both SvelteKit (Host) and FastAPI (Brain).

## 1. Decision

We have adopted the following backend patterns:

*   **Background Tasks (Host):** Centralized `TaskRegistry` for fire-and-forget operations.
*   **Error Handling (Brain):** Global FastAPI exception handlers to simplify route logic.
*   **Dependency Injection:** Constructor-based injection with a centralized container (Host) and `Depends` (Brain).
*   **Data Consistency:** Singleton library instances enforced via root `overrides`.
*   **Path Resolution:** Absolute path resolution centralized in `config.ts`, avoiding brittle relative path math (`../../`).
*   **Request Validation (Brain):** Use Pydantic `@field_validator` for logic-based validation (like file existence) before route handlers execute.

## 2. Rationale

### 2.1 TaskRegistry (SvelteKit)
# ... (same)

### 2.5 Absolute Pathing
*   **Reliability:** Using `path.resolve` once at startup based on the environment or project root ensures the application behaves consistently regardless of the current working directory or Docker container WORKDIR.

### 2.6 Pydantic Validators
*   **Fast-Fail:** By moving path existence checks into the model layer, we catch errors earlier and return standard 422 responses automatically, keeping AI logic focused on processing.

## 3. Implementation Standards

1.  **Background Work:** Never call `async` functions without `await` directly in a route. Always wrap them in `taskRegistry.register('name', promise)`.
2.  **FastAPI Routes:** Write the "happy path." Let the `global_exception_handler` and Pydantic validators deal with validation and unexpected crashes.
3.  **Pathing:** Always use `CONFIG.RESOLVED_UPLOAD_DIR` instead of calculating relative paths in local files.
4.  **DI:**
    *   **Host:** Export singleton instances from `lib/server/container.ts`.
    *   **Brain:** Use `Depends` to inject model instances into route handlers.
5.  **Schema Types:** Use Drizzle's `InferSelectModel` and `InferInsertModel` to generate TypeScript interfaces directly from the database schema.

## 4. Consequences

*   **Positive:** significantly reduced "dirty" code and type casts. Improved logs for background processing. Easier to write fast-running unit tests.
*   **Negative:** Requires discipline to follow the DI pattern instead of direct imports. Root `package.json` management becomes more critical.
