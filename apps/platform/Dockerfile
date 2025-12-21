FROM node:20-slim

WORKDIR /app

# Copy shared packages first (dependencies)
# We assume the build context is the repository root
COPY packages/db packages/db

# Install dependencies for packages/db
WORKDIR /app/packages/db
# If packages/db has dependencies, install them. 
# Assuming it's a simple package, but 'npm install' is safe.
RUN npm install

# Setup Web App
WORKDIR /app/apps/web
COPY apps/web/package.json .
COPY apps/web/package-lock.json .
RUN npm install

# Copy source
COPY apps/web .

# Expose Vite port
EXPOSE 5173

# Start in dev mode, binding to all interfaces
CMD ["npm", "run", "dev", "--", "--host"]
