#!/usr/bin/env bash
# Azure App Service startup — migrations then Next.js (standalone or npm start).
set -euo pipefail

cd "$(dirname "$0")"

echo "[startup] CloudContent TR — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "[startup] NODE_ENV=${NODE_ENV:-unset} PORT=${PORT:-3000}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[startup] ERROR: DATABASE_URL is not set."
  exit 1
fi

if [ -f "prisma/schema.prisma" ] && command -v npx >/dev/null 2>&1; then
  echo "[startup] Running Prisma migrations (migrate deploy)..."
  npx prisma migrate deploy
else
  echo "[startup] Skipping migrations (no prisma/schema or run migrations in CI)."
fi

if [ -f "server.js" ]; then
  export HOSTNAME="${HOSTNAME:-0.0.0.0}"
  export PORT="${PORT:-3000}"
  echo "[startup] Starting Next.js standalone on port $PORT"
  exec node server.js
fi

if [ -f ".next/standalone/server.js" ]; then
  export HOSTNAME="${HOSTNAME:-0.0.0.0}"
  export PORT="${PORT:-3000}"
  echo "[startup] Starting Next.js standalone on port $PORT"
  exec node .next/standalone/server.js
fi

echo "[startup] Starting Next.js via npm start"
exec npm run start
