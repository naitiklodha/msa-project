FROM node:20-alpine AS base
WORKDIR /app

FROM base AS dependencies
COPY shared ./shared
COPY bff ./bff
RUN cd shared && npm install --production
RUN cd bff && npm install --production

FROM base AS runner
COPY --from=dependencies /app/shared ./shared
COPY --from=dependencies /app/bff ./bff

USER node
ENV NODE_ENV=production
ENV SERVICE_NAME=bff
EXPOSE 3010
CMD ["node", "bff/src/index.js"]
