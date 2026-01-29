# Repository Guidelines

## Project Structure & Module Organization

- `apps/platform/` is the SvelteKit web app (routes, components, server services).
- `apps/ai-service/` is the FastAPI-based AI service (Python core, tests, OpenAPI).
- `packages/database/` holds Drizzle schema and migration tooling.
- `infra/` contains Docker Compose files for local/test infrastructure.
- `assets/` and `media/` store vocabulary datasets and media fixtures.

## Build, Test, and Development Commands

- `node scripts/manager.mjs` (or `start.bat`/`start.sh`) boots DB, AI service, and the platform dev server.
- `npm run dev --workspace=@notflix/platform` runs the SvelteKit dev server (default `http://localhost:5173`).
- `npm run build --workspace=@notflix/platform` builds the web app; `npm run preview --workspace=@notflix/platform` serves the build.
- `npm run db:push --workspace=@notflix/database` applies Drizzle schema to the local DB.
- `python -m uvicorn main:app --reload --port 8000` runs the AI service from `apps/ai-service/`.

## Coding Style & Naming Conventions

- Follow existing formatting in each module; Svelte/TypeScript generally use 2-space indents, Python uses 4.
- Linting: `npm run lint --workspace=@notflix/platform` and `npm run lint --workspace=@notflix/database`.
- Python style/security tooling is configured in `apps/ai-service/pyproject.toml` (ruff, pylint, bandit).
- Test naming: Playwright specs use `*.spec.ts`; Python tests use `test_*.py`.

## Testing Guidelines

- Frontend E2E: `npm run test:e2e --workspace=@notflix/platform`.
- Full stack E2E with Docker: `npm run test:e2e:docker --workspace=@notflix/platform`.
- AI service tests: `python -m pytest` from `apps/ai-service/`.

## Commit & Pull Request Guidelines

- Use Conventional Commits; examples from history: `feat(platform): ...`, `chore(deps): ...`.
- PRs should include a brief summary, test evidence, and screenshots for UI changes.
- Link related issues and call out any environment/config changes (e.g., DB or API keys).

## Configuration & Secrets

- Dev defaults are injected by `scripts/manager.mjs` (e.g., `DATABASE_URL`, `AI_SERVICE_URL`).
- Test env lives in `apps/platform/.env.test`; avoid committing real secrets.
