# syntax=docker/dockerfile:1.7
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

COPY apps/ai-service/requirements.lock ./
# Install base deps from lock, then reinstall torch/torchaudio with CUDA 12.6 wheels
RUN uv venv /opt/venv && \
    uv pip install --python /opt/venv -r requirements.lock \
        "torch" "torchaudio" --extra-index-url https://download.pytorch.org/whl/cu126

# ── CUDA runtime base (driver ≥ 525 required; RTX 2000 Ada + 591.64 is fine)
FROM nvidia/cuda:12.6.2-cudnn-runtime-ubuntu22.04 AS runner

# Install Python 3.12 (deadsnakes) + ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    software-properties-common \
    && add-apt-repository ppa:deadsnakes/ppa \
    && apt-get update && apt-get install -y --no-install-recommends \
    python3.12 python3.12-distutils python3.12-venv \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Dependency layer
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" PYTHONUNBUFFERED="1"

# ── Source layer
COPY apps/ai-service/ .

# ── Security: drop to non-root
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
