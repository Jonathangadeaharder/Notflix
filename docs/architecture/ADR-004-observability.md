# ADR-004: Observability & Request Tracing

**Status:** Accepted
**Date:** 2026-03-07
**Context:** Need for structured logging and end-to-end request tracing across the SvelteKit Platform and FastAPI AI Service, without introducing external observability platforms.

## 1. Decision

- **Platform:** `pino` (JSON output, PII redaction)
- **AI Service:** `structlog` (JSON output, `contextvars`)
- **Cross-service tracing:** `X-Request-ID` propagated via `AsyncLocalStorage` (Node.js) and `contextvars` (Python)

## 2. Platform Logging (pino)

Configured in `src/lib/logger.ts`.

### PII Redaction

The following fields are automatically redacted (removed from output):

- `password`, `token`, `access_token`, `refresh_token`
- `session.token`, `user.email`

### Output Destinations

| Target | Description                          |
| :----- | :----------------------------------- |
| stdout | Console/Docker logs                  |
| `logs/platform.log` | Persistent local log file |

```typescript
export const logger = pino({
    level: 'info',
    redact: {
        paths: ['password', 'token', 'access_token', 'refresh_token', 'session.token', 'user.email'],
        remove: true
    },
    transport: {
        targets: [
            { target: 'pino/file', options: { destination: 1 } },
            { target: 'pino/file', options: { destination: '../../logs/platform.log', mkdir: true } }
        ]
    }
});
```

### Client-Side Log Forwarding

`POST /api/log` accepts client-side logs and routes them through pino. Sensitive keys (`token`, `password`, `secret`, `authorization`, `cookie`) are redacted server-side before logging.

## 3. AI Service Logging (structlog)

Configured in `main.py`.

### Processor Chain

```python
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,  # X-Request-ID binding
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ]
)
```

### Output Destinations

| Target | Description              |
| :----- | :----------------------- |
| stderr | Console/Docker logs      |
| `logs/ai-service.log` | Persistent local log file |

### Global Exception Handler

Unhandled exceptions are caught by `@app.exception_handler(Exception)`, logged with path context, and returned as 500 responses.

## 4. Request Context Flow

End-to-end tracing follows this path:

1. **`hooks.server.ts`** — Reads incoming `X-Request-ID` header (or generates a UUID). Stores it in `AsyncLocalStorage` via `requestContext.run({ requestId })`.

2. **`RealAiGateway`** — `getRequestId()` reads from `AsyncLocalStorage`. Sets `X-Request-ID` header on outgoing `fetch()` calls to the AI Service.

3. **AI Service middleware** — `add_request_id()` reads `X-Request-ID` from the incoming request (or generates one). Binds it to `structlog.contextvars` so all log entries in that request include the ID.

4. **AI Service response** — Echoes `X-Request-ID` back in the response header.

```
Client Request
  └─> hooks.server.ts (AsyncLocalStorage: requestId)
        └─> RealAiGateway.fetch() (X-Request-ID header)
              └─> AI Service middleware (structlog contextvars)
                    └─> Response (X-Request-ID echoed)
```

## 5. Consequences

- **Positive:** End-to-end request tracing across services with zero external dependencies. PII is never written to logs. JSON output is machine-parseable for future integration with log aggregators.
- **Negative:** Local log files only — no centralized log platform. Consistent with the KISS / no-cloud philosophy (see ADR-001).
