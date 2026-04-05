FROM node:20-alpine AS base
WORKDIR /app

FROM base AS dependencies
COPY shared ./shared
COPY services/game-service ./services/game-service
RUN cd shared && npm install --production
RUN cd services/game-service && npm install --production

FROM base AS runner
COPY --from=dependencies /app/shared ./shared
COPY --from=dependencies /app/services/game-service ./services/game-service

USER node
ENV NODE_ENV=production
ENV SERVICE_NAME=game-service
EXPOSE 3002
CMD ["node", "services/game-service/src/index.js"]
