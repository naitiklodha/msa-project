FROM node:18-slim

WORKDIR /app

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
