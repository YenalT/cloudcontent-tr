#!/usr/bin/env bash
# Azure App Service startup — migrations then Next.js (standalone preferred).
set -euo pipefail

cd "$(dirname "$0")"
APP_ROOT="$(pwd)"

echo "[startup] CloudContent TR — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "[startup] NODE_ENV=${NODE_ENV:-unset} PORT=${PORT:-8080}"
echo "[startup] cwd=$APP_ROOT"

# Prisma treats whitespace-only DATABASE_URL as set but invalid (empty string).
if [ -z "${DATABASE_URL:-}" ] || [ -z "$(printf '%s' "${DATABASE_URL}" | tr -d '[:space:]')" ]; then
  echo "[startup] ERROR: DATABASE_URL is missing or empty."
  echo ""
  echo "Set DATABASE_URL in Azure Portal:"
  echo "  App Service → Settings → Environment variables → + Add"
  echo "  Name:  DATABASE_URL"
  echo "  Value: postgresql://USER:PASSWORD@HOST.postgres.database.azure.com:5432/cloudcontent_tr?schema=public&sslmode=require"
  echo ""
  echo "See README_GITHUB_AZURE_DEPLOYMENT.md → \"Set DATABASE_URL in Azure App Service\"."
  exit 1
fi

if [ -f "$APP_ROOT/prisma/schema.prisma" ] && command -v npx >/dev/null 2>&1; then
  echo "[startup] Running Prisma migrations (migrate deploy)..."
  npx prisma migrate deploy
else
  echo "[startup] Skipping migrations (no prisma/schema or npx unavailable)."
fi

export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-8080}"

# Prefer Next.js standalone server (no `next` CLI required — recommended for Azure).
if [ -f "$APP_ROOT/server.js" ]; then
  echo "[startup] Starting Next.js standalone: node server.js (port $PORT)"
  exec node "$APP_ROOT/server.js"
fi

if [ -f "$APP_ROOT/.next/standalone/server.js" ]; then
  echo "[startup] Starting Next.js standalone: node .next/standalone/server.js (port $PORT)"
  exec node "$APP_ROOT/.next/standalone/server.js"
fi

# Full-repo deploy: ensure production dependencies (fixes "next: not found").
if [ ! -f "$APP_ROOT/node_modules/next/package.json" ]; then
  echo "[startup] node_modules/next missing — installing production dependencies..."
  if [ -f "$APP_ROOT/package-lock.json" ]; then
    npm ci --omit=dev
  else
    npm install --omit=dev
  fi
fi

if [ ! -f "$APP_ROOT/node_modules/next/package.json" ]; then
  echo "[startup] ERROR: next is not installed. Run npm ci on deploy or use standalone output (.next/standalone)."
  exit 1
fi

echo "[startup] Starting Next.js via npm run start (port $PORT)"
exec npm run start
