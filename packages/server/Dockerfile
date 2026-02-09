# Multi-stage Dockerfile for Bun server
# Build context: project root (need access to root package.json, bun.lockb, and shared package)

# Base stage with Bun runtime
FROM oven/bun:1 AS base
WORKDIR /app

# Development stage
FROM base AS dev
# Copy root dependencies and TypeScript config
COPY package.json bun.lockb* tsconfig.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/
# Install dependencies
RUN bun install
# Copy source (will be overridden by volume mounts in dev mode)
COPY packages/server/ ./packages/server/
COPY packages/shared/ ./packages/shared/
# Expose server port
EXPOSE 3000
# Start with --watch for hot reload
CMD ["bun", "--watch", "packages/server/src/index.ts"]

# Production stage (server-only for Fly.io)
FROM base AS production
WORKDIR /app
# Copy package files for dependency resolution
COPY package.json bun.lockb* tsconfig.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/
# Install production dependencies only
RUN bun install --frozen-lockfile --production
# Copy server and shared source
COPY packages/server/ ./packages/server/
COPY packages/shared/ ./packages/shared/
# Expose server port
EXPOSE 8080
# Set production environment
ENV NODE_ENV=production
ENV PORT=8080
# Start server (WebSocket + API only, no static files)
CMD ["bun", "packages/server/src/index.ts"]
