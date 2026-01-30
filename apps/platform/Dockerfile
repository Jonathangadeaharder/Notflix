FROM node:25-slim

WORKDIR /app

# Copy monorepo manifests
COPY package.json package-lock.json ./
COPY packages/database/package.json packages/database/
COPY apps/platform/package.json apps/platform/

# Install dependencies for the specific workspace and its dependencies
# This uses the root lockfile for deterministic builds
RUN npm ci --workspace=@notflix/platform --workspace=@notflix/database --include=dev && npm cache clean --force

# Setup Web App Configs (required for svelte-kit sync in 'prepare' script)
COPY apps/platform/svelte.config.js apps/platform/
COPY apps/platform/vite.config.ts apps/platform/
COPY apps/platform/tsconfig.json apps/platform/

# Copy source code
COPY packages/database packages/database
COPY apps/platform apps/platform

# Set working directory to the app
WORKDIR /app/apps/platform

# Create non-root user for security
RUN useradd -m appuser && chown -R appuser /app
RUN chown -R appuser /app
USER appuser

# Expose Vite port
EXPOSE 5173

# Start in dev mode, binding to all interfaces
CMD ["npm", "run", "dev", "--", "--host"]
