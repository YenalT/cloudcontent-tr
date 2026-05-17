#!/usr/bin/env bash
# Azure App Service startup — migrations then Next.js (standalone or npm start).
set -euo pipefail

cd "$(dirname "$0")"

echo "[startup] CloudContent TR — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "[startup] NODE_ENV=${NODE_ENV:-unset} PORT=${PORT:-3000}"

# Prisma treats whitespace-only DATABASE_URL as set but invalid (empty string).
if [ -z "${DATABASE_URL:-}" ] || [ -z "$(printf '%s' "${DATABASE_URL}" | tr -d '[:space:]')" ]; then
  echo "[startup] ERROR: DATABASE_URL is missing or empty."
  echo ""
  echo "Set DATABASE_URL in Azure Portal:"
  echo "  App Service → Settings → Environment variables → + Add"
  echo "  Name:  DATABASE_URL"
  echo "  Value: postgresql://USER:PASSWORD@HOST.postgres.database.azure.com:5432/cloudcontent_tr?schema=public&sslmode=require"
  echo ""
  echo "Click Apply, confirm the restart, then check Log stream again."
  echo "Do not leave DATABASE_URL as an empty Application setting — that blocks Prisma."
  echo ""
  echo "See README_GITHUB_AZURE_DEPLOYMENT.md → \"Set DATABASE_URL in Azure App Service\"."
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
