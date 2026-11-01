"""
Test Suite: Intraday Stock Picker - Midcap & Smallcap Universe Verification
"""

import sys
import unittest

from app import get_watchlists_meta
from data_fetcher import WATCHLISTS, get_ticker_cap, fetch_and_analyze_ticker, scan_watchlist


class TestIntradayUniverse(unittest.TestCase):

    def test_watchlists_metadata(self):
        """Verify that all required watchlists exist in WATCHLISTS."""
        required_keys = [
            "NSE_MOMENTUM", "NSE_MIDCAP", "NSE_SMALLCAP",
            "US_MOMENTUM", "US_MIDCAP", "US_SMALLCAP",
            "US_MAG7", "NSE_BANK", "NSE_IT"
        ]
        for key in required_keys:
            self.assertIn(key, WATCHLISTS, f"Watchlist {key} must be defined")
            stocks = WATCHLISTS[key]["stocks"]
            self.assertGreaterEqual(len(stocks), 6, f"Watchlist {key} must contain stocks")
            for s in stocks:
                self.assertIn("ticker", s)
                self.assertIn("name", s)
                self.assertIn("cap", s)
                self.assertIn(s["cap"], ["LARGE", "MID", "SMALL"])

    def test_ticker_cap_lookup(self):
        """Verify get_ticker_cap returns correct cap classifications."""
        self.assertEqual(get_ticker_cap("RELIANCE.NS"), "LARGE")
        self.assertEqual(get_ticker_cap("DIXON.NS"), "MID")
        self.assertEqual(get_ticker_cap("SUZLON.NS"), "SMALL")
        self.assertEqual(get_ticker_cap("NVDA"), "LARGE")
        self.assertEqual(get_ticker_cap("CRWD"), "MID")
        self.assertEqual(get_ticker_cap("ASTS"), "SMALL")

    def test_api_watchlists_endpoint(self):
        """Verify the /api/watchlists endpoint returns the new midcap and smallcap watchlists."""
        data = get_watchlists_meta()
        self.assertEqual(data["status"], "OK")
        watchlists = data["watchlists"]
        self.assertIn("US_MIDCAP", watchlists)
        self.assertIn("US_SMALLCAP", watchlists)
        self.assertIn("NSE_MIDCAP", watchlists)
        self.assertIn("NSE_SMALLCAP", watchlists)
        self.assertEqual(watchlists["US_MIDCAP"]["currency"], "$")
        self.assertEqual(watchlists["NSE_MIDCAP"]["currency"], "₹")

    def test_turnover_liquidity_for_midcaps(self):
        """Verify that high-priced midcaps like DIXON.NS pass the turnover liquidity check."""
        # DIXON.NS has a high share price (₹13k+), testing that turnover-aware floor works
        result = fetch_and_analyze_ticker("DIXON.NS", cap="MID")
        self.assertEqual(result.get("status"), "OK")
        self.assertEqual(result.get("cap"), "MID")
        self.assertEqual(result.get("currency_symbol"), "₹")

    def test_us_midcap_analysis(self):
        """Verify US Midcap stock analysis returns OK and cap MID."""
        result = fetch_and_analyze_ticker("CRWD", cap="MID")
        self.assertEqual(result.get("status"), "OK")
        self.assertEqual(result.get("cap"), "MID")
        self.assertEqual(result.get("currency_symbol"), "$")

    def test_us_smallcap_analysis(self):
        """Verify US Smallcap stock analysis returns OK and cap SMALL."""
        result = fetch_and_analyze_ticker("ASTS", cap="SMALL", force_refresh=True)
        self.assertEqual(result.get("status"), "OK")
        self.assertEqual(result.get("cap"), "SMALL")
        self.assertEqual(result.get("currency_symbol"), "$")

    def test_indian_stock_pick_ist_timezone(self):
        """Verify Indian stock picks strictly use and display IST (Asia/Kolkata) timezone."""
        result = fetch_and_analyze_ticker("TCS.NS", cap="LARGE")
        self.assertEqual(result.get("status"), "OK")
        self.assertTrue(result.get("is_india"), "Indian stock must have is_india=True")
        self.assertEqual(result.get("market_tz"), "Asia/Kolkata", "Indian stock market_tz must be Asia/Kolkata")
        self.assertEqual(result.get("tz_label"), "IST", "Indian stock tz_label must be IST")
        self.assertTrue(str(result.get("time_str", "")).endswith("IST"), f"time_str should end with IST, got {result.get('time_str')}")
        self.assertTrue(str(result.get("pick_time", "")).endswith("IST"), f"pick_time should end with IST, got {result.get('pick_time')}")
        self.assertTrue(str(result.get("pick_time_short", "")).endswith("IST"), f"pick_time_short should end with IST, got {result.get('pick_time_short')}")

    def test_us_stock_pick_non_ist_timezone(self):
        """Verify US stock picks strictly use EST/EDT (America/New_York) and do NOT use IST."""
        result = fetch_and_analyze_ticker("NVDA", cap="LARGE")
        self.assertEqual(result.get("status"), "OK")
        self.assertFalse(result.get("is_india"), "US stock must have is_india=False")
        self.assertEqual(result.get("market_tz"), "America/New_York", "US stock market_tz must be America/New_York")
        self.assertEqual(result.get("tz_label"), "EST", "US stock tz_label must be EST")
        time_str = str(result.get("time_str", ""))
        pick_time = str(result.get("pick_time", ""))
        self.assertTrue(time_str.endswith("EST"), f"US stock time_str should end with EST, got {time_str}")
        self.assertNotIn("IST", time_str, "US stock time_str must not contain IST")
        self.assertNotIn("IST", pick_time, "US stock pick_time must not contain IST")

    def test_scan_watchlist_ist_for_india_only(self):
        """Verify scan endpoints provide IST metadata for Indian watchlists and EST for US watchlists."""
        from app import scan_stocks
        nse_res = scan_stocks(market="NSE_MOMENTUM")
        self.assertEqual(nse_res.get("status"), "OK")
        self.assertTrue(nse_res.get("is_india"), "NSE watchlist must have is_india=True")
        self.assertEqual(nse_res.get("tz_label"), "IST", "NSE watchlist tz_label must be IST")
        self.assertEqual(nse_res.get("market_tz"), "Asia/Kolkata")
        self.assertTrue(str(nse_res.get("scan_time", "")).endswith("IST"))

        us_res = scan_stocks(market="US_MOMENTUM")
        self.assertEqual(us_res.get("status"), "OK")
        self.assertFalse(us_res.get("is_india"), "US watchlist must have is_india=False")
        self.assertEqual(us_res.get("tz_label"), "EST", "US watchlist tz_label must be EST")
        self.assertEqual(us_res.get("market_tz"), "America/New_York")
        self.assertTrue(str(us_res.get("scan_time", "")).endswith("EST"))
        self.assertNotIn("IST", str(us_res.get("scan_time", "")))


if __name__ == "__main__":
    unittest.main()
