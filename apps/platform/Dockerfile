# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder

RUN npm install -g pnpm@10

ENV HUSKY=0

WORKDIR /app

# ── Dependency layer
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json packages/database/
COPY apps/platform/package.json apps/platform/

RUN pnpm install --filter @notflix/platform --filter @notflix/database --ignore-scripts && \
    pnpm rebuild esbuild

# ── Source layer
COPY packages/database packages/database
COPY apps/platform apps/platform

RUN pnpm run --filter @notflix/platform prepare && \
    pnpm run --filter @notflix/platform build

# ── Runner layer
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# ── Security: drop to non-root
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 svelte
COPY --from=builder --chown=svelte:nodejs /app /app

WORKDIR /app/apps/platform
USER svelte

EXPOSE 3000

CMD ["node", "build/index.js"]
