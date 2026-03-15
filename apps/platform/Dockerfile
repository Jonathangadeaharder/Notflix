FROM node:25-slim

WORKDIR /app

# Copy monorepo manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/database/package.json packages/database/
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/platform/package.json apps/platform/

# Install pnpm and workspace dependencies
RUN corepack enable && corepack prepare pnpm@10.32.0 --activate
RUN pnpm install --frozen-lockfile --ignore-scripts

# Setup Web App Configs (required for svelte-kit sync in 'prepare' script)
COPY apps/platform/svelte.config.js apps/platform/
COPY apps/platform/vite.config.ts apps/platform/
COPY apps/platform/tsconfig.json apps/platform/

# Copy source code
COPY packages/database packages/database
COPY packages/shared-types packages/shared-types
COPY apps/platform apps/platform
RUN pnpm --filter @notflix/platform prepare

# Set working directory to the app
WORKDIR /app/apps/platform

# Create non-root user for security
RUN useradd -m appuser && chown -R appuser /app
RUN chown -R appuser /app
USER appuser

# Expose Vite port
EXPOSE 5173

# Start in dev mode, binding to all interfaces
CMD ["pnpm", "run", "dev", "--", "--host"]
