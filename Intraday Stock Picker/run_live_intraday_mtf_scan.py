"""
Live Intraday Multi-Timeframe (1m, 5m, 15m, 30m) Scanner & Recommendation Engine
Scans active NSE equities using real-time market data feed from exchanges.
"""

import sys
import os
import json
import time

backend_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(backend_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from data_fetcher import fetch_and_analyze_ticker, WATCHLISTS
from analysis_engine import analyze_stock_setup

def run_mtf_scan():
    print("="*80)
    print("⚡ INITIATING REAL-TIME INTRADAY SCAN ACROSS 1m, 5m, 15m, 30m CANDLES")
    print("="*80)

    # Combine liquid high-beta intraday universe
    leaders = WATCHLISTS["NSE_MOMENTUM"]["stocks"][:20]
    midcaps = WATCHLISTS["NSE_MIDCAP"]["stocks"][:12]
    smallcaps = WATCHLISTS["NSE_SMALLCAP"]["stocks"][:8]
    universe = leaders + midcaps + smallcaps

    results = []
    print(f"Scanning {len(universe)} liquid NSE equities...\n")

    for i, item in enumerate(universe):
        ticker = item["ticker"]
        name = item.get("name", ticker)
        try:
            analysis = fetch_and_analyze_ticker(ticker)
            if not analysis:
                continue

            mtf = analysis.get("mtf_alignment", {})
            bull_cnt = mtf.get("bull_count", 0)
            bear_cnt = mtf.get("bear_count", 0)
            score = analysis.get("score", 0)
            signal = analysis.get("signal", "NEUTRAL")
            is_rec = analysis.get("is_recommended", False)

            results.append({
                "ticker": ticker,
                "name": name,
                "price": analysis.get("price", 0),
                "day_change_pct": analysis.get("day_change_pct", 0),
                "rvol": analysis.get("rvol", 1.0),
                "score": score,
                "display_score": analysis.get("display_score", 50),
                "signal": signal,
                "is_recommended": is_rec,
                "bull_count": bull_cnt,
                "bear_count": bear_cnt,
                "confluence_level": mtf.get("confluence_level", ""),
                "confluence_score": mtf.get("confluence_score", ""),
                "timeframes": mtf.get("timeframes", {}),
                "trade_plan": analysis.get("trade_plan", {}),
                "setup_name": analysis.get("setup_name", ""),
                "pick_time_window": analysis.get("pick_time_window", ""),
                "holding_time_window": analysis.get("holding_time_window", ""),
                "checks": analysis.get("checks", [])
            })
            sys.stdout.write(f"\rAnalyzed {i+1}/{len(universe)}: {ticker} (Score: {score:+.0f}, MTF: {bull_cnt}B/{bear_cnt}S) ")
            sys.stdout.flush()
        except Exception as e:
            continue

    print("\n\nScan complete! Sorting results by institutional score and MTF alignment...")

    # Sort primarily by:
    # 1. 4/4 MTF alignment (bull_count == 4 or bear_count == 4)
    # 2. Recommended status
    # 3. Absolute score
    results.sort(key=lambda x: (
        1 if (x["bull_count"] == 4 or x["bear_count"] == 4) else (0.5 if (x["bull_count"] == 3 or x["bear_count"] == 3) else 0),
        1 if x["is_recommended"] else 0,
        abs(x["score"])
    ), reverse=True)

    # Save to JSON
    out_file = os.path.join(backend_dir, "live_mtf_recommendations.json")
    with open(out_file, "w") as f:
        json.dump(results, f, indent=2)

    print(f"Saved {len(results)} analyzed stocks to {out_file}\n")
    return results

if __name__ == "__main__":
    run_mtf_scan()
