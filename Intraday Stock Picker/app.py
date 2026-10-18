"""
FastAPI Backend Application
Intraday Trading Technical Expert Screener & Chart Analysis Terminal
"""

import os
import logging
from typing import List, Optional
from datetime import datetime, timezone
import pytz

from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from data_fetcher import (
    WATCHLISTS,
    scan_watchlist,
    get_chart_data,
    fetch_and_analyze_ticker
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("intraday_stock_picker")

app = FastAPI(
    title="Intraday Stock Picker",
    description="Real-time 1-minute intraday technical screener, Stop Loss & Target calculation engine, and institutional chart analysis terminal."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files directory
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class CustomScanRequest(BaseModel):
    tickers: List[str]


@app.get("/")
def get_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Intraday Stock Picker Backend Running. Static index.html not yet created."}


@app.get("/api/watchlists")
def get_watchlists_meta():
    """Returns available predefined watchlists and their stocks."""
    return {
        "status": "OK",
        "watchlists": {
            key: {
                "name": val["name"],
                "description": val["description"],
                "currency": val["currency"],
                "count": len(val["stocks"]),
                "stocks": val["stocks"]
            }
            for key, val in WATCHLISTS.items()
        }
    }


@app.get("/api/market-status")
def get_market_status():
    """Returns status of US and Indian NSE stock markets."""
    now_utc = datetime.now(timezone.utc)
    
    # IST (Indian Standard Time) - Market hours: 9:15 AM to 3:30 PM (Mon-Fri)
    ist = pytz.timezone('Asia/Kolkata')
    now_ist = now_utc.astimezone(ist)
    weekday_ist = now_ist.weekday()  # 0 is Monday, 4 is Friday
    time_ist = now_ist.time()
    nse_open = (weekday_ist < 5) and (time_ist >= datetime.strptime("09:15", "%H:%M").time()) and (time_ist <= datetime.strptime("15:30", "%H:%M").time())

    # EST (Eastern Standard Time) - Market hours: 9:30 AM to 4:00 PM (Mon-Fri)
    est = pytz.timezone('America/New_York')
    now_est = now_utc.astimezone(est)
    weekday_est = now_est.weekday()
    time_est = now_est.time()
    us_open = (weekday_est < 5) and (time_est >= datetime.strptime("09:30", "%H:%M").time()) and (time_est <= datetime.strptime("16:00", "%H:%M").time())

    return {
        "status": "OK",
        "server_time_utc": now_utc.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "nse": {
            "name": "NSE India (National Stock Exchange)",
            "is_open": nse_open,
            "local_time": now_ist.strftime("%I:%M:%S %p IST"),
            "session": "Active 1-Min Live" if nse_open else "Closed (Latest 1-Min Session Replay)"
        },
        "us": {
            "name": "US Markets (NYSE / NASDAQ)",
            "is_open": us_open,
            "local_time": now_est.strftime("%I:%M:%S %p EST"),
            "session": "Active 1-Min Live" if us_open else "Closed (Latest 1-Min Session Replay)"
        }
    }


@app.get("/api/scan")
def scan_stocks(
    market: str = Query("NSE_MOMENTUM", description="Market key: NSE_MOMENTUM or US_MOMENTUM"),
    custom: Optional[str] = Query(None, description="Comma-separated custom ticker symbols")
):
    """
    Scans stocks in real-time, calculates technical setups, scores momentum,
    and returns ranked opportunities with Stop Loss and Targets.
    """
    custom_list = [c.strip().upper() for c in custom.split(",") if c.strip()] if custom else None
    results = scan_watchlist(market, custom_tickers=custom_list)
    return {
        "status": "OK",
        "market": market,
        "scanned_count": len(results),
        "stocks": results
    }


@app.post("/api/custom-scan")
def custom_scan(payload: CustomScanRequest):
    """Scans user-supplied ticker list."""
    tickers = [t.strip().upper() for t in payload.tickers if t.strip()]
    if not tickers:
        raise HTTPException(status_code=400, detail="No tickers provided.")
    results = scan_watchlist("CUSTOM", custom_tickers=tickers)
    return {
        "status": "OK",
        "scanned_count": len(results),
        "stocks": results
    }


@app.get("/api/chart/{ticker}")
def get_chart(
    ticker: str,
    timeframe: str = Query("1m", pattern="^(1m|5m|15m)$"),
    force: bool = Query(False)
):
    """
    Returns 1-minute candlestick data, indicators (VWAP, EMA, Vol, RSI),
    and expert technical analysis rationale.
    """
    data = get_chart_data(ticker, timeframe=timeframe, force_refresh=force)
    if data.get("status") != "OK":
        raise HTTPException(status_code=404, detail=data.get("message", "Data not found."))
    return data


@app.get("/api/stock/{ticker}")
def get_single_stock_analysis(ticker: str, force: bool = Query(False)):
    """Returns detailed technical analysis for a single ticker."""
    data = fetch_and_analyze_ticker(ticker, force_refresh=force)
    if data.get("status") != "OK":
        raise HTTPException(status_code=404, detail=data.get("message", "Analysis failed."))
    return data
