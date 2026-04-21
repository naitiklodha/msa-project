FROM node:18-alpine

WORKDIR /app

# Copy shared library first
COPY shared ./shared

# Copy room-service stuff
COPY services/room-service/package.json ./services/room-service/
RUN cd shared && npm install
RUN cd services/room-service && npm install

COPY services/room-service/src ./services/room-service/src

EXPOSE 3008

CMD ["node", "services/room-service/src/index.js"]
