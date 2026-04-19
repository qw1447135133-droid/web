#!/bin/sh
set -eu

export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

echo "[entrypoint] running database migrations..."
npx prisma migrate deploy

echo "[entrypoint] starting Next.js standalone server on ${HOSTNAME}:${PORT}"
exec node server.js
