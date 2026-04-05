FROM node:20-alpine AS base
WORKDIR /app

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
