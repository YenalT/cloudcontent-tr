#!/usr/bin/env bash
# One-time setup for Homebrew PostgreSQL on macOS.
# Creates role `postgres` / password `postgres` and database `cloudcontent_tr`
# to match DATABASE_URL in .env.example.
#
# Usage (from project root):
#   chmod +x scripts/setup-macos-postgres.sh
#   ./scripts/setup-macos-postgres.sh

set -euo pipefail

DB_NAME="cloudcontent_tr"
DB_USER="postgres"
DB_PASSWORD="postgres"

echo "Checking PostgreSQL on localhost:5432..."
if ! command -v pg_isready >/dev/null 2>&1; then
  echo "pg_isready not found. Install: brew install postgresql@16"
  exit 1
fi

if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  echo "PostgreSQL is not running. Start it with:"
  echo "  brew services start postgresql@16"
  exit 1
fi

echo "PostgreSQL is accepting connections."

# Homebrew connects as your macOS user by default (peer/local trust).
PSQL=(psql -h localhost -p 5432 -d postgres -v ON_ERROR_STOP=1)

ROLE_EXISTS="$("${PSQL[@]}" -tAc "SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}'" 2>/dev/null || true)"
if [[ "${ROLE_EXISTS}" != "1" ]]; then
  echo "Creating role ${DB_USER}..."
  "${PSQL[@]}" -c "CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}' SUPERUSER CREATEDB;"
else
  echo "Role ${DB_USER} already exists. Updating password..."
  "${PSQL[@]}" -c "ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
fi

DB_EXISTS="$("${PSQL[@]}" -tAc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" 2>/dev/null || true)"
if [[ "${DB_EXISTS}" != "1" ]]; then
  echo "Creating database ${DB_NAME}..."
  "${PSQL[@]}" -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
else
  echo "Database ${DB_NAME} already exists."
fi

echo "Verifying connection as ${DB_USER}..."
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -p 5432 -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1 AS ok;"

echo ""
echo "Done. Use in .env:"
echo "DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?schema=public\""
echo ""
echo "Next:"
echo "  npx prisma generate"
echo "  npx prisma migrate dev"
echo "  npm run dev"
