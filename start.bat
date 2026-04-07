@echo off
echo.
echo   Notflix Dev Environment
echo   =======================
echo.
call scripts\ensure-podman.bat || exit /b 1
echo Building and starting services...
docker compose up --build -d
echo Pruning dangling images...
docker image prune -f
echo.
echo   Stack is running.
echo.
echo   Platform   http://localhost:5173
echo   Kong API   http://localhost:8000
echo   Logs       http://localhost:9999
echo.
echo   Press any key to stop the stack...
pause >nul
docker compose down
