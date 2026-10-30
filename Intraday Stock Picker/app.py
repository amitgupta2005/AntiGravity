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
from angel_one_client import angel_client

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

@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static") or request.url.path == "/":
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

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
        return FileResponse(
            index_file,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
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
    timeframe: str = Query("1m", pattern="^(1m|5m|10m|15m)$"),
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


class AngelFeedConfigRequest(BaseModel):
    api_key: Optional[str] = ""
    client_code: Optional[str] = ""
    pin: Optional[str] = ""
    totp_secret: Optional[str] = ""
    enabled: Optional[bool] = True
    auto_connect: Optional[bool] = True


@app.get("/api/feed/status")
def get_feed_status():
    """Returns Angel One SmartAPI live feed status and statistics."""
    return angel_client.get_status()


@app.post("/api/feed/config")
def update_feed_config(payload: AngelFeedConfigRequest):
    """
    Saves Angel One SmartAPI credentials and attempts live connection.
    Endpoint: https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword
    """
    saved = angel_client.save_config(
        api_key=payload.api_key or "",
        client_code=payload.client_code or "",
        pin=payload.pin or "",
        totp_secret=payload.totp_secret or "",
        enabled=payload.enabled if payload.enabled is not None else True
    )
    if not saved:
        raise HTTPException(status_code=500, detail="Failed to save credentials to .env file.")

    msg = "Credentials saved."
    if payload.auto_connect and angel_client.is_configured():
        _, msg = angel_client.login(force=True)

    status = angel_client.get_status()
    status["message"] = msg
    return status


@app.post("/api/feed/connect")
def connect_feed():
    """Triggers login to https://apiconnect.angelone.in and verifies session."""
    success, msg = angel_client.login(force=True)
    status = angel_client.get_status()
    status["message"] = msg
    return status


@app.post("/api/feed/disconnect")
def disconnect_feed():
    """Clears active session tokens."""
    angel_client.jwt_token = None
    angel_client.refresh_token = None
    angel_client.token_expiry = 0.0
    angel_client.last_error = None
    status = angel_client.get_status()
    status["message"] = "Disconnected from Angel One SmartAPI."
    return status


@app.get("/api/feed/quote/{ticker}")
def get_live_quote(ticker: str):
    """Returns live market quote from Angel One SmartAPI (or Yahoo Finance fallback)."""
    clean_ticker = ticker.strip().upper()
    quote = None
    if clean_ticker.endswith(".NS") and angel_client.is_authenticated():
        quote = angel_client.get_live_quote(clean_ticker)
    
    if not quote:
        analysis = fetch_and_analyze_ticker(clean_ticker)
        if analysis.get("status") == "OK":
            quote = {
                "ticker": clean_ticker,
                "price": analysis.get("price"),
                "change_pct": analysis.get("change_pct"),
                "high": analysis.get("day_high"),
                "low": analysis.get("day_low"),
                "feed_source": "YAHOO_FINANCE",
                "feed_label": "Yahoo Finance (Fallback)",
                "timestamp": analysis.get("timestamp")
            }
        else:
            raise HTTPException(status_code=404, detail="Quote unavailable.")

    return {
        "status": "OK",
        "ticker": clean_ticker,
        "quote": quote
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)

