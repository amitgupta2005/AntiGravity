"""
Data Fetcher Module
Fetches real-time 1-minute and 5-minute intraday data from Yahoo Finance,
handles market sessions, caching, error recovery, and multiple watchlists
(Indian NSE Nifty / F&O, US Tech & Momentum, and Custom tickers).
"""

import time
import logging
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor

from analysis_engine import calculate_intraday_indicators, analyze_stock_setup

logger = logging.getLogger(__name__)

# Predefined Watchlists
WATCHLISTS = {
    "NSE_MOMENTUM": {
        "name": "India NSE Top Momentum & F&O",
        "description": "High liquidity Indian intraday stocks (Nifty 50 leaders)",
        "currency": "₹",
        "stocks": [
            {"ticker": "RELIANCE.NS", "name": "Reliance Industries"},
            {"ticker": "TCS.NS", "name": "Tata Consultancy Services"},
            {"ticker": "HDFCBANK.NS", "name": "HDFC Bank Ltd"},
            {"ticker": "INFY.NS", "name": "Infosys Ltd"},
            {"ticker": "ICICIBANK.NS", "name": "ICICI Bank Ltd"},
            {"ticker": "HCLTECH.NS", "name": "HCL Technologies Ltd"},
            {"ticker": "WIPRO.NS", "name": "Wipro Ltd"},
            {"ticker": "SBIN.NS", "name": "State Bank of India"},
            {"ticker": "BHARTIARTL.NS", "name": "Bharti Airtel Ltd"},
            {"ticker": "AXISBANK.NS", "name": "Axis Bank Ltd"},
            {"ticker": "LT.NS", "name": "Larsen & Toubro"},
            {"ticker": "MARUTI.NS", "name": "Maruti Suzuki Ltd"},
            {"ticker": "BAJFINANCE.NS", "name": "Bajaj Finance Ltd"},
            {"ticker": "SUNPHARMA.NS", "name": "Sun Pharma Industries"},
            {"ticker": "TITAN.NS", "name": "Titan Company Ltd"},
            {"ticker": "TATASTEEL.NS", "name": "Tata Steel Ltd"}
        ]
    },
    "NSE_MIDCAP": {
        "name": "India Nifty Midcap Movers",
        "description": "High beta, liquid Indian midcap growth leaders & F&O movers",
        "currency": "₹",
        "stocks": [
            {"ticker": "DIXON.NS", "name": "Dixon Technologies"},
            {"ticker": "POLYCAB.NS", "name": "Polycab India Ltd"},
            {"ticker": "PERSISTENT.NS", "name": "Persistent Systems"},
            {"ticker": "COFORGE.NS", "name": "Coforge Ltd"},
            {"ticker": "TRENT.NS", "name": "Trent Ltd"},
            {"ticker": "VOLTAS.NS", "name": "Voltas Ltd"},
            {"ticker": "ASTRAL.NS", "name": "Astral Ltd"},
            {"ticker": "FEDERALBNK.NS", "name": "Federal Bank Ltd"},
            {"ticker": "IDFCFIRSTB.NS", "name": "IDFC First Bank Ltd"},
            {"ticker": "ASHOKLEY.NS", "name": "Ashok Leyland Ltd"},
            {"ticker": "CUMMINSIND.NS", "name": "Cummins India Ltd"},
            {"ticker": "BHARATFORG.NS", "name": "Bharat Forge Ltd"},
            {"ticker": "JUBLFOOD.NS", "name": "Jubilant FoodWorks"},
            {"ticker": "MAXHEALTH.NS", "name": "Max Healthcare"},
            {"ticker": "ABCAPITAL.NS", "name": "Aditya Birla Capital"},
            {"ticker": "PAGEIND.NS", "name": "Page Industries Ltd"}
        ]
    },
    "NSE_SMALLCAP": {
        "name": "India Nifty Smallcap Breakouts",
        "description": "High volatility, momentum smallcap intraday movers",
        "currency": "₹",
        "stocks": [
            {"ticker": "SUZLON.NS", "name": "Suzlon Energy Ltd"},
            {"ticker": "RVNL.NS", "name": "Rail Vikas Nigam Ltd"},
            {"ticker": "IRCON.NS", "name": "Ircon International Ltd"},
            {"ticker": "HUDCO.NS", "name": "Housing & Urban Dev Corp"},
            {"ticker": "NBCC.NS", "name": "NBCC India Ltd"},
            {"ticker": "CDSL.NS", "name": "Central Depository Services"},
            {"ticker": "ANGELONE.NS", "name": "Angel One Ltd"},
            {"ticker": "KAYNES.NS", "name": "Kaynes Technology Ltd"},
            {"ticker": "BSOFT.NS", "name": "Birlasoft Ltd"},
            {"ticker": "RBLBANK.NS", "name": "RBL Bank Ltd"},
            {"ticker": "MANAPPURAM.NS", "name": "Manappuram Finance"},
            {"ticker": "RADICO.NS", "name": "Radico Khaitan Ltd"},
            {"ticker": "CENTURYPLY.NS", "name": "Century Plyboards Ltd"},
            {"ticker": "CASTROLIND.NS", "name": "Castrol India Ltd"},
            {"ticker": "HFCL.NS", "name": "HFCL Ltd"},
            {"ticker": "EXIDEIND.NS", "name": "Exide Industries Ltd"}
        ]
    },
    "NSE_BANK": {
        "name": "India Bank Nifty Leaders",
        "description": "High beta Indian banking & financial intraday movers",
        "currency": "₹",
        "stocks": [
            {"ticker": "HDFCBANK.NS", "name": "HDFC Bank Ltd"},
            {"ticker": "ICICIBANK.NS", "name": "ICICI Bank Ltd"},
            {"ticker": "SBIN.NS", "name": "State Bank of India"},
            {"ticker": "AXISBANK.NS", "name": "Axis Bank Ltd"},
            {"ticker": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank"},
            {"ticker": "INDUSINDBK.NS", "name": "IndusInd Bank Ltd"},
            {"ticker": "BANKBARODA.NS", "name": "Bank of Baroda"},
            {"ticker": "PNB.NS", "name": "Punjab National Bank"}
        ]
    },
    "NSE_IT": {
        "name": "India Nifty IT Leaders",
        "description": "Indian tech giants with high intraday volume",
        "currency": "₹",
        "stocks": [
            {"ticker": "TCS.NS", "name": "Tata Consultancy Services"},
            {"ticker": "INFY.NS", "name": "Infosys Ltd"},
            {"ticker": "HCLTECH.NS", "name": "HCL Technologies Ltd"},
            {"ticker": "WIPRO.NS", "name": "Wipro Ltd"},
            {"ticker": "TECHM.NS", "name": "Tech Mahindra Ltd"},
            {"ticker": "LTIM.NS", "name": "LTIMindtree Ltd"}
        ]
    },
    "US_MAG7": {
        "name": "US Magnificent 7 & Mega-Caps",
        "description": "Top liquid US tech leaders driving market direction",
        "currency": "$",
        "stocks": [
            {"ticker": "NVDA", "name": "NVIDIA Corporation"},
            {"ticker": "TSLA", "name": "Tesla Inc"},
            {"ticker": "AAPL", "name": "Apple Inc"},
            {"ticker": "MSFT", "name": "Microsoft Corporation"},
            {"ticker": "AMZN", "name": "Amazon.com Inc"},
            {"ticker": "META", "name": "Meta Platforms Inc"},
            {"ticker": "GOOGL", "name": "Alphabet Inc"}
        ]
    },
    "US_MOMENTUM": {
        "name": "US High-Beta Movers",
        "description": "Top liquid US intraday momentum and breakout stocks",
        "currency": "$",
        "stocks": [
            {"ticker": "NVDA", "name": "NVIDIA Corporation"},
            {"ticker": "TSLA", "name": "Tesla Inc"},
            {"ticker": "AAPL", "name": "Apple Inc"},
            {"ticker": "AMD", "name": "Advanced Micro Devices"},
            {"ticker": "MSFT", "name": "Microsoft Corporation"},
            {"ticker": "META", "name": "Meta Platforms Inc"},
            {"ticker": "AMZN", "name": "Amazon.com Inc"},
            {"ticker": "GOOGL", "name": "Alphabet Inc"},
            {"ticker": "PLTR", "name": "Palantir Technologies"},
            {"ticker": "COIN", "name": "Coinbase Global"},
            {"ticker": "NFLX", "name": "Netflix Inc"},
            {"ticker": "SMCI", "name": "Super Micro Computer"},
            {"ticker": "ARM", "name": "Arm Holdings"},
            {"ticker": "MARA", "name": "MARA Holdings"}
        ]
    }
}

# In-memory cache for speed and rate-limit preservation
# Key: ticker, Value: {"timestamp": float, "df": DataFrame, "setup": dict}
_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 20  # 20 seconds cache for rapid scans


def get_stock_raw_intraday(ticker: str, interval: str = "1m") -> pd.DataFrame:
    """
    Fetches raw 1m intraday data from Yahoo Finance.
    Falls back to period='5d' if 1d has few bars.
    """
    clean_ticker = ticker.strip().upper()
    try:
        t = yf.Ticker(clean_ticker)
        # First try 1d
        df = t.history(period="1d", interval=interval)
        
        # If today is just starting or weekend, get last 5 days and slice to latest trading day
        if df.empty or len(df) < 15:
            df_5d = t.history(period="5d", interval=interval)
            if not df_5d.empty:
                # Find the most recent date in the index
                latest_date = df_5d.index.date[-1]
                df_latest = df_5d[df_5d.index.date == latest_date].copy()
                if len(df_latest) >= 15:
                    df = df_latest
                else:
                    # Session just started (e.g. first 15 mins of market):
                    # Keep recent bars (up to 120) so EMAs & MTF have enough data to calculate
                    df = df_5d.iloc[-120:].copy()
        
        if df.empty:
            return pd.DataFrame()

        # Remove rows where volume is 0 or NaN prices
        df = df.dropna(subset=['Open', 'High', 'Low', 'Close'])
        df = df[df['Volume'] >= 0]
        
        # Ensure index is sorted and strictly increasing
        df = df[~df.index.duplicated(keep='last')]
        df = df.sort_index()

        return df

    except Exception as e:
        logger.error(f"Error fetching intraday data for {ticker}: {e}")
        return pd.DataFrame()


def fetch_and_analyze_ticker(ticker: str, company_name: str = "", force_refresh: bool = False) -> Dict[str, Any]:
    """
    Fetches real-time 1m data, calculates indicators, and analyzes technical setup.
    Utilizes short TTL caching for fast UI interactions.
    """
    ticker = ticker.strip().upper()
    now = time.time()

    if not force_refresh and ticker in _CACHE:
        cached_entry = _CACHE[ticker]
        if now - cached_entry["timestamp"] < CACHE_TTL_SECONDS:
            return cached_entry["analysis"]

    # Fetch fresh 1-minute data
    df = get_stock_raw_intraday(ticker, interval="1m")
    if df.empty:
        return {
            "ticker": ticker,
            "status": "ERROR",
            "message": f"Unable to fetch intraday data for '{ticker}'. Verify the symbol on Yahoo Finance."
        }

    # Compute technical indicators
    df_indicators = calculate_intraday_indicators(df)

    # Perform expert intraday analysis
    analysis = analyze_stock_setup(ticker, df_indicators, company_name)
    analysis["status"] = "OK"

    # Save to cache
    _CACHE[ticker] = {
        "timestamp": now,
        "df": df_indicators,
        "analysis": analysis
    }

    return analysis


def get_chart_data(ticker: str, timeframe: str = "1m", force_refresh: bool = False) -> Dict[str, Any]:
    """
    Returns structured data specifically formatted for Lightweight Charts:
    - Candles: [{time, open, high, low, close}]
    - VWAP: [{time, value}]
    - EMA9, EMA21, EMA50: [{time, value}]
    - Volume: [{time, value, color}]
    - RSI: [{time, value}]
    - Overlay Price Lines: SL, T1, T2, Entry, Day High, Day Low
    """
    ticker = ticker.strip().upper()
    analysis = fetch_and_analyze_ticker(ticker, force_refresh=force_refresh)
    
    if analysis.get("status") != "OK":
        return analysis

    cached = _CACHE.get(ticker)
    if not cached:
        return {"status": "ERROR", "message": "Failed to retrieve processed data."}

    df = cached["df"]

    # If timeframe is 5m or 15m, resample if requested
    if timeframe == "5m" and len(df) >= 10:
        agg_rules = {
            'Open': 'first',
            'High': 'max',
            'Low': 'min',
            'Close': 'last',
            'Volume': 'sum'
        }
        df_resampled = df.resample('5min').agg(agg_rules).dropna()
        df_chart = calculate_intraday_indicators(df_resampled)
    elif timeframe == "15m" and len(df) >= 20:
        agg_rules = {
            'Open': 'first',
            'High': 'max',
            'Low': 'min',
            'Close': 'last',
            'Volume': 'sum'
        }
        df_resampled = df.resample('15min').agg(agg_rules).dropna()
        df_chart = calculate_intraday_indicators(df_resampled)
    else:
        df_chart = df

    # Prepare Lightweight Charts arrays
    candles = []
    vwap_series = []
    ema9_series = []
    ema21_series = []
    ema50_series = []
    volume_series = []
    vol_ma_series = []
    rsi_series = []

    last_time = -1
    for idx, row in df_chart.iterrows():
        # UNIX epoch in seconds
        try:
            t_sec = int(idx.timestamp())
        except Exception:
            continue
        
        # Ensure strictly increasing timestamp for Lightweight Charts
        if t_sec <= last_time:
            continue
        last_time = t_sec

        o = float(row['Open'])
        h = float(row['High'])
        l = float(row['Low'])
        c = float(row['Close'])
        v = float(row['Volume'])

        candles.append({
            "time": t_sec,
            "open": round(o, 2),
            "high": round(h, 2),
            "low": round(l, 2),
            "close": round(c, 2)
        })

        if not pd.isna(row.get('VWAP')):
            vwap_series.append({"time": t_sec, "value": round(float(row['VWAP']), 2)})
        
        if not pd.isna(row.get('EMA9')):
            ema9_series.append({"time": t_sec, "value": round(float(row['EMA9']), 2)})

        if not pd.isna(row.get('EMA21')):
            ema21_series.append({"time": t_sec, "value": round(float(row['EMA21']), 2)})

        if not pd.isna(row.get('EMA50')):
            ema50_series.append({"time": t_sec, "value": round(float(row['EMA50']), 2)})

        # Volume color: green if close >= open, else red
        vol_color = "rgba(16, 185, 129, 0.65)" if c >= o else "rgba(239, 68, 68, 0.65)"
        volume_series.append({
            "time": t_sec,
            "value": int(v),
            "color": vol_color
        })

        if not pd.isna(row.get('Vol_MA20')):
            vol_ma_series.append({"time": t_sec, "value": round(float(row['Vol_MA20']), 2)})

        if not pd.isna(row.get('RSI')):
            rsi_series.append({"time": t_sec, "value": round(float(row['RSI']), 2)})

    return {
        "status": "OK",
        "ticker": ticker,
        "timeframe": timeframe,
        "analysis": analysis,
        "candles": candles,
        "markers": analysis.get("chart_markers", []),
        "indicators": {
            "vwap": vwap_series,
            "ema9": ema9_series,
            "ema21": ema21_series,
            "ema50": ema50_series,
            "volume": volume_series,
            "vol_ma": vol_ma_series,
            "rsi": rsi_series
        }
    }


def scan_watchlist(watchlist_key: str = "NSE_MOMENTUM", custom_tickers: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Scans multiple stocks in parallel and sorts by Intraday Score & Momentum.
    """
    if custom_tickers and len(custom_tickers) > 0:
        targets = [{"ticker": t.strip().upper(), "name": t.strip().upper()} for t in custom_tickers if t.strip()]
    elif watchlist_key in WATCHLISTS:
        targets = WATCHLISTS[watchlist_key]["stocks"]
    else:
        targets = WATCHLISTS["NSE_MOMENTUM"]["stocks"]

    results = []

    def _worker(item):
        try:
            return fetch_and_analyze_ticker(item["ticker"], item.get("name", ""))
        except Exception as err:
            logger.error(f"Scan worker failed for {item['ticker']}: {err}")
            return None

    # Fetch with concurrent threads for lightning speed
    with ThreadPoolExecutor(max_workers=8) as executor:
        scan_outputs = list(executor.map(_worker, targets))

    for out in scan_outputs:
        if out and out.get("status") == "OK":
            results.append(out)

    def _rank_key(x):
        # 1 for actionable recommendations (STRONG BUY, BUY, STRONG SELL, SELL)
        sig = str(x.get("signal", "")).upper()
        is_rec = 1 if any(w in sig for w in ["BUY", "SELL"]) and "NEUTRAL" not in sig else 0
        roi = float(x.get("roi_pct") or x.get("trade_plan", {}).get("roi_pct", 0.0))
        score = abs(x.get("score", 0))
        rvol = float(x.get("rvol", 0.0))
        return (is_rec, roi, score, rvol)

    # Sort descending: recommended stocks with highest ROI first, followed by score & volume
    results.sort(key=_rank_key, reverse=True)

    return results
