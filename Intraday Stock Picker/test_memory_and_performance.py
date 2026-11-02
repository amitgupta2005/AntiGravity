"""
Test Suite: Memory Leak & Performance Verification for Intraday Stock Picker
Validates:
1. BoundedTTLCache size limits, LRU eviction, and thread safety.
2. Vectorized chart formatting performance and memory efficiency.
3. Light-mode MTF indicator acceleration.
4. Angel One pooled session and login cooldown anti-flooding.
"""

import time
import unittest
import threading
import pandas as pd
import numpy as np

from data_fetcher import BoundedTTLCache, get_chart_data, _CACHE
from analysis_engine import calculate_intraday_indicators, compute_mtf_alignment
from angel_one_client import angel_client


class TestMemoryAndPerformance(unittest.TestCase):

    def test_bounded_ttl_cache_bounds(self):
        """Verify that cache caps size at maxsize and does not grow indefinitely."""
        cache = BoundedTTLCache(maxsize=10, ttl_seconds=5.0)
        for i in range(50):
            cache[f"TICKER_{i}"] = {
                "timestamp": time.time(),
                "data": list(range(100))
            }
        self.assertEqual(len(cache), 10, "Cache size must be strictly bounded at maxsize")
        # Ensure older items were evicted
        self.assertNotIn("TICKER_0", cache)
        self.assertNotIn("TICKER_30", cache)
        # Ensure latest items are present
        self.assertIn("TICKER_49", cache)

    def test_bounded_ttl_cache_expiration(self):
        """Verify that expired entries are pruned on access."""
        cache = BoundedTTLCache(maxsize=10, ttl_seconds=0.1)
        cache["TEST_EXPIRE"] = {"timestamp": time.time() - 1.0, "val": 42}
        self.assertIsNone(cache.get("TEST_EXPIRE"))
        self.assertNotIn("TEST_EXPIRE", cache)

    def test_bounded_ttl_cache_concurrency(self):
        """Verify thread safety under concurrent writes from multiple threads."""
        cache = BoundedTTLCache(maxsize=25, ttl_seconds=10.0)

        def _worker(thread_id):
            for i in range(40):
                cache[f"T_{thread_id}_{i}"] = {"timestamp": time.time(), "thread": thread_id}

        threads = [threading.Thread(target=_worker, args=(t,)) for t in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertLessEqual(len(cache), 25, "Cache must never exceed maxsize during concurrent access")

    def test_vectorized_chart_data_generation(self):
        """Verify get_chart_data returns valid Lightweight Charts series structure."""
        chart_data = get_chart_data("RELIANCE.NS", timeframe="1m")
        self.assertEqual(chart_data.get("status"), "OK")
        candles = chart_data.get("candles", [])
        self.assertGreater(len(candles), 0, "Candles list must not be empty")
        
        # Verify candle properties
        c0 = candles[0]
        self.assertIn("time", c0)
        self.assertIn("open", c0)
        self.assertIn("high", c0)
        self.assertIn("low", c0)
        self.assertIn("close", c0)
        self.assertIsInstance(c0["time"], int)

        # Verify indicators
        indicators = chart_data.get("indicators", {})
        self.assertIn("vwap", indicators)
        self.assertIn("volume", indicators)
        self.assertIn("rsi", indicators)

    def test_light_indicator_computation(self):
        """Verify calculate_intraday_indicators light=True vs light=False correctness."""
        # Generate dummy 1m intraday OHLCV DataFrame
        periods = 100
        dates = pd.date_range("2026-11-02 09:15:00", periods=periods, freq="1min", tz="Asia/Kolkata")
        np.random.seed(42)
        close_prices = 1000.0 + np.cumsum(np.random.randn(periods) * 2.0)
        df = pd.DataFrame({
            "Open": close_prices - 1.0,
            "High": close_prices + 2.0,
            "Low": close_prices - 2.0,
            "Close": close_prices,
            "Volume": np.random.randint(100, 5000, size=periods)
        }, index=dates)

        # Compute full
        df_full = calculate_intraday_indicators(df, light=False)
        self.assertIn("VWAP", df_full.columns)
        self.assertIn("VWAP_Upper", df_full.columns)
        self.assertIn("ATR14", df_full.columns)
        self.assertIn("ORB_High", df_full.columns)

        # Compute light (used in MTF alignment across 5m, 10m, 15m)
        df_light = calculate_intraday_indicators(df, light=True)
        self.assertIn("VWAP", df_light.columns)
        self.assertIn("EMA9", df_light.columns)
        self.assertIn("EMA21", df_light.columns)
        self.assertIn("RSI", df_light.columns)
        # Heavy intermediate series should be omitted in light mode
        self.assertNotIn("VWAP_Upper", df_light.columns)
        self.assertNotIn("ATR14", df_light.columns)
        self.assertNotIn("ORB_High", df_light.columns)

        # VWAP values should be identical
        np.testing.assert_allclose(df_full["VWAP"].values, df_light["VWAP"].values, rtol=1e-5)

    def test_angel_one_session_and_cooldown(self):
        """Verify Angel One client has pooled session and login cooldown protection."""
        self.assertIsNotNone(angel_client.session)
        self.assertEqual(angel_client.login_cooldown_seconds, 45.0)

        # First login attempt
        angel_client.last_login_attempt = time.time()
        # Immediate consecutive login attempt should be blocked by cooldown
        success, msg = angel_client.login(force=False)
        self.assertFalse(success)
        self.assertIn("cooldown", msg.lower())

    def test_single_session_orb_fast_path(self):
        """Verify that vectorized single-session ORB calculation matches multi-session logic."""
        periods = 60
        dates = pd.date_range("2026-11-02 09:15:00", periods=periods, freq="1min", tz="Asia/Kolkata")
        np.random.seed(123)
        prices = 500.0 + np.cumsum(np.random.randn(periods))
        df = pd.DataFrame({
            "Open": prices,
            "High": prices + 1.5,
            "Low": prices - 1.5,
            "Close": prices + 0.2,
            "Volume": np.random.randint(100, 2000, size=periods)
        }, index=dates)

        df_calc = calculate_intraday_indicators(df.copy(), light=False)
        expected_orb_high = float(df.iloc[:15]["High"].max())
        expected_orb_low = float(df.iloc[:15]["Low"].min())

        self.assertAlmostEqual(df_calc["ORB_High"].iloc[0], expected_orb_high)
        self.assertAlmostEqual(df_calc["ORB_Low"].iloc[0], expected_orb_low)
        self.assertAlmostEqual(df_calc["ORB_High"].iloc[-1], expected_orb_high)
        self.assertAlmostEqual(df_calc["ORB_Low"].iloc[-1], expected_orb_low)

    def test_shutdown_data_fetcher_lifecycle(self):
        """Verify shutdown_data_fetcher safely cleans resources and permits re-initialization."""
        from data_fetcher import _get_scan_executor, shutdown_data_fetcher
        ex = _get_scan_executor()
        self.assertFalse(ex._shutdown)
        shutdown_data_fetcher(wait=False)
        self.assertTrue(ex._shutdown)

        # Calling _get_scan_executor again should recreate a fresh executor
        ex2 = _get_scan_executor()
        self.assertFalse(ex2._shutdown)
        shutdown_data_fetcher(wait=False)


if __name__ == "__main__":
    unittest.main()
