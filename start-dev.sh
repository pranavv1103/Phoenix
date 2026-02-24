#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT_DIR/.dev-logs"
PID_DIR="$ROOT_DIR/.dev-pids"

# Load environment variables from .env file
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
else
  echo "ERROR: .env file not found. Copy .env.example to .env and fill in your credentials."
  exit 1
fi

mkdir -p "$LOG_DIR" "$PID_DIR"

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    kill -9 $pids >/dev/null 2>&1 || true
  fi
}

kill_port 8080
kill_port 5173

cd "$ROOT_DIR"
nohup mvn spring-boot:run > "$LOG_DIR/backend.log" 2>&1 &
echo $! > "$PID_DIR/backend.pid"

cd "$ROOT_DIR/phoenix-client"
nohup npm run dev -- --host > "$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$PID_DIR/frontend.pid"

sleep 2

echo "Backend log: $LOG_DIR/backend.log"
echo "Frontend log: $LOG_DIR/frontend.log"
echo "Website: http://localhost:5173"
echo "API: http://localhost:8080"
