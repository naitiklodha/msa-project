FROM node:20-alpine AS base
WORKDIR /app

# Install curl and download RDS CA bundle at build time (as root)
RUN apk add --no-cache curl \
    && curl -sL https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem -o /tmp/rds-ca.pem \
    && update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/tmp/rds-ca.pem

FROM base AS dependencies
COPY shared ./shared
COPY services/timer-service ./services/timer-service
RUN cd shared && npm install --production
RUN cd services/timer-service && npm install --production

FROM base AS runner
COPY --from=dependencies /app/shared ./shared
COPY --from=dependencies /app/services/timer-service ./services/timer-service

USER node
ENV NODE_ENV=production
ENV SERVICE_NAME=timer-service
EXPOSE 3004
CMD ["node", "services/timer-service/src/index.js"]
