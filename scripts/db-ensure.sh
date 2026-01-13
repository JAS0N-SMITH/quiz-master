#!/usr/bin/env bash
set -euo pipefail

SERVICE="postgres"
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
cd "$ROOT_DIR"

# Get container id for the postgres service (empty if not running)
CONTAINER_ID=$(docker compose ps -q "$SERVICE" || true)

if [[ -z "$CONTAINER_ID" ]]; then
  # If container not found, check if local port 5432 is already in use
  if command -v nc >/dev/null 2>&1 && nc -z localhost 5432; then
    echo "Detected a local Postgres on port 5432. Skipping docker compose start."
    exit 0
  fi

  echo "Postgres not running via compose. Starting 'postgres' service..."
  docker compose up -d "$SERVICE"
  CONTAINER_ID=$(docker compose ps -q "$SERVICE")
fi

# If we have a container, wait for healthy status
if [[ -n "$CONTAINER_ID" ]]; then
  ATTEMPTS=30
  SLEEP=2
  for ((i=1; i<=ATTEMPTS; i++)); do
    STATUS=$(docker inspect -f '{{.State.Health.Status}}' "$CONTAINER_ID" 2>/dev/null || echo "unknown")
    if [[ "$STATUS" == "healthy" ]]; then
      echo "Postgres is healthy (container: $CONTAINER_ID)."
      exit 0
    fi
    echo "Waiting for Postgres to be healthy (status: $STATUS)... ($i/$ATTEMPTS)"
    sleep "$SLEEP"
  done
  echo "Postgres did not become healthy in time. Check 'docker compose logs $SERVICE'."
  exit 1
fi

echo "Postgres readiness assumed (external service detected)."
exit 0
