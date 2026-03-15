# Repository Guidelines

## Project Structure & Module Organization

- `apps/platform/` is the SvelteKit web app (routes, components, server services).
- `apps/ai-service/` is the FastAPI-based AI service (Python core, tests, OpenAPI).
- `packages/database/` holds Drizzle schema and migration tooling.
- `infra/` contains Docker Compose files for local/test infrastructure.
- `assets/` and `media/` store vocabulary datasets and media fixtures.

## Build, Test, and Development Commands

- `node scripts/manager.mjs` (or `start.bat`/`start.sh`) boots DB, AI service, and the platform dev server.
- `pnpm --filter @notflix/platform dev` runs the SvelteKit dev server (default `http://localhost:5173`).
- `pnpm --filter @notflix/platform build` builds the web app; `pnpm --filter @notflix/platform preview` serves the build.
- `pnpm --filter @notflix/database db:push` applies Drizzle schema to the local DB.
- `cd apps/ai-service && uvx --with-requirements requirements.lock --from uvicorn uvicorn main:app --reload --port 8000` runs the AI service.

## Coding Style & Naming Conventions

- Follow existing formatting in each module; Svelte/TypeScript generally use 2-space indents, Python uses 4.
- Linting: `pnpm --filter @notflix/platform lint` and `pnpm --filter @notflix/database lint`.
- Python style/security tooling is configured in `apps/ai-service/pyproject.toml` (ruff, pylint, bandit).
- Test naming: Playwright specs use `*.spec.ts`; Python tests use `test_*.py`.

## Testing Guidelines

- Frontend E2E: `pnpm --filter @notflix/platform test:e2e`.
- Full stack E2E with Docker: `pnpm --filter @notflix/platform test:e2e:docker`.
- AI service tests: `cd apps/ai-service && uvx --with-requirements requirements.lock --from pytest pytest`.

## Commit & Pull Request Guidelines

- Use Conventional Commits; examples from history: `feat(platform): ...`, `chore(deps): ...`.
- PRs should include a brief summary, test evidence, and screenshots for UI changes.
- Link related issues and call out any environment/config changes (e.g., DB or API keys).

## Configuration & Secrets

- Dev defaults are injected by `scripts/manager.mjs` (e.g., `DATABASE_URL`, `AI_SERVICE_URL`).
- Test env lives in `apps/platform/.env.test`; avoid committing real secrets.
