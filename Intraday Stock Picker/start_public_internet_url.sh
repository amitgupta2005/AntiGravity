#!/bin/bash
# ==============================================================================
# Launch Cloudflare Tunnel for Intraday Stock Picker
# Provides a 100% Free Public Internet URL with Automatic HTTPS & Global DNS
# ==============================================================================

PORT=${1:-8000}

# Verify local server is running on target port
if ! nc -z localhost $PORT 2>/dev/null; then
  echo "⚠️  Local server not detected on port $PORT."
  echo "👉 Starting background uvicorn server on port $PORT..."
  DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
  cd "$DIR"
  if [ -f ".venv/bin/uvicorn" ]; then
    .venv/bin/uvicorn app:app --host 0.0.0.0 --port $PORT &
  else
    uvicorn app:app --host 0.0.0.0 --port $PORT &
  fi
  sleep 2
fi

echo "🚀 Starting Cloudflare Quick Tunnel for http://localhost:$PORT..."
echo "🔒 Global Edge Network & Automatic SSL / HTTPS"
echo "=============================================================================="
cloudflared tunnel --url http://localhost:$PORT
