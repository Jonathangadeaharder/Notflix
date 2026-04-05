FROM node:25-slim

RUN npm install -g pnpm@10

WORKDIR /app

# ── Dependency layer (cached unless manifests change) ────
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json packages/database/
COPY apps/platform/package.json apps/platform/

RUN pnpm install --filter @notflix/platform --filter @notflix/database && \
    pnpm approve-builds esbuild && \
    pnpm install --filter @notflix/platform --filter @notflix/database

# ── Config layer (cached unless build config changes) ────
COPY apps/platform/svelte.config.js apps/platform/
COPY apps/platform/vite.config.ts   apps/platform/
COPY apps/platform/tsconfig.json    apps/platform/

# ── Source layer ─────────────────────────────────────────
COPY packages/database packages/database
COPY apps/platform     apps/platform

WORKDIR /app/apps/platform

# ── Security: drop to non-root ──────────────────────────
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 5173
CMD ["pnpm", "run", "dev", "--", "--host"]
