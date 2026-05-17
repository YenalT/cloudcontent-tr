#!/usr/bin/env bash
# Copy static assets into Next.js standalone output (required for Azure / Docker deploys).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STANDALONE="$ROOT/.next/standalone"

if [ ! -d "$STANDALONE" ]; then
  echo "No .next/standalone directory — skip copy-standalone-assets (run npm run build first)."
  exit 0
fi

mkdir -p "$STANDALONE/.next"
cp -R "$ROOT/public" "$STANDALONE/public"
cp -R "$ROOT/.next/static" "$STANDALONE/.next/static"
cp -R "$ROOT/prisma" "$STANDALONE/prisma"
cp "$ROOT/startup.sh" "$STANDALONE/startup.sh"
chmod +x "$STANDALONE/startup.sh"
cp "$ROOT/deploy/azure-standalone.deployment" "$STANDALONE/.deployment"

echo "Standalone assets copied to $STANDALONE"
echo "Azure startup (standalone-only deploy): bash startup.sh  OR  node server.js"
