@echo off
echo Stopping Notflix Docker Stack...
cd infra
..\apps\ai-service\venv\Scripts\python.exe -m podman_compose down
cd ..
echo Stack stopped.
pause
