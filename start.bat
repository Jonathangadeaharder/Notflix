@echo off
echo.
echo   Notflix Dev Environment
echo   =======================
echo.
echo Stopping containers...
docker compose stop db 2>nul
echo Restarting Podman machine...
podman machine stop 2>nul
podman machine start
echo Waiting for Podman named pipe...
powershell -command "while ($true) { $pipes = [System.IO.Directory]::GetFiles('\\.\pipe'); if ($pipes -contains '\\.\pipe\podman-machine-default') { break }; Start-Sleep -Seconds 1 }"
echo Podman machine ready.
docker compose rm -fsv platform init-db 2>nul
echo Building images...
docker compose build -q
echo Starting services...
docker compose up -d
echo.
echo   Stack is running.
echo.
echo   Access:
for /f "tokens=2 delims=:" %%p in ('docker compose port platform 5173 2^>nul') do echo     Platform   http://localhost:%%p
for /f "tokens=2 delims=:" %%p in ('docker compose port kong 8000 2^>nul') do echo     Kong API   http://localhost:%%p
for /f "tokens=2 delims=:" %%p in ('docker compose port dozzle 8080 2^>nul') do echo     Logs       http://localhost:%%p
echo.
echo   Press any key to stop the stack...
pause >nul
docker compose down
