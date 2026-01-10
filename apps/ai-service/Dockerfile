FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies and Models in single layer
COPY apps/ai-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    python -m spacy download es_core_news_lg && \
    python -m spacy download en_core_web_lg && \
    rm -rf /root/.cache/pip

# Copy source code
COPY apps/ai-service/ .

# Create non-root user for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# Expose API port
EXPOSE 8000

# Start the application
CMD ["python", "main.py"]

