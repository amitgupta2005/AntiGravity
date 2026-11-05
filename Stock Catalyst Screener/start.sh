#!/bin/bash

# ==========================================================
# Stock Catalyst Screener - 1-Click Startup Script
# Starts both FastAPI Backend (:8000) and Vite React Frontend (:5175)
# ==========================================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo "🎯 Starting Stock Catalyst & Earnings Screener Platform"
echo "=========================================================="

# 1. Determine Python Interpreter
PYTHON_BIN="python3"
if [ -f "$SCRIPT_DIR/../Intraday Stock Picker/.venv/bin/python" ]; then
    PYTHON_BIN="$SCRIPT_DIR/../Intraday Stock Picker/.venv/bin/python"
elif [ -f "$SCRIPT_DIR/backend/.venv/bin/python" ]; then
    PYTHON_BIN="$SCRIPT_DIR/backend/.venv/bin/python"
fi

echo "🐍 Using Python: $PYTHON_BIN"

# 2. Start Backend Server
echo "🚀 Launching FastAPI Backend on http://localhost:8000..."
cd "$SCRIPT_DIR/backend"
$PYTHON_BIN -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

# 3. Start Frontend Dev Server
echo "⚡ Launching Vite React Frontend on http://localhost:5175..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

echo ""
echo "✅ Application running!"
echo "👉 Frontend UI: http://localhost:5175"
echo "👉 Backend API Docs: http://localhost:8000/docs"
echo ""
echo "Press [CTRL+C] to stop all servers."

# Trap SIGINT to kill background processes cleanly
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
