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

echo "Starting server on http://localhost:8000 ..."
exec .venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000 --reload

