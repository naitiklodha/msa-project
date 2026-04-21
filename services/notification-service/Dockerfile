FROM node:18-slim

WORKDIR /app

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
