"""
Angel One SmartAPI Client Module
Handles live market feed connection to https://apiconnect.angelone.in
Integrates seamlessly with Yahoo Finance to provide up-to-date Indian stock market prices.
"""

import os
import json
import time
import logging
from typing import Dict, Any, List, Optional, Tuple
import requests
import pyotp
import pandas as pd

logger = logging.getLogger(__name__)

# Base URLs
SMARTAPI_BASE_URL = "https://apiconnect.angelone.in"
SCRIP_MASTER_URL = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"

# Pre-compiled high-liquidity NSE token mapping for our watchlists
BUILTIN_NSE_TOKENS: Dict[str, Dict[str, str]] = {
    "RELIANCE.NS": {"token": "2885", "symbol": "RELIANCE-EQ", "name": "RELIANCE"},
    "TCS.NS": {"token": "11536", "symbol": "TCS-EQ", "name": "TCS"},
    "HDFCBANK.NS": {"token": "1333", "symbol": "HDFCBANK-EQ", "name": "HDFCBANK"},
    "INFY.NS": {"token": "1594", "symbol": "INFY-EQ", "name": "INFY"},
    "ICICIBANK.NS": {"token": "4963", "symbol": "ICICIBANK-EQ", "name": "ICICIBANK"},
    "HCLTECH.NS": {"token": "7229", "symbol": "HCLTECH-EQ", "name": "HCLTECH"},
    "WIPRO.NS": {"token": "3787", "symbol": "WIPRO-EQ", "name": "WIPRO"},
    "SBIN.NS": {"token": "3045", "symbol": "SBIN-EQ", "name": "SBIN"},
    "BHARTIARTL.NS": {"token": "10604", "symbol": "BHARTIARTL-EQ", "name": "BHARTIARTL"},
    "AXISBANK.NS": {"token": "5900", "symbol": "AXISBANK-EQ", "name": "AXISBANK"},
    "LT.NS": {"token": "11483", "symbol": "LT-EQ", "name": "LT"},
    "MARUTI.NS": {"token": "10999", "symbol": "MARUTI-EQ", "name": "MARUTI"},
    "BAJFINANCE.NS": {"token": "317", "symbol": "BAJFINANCE-EQ", "name": "BAJFINANCE"},
    "SUNPHARMA.NS": {"token": "3351", "symbol": "SUNPHARMA-EQ", "name": "SUNPHARMA"},
    "TITAN.NS": {"token": "3506", "symbol": "TITAN-EQ", "name": "TITAN"},
    "TATASTEEL.NS": {"token": "3499", "symbol": "TATASTEEL-EQ", "name": "TATASTEEL"},
    "DIXON.NS": {"token": "21690", "symbol": "DIXON-EQ", "name": "DIXON"},
    "POLYCAB.NS": {"token": "9590", "symbol": "POLYCAB-EQ", "name": "POLYCAB"},
    "PERSISTENT.NS": {"token": "18365", "symbol": "PERSISTENT-EQ", "name": "PERSISTENT"},
    "COFORGE.NS": {"token": "11543", "symbol": "COFORGE-EQ", "name": "COFORGE"},
    "TRENT.NS": {"token": "1964", "symbol": "TRENT-EQ", "name": "TRENT"},
    "VOLTAS.NS": {"token": "3718", "symbol": "VOLTAS-EQ", "name": "VOLTAS"},
    "ASTRAL.NS": {"token": "14418", "symbol": "ASTRAL-EQ", "name": "ASTRAL"},
    "FEDERALBNK.NS": {"token": "1023", "symbol": "FEDERALBNK-EQ", "name": "FEDERALBNK"},
    "IDFCFIRSTB.NS": {"token": "11184", "symbol": "IDFCFIRSTB-EQ", "name": "IDFCFIRSTB"},
    "ASHOKLEY.NS": {"token": "212", "symbol": "ASHOKLEY-EQ", "name": "ASHOKLEY"},
    "CUMMINSIND.NS": {"token": "1901", "symbol": "CUMMINSIND-EQ", "name": "CUMMINSIND"},
    "BHARATFORG.NS": {"token": "422", "symbol": "BHARATFORG-EQ", "name": "BHARATFORG"},
    "JUBLFOOD.NS": {"token": "18096", "symbol": "JUBLFOOD-EQ", "name": "JUBLFOOD"},
    "MAXHEALTH.NS": {"token": "22377", "symbol": "MAXHEALTH-EQ", "name": "MAXHEALTH"},
    "ABCAPITAL.NS": {"token": "21614", "symbol": "ABCAPITAL-EQ", "name": "ABCAPITAL"},
    "PAGEIND.NS": {"token": "14413", "symbol": "PAGEIND-EQ", "name": "PAGEIND"},
    "SUZLON.NS": {"token": "12018", "symbol": "SUZLON-EQ", "name": "SUZLON"},
    "RVNL.NS": {"token": "9552", "symbol": "RVNL-EQ", "name": "RVNL"},
    "IRCON.NS": {"token": "4986", "symbol": "IRCON-EQ", "name": "IRCON"},
    "HUDCO.NS": {"token": "20825", "symbol": "HUDCO-EQ", "name": "HUDCO"},
    "NBCC.NS": {"token": "31415", "symbol": "NBCC-EQ", "name": "NBCC"},
    "CDSL.NS": {"token": "21174", "symbol": "CDSL-EQ", "name": "CDSL"},
    "ANGELONE.NS": {"token": "324", "symbol": "ANGELONE-EQ", "name": "ANGELONE"},
    "KAYNES.NS": {"token": "12092", "symbol": "KAYNES-EQ", "name": "KAYNES"},
    "BSOFT.NS": {"token": "6994", "symbol": "BSOFT-EQ", "name": "BSOFT"},
    "RBLBANK.NS": {"token": "18391", "symbol": "RBLBANK-EQ", "name": "RBLBANK"},
    "MANAPPURAM.NS": {"token": "19061", "symbol": "MANAPPURAM-EQ", "name": "MANAPPURAM"},
    "RADICO.NS": {"token": "10990", "symbol": "RADICO-EQ", "name": "RADICO"},
    "IRFC.NS": {"token": "2029", "symbol": "IRFC-EQ", "name": "IRFC"},
    "CASTROLIND.NS": {"token": "1250", "symbol": "CASTROLIND-EQ", "name": "CASTROLIND"},
    "HFCL.NS": {"token": "21954", "symbol": "HFCL-BE", "name": "HFCL"},
    "EXIDEIND.NS": {"token": "676", "symbol": "EXIDEIND-EQ", "name": "EXIDEIND"},
    "KOTAKBANK.NS": {"token": "1922", "symbol": "KOTAKBANK-EQ", "name": "KOTAKBANK"},
    "INDUSINDBK.NS": {"token": "5258", "symbol": "INDUSINDBK-EQ", "name": "INDUSINDBK"},
    "BANKBARODA.NS": {"token": "4668", "symbol": "BANKBARODA-EQ", "name": "BANKBARODA"},
    "PNB.NS": {"token": "10666", "symbol": "PNB-EQ", "name": "PNB"},
    "TECHM.NS": {"token": "13538", "symbol": "TECHM-EQ", "name": "TECHM"},
    "OFSS.NS": {"token": "10738", "symbol": "OFSS-EQ", "name": "OFSS"}
}


class AngelOneSmartAPI:
    """
    Direct REST API Client for Angel One SmartAPI (https://apiconnect.angelone.in)
    Features:
    - Zero external dependency issues (pure requests + pyotp)
    - Automatic session renewal and error recovery
    - Fast batch quotes and real-time LTP extraction
    - Local disk caching for ScripMaster instruments
    """

    def __init__(self, env_file_path: Optional[str] = None):
        self.env_file_path = env_file_path or os.path.join(os.path.dirname(__file__), ".env")
        self.load_env_config()
        
        self.jwt_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.feed_token: Optional[str] = None
        self.token_expiry: float = 0.0
        self.last_login_time: float = 0.0
        self.last_error: Optional[str] = None
        
        # Scrip master cache
        self.tokens_cache: Dict[str, Dict[str, str]] = dict(BUILTIN_NSE_TOKENS)
        self.scrip_master_file = os.path.join(os.path.dirname(__file__), "angel_scrip_master.json")
        self._load_local_scrip_cache()

    def load_env_config(self):
        """Loads configuration from environment or .env file."""
        if os.path.exists(self.env_file_path):
            try:
                with open(self.env_file_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ[k.strip()] = v.strip()
            except Exception as e:
                logger.warning(f"Could not read .env file: {e}")

        self.api_key = os.getenv("ANGEL_API_KEY", "").strip()
        self.client_code = os.getenv("ANGEL_CLIENT_CODE", "").strip()
        self.password = os.getenv("ANGEL_PASSWORD", os.getenv("ANGEL_PIN", "")).strip()
        self.totp_secret = os.getenv("ANGEL_TOTP_SECRET", os.getenv("ANGEL_TOTP_KEY", "")).strip()
        self.enabled = os.getenv("ANGEL_FEED_ENABLED", "true").lower() in ["1", "true", "yes"]

    def save_config(self, api_key: str, client_code: str, pin: str, totp_secret: str, enabled: bool = True) -> bool:
        """Saves credentials into .env and reloads."""
        try:
            self.api_key = api_key.strip()
            self.client_code = client_code.strip()
            self.password = pin.strip()
            self.totp_secret = totp_secret.strip()
            self.enabled = bool(enabled)

            # Update environment variables
            os.environ["ANGEL_API_KEY"] = self.api_key
            os.environ["ANGEL_CLIENT_CODE"] = self.client_code
            os.environ["ANGEL_PIN"] = self.password
            os.environ["ANGEL_PASSWORD"] = self.password
            os.environ["ANGEL_TOTP_SECRET"] = self.totp_secret
            os.environ["ANGEL_FEED_ENABLED"] = "true" if self.enabled else "false"

            # Write to .env file
            content = (
                "# Angel One SmartAPI Credentials\n"
                f"ANGEL_API_KEY={self.api_key}\n"
                f"ANGEL_CLIENT_CODE={self.client_code}\n"
                f"ANGEL_PIN={self.password}\n"
                f"ANGEL_PASSWORD={self.password}\n"
                f"ANGEL_TOTP_SECRET={self.totp_secret}\n"
                f"ANGEL_FEED_ENABLED={'true' if self.enabled else 'false'}\n"
            )
            with open(self.env_file_path, "w", encoding="utf-8") as f:
                f.write(content)

            # Invalidate existing session tokens so new credentials take effect
            self.jwt_token = None
            self.token_expiry = 0.0
            self.last_error = None
            return True
        except Exception as e:
            logger.error(f"Failed to save Angel One config: {e}")
            return False

    def is_configured(self) -> bool:
        """Returns True if minimum credentials exist."""
        return bool(self.api_key and self.client_code and self.password and self.totp_secret)

    def is_authenticated(self) -> bool:
        """Returns True if a valid session JWT token is active."""
        return bool(self.jwt_token and time.time() < (self.token_expiry - 60))

    def _get_headers(self, authenticated: bool = True) -> Dict[str, str]:
        """Builds standard Angel One SmartAPI HTTP headers."""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-UserType": "USER",
            "X-SourceID": "WEB",
            "X-ClientLocalIP": "127.0.0.1",
            "X-ClientPublicIP": "127.0.0.1",
            "X-MACAddress": "00:00:00:00:00:00",
            "X-PrivateKey": self.api_key
        }
        if authenticated and self.jwt_token:
            auth_val = self.jwt_token if self.jwt_token.startswith("Bearer ") else f"Bearer {self.jwt_token}"
            headers["Authorization"] = auth_val
        return headers

    def generate_totp(self) -> Optional[str]:
        """Generates real-time 6-digit TOTP from secret."""
        if not self.totp_secret:
            return None
        try:
            clean_secret = self.totp_secret.replace(" ", "").upper()
            totp = pyotp.TOTP(clean_secret)
            return totp.now()
        except Exception as e:
            logger.error(f"Error generating TOTP: {e}")
            return None

    def login(self, force: bool = False) -> Tuple[bool, str]:
        """
        Authenticates with Angel One SmartAPI at https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword
        """
        if not self.is_configured():
            msg = "Angel One credentials incomplete. Please set API Key, Client ID, PIN, and TOTP Secret."
            self.last_error = msg
            return False, msg

        if not force and self.is_authenticated():
            return True, "Already connected with active session."

        totp_code = self.generate_totp()
        if not totp_code:
            msg = "Failed to generate TOTP code. Verify your TOTP secret key."
            self.last_error = msg
            return False, msg

        endpoint = f"{SMARTAPI_BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword"
        payload = {
            "clientcode": self.client_code,
            "password": self.password,
            "totp": totp_code
        }

        try:
            headers = self._get_headers(authenticated=False)
            res = requests.post(endpoint, json=payload, headers=headers, timeout=12)
            data = res.json()

            if res.status_code == 200 and data.get("status") is True:
                resp_data = data.get("data", {})
                self.jwt_token = resp_data.get("jwtToken")
                self.refresh_token = resp_data.get("refreshToken")
                self.feed_token = resp_data.get("feedToken")
                # Token valid for ~20 hours
                self.token_expiry = time.time() + (20 * 3600)
                self.last_login_time = time.time()
                self.last_error = None
                logger.info(f"Angel One SmartAPI login successful for client {self.client_code}")
                return True, "Connected successfully to Angel One SmartAPI live feed."
            else:
                err_msg = data.get("message") or data.get("errorcode") or f"HTTP {res.status_code}"
                self.last_error = err_msg
                logger.warning(f"Angel One SmartAPI login failed: {err_msg}")
                return False, f"Login failed: {err_msg}"

        except Exception as e:
            err_msg = f"Network exception reaching {SMARTAPI_BASE_URL}: {str(e)}"
            self.last_error = err_msg
            logger.error(err_msg)
            return False, err_msg

    def refresh_session_token(self) -> bool:
        """Refreshes JWT token using refreshToken."""
        if not self.refresh_token or not self.api_key:
            return False
        endpoint = f"{SMARTAPI_BASE_URL}/rest/auth/angelbroking/jwt/v1/generateTokens"
        payload = {"refreshToken": self.refresh_token}
        try:
            headers = self._get_headers(authenticated=True)
            res = requests.post(endpoint, json=payload, headers=headers, timeout=10)
            data = res.json()
            if res.status_code == 200 and data.get("status") is True:
                resp_data = data.get("data", {})
                self.jwt_token = resp_data.get("jwtToken")
                self.refresh_token = resp_data.get("refreshToken")
                self.token_expiry = time.time() + (20 * 3600)
                return True
        except Exception as e:
            logger.error(f"Error refreshing Angel One token: {e}")
        return False

    def resolve_token(self, ticker: str) -> Optional[Dict[str, str]]:
        """Resolves ticker (e.g. RELIANCE.NS) to token dictionary."""
        ticker = ticker.strip().upper()
        if ticker in self.tokens_cache:
            return self.tokens_cache[ticker]

        # Try stripping .NS
        clean = ticker.replace(".NS", "")
        if clean in self.tokens_cache:
            return self.tokens_cache[clean]

        for k, v in self.tokens_cache.items():
            if v.get("name") == clean or v.get("symbol") == f"{clean}-EQ":
                return v

        return None

    def get_live_quotes(self, tickers: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Batch-fetches live market quotes for given tickers using Angel One SmartAPI quote endpoint.
        Returns dictionary keyed by original ticker (e.g. 'RELIANCE.NS').
        """
        if not self.enabled or not self.is_configured():
            return {}

        if not self.is_authenticated():
            success, _ = self.login()
            if not success:
                return {}

        # Resolve tokens
        token_to_ticker: Dict[str, str] = {}
        tokens_list: List[str] = []

        for t in tickers:
            info = self.resolve_token(t)
            if info and "token" in info:
                tok = str(info["token"])
                token_to_ticker[tok] = t
                tokens_list.append(tok)

        if not tokens_list:
            return {}

        endpoint = f"{SMARTAPI_BASE_URL}/rest/secure/angelbroking/market/v1/quote/"
        results: Dict[str, Dict[str, Any]] = {}

        # Chunk in batches of 50 (Angel One API limit per request)
        batch_size = 50
        for i in range(0, len(tokens_list), batch_size):
            chunk = tokens_list[i:i + batch_size]
            payload = {
                "mode": "FULL",
                "exchangeTokens": {
                    "NSE": chunk
                }
            }

            try:
                headers = self._get_headers(authenticated=True)
                res = requests.post(endpoint, json=payload, headers=headers, timeout=8)
                data = res.json()

                if res.status_code == 200 and data.get("status") is True:
                    fetched = data.get("data", {}).get("fetched", [])
                    for item in fetched:
                        tok = str(item.get("symbolToken"))
                        orig_ticker = token_to_ticker.get(tok)
                        if not orig_ticker:
                            continue

                        ltp = float(item.get("ltp") or 0.0)
                        open_p = float(item.get("open") or 0.0)
                        high_p = float(item.get("high") or 0.0)
                        low_p = float(item.get("low") or 0.0)
                        close_p = float(item.get("close") or 0.0)
                        chg_pct = float(item.get("percentChange") or 0.0)
                        net_chg = float(item.get("netChange") or 0.0)
                        vol = int(item.get("totalTradedVolume") or 0)
                        depth = item.get("depth", {})

                        results[orig_ticker] = {
                            "ticker": orig_ticker,
                            "trading_symbol": item.get("tradingSymbol"),
                            "token": tok,
                            "price": ltp,
                            "ltp": ltp,
                            "open": open_p,
                            "high": high_p,
                            "low": low_p,
                            "close": close_p,
                            "change_pct": chg_pct,
                            "net_change": net_chg,
                            "volume": vol,
                            "avg_price": float(item.get("avgPrice") or 0.0),
                            "upper_circuit": float(item.get("upperCircuit") or 0.0),
                            "lower_circuit": float(item.get("lowerCircuit") or 0.0),
                            "52w_high": float(item.get("52WeekHigh") or 0.0),
                            "52w_low": float(item.get("52WeekLow") or 0.0),
                            "depth": depth,
                            "feed_source": "ANGEL_ONE_SMART_API",
                            "timestamp": time.time()
                        }
                elif res.status_code == 401 or data.get("errorcode") == "AG8001":
                    # Token expired, try refreshing
                    if self.refresh_session_token():
                        # Retry once with refreshed token
                        headers = self._get_headers(authenticated=True)
                        res2 = requests.post(endpoint, json=payload, headers=headers, timeout=8)
                        data2 = res2.json()
                        if res2.status_code == 200 and data2.get("status") is True:
                            for item in data2.get("data", {}).get("fetched", []):
                                tok = str(item.get("symbolToken"))
                                orig_ticker = token_to_ticker.get(tok)
                                if orig_ticker:
                                    results[orig_ticker] = {
                                        "ticker": orig_ticker,
                                        "price": float(item.get("ltp") or 0.0),
                                        "open": float(item.get("open") or 0.0),
                                        "high": float(item.get("high") or 0.0),
                                        "low": float(item.get("low") or 0.0),
                                        "close": float(item.get("close") or 0.0),
                                        "change_pct": float(item.get("percentChange") or 0.0),
                                        "volume": int(item.get("totalTradedVolume") or 0),
                                        "feed_source": "ANGEL_ONE_SMART_API",
                                        "timestamp": time.time()
                                    }
            except Exception as e:
                logger.error(f"Error fetching Angel One market quotes for batch: {e}")

        return results

    def get_live_quote(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Fetches live market quote for a single ticker."""
        res = self.get_live_quotes([ticker])
        return res.get(ticker)

    def get_historical_candles(self, ticker: str, interval: str = "ONE_MINUTE", days: int = 1) -> Optional[pd.DataFrame]:
        """
        Fetches historical candle data from Angel One SmartAPI.
        Endpoint: /rest/secure/angelbroking/historical/v1/getCandleData
        """
        if not self.is_authenticated():
            success, _ = self.login()
            if not success:
                return None

        info = self.resolve_token(ticker)
        if not info or "token" not in info:
            return None

        endpoint = f"{SMARTAPI_BASE_URL}/rest/secure/angelbroking/historical/v1/getCandleData"
        now_dt = pd.Timestamp.now(tz="Asia/Kolkata")
        start_dt = now_dt - pd.Timedelta(days=days)

        payload = {
            "exchange": "NSE",
            "symboltoken": str(info["token"]),
            "interval": interval,
            "fromdate": start_dt.strftime("%Y-%m-%d 09:15"),
            "todate": now_dt.strftime("%Y-%m-%d 15:30")
        }

        try:
            headers = self._get_headers(authenticated=True)
            res = requests.post(endpoint, json=payload, headers=headers, timeout=10)
            data = res.json()

            if res.status_code == 200 and data.get("status") is True:
                candles = data.get("data", [])
                if not candles:
                    return None

                # Format: [datetime_str, open, high, low, close, volume]
                records = []
                for c in candles:
                    records.append({
                        "Datetime": pd.to_datetime(c[0]),
                        "Open": float(c[1]),
                        "High": float(c[2]),
                        "Low": float(c[3]),
                        "Close": float(c[4]),
                        "Volume": float(c[5])
                    })
                df = pd.DataFrame(records).set_index("Datetime").sort_index()
                return df
        except Exception as e:
            logger.error(f"Error fetching Angel One historical candles for {ticker}: {e}")

        return None

    def get_status(self) -> Dict[str, Any]:
        """Returns comprehensive connectivity status dictionary."""
        is_conn = self.is_authenticated()
        has_creds = self.is_configured()
        
        # Mask credentials for display
        masked_client = f"{self.client_code[:2]}***{self.client_code[-2:]}" if len(self.client_code) >= 4 else (self.client_code or "Not set")
        masked_key = f"{self.api_key[:3]}***{self.api_key[-3:]}" if len(self.api_key) >= 6 else (self.api_key or "Not set")

        mode_desc = "Angel One SmartAPI Live (NSE)" if is_conn else ("Credentials Configured (Connecting...)" if has_creds else "Yahoo Finance (Real-Time Fallback)")

        return {
            "status": "OK",
            "connected": is_conn,
            "configured": has_creds,
            "enabled": self.enabled,
            "base_url": SMARTAPI_BASE_URL,
            "client_code_masked": masked_client,
            "api_key_masked": masked_key,
            "feed_mode": mode_desc,
            "token_count": len(self.tokens_cache),
            "last_login_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(self.last_login_time)) if self.last_login_time > 0 else "Never",
            "last_error": self.last_error
        }

    def _load_local_scrip_cache(self):
        """Loads cached scrip tokens if file exists."""
        if os.path.exists(self.scrip_master_file):
            try:
                with open(self.scrip_master_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        self.tokens_cache.update(data)
            except Exception as e:
                logger.warning(f"Could not load local scrip cache: {e}")


# Global Singleton Client
angel_client = AngelOneSmartAPI()
