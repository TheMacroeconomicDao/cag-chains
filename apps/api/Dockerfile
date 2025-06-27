# CAG-Chains API Dockerfile
# Multi-stage build for production

# Base stage
FROM oven/bun:1.0.21-alpine AS base
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Dependencies stage
FROM base AS deps
COPY package.json bun.lockb* ./
COPY packages/core/package.json ./packages/core/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN bun install --frozen-lockfile --production

# Development stage
FROM base AS development
COPY package.json bun.lockb* ./
COPY packages/core/package.json ./packages/core/
COPY apps/api/package.json ./apps/api/

# Install all dependencies (including dev)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the project
RUN bun run build

EXPOSE 3001
CMD ["bun", "run", "apps/api/src/index.ts"]

# Production stage
FROM base AS production
ENV NODE_ENV=production
ENV PORT=3001

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=development /app/packages ./packages
COPY --from=development /app/apps/api ./apps/api
COPY --from=development /app/package.json ./
COPY --from=development /app/turbo.json ./
COPY --from=development /app/tsconfig.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S cag-api -u 1001

# Create logs directory
RUN mkdir -p /app/logs && chown -R cag-api:nodejs /app/logs

# Switch to non-root user
USER cag-api

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

EXPOSE 3001

# Start the application
CMD ["bun", "run", "apps/api/src/index.ts"] 