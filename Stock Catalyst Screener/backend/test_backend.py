"""
Automated Test Suite for Stock Catalyst & Earnings Screener Backend:
Verifies Stock Universe, Quantitative Trade Engine Math, Catalyst Analysis,
and Pydantic Schema Integrity.
"""

import sys
import unittest
from stock_universe import INDIAN_STOCKS, US_STOCKS, get_stock_info
from trade_engine import calculate_trade_parameters
from ai_analyzer import analyze_catalyst_heuristic, TradeRecommendation
from data_ingestion import classify_live_catalyst

class TestStockCatalystBackend(unittest.TestCase):

    def test_01_stock_universe(self):
        """Verify dual-market stock catalog contains Indian and US assets."""
        self.assertGreaterEqual(len(INDIAN_STOCKS), 10, "Should have at least 10 Indian stocks")
        self.assertGreaterEqual(len(US_STOCKS), 10, "Should have at least 10 US stocks")

        # Test lookup
        rel = get_stock_info("RELIANCE")
        self.assertEqual(rel["market"], "India")
        self.assertEqual(rel["currency"], "₹")

        nvda = get_stock_info("NVDA")
        self.assertEqual(nvda["market"], "US")
        self.assertEqual(nvda["currency"], "$")
        print("✅ Test 1 Passed: Stock Universe lookup verified.")

    def test_02_intraday_trade_math(self):
        """Verify Intraday trade parameters adhere to tight stops and 2-6% target returns."""
        spot = 1000.0
        params = calculate_trade_parameters(
            current_price=spot,
            direction="BUY",
            timeframe="Intraday",
            catalyst_strength=88.0
        )

        entry = params["entry_price"]
        sl = params["stop_loss_price"]
        target = params["target_price"]
        roi = params["projected_roi_pct"]
        rr = params["risk_reward_numeric"]

        self.assertGreater(entry, sl, "Stop loss must be strictly lower than entry for BUY")
        self.assertGreater(target, entry, "Target must be strictly higher than entry for BUY")
        self.assertGreaterEqual(roi, 2.0, "Intraday ROI must be at least 2.0%")
        self.assertLessEqual(roi, 7.0, "Intraday ROI should be capped under 7.0%")
        self.assertGreaterEqual(rr, 1.8, "Intraday Risk:Reward ratio must be favorable (>= 1:1.8)")
        print(f"✅ Test 2 Passed: Intraday BUY Math verified (Entry: {entry}, SL: {sl}, Target: {target}, ROI: +{roi}%, R:R: {params['risk_reward_ratio']}).")

    def test_03_short_term_delivery_math(self):
        """Verify Short-term delivery trade parameters achieve the target 10% to 50% return!"""
        spot = 500.0
        params = calculate_trade_parameters(
            current_price=spot,
            direction="BUY",
            timeframe="Short-term",
            catalyst_strength=94.0  # High conviction
        )

        entry = params["entry_price"]
        sl = params["stop_loss_price"]
        target = params["target_price"]
        roi = params["projected_roi_pct"]
        rr = params["risk_reward_numeric"]

        self.assertGreater(entry, sl, "Stop loss must be strictly lower than entry for BUY")
        self.assertGreater(target, entry, "Target must be strictly higher than entry for BUY")
        self.assertGreaterEqual(roi, 10.0, "Short-term delivery ROI must achieve at least 10%")
        self.assertLessEqual(roi, 50.0, "Short-term delivery ROI should not exceed 50%")
        self.assertGreaterEqual(rr, 2.5, "Short-term delivery Risk:Reward must be >= 1:2.5")
        print(f"✅ Test 3 Passed: Short-Term Delivery Math verified (Entry: {entry}, SL: {sl}, Target: {target}, ROI: +{roi}%, R:R: {params['risk_reward_ratio']}).")

    def test_04_bearish_sell_math(self):
        """Verify SELL / Breakdown trade parameters."""
        spot = 200.0
        params = calculate_trade_parameters(
            current_price=spot,
            direction="SELL",
            timeframe="Intraday",
            catalyst_strength=82.0
        )

        entry = params["entry_price"]
        sl = params["stop_loss_price"]
        target = params["target_price"]

        self.assertGreater(sl, entry, "Stop loss must be above entry for SELL")
        self.assertLess(target, entry, "Target must be below entry for SELL")
        print(f"✅ Test 4 Passed: Bearish SELL Math verified (Entry: {entry}, SL: {sl}, Target: {target}).")

    def test_05_catalyst_recommendation_schema(self):
        """Verify heuristic catalyst analysis produces valid Pydantic TradeRecommendation objects."""
        stock = get_stock_info("TATAPOWER")
        fake_quote = {
            "current_price": 420.0,
            "day_change_pct": 3.4,
            "rvol": 2.2,
            "currency": "₹"
        }
        live_classification = classify_live_catalyst(
            headline="Tata Power Bags ₹4,200 Cr Clean Energy Transmission Project from State Grid",
            quote=fake_quote
        )
        sample_catalyst = {
            "headline": "Tata Power Bags ₹4,200 Cr Clean Energy Transmission Project from State Grid",
            "catalyst_type": live_classification["catalyst_type"],
            "source": "Business Standard",
            "published_at": "Today",
            "catalyst_strength": live_classification["catalyst_strength"],
            "timeframe": live_classification["timeframe"],
            "financials": live_classification["financials"],
            "summary": "Secured major clean energy transmission infrastructure order."
        }

        rec = analyze_catalyst_heuristic(stock, fake_quote, sample_catalyst)
        self.assertIsInstance(rec, TradeRecommendation)
        self.assertEqual(rec.display_ticker, "TATAPOWER")
        self.assertEqual(rec.market, "India")
        self.assertIn(rec.direction, ["BUY", "SELL"])
        self.assertIn(rec.timeframe, ["Intraday", "Short-term"])
        self.assertGreaterEqual(rec.catalyst_score, 70)
        self.assertTrue(len(rec.reason) > 10, "Reason must be descriptive")
        self.assertGreater(rec.entry_price, 0)
        print(f"✅ Test 5 Passed: TradeRecommendation Pydantic schema validated for {rec.display_ticker}.")

if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestStockCatalystBackend)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
    print("\n🎉 ALL BACKEND UNIT TESTS PASSED SUCCESSFULLY!")
