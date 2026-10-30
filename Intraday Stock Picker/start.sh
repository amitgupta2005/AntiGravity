#!/usr/bin/env bash
# ==============================================================================
# Intraday Stock Picker - Startup Script
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================================"
echo "  🚀 Starting Intraday Stock Picker"
echo "  Technical Screener & Chart Analysis Terminal"
echo "============================================================"

if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
    echo "Installing required dependencies..."
    .venv/bin/pip install -r requirements.txt
fi

# Gracefully free port 8000 if already occupied by an old process
PORT_PID=$(lsof -ti :8000)
if [ -n "$PORT_PID" ]; then
    echo "Freeing occupied port 8000 (PID: $PORT_PID)..."
    kill -9 $PORT_PID 2>/dev/null || true
    sleep 1
fi

echo "Starting server on http://localhost:8000 ..."
exec .venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000 --reload


