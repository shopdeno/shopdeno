#!/bin/bash
# Render free is 512MB — API and worker each get their own service.
# MODE=api (default): migrate -> uvicorn only.
# MODE=worker: tiny HTTP server on $PORT (satisfies Render's port scan) +
#   celery worker + celery beat. No migrate here.
set -e

PORT="${PORT:-8000}"
MODE="${MODE:-api}"

if [ "$MODE" = "worker" ]; then
  echo "==> [worker] Starting keepalive HTTP on port ${PORT}..."
  python -m http.server "${PORT}" --bind 0.0.0.0 >/dev/null 2>&1 &
  echo "==> [worker] Starting Celery worker..."
  celery --app saleor.celeryconf:app worker \
    -E \
    --loglevel=info \
    --concurrency=1 \
    --max-tasks-per-child=20 &
  echo "==> [worker] Starting Celery beat..."
  celery --app saleor.celeryconf:app beat \
    --scheduler saleor.schedulers.schedulers.DatabaseScheduler \
    --loglevel=info &
  trap 'kill $(jobs -p) 2>/dev/null' EXIT
  wait -n
  exit 0
fi

echo "==> [api] Running Django migrations..."
python /app/manage.py migrate --noinput

echo "==> [api] Starting Saleor API on port ${PORT}..."
exec uvicorn saleor.asgi:application \
  --host=0.0.0.0 \
  --port="${PORT}" \
  --workers=1 \
  --lifespan=auto \
  --ws=none \
  --no-server-header \
  --no-access-log \
  --timeout-keep-alive=35 \
  --timeout-graceful-shutdown=30 \
  --limit-max-requests=10000
