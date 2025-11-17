#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] Starting backend with prestart tasks"

SKIP_PRESTART=${SKIP_PRESTART:-0}
WORKERS=${WORKERS:-2}
RELOAD=${RELOAD:-0}

if [[ "$SKIP_PRESTART" != "1" ]]; then
  echo "[entrypoint] Waiting for DB & running migrations + initial data"
  python app/backend_pre_start.py
  alembic upgrade head || {
    echo "[entrypoint] Alembic failed" >&2
    exit 1
  }
  python app/initial_data.py || {
    echo "[entrypoint] Initial data script failed" >&2
    exit 1
  }
else
  echo "[entrypoint] SKIP_PRESTART=1 -> Skipping migrations & initial data"
fi

if [[ "$RELOAD" == "1" ]]; then
  echo "[entrypoint] RELOAD=1 -> using --reload (overrides workers)"
  exec fastapi run --reload app/main.py
else
  echo "[entrypoint] Launching FastAPI app (workers=$WORKERS)"
  exec fastapi run --workers "$WORKERS" app/main.py
fi
