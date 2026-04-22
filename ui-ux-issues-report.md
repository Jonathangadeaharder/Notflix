# Notflix Application & UI Issues Report

During the attempt to start the Notflix server and access the UI to perform a UX audit, multiple critical infrastructure and build failures were encountered. These deployment blockers currently prevent the server from starting. Once these are resolved and the application is accessible, the browser UI tests can be performed.

## 1. Development Environment Windows/WSL Compatibility
- **UNC Path Failures:** Executing `start.bat` directly from the `\\wsl.localhost\...` path fails because CMD does not support UNC paths as the current directory.
- **Incorrect PNPM Resolution:** When attempting to run the project natively via `pnpm install`, WSL resolves the Windows `pnpm.cmd`. This causes an `EPERM` error when trying to rename files in the Windows cache directly from WSL.

## 2. Podman Missing Dependency
- The development scripts (`start.bat` and `ensure-podman.bat`) are configured under the assumption that Podman is installed. However, `podman` is not recognized, failing the startup scripts natively.

## 3. Docker CLI Secret Service dbus Bug
- When executing `docker compose up --build -d`, Docker tries to spawn buildkit via syntax `dockerfile:1.7`, triggering a credential helper (`org.freedesktop.secrets`). Since `dbus` lacks the correct `.service` file for `secretservice` inside WSL, building the images fails persistently with:
  > `GDBus.Error:org.freedesktop.DBus.Error.ServiceUnknown`

## 4. Deprecated Python 3.12 Distutils Package
- The `ai-service` Dockerfile attempts to install `python3.12-distutils` via `apt-get`.
- `distutils` has been permanently removed in Python 3.12, causing the `apt-get` command to return an `Unable to locate package` error and breaking the `ai-service` Docker build entirely. (*I have proactively applied a fix for this by removing the dependency in the Dockerfile*).

## 5. Network Speed / Container Pull Blockers
- Even when manually bypassing the dbus issue and fixing the distutils bug, downloading base image layers (like `node:22-alpine`) inside the WSL `dockerd` instance executes at extremely slow speeds (taking >15 minutes for 50MB), effectively hanging the backend deployment.

---

### Next Steps Recommendation
Before the UI UX can be reviewed:
1. Refactor `start.bat` and CLI paths so the application can run properly on Windows natively via a Node dev server without requiring WSL Docker, **or** setup a proper `docker-compose.yml` override that prevents `BuildKit` from calling system credential helpers in WSL.
2. Fix the extremely slow docker pull speeds affecting WSL on this machine.
3. Once the server backend successfully binds to `http://localhost:5173`, the UI testing suite and visual exploration can be resumed.
