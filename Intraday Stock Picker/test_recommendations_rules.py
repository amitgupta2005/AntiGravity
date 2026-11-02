import unittest
from datetime import datetime, time as dt_time
import pandas as pd
import numpy as np
import pytz

from analysis_engine import calculate_intraday_indicators, analyze_stock_setup


class TestRecommendationRules(unittest.TestCase):

    def _create_mock_df(self, n_bars=40, start_price=100.0, trend="UP", base_time=None):
        tz = pytz.timezone("Asia/Kolkata")
        if base_time is None:
            # Morning prime window: 10:00 AM IST
            base_time = datetime(2026, 11, 2, 10, 0, 0)
        
        dates = [tz.localize(base_time + pd.Timedelta(minutes=i)) for i in range(n_bars)]
        prices = []
        p = start_price
        for i in range(n_bars):
            if trend == "UP":
                p += 0.2
            elif trend == "DOWN":
                p -= 0.2
            else:
                p += 0.02 * (1 if i % 2 == 0 else -1)
            prices.append(p)
        
        df = pd.DataFrame({
            "Open": [p - 0.05 for p in prices],
            "High": [p + 0.15 for p in prices],
            "Low": [p - 0.15 for p in prices],
            "Close": prices,
            "Volume": [20000 for _ in range(n_bars)]
        }, index=pd.DatetimeIndex(dates))
        
        return calculate_intraday_indicators(df, light=False)

    def test_adx_indicator_calculated(self):
        df = self._create_mock_df(n_bars=35, trend="UP")
        self.assertIn("ADX14", df.columns)
        self.assertTrue(df["ADX14"].iloc[-1] > 0)

    def test_midday_chop_gate(self):
        # Candle at 12:15 PM IST (midday chop zone: 11:30 - 13:30)
        chop_time = datetime(2026, 11, 2, 12, 15, 0)
        df = self._create_mock_df(n_bars=35, trend="UP", base_time=chop_time)
        res = analyze_stock_setup("RELIANCE.NS", df)
        self.assertFalse(res["is_recommended"], "Midday chop window must withhold recommendations")
        self.assertIn("MIDDAY CHOP", res["signal"])

    def test_late_session_gate(self):
        # Candle at 14:50 PM IST (late session zone: >= 14:45)
        late_time = datetime(2026, 11, 2, 14, 50, 0)
        df = self._create_mock_df(n_bars=35, trend="UP", base_time=late_time)
        res = analyze_stock_setup("RELIANCE.NS", df)
        self.assertFalse(res["is_recommended"], "Late session must withhold recommendations")
        self.assertIn("LATE SESSION", res["signal"])

    def test_bear_trap_shield_on_green_day(self):
        # Mock stock with strong 4-TF downtrend at end of bars, but started with a gap up so day_change_pct is positive
        tz = pytz.timezone("Asia/Kolkata")
        base_time = datetime(2026, 11, 2, 10, 0, 0)
        n_bars = 40
        dates = [tz.localize(base_time + pd.Timedelta(minutes=i)) for i in range(n_bars)]
        # Bar 0 opens at 100, spikes up to 105, then later drops to 102 (still > open of 100)
        closes = [100.0] + [105.0 - (i * 0.1) for i in range(1, n_bars)]
        df = pd.DataFrame({
            "Open": [100.0] + [c + 0.05 for c in closes[1:]],
            "High": [c + 0.15 for c in closes],
            "Low": [c - 0.15 for c in closes],
            "Close": closes,
            "Volume": [25000 for _ in range(n_bars)]
        }, index=pd.DatetimeIndex(dates))
        df = calculate_intraday_indicators(df, light=False)
        res = analyze_stock_setup("RELIANCE.NS", df)
        
        # If bear conditions are detected on a green day, shorting must be blocked by Bear-Trap Shield
        if res.get("action") == "SHORT" or "BEAR" in res.get("signal", ""):
            self.assertFalse(res["is_recommended"], "Shorting green day must not be recommended")
            self.assertIn("BEAR TRAP", res.get("signal", ""))

    def test_lock_in_trailing_stop_in_trade_plan(self):
        df = self._create_mock_df(n_bars=35, trend="UP")
        res = analyze_stock_setup("RELIANCE.NS", df)
        plan = res.get("trade_plan")
        self.assertIsNotNone(plan)
        self.assertIn("locked_stop_loss", plan)
        self.assertIn("+0.5R", plan["execution_strategy"])
        
        entry = plan["entry_price"]
        sl = plan["stop_loss"]
        locked_sl = plan["locked_stop_loss"]
        risk = abs(entry - sl)
        if plan["action"] == "LONG":
            expected_locked = round(entry + (0.5 * risk), 2)
            self.assertEqual(locked_sl, expected_locked)


if __name__ == "__main__":
    unittest.main()
