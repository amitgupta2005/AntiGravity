"""
Stock Universe Catalog for Dual-Market Coverage:
- India (NSE/BSE): Major Nifty 50, Bank Nifty, and High-Beta Midcaps
- US (NYSE/NASDAQ): Mega-Cap Tech, AI Leaders, and High-Beta Momentum
"""

from typing import Dict, List, Any

# Curated Indian Equities Universe (NSE Symbols with .NS suffix for yfinance)
INDIAN_STOCKS: List[Dict[str, Any]] = [
    {"ticker": "RELIANCE.NS", "display_ticker": "RELIANCE", "name": "Reliance Industries Ltd", "sector": "Energy & Retail", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "TCS.NS", "display_ticker": "TCS", "name": "Tata Consultancy Services", "sector": "Information Technology", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "HDFCBANK.NS", "display_ticker": "HDFCBANK", "name": "HDFC Bank Ltd", "sector": "Banking & Financials", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "INFY.NS", "display_ticker": "INFY", "name": "Infosys Ltd", "sector": "Information Technology", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "ICICIBANK.NS", "display_ticker": "ICICIBANK", "name": "ICICI Bank Ltd", "sector": "Banking & Financials", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "TATAPOWER.NS", "display_ticker": "TATAPOWER", "name": "Tata Power Company Ltd", "sector": "Power & Clean Energy", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "BHARTIARTL.NS", "display_ticker": "BHARTIARTL", "name": "Bharti Airtel Ltd", "sector": "Telecom", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "SBIN.NS", "display_ticker": "SBIN", "name": "State Bank of India", "sector": "PSU Banking", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "LT.NS", "display_ticker": "LT", "name": "Larsen & Toubro Ltd", "sector": "Infrastructure & Defense", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "TRENT.NS", "display_ticker": "TRENT", "name": "Trent Ltd (Westside / Zudio)", "sector": "Consumer Retail", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "DIXON.NS", "display_ticker": "DIXON", "name": "Dixon Technologies", "sector": "Electronics Manufacturing", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "HAL.NS", "display_ticker": "HAL", "name": "Hindustan Aeronautics Ltd", "sector": "Defense & Aerospace", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "BEL.NS", "display_ticker": "BEL", "name": "Bharat Electronics Ltd", "sector": "Defense Electronics", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "POLYCAB.NS", "display_ticker": "POLYCAB", "name": "Polycab India Ltd", "sector": "Cables & Infrastructure", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "PERSISTENT.NS", "display_ticker": "PERSISTENT", "name": "Persistent Systems Ltd", "sector": "Information Technology", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "SUZLON.NS", "display_ticker": "SUZLON", "name": "Suzlon Energy Ltd", "sector": "Renewable Green Energy", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "RVNL.NS", "display_ticker": "RVNL", "name": "Rail Vikas Nigam Ltd", "sector": "Railway Infrastructure", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "BSE.NS", "display_ticker": "BSE", "name": "BSE Ltd", "sector": "Capital Markets Exchange", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "CDSL.NS", "display_ticker": "CDSL", "name": "Central Depository Services", "sector": "Financial Market Infra", "market": "India", "currency": "₹", "exchange": "NSE"},
    {"ticker": "TITAN.NS", "display_ticker": "TITAN", "name": "Titan Company Ltd", "sector": "Gems & Luxury Retail", "market": "India", "currency": "₹", "exchange": "NSE"},
]

# Curated US Equities Universe (NYSE & NASDAQ)
US_STOCKS: List[Dict[str, Any]] = [
    {"ticker": "NVDA", "display_ticker": "NVDA", "name": "NVIDIA Corporation", "sector": "Semiconductors & AI", "market": "US", "currency": "$", "exchange": "NASDAQ"},
    {"ticker": "AAPL", "display_ticker": "AAPL", "name": "Apple Inc.", "sector": "Consumer Electronics", "market": "US", "currency": "$", "exchange": "NASDAQ"},
    {"ticker": "MSFT", "display_ticker": "MSFT", "name": "Microsoft Corporation", "sector": "Cloud & Enterprise Software", "market": "US", "currency": "$", "exchange": "NASDAQ"},
    {"ticker": "AMZN", "display_ticker": "AMZN", "name": "Amazon.com Inc.", "sector": "E-Commerce & Cloud AWS", "market": "US", "currency": "$", "exchange": "NASDAQ"},
    {"ticker": "TSLA", "display_ticker": "TSLA", "name": "Tesla Inc.", "sector": "Electric Vehicles & Energy", "market": "US", "currency": "$", "exchange": "NASDAQ"},
    {"ticker": "GOOGL", "display_ticker": "GOOGL", "name": "Alphabet Inc. (Google)", "sector": "Internet Search & Cloud", "market": "US", "currency": "$", "exchange": "NASDAQ"},
    {"ticker": "META", "display_ticker": "META", "name": "Meta Platforms Inc.", "sector": "Social Media & AI", "market": "US", "currency": "$", "exchange": "NASDAQ"},
    {"ticker": "AMD", "display_ticker": "AMD", "name": "Advanced Micro Devices", "sector": "Semiconductors & Data Center", "market": "US", "currency": "$", "exchange": "NASDAQ"},
    {"ticker": "PLTR", "display_ticker": "PLTR", "name": "Palantir Technologies", "sector": "Enterprise AI & Defense", "market": "US", "currency": "$", "exchange": "NYSE"},
    {"ticker": "SMCI", "display_ticker": "SMCI", "name": "Super Micro Computer", "sector": "AI Server Infrastructure", "market": "US", "currency": "$", "exchange": "NASDAQ"},
    {"ticker": "COIN", "display_ticker": "COIN", "name": "Coinbase Global Inc.", "sector": "Fintech & Crypto", "market": "US", "currency": "$", "exchange": "NASDAQ"},
    {"ticker": "CRWD", "display_ticker": "CRWD", "name": "CrowdStrike Holdings", "sector": "Cybersecurity & Cloud", "market": "US", "currency": "$", "exchange": "NASDAQ"},
    {"ticker": "ARM", "display_ticker": "ARM", "name": "Arm Holdings plc", "sector": "Semiconductor IP", "market": "US", "currency": "$", "exchange": "NASDAQ"},
    {"ticker": "AVGO", "display_ticker": "AVGO", "name": "Broadcom Inc.", "sector": "Semiconductors & Software", "market": "US", "currency": "$", "exchange": "NASDAQ"},
    {"ticker": "NET", "display_ticker": "NET", "name": "Cloudflare Inc.", "sector": "Edge Cloud & Security", "market": "US", "currency": "$", "exchange": "NYSE"},
    {"ticker": "HOOD", "display_ticker": "HOOD", "name": "Robinhood Markets", "sector": "Fintech Brokerage", "market": "US", "currency": "$", "exchange": "NASDAQ"},
    {"ticker": "SOFI", "display_ticker": "SOFI", "name": "SoFi Technologies", "sector": "Digital Banking & Lending", "market": "US", "currency": "$", "exchange": "NASDAQ"},
    {"ticker": "LLY", "display_ticker": "LLY", "name": "Eli Lilly and Company", "sector": "Biopharma & GLP-1", "market": "US", "currency": "$", "exchange": "NYSE"},
]

# Combined Lookup Map
STOCK_MAP: Dict[str, Dict[str, Any]] = {
    s["ticker"]: s for s in INDIAN_STOCKS + US_STOCKS
}
for s in INDIAN_STOCKS + US_STOCKS:
    STOCK_MAP[s["display_ticker"]] = s

def get_stock_info(symbol: str) -> Dict[str, Any]:
    """Retrieve metadata for a given symbol."""
    clean_sym = symbol.strip().upper()
    if clean_sym in STOCK_MAP:
        return STOCK_MAP[clean_sym]
    if f"{clean_sym}.NS" in STOCK_MAP:
        return STOCK_MAP[f"{clean_sym}.NS"]
    
    # Generic fallback
    is_india = clean_sym.endswith(".NS") or clean_sym.endswith(".BO")
    return {
        "ticker": clean_sym,
        "display_ticker": clean_sym.replace(".NS", "").replace(".BO", ""),
        "name": clean_sym,
        "sector": "Equity",
        "market": "India" if is_india else "US",
        "currency": "₹" if is_india else "$",
        "exchange": "NSE" if is_india else "US",
    }
