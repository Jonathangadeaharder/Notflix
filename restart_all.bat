@echo off
echo Restarting Notflix Environment...
apps\ai-service\venv\Scripts\python.exe -m podman_compose -f infra\docker-compose.yml down
call start_docker.bat