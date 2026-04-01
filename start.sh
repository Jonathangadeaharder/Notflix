#!/usr/bin/env bash
set -euo pipefail

printf '\n  Notflix Dev Environment\n  =======================\n\n'

# Resolve the compose command: docker compose → sudo docker compose → podman-compose
if docker compose version &>/dev/null; then
    COMPOSE="docker compose"
elif sudo docker compose version &>/dev/null; then
    printf '  Elevating with sudo for Docker socket access...\n\n'
    COMPOSE="sudo docker compose"
elif command -v podman-compose &>/dev/null; then
    COMPOSE="podman-compose"
else
    printf '  ERROR: No compose provider found. Install Docker or podman-compose.\n'
    exit 1
fi

exec $COMPOSE up --build
