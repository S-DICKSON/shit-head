# Multi-stage Dockerfile for Vue client
# Build context: project root (need access to root package.json, bun.lockb, and shared package)

# Base stage with Bun runtime
FROM oven/bun:1 AS base
WORKDIR /app

# Development stage
FROM base AS dev
# Copy root dependencies and TypeScript config
COPY package.json bun.lockb* tsconfig.json ./
COPY packages/client/package.json ./packages/client/
COPY packages/shared/package.json ./packages/shared/
# Install dependencies
RUN bun install
# Copy source (will be overridden by volume mounts in dev mode)
COPY packages/client/ ./packages/client/
COPY packages/shared/ ./packages/shared/
# Expose Vite dev server port
EXPOSE 5173
# Start Vite dev server with --host for Docker access
CMD ["bunx", "vite", "--host", "packages/client"]

# Build stage - creates production assets
FROM base AS build
# Copy root dependencies and TypeScript config
COPY package.json bun.lockb* tsconfig.json ./
COPY packages/client/package.json ./packages/client/
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/client/tsconfig.json ./packages/client/
COPY packages/client/tsconfig.app.json ./packages/client/
COPY packages/client/tsconfig.node.json ./packages/client/
# Install all dependencies (need dev deps for build)
RUN bun install --frozen-lockfile
# Copy source
COPY packages/client/ ./packages/client/
COPY packages/shared/ ./packages/shared/
# Build production assets
WORKDIR /app/packages/client
RUN bunx vite build

# Production stage - serve static files with nginx
FROM nginx:alpine AS production
# Copy built assets from build stage
COPY --from=build /app/packages/client/dist /usr/share/nginx/html
# Expose nginx default port
EXPOSE 80
# nginx starts automatically via base image CMD
