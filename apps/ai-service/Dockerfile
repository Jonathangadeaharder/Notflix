# syntax=docker/dockerfile:1.7
FROM python:3.12-slim

WORKDIR /app

# ── System dependencies ──────────────────────────────────
# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# ── Python tooling ───────────────────────────────────────
COPY --from=ghcr.io/astral-sh/uv@sha256:c152167fbb12521eafe9328693e88adb7474fbe2f1227576ceea87aeec18683e /uv /usr/local/bin/uv

# ── Dependency layer (cached unless lockfile changes) ────
COPY apps/ai-service/requirements.lock ./requirements.lock
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system -r requirements.lock

# ── Source layer ─────────────────────────────────────────
COPY apps/ai-service/ .

# ── Security: drop to non-root ──────────────────────────
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
