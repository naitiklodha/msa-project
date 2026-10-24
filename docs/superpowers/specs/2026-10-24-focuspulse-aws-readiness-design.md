# FocusPulse AWS Readiness Design

## Goal

Allow every FocusPulse service to run independently with environment-based configuration while preserving `docker compose up` as the local developer workflow.

## External Endpoint Contract

The browser uses `VITE_API_BASE_URL` for HTTP APIs and `VITE_WS_BASE_URL` for Socket.IO connections. Both default to the current origin, so the local frontend container reaches Kong through its reverse proxy without embedding `localhost` or a Docker DNS name in browser JavaScript.

When AWS deploys the frontend and gateway behind different public origins, build the frontend with explicit HTTPS and WSS bases. Socket.IO keeps the existing paths: `/socket.io`, `/ws/leaderboard`, and `/ws/rooms/socket.io`.

## Gateway and CORS Contract

Kong service URLs are expressed through declarative configuration environment interpolation. Compose supplies internal Docker defaults; production supplies service discovery DNS or private load-balancer addresses. `CORS_ORIGINS` is an explicit comma-separated allowlist. Credentials are permitted only with those explicit origins; wildcard origins are not used.

## Service Contract

Each HTTP service exposes `/health/live` for process liveness and `/health/ready` for dependency readiness. Existing `/healthz` and `/readyz` remain as compatibility aliases. Services bind their `PORT` environment variable, while the documented service-specific variables provide local defaults. On `SIGTERM`, HTTP servers stop accepting new requests before closing Kafka, Postgres, and Redis connections.

## Container Contract

Dockerfiles expose their documented default port without baking in a deployment hostname. Compose passes every inter-service URL explicitly, uses readiness probes for dependency-aware services, and preserves the local port mapping. The frontend container routes all same-origin API and WebSocket paths to Kong through a configurable internal upstream.

## Verification

Focused tests cover frontend URL resolution and shared health routes. Static checks validate Kong interpolation and all three WebSocket routes. The frontend build and `docker compose config` validate the production environment contract without requiring a running AWS account.
