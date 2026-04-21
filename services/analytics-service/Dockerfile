# Build stage
FROM golang:1.22-alpine AS builder
RUN apk add --no-cache gcc musl-dev pkgconf librdkafka-dev
WORKDIR /app
COPY go.mod ./
RUN go mod download 2>/dev/null || true
COPY *.go ./
RUN go mod tidy
RUN CGO_ENABLED=1 go build -tags musl -o analytics-service .

# Production stage
FROM alpine:3.19
RUN apk add --no-cache librdkafka ca-certificates
WORKDIR /app
COPY --from=builder /app/analytics-service .
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s CMD wget -qO- http://localhost:4000/healthz || exit 1
CMD ["./analytics-service"]
