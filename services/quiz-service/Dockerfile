FROM node:20-alpine AS base
WORKDIR /app

FROM base AS dependencies
COPY shared ./shared
COPY services/quiz-service ./services/quiz-service
RUN cd shared && npm install --production
RUN cd services/quiz-service && npm install --production

FROM base AS runner
COPY --from=dependencies /app/shared ./shared
COPY --from=dependencies /app/services/quiz-service ./services/quiz-service

USER node
ENV NODE_ENV=production
ENV SERVICE_NAME=quiz-service
EXPOSE 3003
CMD ["node", "services/quiz-service/src/index.js"]
