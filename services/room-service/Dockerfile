FROM node:18-alpine

WORKDIR /app

# Install curl and download RDS CA bundle at build time
RUN apk add --no-cache curl \
    && curl -sL https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem -o /tmp/rds-ca.pem \
    && update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/tmp/rds-ca.pem

# Copy shared library first
COPY shared ./shared

# Copy room-service stuff
COPY services/room-service/package.json ./services/room-service/
RUN cd shared && npm install
RUN cd services/room-service && npm install

COPY services/room-service/src ./services/room-service/src

EXPOSE 3008

CMD ["node", "services/room-service/src/index.js"]
