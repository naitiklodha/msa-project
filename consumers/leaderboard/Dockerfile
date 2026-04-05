FROM node:20-alpine AS base
WORKDIR /app

FROM base AS dependencies
COPY shared ./shared
COPY consumers/leaderboard ./consumers/leaderboard
RUN cd shared && npm install --production
RUN cd consumers/leaderboard && npm install --production

FROM base AS runner
COPY --from=dependencies /app/shared ./shared
COPY --from=dependencies /app/consumers/leaderboard ./consumers/leaderboard

USER node
ENV NODE_ENV=production
ENV SERVICE_NAME=leaderboard-consumer
CMD ["node", "consumers/leaderboard/src/index.js"]
