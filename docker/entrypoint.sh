#!/bin/sh
set -eu

export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"
export DATABASE_URL="${DATABASE_URL:-file:/app/data/prod.db}"

mkdir -p /app/data

echo "[entrypoint] initializing sqlite schema: ${DATABASE_URL}"
node scripts/init-db.mjs

echo "[entrypoint] starting Next.js standalone server on ${HOSTNAME}:${PORT}"
exec node server.js
