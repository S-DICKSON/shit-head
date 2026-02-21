# Multi-stage Dockerfile for Bun server
# Build context: project root (need access to root package.json, bun.lock, and shared package)

# Base stage with Bun runtime
FROM oven/bun:1 AS base
WORKDIR /app

# Development stage
FROM base AS dev
# Copy root dependencies and TypeScript config
COPY package.json bun.lock* tsconfig.json ./
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

# Client build stage (builds Vite production assets)
FROM base AS client-build
WORKDIR /app
# Copy root dependencies and TypeScript config
COPY package.json bun.lock* tsconfig.json ./
# Copy all package.json files for dependency resolution
COPY packages/client/package.json ./packages/client/
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
# Copy client TypeScript configs
COPY packages/client/tsconfig.json ./packages/client/
COPY packages/client/tsconfig.app.json ./packages/client/
COPY packages/client/tsconfig.node.json ./packages/client/
COPY packages/shared/tsconfig.json ./packages/shared/
# Install all dependencies (including devDependencies for Vite build)
RUN bun install --frozen-lockfile
# Copy client and shared source
COPY packages/client/ ./packages/client/
COPY packages/shared/ ./packages/shared/
# Build client assets
WORKDIR /app/packages/client
ENV VITE_DISCORD_CLIENT_ID=1473070068190679163
RUN bunx vite build
# Result: client assets in /app/packages/client/dist/

# Production stage (unified server + client)
FROM base AS production
WORKDIR /app
# Copy package files for dependency resolution
COPY package.json bun.lock* tsconfig.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/
# Install production dependencies only
RUN bun install --frozen-lockfile --production
# Copy server and shared source
COPY packages/server/ ./packages/server/
COPY packages/shared/ ./packages/shared/
# Copy built client assets from client-build stage
COPY --from=client-build /app/packages/client/dist ./packages/client/dist
# Expose unified port (WebSocket + API + static files)
EXPOSE 3000
# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
# Start server (WebSocket + API + static files)
CMD ["bun", "packages/server/src/index.ts"]
