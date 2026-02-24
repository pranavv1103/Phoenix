#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT_DIR/.dev-pids"

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    kill -9 $pids >/dev/null 2>&1 || true
  fi
}

if [[ -f "$PID_DIR/backend.pid" ]]; then
  kill -9 "$(cat "$PID_DIR/backend.pid")" >/dev/null 2>&1 || true
  rm -f "$PID_DIR/backend.pid"
fi

if [[ -f "$PID_DIR/frontend.pid" ]]; then
  kill -9 "$(cat "$PID_DIR/frontend.pid")" >/dev/null 2>&1 || true
  rm -f "$PID_DIR/frontend.pid"
fi

kill_port 8080
kill_port 5173

echo "Stopped backend/frontend if running."
