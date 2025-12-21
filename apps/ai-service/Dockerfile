FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# ffmpeg is often required for audio processing (faster-whisper/pydub)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg=7.1* \
    git=1:2.39* \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY apps/linguistics/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download models
RUN python -m spacy download es_core_news_lg && \
    python -m spacy download en_core_web_sm

# Copy source code
COPY apps/linguistics .

# Expose API port
EXPOSE 8000

# Start the application
CMD ["python", "main.py"]

