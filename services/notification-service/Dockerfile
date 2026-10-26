FROM node:18-slim

WORKDIR /app

# Install curl and download RDS CA bundle at build time
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -sL https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem -o /tmp/rds-ca.pem \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_EXTRA_CA_CERTS=/tmp/rds-ca.pem

# Copy shared library first
COPY shared ./shared

# Copy service code
COPY services/notification-service ./services/notification-service

# Install dependencies for shared and then the service
WORKDIR /app/shared
RUN npm install

WORKDIR /app/services/notification-service
RUN npm install

EXPOSE 3007

CMD ["npm", "start"]
