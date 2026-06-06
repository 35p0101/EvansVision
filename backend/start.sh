#!/bin/sh
set -eu

echo "[start] Running prisma migrate deploy..."
if ! npx prisma migrate deploy 2>&1; then
  echo "[start] No pending migrations or migrations table missing. Trying db push as fallback..."
  npx prisma db push --accept-data-loss=false 2>&1 || {
    echo "[start] WARNING: prisma db push failed. Continuing - the DB may already be in sync."
  }
fi

echo "[start] Starting app on port ${PORT:-4000}..."
exec node dist/app.js
