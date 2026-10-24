# Build stage
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV VITE_API_BASE_URL=""
ENV VITE_WS_BASE_URL=""
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
