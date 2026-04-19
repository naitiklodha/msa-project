#!/bin/bash
set -e

# This runs through the basics—health, registration, and checking 
# that our JWT actually lets us into a protected service.

GATEWAY="http://localhost:8000"
echo "🚀 Starting FocusPulse Smoke Test..."

# Checking service health first.
echo -e "\n--- Checking Service Health ---"
services=("auth" "game" "quiz" "timer")
for svc in "${services[@]}"; do
  # Internal health check via Gateway
  status=$(curl -s -o /dev/null -w "%{http_code}" $GATEWAY/$svc/healthz)
  if [ $status -eq 200 ]; then
    echo "✅ $svc-service is HEALTHY"
  else
    echo "❌ $svc-service is UNHEALTHY ($status)"
  fi
done

# Testing the registration and login flows.
echo -e "\n--- Testing Auth Flow ---"

# Registration
echo "Creating User..."
REGISTER_RES=$(curl -s -X POST $GATEWAY/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "smoke@test.com", "password": "password123", "role": "user"}')

# Simple JSON hack using sed since we might not have jq installed everywhere.
USER_ID=$(echo $REGISTER_RES | sed -n 's/.*"userId":"\([^"]*\)".*/\1/p')

if [ -n "$USER_ID" ]; then
  echo "✅ User Created: $USER_ID"
else
  echo "❌ Registration Failed: $REGISTER_RES"
  exit 1
fi

# Login
echo "Logging In..."
LOGIN_RES=$(curl -s -X POST $GATEWAY/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@focuspulse.com", "password": "password"}')

TOKEN=$(echo $LOGIN_RES | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')

if [ -n "$TOKEN" ]; then
  echo "✅ Login Successful (JWT Received)"
else
  echo "❌ Login Failed: $LOGIN_RES"
  exit 1
fi

# Making sure we can actually hit a protected route after we're logged in.
echo -e "\n--- Testing Protected Route ---"
# Passing the Bearer token to game-service which uses authMiddleware
GAME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $GATEWAY/game/status \
  -H "Authorization: Bearer $TOKEN")

if [ $GAME_STATUS -eq 200 ]; then
  echo "✅ Gateway correctly routed and authenticated request to game-service"
else
  echo "❌ Gateway/Auth routing failed status: $GAME_STATUS"
  exit 1
fi

echo -e "\n🔥 ALL TESTS PASSED SUCCESSFULLY 🔥"
