"""
Data Fetcher Module
Fetches real-time 1-minute and 5-minute intraday data from Yahoo Finance,
handles market sessions, caching, error recovery, and multiple watchlists
(Indian NSE Nifty / F&O, US Tech & Momentum, and Custom tickers).
"""

import time
import logging
import threading
from collections import OrderedDict
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor

from analysis_engine import calculate_intraday_indicators, analyze_stock_setup
from angel_one_client import angel_client, BUILTIN_NSE_TOKENS

logger = logging.getLogger(__name__)

# Predefined Watchlists
WATCHLISTS = {
    "NSE_MOMENTUM": {
        "name": "India Nifty 50 Leaders",
        "description": "High liquidity Indian intraday stocks (Complete Nifty 50 universe)",
        "currency": "₹",
        "stocks": [
            {"ticker": "RELIANCE.NS", "name": "Reliance Industries", "cap": "LARGE"},
            {"ticker": "TCS.NS", "name": "Tata Consultancy Services", "cap": "LARGE"},
            {"ticker": "HDFCBANK.NS", "name": "HDFC Bank Ltd", "cap": "LARGE"},
            {"ticker": "INFY.NS", "name": "Infosys Ltd", "cap": "LARGE"},
            {"ticker": "ICICIBANK.NS", "name": "ICICI Bank Ltd", "cap": "LARGE"},
            {"ticker": "BHARTIARTL.NS", "name": "Bharti Airtel Ltd", "cap": "LARGE"},
            {"ticker": "ITC.NS", "name": "ITC Ltd", "cap": "LARGE"},
            {"ticker": "SBIN.NS", "name": "State Bank of India", "cap": "LARGE"},
            {"ticker": "LT.NS", "name": "Larsen & Toubro Ltd", "cap": "LARGE"},
            {"ticker": "HINDUNILVR.NS", "name": "Hindustan Unilever Ltd", "cap": "LARGE"},
            {"ticker": "AXISBANK.NS", "name": "Axis Bank Ltd", "cap": "LARGE"},
            {"ticker": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank", "cap": "LARGE"},
            {"ticker": "BAJFINANCE.NS", "name": "Bajaj Finance Ltd", "cap": "LARGE"},
            {"ticker": "MARUTI.NS", "name": "Maruti Suzuki Ltd", "cap": "LARGE"},
            {"ticker": "SUNPHARMA.NS", "name": "Sun Pharma Industries", "cap": "LARGE"},
            {"ticker": "M&M.NS", "name": "Mahindra & Mahindra Ltd", "cap": "LARGE"},
            {"ticker": "TATASTEEL.NS", "name": "Tata Steel Ltd", "cap": "LARGE"},
            {"ticker": "TITAN.NS", "name": "Titan Company Ltd", "cap": "LARGE"},
            {"ticker": "ULTRACEMCO.NS", "name": "UltraTech Cement Ltd", "cap": "LARGE"},
            {"ticker": "NTPC.NS", "name": "NTPC Ltd", "cap": "LARGE"},
            {"ticker": "POWERGRID.NS", "name": "Power Grid Corporation", "cap": "LARGE"},
            {"ticker": "HCLTECH.NS", "name": "HCL Technologies Ltd", "cap": "LARGE"},
            {"ticker": "ADANIENT.NS", "name": "Adani Enterprises Ltd", "cap": "LARGE"},
            {"ticker": "ADANIPORTS.NS", "name": "Adani Ports & SEZ", "cap": "LARGE"},
            {"ticker": "TRENT.NS", "name": "Trent Ltd", "cap": "LARGE"},
            {"ticker": "ONGC.NS", "name": "Oil & Natural Gas Corp", "cap": "LARGE"},
            {"ticker": "COALINDIA.NS", "name": "Coal India Ltd", "cap": "LARGE"},
            {"ticker": "BAJAJFINSV.NS", "name": "Bajaj Finserv Ltd", "cap": "LARGE"},
            {"ticker": "JSWSTEEL.NS", "name": "JSW Steel Ltd", "cap": "LARGE"},
            {"ticker": "NESTLEIND.NS", "name": "Nestle India Ltd", "cap": "LARGE"},
            {"ticker": "GRASIM.NS", "name": "Grasim Industries Ltd", "cap": "LARGE"},
            {"ticker": "TECHM.NS", "name": "Tech Mahindra Ltd", "cap": "LARGE"},
            {"ticker": "HINDALCO.NS", "name": "Hindalco Industries Ltd", "cap": "LARGE"},
            {"ticker": "CIPLA.NS", "name": "Cipla Ltd", "cap": "LARGE"},
            {"ticker": "BEL.NS", "name": "Bharat Electronics Ltd", "cap": "LARGE"},
            {"ticker": "DRREDDY.NS", "name": "Dr. Reddy's Laboratories", "cap": "LARGE"},
            {"ticker": "WIPRO.NS", "name": "Wipro Ltd", "cap": "LARGE"},
            {"ticker": "EICHERMOT.NS", "name": "Eicher Motors Ltd", "cap": "LARGE"},
            {"ticker": "APOLLOHOSP.NS", "name": "Apollo Hospitals", "cap": "LARGE"},
            {"ticker": "BPCL.NS", "name": "Bharat Petroleum Corp", "cap": "LARGE"},
            {"ticker": "BRITANNIA.NS", "name": "Britannia Industries Ltd", "cap": "LARGE"},
            {"ticker": "HEROMOTOCO.NS", "name": "Hero MotoCorp Ltd", "cap": "LARGE"},
            {"ticker": "DIVISLAB.NS", "name": "Divi's Laboratories", "cap": "LARGE"},
            {"ticker": "SBILIFE.NS", "name": "SBI Life Insurance", "cap": "LARGE"},
            {"ticker": "HDFCLIFE.NS", "name": "HDFC Life Insurance", "cap": "LARGE"},
            {"ticker": "SHREECEM.NS", "name": "Shree Cement Ltd", "cap": "LARGE"},
            {"ticker": "TATACONSUM.NS", "name": "Tata Consumer Products", "cap": "LARGE"},
            {"ticker": "INDUSINDBK.NS", "name": "IndusInd Bank Ltd", "cap": "LARGE"},
            {"ticker": "ASIANPAINT.NS", "name": "Asian Paints Ltd", "cap": "LARGE"},
            {"ticker": "TATAPOWER.NS", "name": "Tata Power Company Ltd", "cap": "LARGE"}
        ]
    },
    "NSE_MIDCAP": {
        "name": "India Nifty Midcap Movers",
        "description": "High beta, liquid Indian midcap growth leaders & F&O movers",
        "currency": "₹",
        "stocks": [
            {"ticker": "DIXON.NS", "name": "Dixon Technologies", "cap": "MID"},
            {"ticker": "POLYCAB.NS", "name": "Polycab India Ltd", "cap": "MID"},
            {"ticker": "PERSISTENT.NS", "name": "Persistent Systems", "cap": "MID"},
            {"ticker": "COFORGE.NS", "name": "Coforge Ltd", "cap": "MID"},
            {"ticker": "TRENT.NS", "name": "Trent Ltd", "cap": "MID"},
            {"ticker": "VOLTAS.NS", "name": "Voltas Ltd", "cap": "MID"},
            {"ticker": "ASTRAL.NS", "name": "Astral Ltd", "cap": "MID"},
            {"ticker": "FEDERALBNK.NS", "name": "Federal Bank Ltd", "cap": "MID"},
            {"ticker": "IDFCFIRSTB.NS", "name": "IDFC First Bank Ltd", "cap": "MID"},
            {"ticker": "ASHOKLEY.NS", "name": "Ashok Leyland Ltd", "cap": "MID"},
            {"ticker": "CUMMINSIND.NS", "name": "Cummins India Ltd", "cap": "MID"},
            {"ticker": "BHARATFORG.NS", "name": "Bharat Forge Ltd", "cap": "MID"},
            {"ticker": "JUBLFOOD.NS", "name": "Jubilant FoodWorks", "cap": "MID"},
            {"ticker": "MAXHEALTH.NS", "name": "Max Healthcare", "cap": "MID"},
            {"ticker": "ABCAPITAL.NS", "name": "Aditya Birla Capital", "cap": "MID"},
            {"ticker": "PAGEIND.NS", "name": "Page Industries Ltd", "cap": "MID"}
        ]
    },
    "NSE_SMALLCAP": {
        "name": "India Nifty Smallcap Breakouts",
        "description": "High volatility, momentum smallcap intraday movers",
        "currency": "₹",
        "stocks": [
            {"ticker": "SUZLON.NS", "name": "Suzlon Energy Ltd", "cap": "SMALL"},
            {"ticker": "RVNL.NS", "name": "Rail Vikas Nigam Ltd", "cap": "SMALL"},
            {"ticker": "IRCON.NS", "name": "Ircon International Ltd", "cap": "SMALL"},
            {"ticker": "HUDCO.NS", "name": "Housing & Urban Dev Corp", "cap": "SMALL"},
            {"ticker": "NBCC.NS", "name": "NBCC India Ltd", "cap": "SMALL"},
            {"ticker": "CDSL.NS", "name": "Central Depository Services", "cap": "SMALL"},
            {"ticker": "ANGELONE.NS", "name": "Angel One Ltd", "cap": "SMALL"},
            {"ticker": "KAYNES.NS", "name": "Kaynes Technology Ltd", "cap": "SMALL"},
            {"ticker": "BSOFT.NS", "name": "Birlasoft Ltd", "cap": "SMALL"},
            {"ticker": "RBLBANK.NS", "name": "RBL Bank Ltd", "cap": "SMALL"},
            {"ticker": "MANAPPURAM.NS", "name": "Manappuram Finance", "cap": "SMALL"},
            {"ticker": "RADICO.NS", "name": "Radico Khaitan Ltd", "cap": "SMALL"},
            {"ticker": "IRFC.NS", "name": "Indian Railway Finance Corp", "cap": "SMALL"},
            {"ticker": "CASTROLIND.NS", "name": "Castrol India Ltd", "cap": "SMALL"},
            {"ticker": "HFCL.NS", "name": "HFCL Ltd", "cap": "SMALL"},
            {"ticker": "EXIDEIND.NS", "name": "Exide Industries Ltd", "cap": "SMALL"}
        ]
    },
    "NSE_BANK": {
        "name": "India Bank Nifty Leaders",
        "description": "High beta Indian banking & financial intraday movers",
        "currency": "₹",
        "stocks": [
            {"ticker": "HDFCBANK.NS", "name": "HDFC Bank Ltd", "cap": "LARGE"},
            {"ticker": "ICICIBANK.NS", "name": "ICICI Bank Ltd", "cap": "LARGE"},
            {"ticker": "SBIN.NS", "name": "State Bank of India", "cap": "LARGE"},
            {"ticker": "AXISBANK.NS", "name": "Axis Bank Ltd", "cap": "LARGE"},
            {"ticker": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank", "cap": "LARGE"},
            {"ticker": "INDUSINDBK.NS", "name": "IndusInd Bank Ltd", "cap": "LARGE"},
            {"ticker": "BANKBARODA.NS", "name": "Bank of Baroda", "cap": "LARGE"},
            {"ticker": "PNB.NS", "name": "Punjab National Bank", "cap": "LARGE"}
        ]
    },
    "NSE_IT": {
        "name": "India Nifty IT Leaders",
        "description": "Indian tech giants with high intraday volume",
        "currency": "₹",
        "stocks": [
            {"ticker": "TCS.NS", "name": "Tata Consultancy Services", "cap": "LARGE"},
            {"ticker": "INFY.NS", "name": "Infosys Ltd", "cap": "LARGE"},
            {"ticker": "HCLTECH.NS", "name": "HCL Technologies Ltd", "cap": "LARGE"},
            {"ticker": "WIPRO.NS", "name": "Wipro Ltd", "cap": "LARGE"},
            {"ticker": "TECHM.NS", "name": "Tech Mahindra Ltd", "cap": "LARGE"},
            {"ticker": "OFSS.NS", "name": "Oracle Financial Services", "cap": "LARGE"}
        ]
    },
    "US_MAG7": {
        "name": "US Magnificent 7 & Mega-Caps",
        "description": "Top liquid US tech leaders driving market direction",
        "currency": "$",
        "stocks": [
            {"ticker": "NVDA", "name": "NVIDIA Corporation", "cap": "LARGE"},
            {"ticker": "TSLA", "name": "Tesla Inc", "cap": "LARGE"},
            {"ticker": "AAPL", "name": "Apple Inc", "cap": "LARGE"},
            {"ticker": "MSFT", "name": "Microsoft Corporation", "cap": "LARGE"},
            {"ticker": "AMZN", "name": "Amazon.com Inc", "cap": "LARGE"},
            {"ticker": "META", "name": "Meta Platforms Inc", "cap": "LARGE"},
            {"ticker": "GOOGL", "name": "Alphabet Inc", "cap": "LARGE"}
        ]
    },
    "US_MOMENTUM": {
        "name": "US Large-Cap Movers",
        "description": "Top liquid US intraday momentum and breakout largecaps",
        "currency": "$",
        "stocks": [
            {"ticker": "NVDA", "name": "NVIDIA Corporation", "cap": "LARGE"},
            {"ticker": "TSLA", "name": "Tesla Inc", "cap": "LARGE"},
            {"ticker": "AAPL", "name": "Apple Inc", "cap": "LARGE"},
            {"ticker": "AMD", "name": "Advanced Micro Devices", "cap": "LARGE"},
            {"ticker": "MSFT", "name": "Microsoft Corporation", "cap": "LARGE"},
            {"ticker": "META", "name": "Meta Platforms Inc", "cap": "LARGE"},
            {"ticker": "AMZN", "name": "Amazon.com Inc", "cap": "LARGE"},
            {"ticker": "GOOGL", "name": "Alphabet Inc", "cap": "LARGE"},
            {"ticker": "PLTR", "name": "Palantir Technologies", "cap": "LARGE"},
            {"ticker": "COIN", "name": "Coinbase Global", "cap": "LARGE"},
            {"ticker": "NFLX", "name": "Netflix Inc", "cap": "LARGE"},
            {"ticker": "SMCI", "name": "Super Micro Computer", "cap": "LARGE"},
            {"ticker": "ARM", "name": "Arm Holdings", "cap": "LARGE"},
            {"ticker": "MARA", "name": "MARA Holdings", "cap": "LARGE"}
        ]
    },
    "US_MIDCAP": {
        "name": "US Midcap High-Growth Movers",
        "description": "High beta, liquid US midcap momentum and growth stocks",
        "currency": "$",
        "stocks": [
            {"ticker": "SMCI", "name": "Super Micro Computer", "cap": "MID"},
            {"ticker": "CRWD", "name": "CrowdStrike Holdings", "cap": "MID"},
            {"ticker": "NET", "name": "Cloudflare Inc", "cap": "MID"},
            {"ticker": "DKNG", "name": "DraftKings Inc", "cap": "MID"},
            {"ticker": "APP", "name": "AppLovin Corporation", "cap": "MID"},
            {"ticker": "HOOD", "name": "Robinhood Markets", "cap": "MID"},
            {"ticker": "SOFI", "name": "SoFi Technologies", "cap": "MID"},
            {"ticker": "COIN", "name": "Coinbase Global", "cap": "MID"},
            {"ticker": "PLTR", "name": "Palantir Technologies", "cap": "MID"},
            {"ticker": "MDB", "name": "MongoDB Inc", "cap": "MID"},
            {"ticker": "DDOG", "name": "Datadog Inc", "cap": "MID"},
            {"ticker": "AFRM", "name": "Affirm Holdings", "cap": "MID"},
            {"ticker": "CELH", "name": "Celsius Holdings", "cap": "MID"},
            {"ticker": "DASH", "name": "DoorDash Inc", "cap": "MID"},
            {"ticker": "RBLX", "name": "Roblox Corporation", "cap": "MID"},
            {"ticker": "SNAP", "name": "Snap Inc", "cap": "MID"}
        ]
    },
    "US_SMALLCAP": {
        "name": "US Smallcap High-Beta Breakouts",
        "description": "High volatility, momentum smallcap intraday runners",
        "currency": "$",
        "stocks": [
            {"ticker": "IREN", "name": "Iris Energy Ltd", "cap": "SMALL"},
            {"ticker": "CLSK", "name": "CleanSpark Inc", "cap": "SMALL"},
            {"ticker": "IONQ", "name": "IonQ Inc", "cap": "SMALL"},
            {"ticker": "ASTS", "name": "AST SpaceMobile", "cap": "SMALL"},
            {"ticker": "RKLB", "name": "Rocket Lab USA", "cap": "SMALL"},
            {"ticker": "UPST", "name": "Upstart Holdings", "cap": "SMALL"},
            {"ticker": "HIMS", "name": "Hims & Hers Health", "cap": "SMALL"},
            {"ticker": "SOUN", "name": "SoundHound AI", "cap": "SMALL"},
            {"ticker": "BBAI", "name": "BigBear.ai Holdings", "cap": "SMALL"},
            {"ticker": "RGTI", "name": "Rigetti Computing", "cap": "SMALL"},
            {"ticker": "MARA", "name": "MARA Holdings", "cap": "SMALL"},
            {"ticker": "RIOT", "name": "Riot Platforms", "cap": "SMALL"},
            {"ticker": "CIFR", "name": "Cipher Mining", "cap": "SMALL"},
            {"ticker": "WULF", "name": "TeraWulf Inc", "cap": "SMALL"},
            {"ticker": "OPEN", "name": "Opendoor Technologies", "cap": "SMALL"},
            {"ticker": "ACHR", "name": "Archer Aviation", "cap": "SMALL"}
        ]
    }
}


def _build_aggregate_stocks(*watchlist_keys: str) -> List[Dict[str, Any]]:
    """Constructs deduplicated stocks list from multiple watchlists."""
    seen = set()
    aggregated = []
    for k in watchlist_keys:
        if k in WATCHLISTS:
            for s in WATCHLISTS[k].get("stocks", []):
                sym = s.get("ticker", "").upper()
                if sym and sym not in seen:
                    seen.add(sym)
                    aggregated.append(s)
    return aggregated


# Comprehensive Aggregated Universes for Complete Opportunity Visibility
WATCHLISTS["ALL_INDIA"] = {
    "name": "India All Opportunities",
    "description": "Comprehensive scan across Nifty 50, Midcaps, Smallcaps, Banking & IT movers",
    "currency": "₹",
    "stocks": _build_aggregate_stocks("NSE_MOMENTUM", "NSE_MIDCAP", "NSE_SMALLCAP", "NSE_BANK", "NSE_IT")
}

WATCHLISTS["ALL_US"] = {
    "name": "US All Opportunities",
    "description": "Comprehensive scan across US Mag 7, Large-Cap, Midcap, and Smallcap breakouts",
    "currency": "$",
    "stocks": _build_aggregate_stocks("US_MAG7", "US_MOMENTUM", "US_MIDCAP", "US_SMALLCAP")
}

WATCHLISTS["ALL_OPPORTUNITIES"] = {
    "name": "All Global Opportunities",
    "description": "Full scan across all tracked Indian and US intraday opportunities",
    "currency": "₹/$",
    "stocks": _build_aggregate_stocks("ALL_INDIA", "ALL_US")
}

CACHE_TTL_SECONDS = 20  # 20 seconds cache for rapid scans

class BoundedTTLCache:
    """
    Thread-safe, bounded LRU + TTL in-memory cache.
    Prevents unbounded memory growth, memory leaks from accumulated Pandas DataFrames,
    and race conditions during concurrent multi-threaded scans.
    """
    def __init__(self, maxsize: int = 256, ttl_seconds: float = CACHE_TTL_SECONDS):
        self._maxsize = maxsize
        self._ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            if key not in self._cache:
                return default
            entry = self._cache[key]
            now = time.time()
            if now - entry.get("timestamp", 0) > self._ttl_seconds:
                del self._cache[key]
                return default
            self._cache.move_to_end(key)
            return entry

    def __contains__(self, key: str) -> bool:
        return self.get(key) is not None

    def __getitem__(self, key: str) -> Dict[str, Any]:
        val = self.get(key)
        if val is None:
            raise KeyError(key)
        return val

    def __setitem__(self, key: str, value: Dict[str, Any]) -> None:
        with self._lock:
            now = time.time()
            # Prune stale expired entries proactively to conserve memory
            expired = [
                k for k, v in self._cache.items()
                if (now - v.get("timestamp", 0)) > (self._ttl_seconds * 3)
            ]
            for k in expired:
                del self._cache[k]

            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = value

            while len(self._cache) > self._maxsize:
                self._cache.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._cache)

# In-memory bounded cache for speed and rate-limit preservation
_CACHE = BoundedTTLCache(maxsize=256, ttl_seconds=CACHE_TTL_SECONDS)


def _cleanup_thread_db() -> None:
    """
    Closes thread-local SQLite connections created by yfinance's Peewee cache manager.
    Prevents unclosed database ResourceWarnings and memory leaks across worker threads.
    """
    try:
        if hasattr(yf, 'cache'):
            if hasattr(yf.cache, '_TzDBManager'):
                yf.cache._TzDBManager.close_db()
            if hasattr(yf.cache, '_CookieDBManager'):
                yf.cache._CookieDBManager.close_db()
            if hasattr(yf.cache, '_ISINDBManager'):
                yf.cache._ISINDBManager.close_db()
    except Exception:
        pass


# Persistent thread pool for concurrent stock screening (avoids thread churn)
_SCAN_EXECUTOR: Optional[ThreadPoolExecutor] = None
_SCAN_LOCK = threading.Lock()


def _get_scan_executor() -> ThreadPoolExecutor:
    global _SCAN_EXECUTOR
    if _SCAN_EXECUTOR is None:
        with _SCAN_LOCK:
            if _SCAN_EXECUTOR is None:
                _SCAN_EXECUTOR = ThreadPoolExecutor(max_workers=20, thread_name_prefix="screener_worker")
    return _SCAN_EXECUTOR


def shutdown_data_fetcher(wait: bool = False) -> None:
    """Gracefully shuts down persistent thread pool and cleans up cache database resources."""
    global _SCAN_EXECUTOR
    with _SCAN_LOCK:
        if _SCAN_EXECUTOR is not None:
            _SCAN_EXECUTOR.shutdown(wait=wait, cancel_futures=True)
            _SCAN_EXECUTOR = None
    _cleanup_thread_db()


def get_ticker_cap(ticker: str) -> str:
    """Helper to find market cap category for a ticker from predefined universe."""
    clean = ticker.strip().upper()
    for w in WATCHLISTS.values():
        for s in w.get("stocks", []):
            if s.get("ticker", "").upper() == clean:
                return s.get("cap", "LARGE")
    return "LARGE"


def get_stock_raw_intraday(ticker: str, interval: str = "1m", live_quote: Optional[Dict[str, Any]] = None) -> Tuple[pd.DataFrame, str]:
    """
    Fetches raw 1m intraday data using Angel One SmartAPI live feed for Indian NSE stocks,
    combined with Yahoo Finance for full historical bars.
    Returns: (df, feed_source)
    """
    clean_ticker = ticker.strip().upper()
    feed_source = "YAHOO_FINANCE"

    is_nse = (".NS" in clean_ticker or ".BO" in clean_ticker or clean_ticker in BUILTIN_NSE_TOKENS)

    # 1. If Indian stock and no live quote was passed, attempt to fetch live quote from Angel One
    if is_nse and live_quote is None and angel_client.is_configured():
        try:
            live_quote = angel_client.get_live_quote(clean_ticker)
        except Exception as e:
            logger.debug(f"Angel One quote fetch skipped for {clean_ticker}: {e}")

    df = pd.DataFrame()

    # 2. If Angel One session is authenticated, try fetching official exchange 1m candles
    if is_nse and angel_client.is_authenticated():
        try:
            df_angel = angel_client.get_historical_candles(clean_ticker, interval="ONE_MINUTE", days=2)
            if df_angel is not None and len(df_angel) >= 15:
                df = df_angel
                feed_source = "ANGEL_ONE_SMART_API"
        except Exception as e:
            logger.debug(f"Angel One candle fetch fallback to Yahoo Finance for {ticker}: {e}")

    # 3. Yahoo Finance fetch (as primary historical provider or backup)
    if df.empty:
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
                        # Keep recent bars (up to 240) so EMAs & MTF have enough data to calculate
                        df = df_5d.iloc[-240:].copy()
        except Exception as e:
            logger.error(f"Error fetching Yahoo Finance data for {ticker}: {e}")
            df = pd.DataFrame()
        finally:
            _cleanup_thread_db()

    if df.empty:
        return pd.DataFrame(), feed_source

    # Remove rows where volume is 0 or NaN prices
    df = df.dropna(subset=['Open', 'High', 'Low', 'Close'])
    df = df[df['Volume'] >= 0]
    
    # Ensure index is sorted and strictly increasing
    df = df[~df.index.duplicated(keep='last')]
    df = df.sort_index()

    # Timezone normalization: Indian stocks strictly use Asia/Kolkata (IST), US stocks use America/New_York (EST)
    is_india = bool(".NS" in clean_ticker or ".BO" in clean_ticker)
    target_tz = "Asia/Kolkata" if is_india else "America/New_York"
    if df.index.tz is None:
        df.index = df.index.tz_localize(target_tz)
    else:
        df.index = df.index.tz_convert(target_tz)

    # 4. Synthesize latest bar with live tick from Angel One SmartAPI if available
    if live_quote and live_quote.get("price", 0) > 0:
        feed_source = "ANGEL_ONE_SMART_API"
        ltp = float(live_quote["price"])
        q_high = float(live_quote.get("high") or ltp)
        q_low = float(live_quote.get("low") or ltp)

        # Update last bar's Close, High, Low with Angel One live exchange prices
        try:
            last_c = float(df.iloc[-1]['Close'])
            last_h = max(float(df.iloc[-1]['High']), ltp, q_high if q_high > 0 else ltp)
            last_l = min(float(df.iloc[-1]['Low']), ltp) if q_low <= 0 else min(float(df.iloc[-1]['Low']), ltp, q_low)

            df.iloc[-1, df.columns.get_loc('Close')] = ltp
            df.iloc[-1, df.columns.get_loc('High')] = last_h
            df.iloc[-1, df.columns.get_loc('Low')] = last_l
        except Exception as e:
            logger.debug(f"Could not merge Angel One live tick: {e}")

    return df, feed_source


def fetch_and_analyze_ticker(
    ticker: str,
    company_name: str = "",
    force_refresh: bool = False,
    cap: Optional[str] = None,
    live_quote: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Fetches real-time 1m data (hybrid Angel One SmartAPI + Yahoo Finance),
    calculates indicators, and analyzes technical setup.
    Utilizes short TTL caching for fast UI interactions.
    """
    ticker = ticker.strip().upper()
    if not cap:
        cap = get_ticker_cap(ticker)
    now = time.time()

    if not force_refresh:
        cached_entry = _CACHE.get(ticker)
        if cached_entry and (now - cached_entry.get("timestamp", 0) < CACHE_TTL_SECONDS):
            return cached_entry["analysis"]

    # Fetch fresh 1-minute data and feed source
    df, feed_source = get_stock_raw_intraday(ticker, interval="1m", live_quote=live_quote)
    if df.empty:
        return {
            "ticker": ticker,
            "company_name": company_name or ticker,
            "cap": cap,
            "status": "ERROR",
            "feed_source": feed_source,
            "message": f"Unable to fetch intraday data for '{ticker}'. Verify the symbol."
        }

    # Compute technical indicators
    df_indicators = calculate_intraday_indicators(df)

    # Perform expert intraday analysis
    analysis = analyze_stock_setup(
        ticker,
        df_indicators,
        company_name,
        cap=cap,
        feed_source=feed_source,
        live_quote=live_quote
    )
    if "status" not in analysis:
        analysis["status"] = "OK"
    if "cap" not in analysis:
        analysis["cap"] = cap

    # Save to cache
    _CACHE[ticker] = {
        "timestamp": now,
        "df": df_indicators,
        "analysis": analysis,
        "feed_source": feed_source
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
    - Live Feed Source indicator (Angel One SmartAPI / Yahoo Finance)
    """
    ticker = ticker.strip().upper()
    analysis = fetch_and_analyze_ticker(ticker, force_refresh=force_refresh)
    
    if analysis.get("status") != "OK":
        return analysis

    cached = _CACHE.get(ticker)
    if not cached:
        return {"status": "ERROR", "message": "Failed to retrieve processed data."}

    df = cached["df"]

    # If timeframe is 5m, 10m, or 15m, resample if requested
    agg_rules = {
        'Open': 'first',
        'High': 'max',
        'Low': 'min',
        'Close': 'last',
        'Volume': 'sum'
    }
    if timeframe == "5m" and len(df) >= 10:
        df_resampled = df.resample('5min').agg(agg_rules).dropna()
        df_chart = calculate_intraday_indicators(df_resampled)
    elif timeframe == "10m" and len(df) >= 15:
        df_resampled = df.resample('10min').agg(agg_rules).dropna()
        df_chart = calculate_intraday_indicators(df_resampled)
    elif timeframe == "15m" and len(df) >= 20:
        df_resampled = df.resample('15min').agg(agg_rules).dropna()
        df_chart = calculate_intraday_indicators(df_resampled)
    else:
        df_chart = df

    # Prepare Lightweight Charts arrays with high performance
    candles = []
    vwap_series = []
    ema9_series = []
    ema21_series = []
    ema50_series = []
    volume_series = []
    vol_ma_series = []
    rsi_series = []

    last_time = -1
    has_vwap = 'VWAP' in df_chart.columns
    has_ema9 = 'EMA9' in df_chart.columns
    has_ema21 = 'EMA21' in df_chart.columns
    has_ema50 = 'EMA50' in df_chart.columns
    has_vol_ma = 'Vol_MA20' in df_chart.columns
    has_rsi = 'RSI' in df_chart.columns

    # itertuples is 30-50x faster than iterrows and avoids allocating a pd.Series per row
    for row in df_chart.itertuples():
        idx = row.Index
        try:
            t_sec = int(idx.timestamp())
        except Exception:
            continue
        
        # Ensure strictly increasing timestamp for Lightweight Charts
        if t_sec <= last_time:
            continue
        last_time = t_sec

        o = float(row.Open)
        h = float(row.High)
        l = float(row.Low)
        c = float(row.Close)
        v = float(row.Volume)

        candles.append({
            "time": t_sec,
            "open": round(o, 2),
            "high": round(h, 2),
            "low": round(l, 2),
            "close": round(c, 2)
        })

        if has_vwap:
            val = getattr(row, 'VWAP', None)
            if val is not None and not pd.isna(val):
                vwap_series.append({"time": t_sec, "value": round(float(val), 2)})
        
        if has_ema9:
            val = getattr(row, 'EMA9', None)
            if val is not None and not pd.isna(val):
                ema9_series.append({"time": t_sec, "value": round(float(val), 2)})

        if has_ema21:
            val = getattr(row, 'EMA21', None)
            if val is not None and not pd.isna(val):
                ema21_series.append({"time": t_sec, "value": round(float(val), 2)})

        if has_ema50:
            val = getattr(row, 'EMA50', None)
            if val is not None and not pd.isna(val):
                ema50_series.append({"time": t_sec, "value": round(float(val), 2)})

        # Volume color: green if close >= open, else red
        vol_color = "rgba(16, 185, 129, 0.65)" if c >= o else "rgba(239, 68, 68, 0.65)"
        volume_series.append({
            "time": t_sec,
            "value": int(v),
            "color": vol_color
        })

        if has_vol_ma:
            val = getattr(row, 'Vol_MA20', None)
            if val is not None and not pd.isna(val):
                vol_ma_series.append({"time": t_sec, "value": round(float(val), 2)})

        if has_rsi:
            val = getattr(row, 'RSI', None)
            if val is not None and not pd.isna(val):
                rsi_series.append({"time": t_sec, "value": round(float(val), 2)})

    return {
        "status": "OK",
        "ticker": ticker,
        "timeframe": timeframe,
        "feed_source": analysis.get("feed_source", "YAHOO_FINANCE"),
        "feed_source_label": analysis.get("feed_source_label", "Yahoo Finance"),
        "circuit_limits": analysis.get("circuit_limits"),
        "market_depth": analysis.get("market_depth"),
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
    Utilizes Angel One SmartAPI live market feed for real-time Indian NSE quotes.
    """
    if custom_tickers and len(custom_tickers) > 0:
        raw_targets = [{"ticker": t.strip().upper(), "name": t.strip().upper()} for t in custom_tickers if t.strip()]
    elif watchlist_key in WATCHLISTS:
        raw_targets = WATCHLISTS[watchlist_key]["stocks"]
    else:
        raw_targets = WATCHLISTS["NSE_MOMENTUM"]["stocks"]

    # Deduplicate targets by ticker symbol to avoid duplicate work and concurrent thread waste
    seen_tickers = set()
    targets = []
    for item in raw_targets:
        sym = item.get("ticker", "").strip().upper()
        if sym and sym not in seen_tickers:
            seen_tickers.add(sym)
            targets.append(item)

    # Batch-fetch live Angel One quotes for Indian stocks up-front if configured
    angel_quotes: Dict[str, Dict[str, Any]] = {}
    is_indian_universe = any((".NS" in t["ticker"] or ".BO" in t["ticker"] or "NSE" in watchlist_key) for t in targets)
    
    if is_indian_universe and angel_client.is_configured():
        try:
            target_symbols = [t["ticker"] for t in targets]
            angel_quotes = angel_client.get_live_quotes(target_symbols)
            if angel_quotes:
                logger.info(f"Retrieved {len(angel_quotes)} live quotes from Angel One SmartAPI (https://apiconnect.angelone.in)")
        except Exception as e:
            logger.warning(f"Angel One batch quote error; fallback to Yahoo Finance: {e}")

    results = []

    def _worker(item):
        try:
            l_quote = angel_quotes.get(item["ticker"])
            return fetch_and_analyze_ticker(
                item["ticker"],
                item.get("name", ""),
                cap=item.get("cap"),
                live_quote=l_quote
            )
        except Exception as err:
            logger.error(f"Scan worker failed for {item['ticker']}: {err}")
            return None
        finally:
            _cleanup_thread_db()

    # Fetch with concurrent threads using persistent executor for maximum throughput
    executor = _get_scan_executor()
    scan_outputs = list(executor.map(_worker, targets))

    for out in scan_outputs:
        if out and out.get("status") == "OK":
            results.append(out)

    def _rank_key(x):
        # 1 for actionable recommendations (STRONG BUY, BUY, STRONG SELL, SELL)
        sig = str(x.get("signal", "")).upper()
        is_rec = 1 if (x.get("is_recommended") or (any(w in sig for w in ["BUY", "SELL", "SHORT"]) and "NEUTRAL" not in sig)) else 0
        roi = float(x.get("roi_pct") or x.get("trade_plan", {}).get("roi_pct", 0.0))
        score = abs(x.get("score", 0))
        rvol = float(x.get("rvol", 0.0))
        return (is_rec, roi, score, rvol)

    # Sort descending: recommended stocks with highest ROI first, followed by score & volume
    results.sort(key=_rank_key, reverse=True)

    return results

