#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1
export DOCKER_BUILDKIT=0
docker rm -f buildx_buildkit_default || true
docker-compose up --build -d
