# Playwright E2E test runner
# Uses official Playwright image (Node.js + browsers pre-installed)
# Build context: project root

FROM mcr.microsoft.com/playwright:v1.58.0-noble

WORKDIR /app/packages/e2e

# Copy package.json and install deps
COPY packages/e2e/package.json ./
RUN npm install

# Copy source (overridden by volume mounts in dev)
COPY packages/e2e/ ./
