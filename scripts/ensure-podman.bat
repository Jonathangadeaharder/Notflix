@echo off
REM Ensure Podman machine is running and Docker API is available.
REM Idempotent: exits immediately if the API is already reachable.

docker info >nul 2>&1 && exit /b 0

echo Starting Podman machine...
podman machine stop >nul 2>&1
podman machine start >nul 2>&1

REM Poll for Docker API readiness (max ~120s, with progress dots)
set count=0
:wait
docker info >nul 2>&1 && echo. && exit /b 0
set /a count+=1
if %count% geq 60 goto fail
<nul set /p "=."
timeout /t 2 /nobreak >nul
goto wait

:fail
echo.
echo ERROR: Docker API unavailable after starting Podman machine.
echo If this keeps happening, run from a Windows terminal:
echo   wsl -d podman-machine-default -- sudo tee /etc/wsl.conf
echo Then paste: [user]^<enter^>default=user^<enter^>^<enter^>[boot]^<enter^>systemd=true
echo Then: wsl --terminate podman-machine-default ^& podman machine stop ^& podman machine start
exit /b 1
