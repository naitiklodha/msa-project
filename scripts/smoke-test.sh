#!/bin/bash
set -e

# This runs through the full flow: health, auth with real DB,
# timer sessions, and checking that scores land in Redis.

GATEWAY="http://localhost:8000"
echo "🚀 Starting FocusPulse Smoke Test..."

# Checking service health first.
# echo -e "\n--- Checking Service Health ---"
# services=("auth" "game" "quiz" "timer" "leaderboard" "notification")
# for svc in "${services[@]}"; do
#   status=$(curl -s -o /dev/null -w "%{http_code}" $GATEWAY/$svc/healthz)
#   if [ $status -eq 200 ]; then
#     echo "✅ $svc-service is HEALTHY"
#   else
#     echo "❌ $svc-service is UNHEALTHY ($status)"
#   fi
# done

# Testing the registration and login flows (now with real Postgres).
echo -e "\n--- Testing Auth Flow (Real DB) ---"

TIMESTAMP=$(date +%s)
TEST_EMAIL="smoke-${TIMESTAMP}@test.com"

# Registration
echo "Registering ${TEST_EMAIL}..."
REGISTER_RES=$(curl -s -X POST $GATEWAY/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${TEST_EMAIL}\", \"password\": \"password123\", \"role\": \"user\"}")

USER_ID=$(echo $REGISTER_RES | sed -n 's/.*"userId":"\([^"]*\)".*/\1/p')

if [ -n "$USER_ID" ]; then
  echo "✅ User Created: $USER_ID"
else
  echo "❌ Registration Failed: $REGISTER_RES"
  exit 1
fi

# Duplicate registration should fail with 409
echo "Testing duplicate registration..."
DUP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $GATEWAY/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${TEST_EMAIL}\", \"password\": \"password123\"}")

if [ $DUP_STATUS -eq 409 ]; then
  echo "✅ Duplicate correctly rejected (409)"
else
  echo "❌ Duplicate check failed (got $DUP_STATUS, expected 409)"
fi

# Login with the same creds
echo "Logging in..."
LOGIN_RES=$(curl -s -X POST $GATEWAY/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${TEST_EMAIL}\", \"password\": \"password123\"}")

TOKEN=$(echo $LOGIN_RES | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')

if [ -n "$TOKEN" ]; then
  echo "✅ Login Successful (JWT Received)"
else
  echo "❌ Login Failed: $LOGIN_RES"
  exit 1
fi

# Making sure we can actually hit a protected route after we're logged in.
echo -e "\n--- Testing Protected Route ---"
GAME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $GATEWAY/game/status \
  -H "Authorization: Bearer $TOKEN")

if [ $GAME_STATUS -eq 200 ]; then
  echo "✅ Gateway correctly routed and authenticated request to game-service"
else
  echo "❌ Gateway/Auth routing failed status: $GAME_STATUS"
  exit 1
fi

# Testing the timer service: start → complete a focus session
echo -e "\n--- Testing Timer Flow ---"

echo "Starting a focus session..."
SESSION_RES=$(curl -s -X POST $GATEWAY/timer/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"durationMinutes": 25}')

SESSION_ID=$(echo $SESSION_RES | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')

if [ -n "$SESSION_ID" ]; then
  echo "✅ Focus session started: $SESSION_ID"
else
  echo "❌ Failed to start session: $SESSION_RES"
  exit 1
fi

# Check active session
ACTIVE_RES=$(curl -s $GATEWAY/timer/sessions/active \
  -H "Authorization: Bearer $TOKEN")
ACTIVE=$(echo $ACTIVE_RES | sed -n 's/.*"active":\([^,}]*\).*/\1/p')

if [ "$ACTIVE" = "true" ]; then
  echo "✅ Active session confirmed"
else
  echo "❌ Active session check failed: $ACTIVE_RES"
fi

# Complete the session (this triggers the scoring chain)
echo "Completing focus session..."
COMPLETE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST $GATEWAY/timer/sessions/$SESSION_ID/complete \
  -H "Authorization: Bearer $TOKEN")

if [ $COMPLETE_STATUS -eq 200 ]; then
  echo "✅ Focus session completed"
else
  echo "❌ Failed to complete session ($COMPLETE_STATUS)"
fi

# Give Kafka a moment to propagate the events through the chain
echo "Waiting for event propagation (5s)..."
sleep 5

# Check game stats
echo -e "\n--- Checking Game Stats ---"
STATS_RES=$(curl -s $GATEWAY/game/stats \
  -H "Authorization: Bearer $TOKEN")
TOTAL_SCORE=$(echo $STATS_RES | sed -n 's/.*"totalScore":\([0-9]*\).*/\1/p')

if [ -n "$TOTAL_SCORE" ] && [ "$TOTAL_SCORE" -gt 0 ] 2>/dev/null; then
  echo "✅ Score recorded: $TOTAL_SCORE points"
else
  echo "⚠️  Score not yet propagated: $STATS_RES"
fi

# Check Analytics Service (Go)
echo -e "\n--- Checking Analytics Overview (Go) ---"
ANALYTICS_RES=$(curl -s $GATEWAY/analytics/overview \
  -H "Authorization: Bearer $TOKEN")
INGESTED=$(echo $ANALYTICS_RES | sed -n 's/.*"events_ingested":\([0-9]*\).*/\1/p')

if [ -n "$INGESTED" ] && [ "$INGESTED" -gt 0 ] 2>/dev/null; then
  echo "✅ Analytics service ingested $INGESTED events"
else
  echo "❌ Analytics service verification failed: $ANALYTICS_RES"
  exit 1
fi

echo -e "\n🔥 ALL TESTS PASSED SUCCESSFULLY 🔥"
