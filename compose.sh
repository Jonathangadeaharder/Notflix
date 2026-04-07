#!/bin/bash
cd "/mnt/c/Users/jogah/Coding Projects/IdeaProjects/Notflix"
export DOCKER_BUILDKIT=0
docker rm -f buildx_buildkit_default || true
docker-compose up --build -d
