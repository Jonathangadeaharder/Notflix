# syntax=docker/dockerfile:1.7
FROM python:3.11-slim

WORKDIR /app

# System dependencies
# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install Python dependencies with uv — pip cache is mounted so
# repeated builds on the droplet only download changed packages.
COPY apps/ai-service/requirements.lock ./requirements.lock
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system -r requirements.lock

# Copy source code
COPY apps/ai-service/ .

# Create non-root user for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
