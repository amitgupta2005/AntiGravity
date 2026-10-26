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
        result = fetch_and_analyze_ticker("MARA", cap="SMALL")
        self.assertEqual(result.get("status"), "OK")
        self.assertEqual(result.get("cap"), "SMALL")
        self.assertEqual(result.get("currency_symbol"), "$")


if __name__ == "__main__":
    unittest.main()
