FROM node:20-alpine AS base
WORKDIR /app

# Install curl and download RDS CA bundle at build time (as root)
RUN apk add --no-cache curl ca-certificates \
    && curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o /tmp/rds-ca.pem \
    && grep -q "BEGIN CERTIFICATE" /tmp/rds-ca.pem \
    && update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/tmp/rds-ca.pem

FROM base AS dependencies
COPY shared ./shared
COPY bff ./bff
RUN cd shared && npm install --production
RUN cd bff && npm install --production

FROM base AS runner
COPY --from=dependencies /app/shared ./shared
COPY --from=dependencies /app/bff ./bff

USER node
ENV NODE_ENV=production
ENV SERVICE_NAME=bff
EXPOSE 3010
CMD ["node", "bff/src/index.js"]
