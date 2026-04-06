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
echo   Stack is running. To view logs:
echo     docker compose logs -f platform
echo     docker compose logs -f db
echo     docker compose logs -f auth
echo.
