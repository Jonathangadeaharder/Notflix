# syntax=docker/dockerfile:1.7
# ── Shared base: CUDA + Python 3.12 (same distro for builder & runner)
FROM nvidia/cuda:12.6.2-cudnn-runtime-ubuntu22.04 AS base

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apt-get update && apt-get install -y --no-install-recommends \
    software-properties-common=0.99.* curl=7.68.* \
    && add-apt-repository ppa:deadsnakes/ppa \
    && apt-get update && apt-get install -y --no-install-recommends \
    python3.12=3.12.* python3.12-venv=3.12.* \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PATH="/root/.local/bin:$PATH"

# ── Builder (same base image so venv is portable)
FROM base AS builder

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

COPY apps/ai-service/requirements.lock ./

RUN uv venv /opt/venv && \
    uv pip install --python /opt/venv -r requirements.lock \
        "torch" "torchaudio" --extra-index-url https://download.pytorch.org/whl/cu126

# ── Runner (driver ≥ 525 required; RTX 2000 Ada + 591.64 is fine)
FROM base AS runner

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg=7:* \
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
