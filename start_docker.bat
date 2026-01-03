@echo off
echo Building Notflix Images...

echo Building Platform...
podman.exe build -f apps/platform/Dockerfile -t notflix-platform .
if %errorlevel% neq 0 (
    echo Platform build failed!
    pause
    exit /b %errorlevel%
)

echo Building AI Service...
podman.exe build -f apps/ai-service/Dockerfile -t notflix-ai-service .
if %errorlevel% neq 0 (
    echo AI Service build failed!
    pause
    exit /b %errorlevel%
)

echo Starting Notflix Docker Stack...
apps\ai-service\venv\Scripts\python.exe -m podman_compose -f infra\docker-compose.yml up -d

echo.
echo ==========================================
echo    Stack is running!
echo    Platform:    http://localhost:5173/debug
echo    AI Service:  http://localhost:8000/docs
echo ==========================================
pause