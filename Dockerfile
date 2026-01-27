FROM node:20-alpine AS base

# Install FFmpeg for video conversion and security updates
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache ffmpeg

WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM base AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nachyomi -u 1001 -G nodejs

# Create temp directory for video processing
RUN mkdir -p /tmp/nachyomi && chown nachyomi:nodejs /tmp/nachyomi

COPY --from=deps --chown=nachyomi:nodejs /app/node_modules ./node_modules
COPY --chown=nachyomi:nodejs src/ ./src/
COPY --chown=nachyomi:nodejs package.json ./

USER nachyomi

# Environment
ENV NODE_ENV=production
ENV ENABLE_VIDEO=true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

CMD ["node", "src/index.js"]
