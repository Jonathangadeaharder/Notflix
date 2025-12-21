@echo off
echo Stopping Notflix Docker Stack...
cd infra
..\apps\ai-service\venv\Scripts\podman-compose.exe down
cd ..
echo Stack stopped.
pause
