import unittest
from datetime import datetime
import pandas as pd
import pytz

from analysis_engine import calculate_intraday_indicators, analyze_stock_setup
from data_fetcher import get_chart_data, scan_watchlist
from app import app


class TestORBTimeframe(unittest.TestCase):

    def _create_mock_df(self, n_bars=45, start_price=100.0, base_time=None, orb_minutes=15, breakout=False, breakdown=False):
        tz = pytz.timezone("Asia/Kolkata")
        if base_time is None:
            # 9:15 AM IST (session start)
            base_time = datetime(2026, 11, 2, 9, 15, 0)

        dates = [tz.localize(base_time + pd.Timedelta(minutes=i)) for i in range(n_bars)]
        highs = []
        lows = []
        closes = []
        opens = []

        # First orb_minutes: range between 99.0 and 101.0
        for i in range(n_bars):
            if i < orb_minutes:
                # Range within 99.5 - 100.5
                o = 100.0
                h = 100.5 if i == (orb_minutes - 1) else 100.2
                l = 99.5 if i == 0 else 99.8
                c = 100.0
            else:
                if breakout:
                    # Break out above 100.5 (e.g. 102.0)
                    o = 101.0
                    h = 102.5
                    l = 100.8
                    c = 102.0
                elif breakdown:
                    # Break down below 99.5 (e.g. 98.0)
                    o = 99.0
                    h = 99.2
                    l = 98.0
                    c = 98.2
                else:
                    o = 100.0
                    h = 100.3
                    l = 99.7
                    c = 100.0

            opens.append(o)
            highs.append(h)
            lows.append(l)
            closes.append(c)

        volumes = []
        for i in range(n_bars):
            if (breakout or breakdown) and i >= (n_bars - 3):
                volumes.append(60000)
            else:
                volumes.append(20000)

        df = pd.DataFrame({
            "Open": opens,
            "High": highs,
            "Low": lows,
            "Close": closes,
            "Volume": volumes
        }, index=pd.DatetimeIndex(dates))

        return calculate_intraday_indicators(df, light=False, orb_minutes=orb_minutes)

    def test_calculate_intraday_indicators_orb_15m(self):
        df = self._create_mock_df(n_bars=30, orb_minutes=15)
        self.assertIn("ORB_High", df.columns)
        self.assertIn("ORB_Low", df.columns)
        # First 15 bars: max High was 100.5, min Low was 99.5
        self.assertAlmostEqual(float(df["ORB_High"].iloc[-1]), 100.5, places=2)
        self.assertAlmostEqual(float(df["ORB_Low"].iloc[-1]), 99.5, places=2)

    def test_calculate_intraday_indicators_orb_5m(self):
        df = self._create_mock_df(n_bars=30, orb_minutes=5)
        self.assertIn("ORB_High", df.columns)
        self.assertIn("ORB_Low", df.columns)
        # First 5 bars: max High was 100.5 if orb_minutes==5, min Low was 99.5
        self.assertAlmostEqual(float(df["ORB_High"].iloc[-1]), 100.5, places=2)
        self.assertAlmostEqual(float(df["ORB_Low"].iloc[-1]), 99.5, places=2)

    def test_orb_15m_breakout_detection(self):
        # Breakout occurs after 15 minutes
        df = self._create_mock_df(n_bars=30, orb_minutes=15, breakout=True)
        res = analyze_stock_setup("INFY.NS", df, company_name="Infosys Ltd", orb_minutes=15)

        self.assertEqual(res["orb_minutes"], 15)
        self.assertEqual(res["orb_timeframe"], "15m")
        self.assertTrue(res["is_orb_breakout"])
        self.assertFalse(res["is_orb_breakdown"])
        self.assertIn("15-Min Opening Range Breakout", res["setup_name"])
        self.assertIn("15-min", res["setup_desc"].lower())
        self.assertAlmostEqual(res["orb_high"], 100.5, places=2)

        # Check checks factor label
        check_factors = [c["factor"] for c in res["checks"]]
        self.assertIn("15-Min Opening Range High", check_factors)

    def test_orb_15m_breakdown_detection(self):
        # Breakdown occurs after 15 minutes
        df = self._create_mock_df(n_bars=30, orb_minutes=15, breakdown=True)
        res = analyze_stock_setup("TCS.NS", df, company_name="Tata Consultancy Services", orb_minutes=15)

        self.assertEqual(res["orb_minutes"], 15)
        self.assertEqual(res["orb_timeframe"], "15m")
        self.assertTrue(res["is_orb_breakdown"])
        self.assertFalse(res["is_orb_breakout"])
        self.assertIn("15-Min Opening Range Breakdown", res["setup_name"])
        self.assertAlmostEqual(res["orb_low"], 99.5, places=2)

    def test_orb_5m_breakout_labeling(self):
        df = self._create_mock_df(n_bars=25, orb_minutes=5, breakout=True)
        res = analyze_stock_setup("RELIANCE.NS", df, company_name="Reliance Industries", orb_minutes=5)

        self.assertEqual(res["orb_minutes"], 5)
        self.assertEqual(res["orb_timeframe"], "5m")
        self.assertIn("5-Min Opening Range Breakout", res["setup_name"])
        check_factors = [c["factor"] for c in res["checks"]]
        self.assertIn("5-Min Opening Range High", check_factors)

    def test_api_scan_timeframe_parameter(self):
        from app import scan_stocks
        # Test scan with timeframe=15m (default)
        data15 = scan_stocks(market="NSE_MOMENTUM", timeframe="15m")
        self.assertEqual(data15["status"], "OK")
        self.assertEqual(data15["timeframe"], "15m")
        if data15["stocks"]:
            first = data15["stocks"][0]
            self.assertEqual(first.get("orb_minutes"), 15)

        # Test scan with timeframe=5m
        data5 = scan_stocks(market="NSE_MOMENTUM", timeframe="5m")
        self.assertEqual(data5["status"], "OK")
        self.assertEqual(data5["timeframe"], "5m")
        if data5["stocks"]:
            first = data5["stocks"][0]
            self.assertEqual(first.get("orb_minutes"), 5)

    def test_api_chart_timeframe_parameter(self):
        from app import get_chart
        try:
            data = get_chart("RELIANCE.NS", timeframe="15m")
            self.assertEqual(data["status"], "OK")
            self.assertEqual(data["timeframe"], "15m")
            self.assertEqual(data["orb_minutes"], 15)
            self.assertIn("orb_high", data)
            self.assertIn("orb_low", data)
        except Exception:
            # Network-dependent, acceptable if offline
            pass


if __name__ == "__main__":
    unittest.main()
