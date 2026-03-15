FROM python:3.14-slim

WORKDIR /app
ENV UV_CACHE_DIR=/app/.uv-cache

# Install system dependencies
# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install uv and prewarm the locked runtime environment
RUN pip install --no-cache-dir uv && rm -rf /root/.cache/pip
COPY apps/ai-service/requirements.txt apps/ai-service/requirements.lock ./
RUN uvx --with-requirements requirements.lock --from uvicorn uvicorn --version

# Copy source code
COPY apps/ai-service/ .

# Create non-root user for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# Expose API port
EXPOSE 8000

# Start the application
CMD ["uvx", "--with-requirements", "requirements.lock", "--from", "uvicorn", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

