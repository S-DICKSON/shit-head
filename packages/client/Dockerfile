# Multi-stage Dockerfile for Vite client dev server
# Build context: project root (need access to root package.json, bun.lockb, and shared package)

# Development stage
FROM oven/bun:1 AS dev
WORKDIR /app

# Copy root dependencies and TypeScript config
COPY package.json bun.lockb* tsconfig.json ./

# Copy package.json files for workspace resolution
COPY packages/client/package.json ./packages/client/
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# Install dependencies
RUN bun install

# Copy source (will be overridden by volume mounts in dev mode)
COPY packages/client/ ./packages/client/
COPY packages/shared/ ./packages/shared/

# Expose Vite dev server port
EXPOSE 5173

# Start Vite dev server with host binding for Docker
CMD ["bunx", "vite", "--host", "0.0.0.0"]
