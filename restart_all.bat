@echo off
echo Restarting Notflix Environment...
apps\ai-service\venv\Scripts\podman-compose.exe -f infra\docker-compose.yml down
call start_docker.bat