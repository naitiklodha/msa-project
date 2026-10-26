FROM node:18-slim

WORKDIR /app

# Install curl and download RDS CA bundle at build time
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o /tmp/rds-ca.pem \
    && grep -q "BEGIN CERTIFICATE" /tmp/rds-ca.pem \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_EXTRA_CA_CERTS=/tmp/rds-ca.pem

# Copy shared library first
COPY shared ./shared

# Copy service code
COPY services/leaderboard-service ./services/leaderboard-service

# Install dependencies for shared and then the service
WORKDIR /app/shared
RUN npm install

WORKDIR /app/services/leaderboard-service
RUN npm install

EXPOSE 3005

CMD ["npm", "start"]
