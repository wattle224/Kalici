#!/usr/bin/env bash
# Linux/macOS equivalent of Launch-Investment-Management.bat
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "Kalici Investment Management"
echo "Root: $ROOT"

command -v node >/dev/null || { echo "ERROR: Node.js required"; exit 1; }

[[ -d "$ROOT/web/node_modules" ]] || (cd web && npm install)

if ! curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
  echo "Starting ledger API :8000..."
  npm run ledger &
  sleep 3
fi

if ! curl -sf http://127.0.0.1:3000/api/ledger >/dev/null 2>&1; then
  echo "Starting web UI :3000..."
  (cd web && npm run dev) &
  for i in $(seq 1 15); do
    curl -sf http://127.0.0.1:3000/api/ledger >/dev/null 2>&1 && break
    sleep 2
  done
fi

curl -sf http://127.0.0.1:3000/api/ledger >/dev/null || {
  echo "ERROR: http://127.0.0.1:3000/api/ledger not responding"
  exit 1
}

echo "Web ledger OK: http://127.0.0.1:3000/api/ledger"
if command -v xdg-open >/dev/null; then xdg-open "http://127.0.0.1:3000/"; fi
