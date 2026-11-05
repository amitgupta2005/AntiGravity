#!/bin/bash

# ==========================================================
# Stock Catalyst Screener - Unified 1-Click Startup Script
# Runs the complete platform with built-in in-UI API on http://localhost:5177
# ==========================================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/frontend"

echo "=========================================================="
echo "🎯 Starting Stock Catalyst & Earnings Screener Platform"
echo "🌐 Unified In-UI Engine with Real-Time Exchange Feed Stream"
echo "=========================================================="

echo "⚡ Launching platform on http://localhost:5177..."
npm run dev
