#!/bin/bash
# Single-container boot: migrate -> API + celery worker + celery beat.
# Runs on HF Spaces (Docker) or Render free (512MB — tuned lean: 1 worker).
# Platform injects $PORT (HF: 7860, Render: auto); local docker uses 8000.
set -e

PORT="${PORT:-8000}"

echo "==> Running Django migrations..."
python /app/manage.py migrate --noinput

echo "==> Starting Saleor API on port ${PORT}..."
uvicorn saleor.asgi:application \
  --host=0.0.0.0 \
  --port="${PORT}" \
  --workers=1 \
  --lifespan=auto \
  --ws=none \
  --no-server-header \
  --no-access-log \
  --timeout-keep-alive=35 \
  --timeout-graceful-shutdown=30 \
  --limit-max-requests=10000 &

echo "==> Starting Celery worker..."
celery --app saleor.celeryconf:app worker \
  -E \
  --loglevel=info \
  --concurrency=1 \
  --max-tasks-per-child=20 &

echo "==> Starting Celery beat..."
celery --app saleor.celeryconf:app beat \
  --scheduler saleor.schedulers.schedulers.DatabaseScheduler \
  --loglevel=info &

# If any child exits, shut the rest down so the platform restarts us.
trap 'kill $(jobs -p) 2>/dev/null' EXIT
wait -n
