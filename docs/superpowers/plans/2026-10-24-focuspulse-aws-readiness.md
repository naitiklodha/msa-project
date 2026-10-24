# FocusPulse AWS Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make FocusPulse deployable behind AWS infrastructure through a consistent environment, health, CORS, and WebSocket contract while retaining local Docker Compose support.

**Architecture:** Browser clients use configurable public API and WebSocket bases, defaulting to same-origin. Kong and Nginx receive runtime-configurable internal upstreams, while services bind `PORT`, expose standardized probes, and gracefully drain HTTP traffic on termination.

**Tech Stack:** React/Vite, Nginx, Kong declarative configuration, Node.js/Express/Socket.IO, FastAPI, Go, Docker Compose.

---

### Task 1: Frontend endpoint configuration

Introduce `VITE_API_BASE_URL` and `VITE_WS_BASE_URL`, normalize their values, and replace browser-visible hard-coded gateway locations in Axios and Socket.IO clients.

### Task 2: Health and shutdown lifecycle

Provide `/health/live` and `/health/ready` alongside compatibility aliases. Make Node, Python, and Go HTTP processes stop accepting new connections before dependent clients are closed.

### Task 3: Gateway, CORS, and proxy configuration

Use Kong environment interpolation for every upstream; require explicit CORS origins; preserve `/socket.io`, `/ws/leaderboard`, and `/ws/rooms` through Nginx and Kong.

### Task 4: Compose and Docker contract

Standardize `*_SERVICE_PORT` variables, document all production variables, expose matching defaults, and validate the resolved Compose model.

### Task 5: Verification

Add focused endpoint, health, and static route checks; build the frontend; compile language-specific services; validate `docker compose config`.
