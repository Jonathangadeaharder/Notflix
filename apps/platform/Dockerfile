FROM node:20-slim

WORKDIR /app

# Copy shared packages first (dependencies)
# We assume the build context is the repository root
COPY packages/database packages/database

# Install dependencies for packages/database
WORKDIR /app/packages/database
RUN npm install

# Setup Web App
WORKDIR /app/apps/platform
COPY apps/platform/package.json .
# SKIP: COPY apps/platform/package-lock.json .
RUN npm install --legacy-peer-deps && npm cache clean --force

# Copy source
COPY apps/platform .

# Create non-root user for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# Expose Vite port
EXPOSE 5173

# Start in dev mode, binding to all interfaces
CMD ["npm", "run", "dev", "--", "--host"]
