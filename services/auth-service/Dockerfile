# ── Production Image ──────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# ── Dependency Stage ──
FROM base AS dependencies
# We MUST copy the entire shared source before npm install because it's a file: dependency
COPY shared ./shared
COPY services/auth-service ./services/auth-service

# Install dependencies for both the library and the service
RUN cd shared && npm install --production
RUN cd services/auth-service && npm install --production

# ── Final Runner ──
FROM base AS runner
COPY --from=dependencies /app/shared ./shared
COPY --from=dependencies /app/services/auth-service ./services/auth-service

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

ENV NODE_ENV=production
ENV SERVICE_NAME=auth-service

EXPOSE 3001

CMD ["node", "services/auth-service/src/index.js"]
