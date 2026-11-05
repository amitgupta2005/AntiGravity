"""
Quantitative Backtest Engine for Stock Catalyst Screener Strategy
Tests historical performance across US and Indian equities over multiple market regimes.

Simulates:
1. Intraday Strategy: Next-day execution, tight stops (1.4%), target moves (2% to 6%)
2. Short-Term Delivery (Swing) Strategy: Multi-day execution (up to 20 days), stops (5.2%), targets (10% to 50%)
3. Market Regime Segmentation: Bull, Choppy/Sideways, and Bear/Correction conditions
"""

import sys
import os
import math
import json
from datetime import datetime
from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
import yfinance as yf

# Representative universe of high-beta and liquid catalyst candidates
UNIVERSE_US = [
    "NVDA", "AAPL", "MSFT", "TSLA", "AMD", "PLTR", "META", "AMZN", "COIN", "SMCI", "NFLX", "GOOGL"
]

UNIVERSE_INDIA = [
    "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "TATAPOWER.NS", "TRENT.NS",
    "DIXON.NS", "HAL.NS", "BEL.NS", "BSE.NS", "POLYCAB.NS", "SUZLON.NS"
]

BENCHMARK_US = "^GSPC"     # S&P 500
BENCHMARK_INDIA = "^NSEI"  # Nifty 50


def fetch_historical_data(tickers: List[str], period: str = "2y") -> Dict[str, pd.DataFrame]:
    """Downloads daily historical OHLCV data for given tickers."""
    data = {}
    print(f"📥 Downloading historical data ({period}) for {len(tickers)} assets...")
    for t in tickers:
        try:
            ticker_obj = yf.Ticker(t)
            df = ticker_obj.history(period=period)
            if df is not None and len(df) > 60:
                # Basic cleaning: drop timezone if present, drop zero volume days
                if df.index.tz is not None:
                    df.index = df.index.tz_localize(None)
                df = df[df['Volume'] > 0]
                data[t] = df
        except Exception as e:
            print(f"⚠️ Failed to download {t}: {e}")
    print(f"✅ Successfully downloaded {len(data)}/{len(tickers)} assets.")
    return data


def classify_market_regimes(benchmark_df: pd.DataFrame) -> pd.Series:
    """
    Classifies each trading day into one of three market regimes:
    1. 'Bull': Index > 50 SMA and 50 SMA >= 200 SMA (or > 50 SMA if 200 SMA not yet populated)
    2. 'Bear': Index < 50 SMA and 20-day return < -3% or Index < 200 SMA
    3. 'Choppy': Oscillating around 50 SMA within +/- 2.5%, lacking strong directional trend
    """
    df = benchmark_df.copy()
    df['SMA50'] = df['Close'].rolling(window=50).mean()
    df['SMA200'] = df['Close'].rolling(window=200).mean()
    df['Ret20'] = df['Close'].pct_change(20)

    regimes = pd.Series(index=df.index, dtype='object')

    for idx, row in df.iterrows():
        c = row['Close']
        s50 = row['SMA50']
        s200 = row['SMA200'] if not pd.isna(row['SMA200']) else s50
        r20 = row['Ret20'] if not pd.isna(row['Ret20']) else 0.0

        if pd.isna(s50):
            regimes[idx] = "Bull"
            continue

        pct_from_50 = (c - s50) / s50

        # Bear regime condition
        if c < s50 and (c < s200 or r20 < -0.04):
            regimes[idx] = "Bear"
        # Strong Bull condition
        elif c > s50 and (s50 >= s200) and pct_from_50 > 0.015:
            regimes[idx] = "Bull"
        else:
            regimes[idx] = "Choppy"

    return regimes


def identify_catalysts(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Identifies catalyst event days on historical daily data:
    - Return magnitude: |Change| >= 2.0%
    - Volume surge: Volume >= 1.5x 20-day average volume
    - Relative closing strength (closing near high for BUY, near low for SELL)
    """
    df = df.copy()
    df['Vol20'] = df['Volume'].rolling(window=20).mean()
    df['RVOL'] = df['Volume'] / df['Vol20']
    df['DayRet'] = (df['Close'] - df['Close'].shift(1)) / df['Close'].shift(1)

    catalysts = []

    # Start after warm-up period of 25 bars
    for i in range(25, len(df) - 21):
        row = df.iloc[i]
        prev_row = df.iloc[i - 1]

        rvol = row['RVOL']
        day_ret = row['DayRet']

        if pd.isna(rvol) or pd.isna(day_ret):
            continue

        # Check catalyst criteria
        is_volume_surge = rvol >= 1.50
        is_price_move = abs(day_ret) >= 0.020

        if is_volume_surge and is_price_move:
            candle_range = row['High'] - row['Low']
            if candle_range <= 0:
                continue

            # Candle close location: 0 = Low, 1 = High
            close_pos = (row['Close'] - row['Low']) / candle_range

            direction = None
            if day_ret > 0 and close_pos >= 0.55:
                direction = "BUY"
            elif day_ret < 0 and close_pos <= 0.45:
                direction = "SELL"

            if direction:
                # Compute catalyst conviction score (75 to 98 scale)
                score = min(98, max(75, int(78 + min(12, (rvol - 1.5) * 6) + abs(day_ret) * 100)))

                catalysts.append({
                    "date": df.index[i],
                    "index_i": i,
                    "close": row['Close'],
                    "day_ret": day_ret,
                    "rvol": rvol,
                    "direction": direction,
                    "score": score
                })

    return catalysts


def simulate_intraday_trade(df: pd.DataFrame, cat: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulates Intraday Trade executed on Day T+1:
    - Entry: Confirmation at Open * 1.003 (BUY) or Open * 0.997 (SELL)
    - Stop Loss: 1.4% tight invalidation stop
    - Target: +3.8% (scaled by catalyst conviction)
    - Exit: Stop Loss, Target, or Market On Close (MOC)
    """
    idx = cat["index_i"]
    t1_row = df.iloc[idx + 1]
    t1_date = df.index[idx + 1]

    direction = cat["direction"]
    conviction_mult = max(0.7, min(1.3, cat["score"] / 75.0))

    if direction == "BUY":
        entry_price = t1_row['Open'] * 1.003
        stop_loss = entry_price * (1.0 - 0.014)
        target_roi = max(0.025, min(0.065, 0.038 * conviction_mult))
        target_price = entry_price * (1.0 + target_roi)

        # Realistic Gap check on open
        if t1_row['Open'] < stop_loss:
            # Gapped down below stop
            exit_price = t1_row['Open']
            outcome = "GAP_STOP"
        elif t1_row['Low'] <= stop_loss:
            exit_price = stop_loss
            outcome = "STOP_LOSS"
        elif t1_row['High'] >= target_price:
            exit_price = target_price
            outcome = "TARGET_HIT"
        else:
            exit_price = t1_row['Close']
            outcome = "MOC_EXIT"

        ret_pct = (exit_price - entry_price) / entry_price
    else:  # SELL
        entry_price = t1_row['Open'] * 0.997
        stop_loss = entry_price * (1.0 + 0.014)
        target_roi = max(0.025, min(0.065, 0.035 * conviction_mult))
        target_price = entry_price * (1.0 - target_roi)

        if t1_row['Open'] > stop_loss:
            exit_price = t1_row['Open']
            outcome = "GAP_STOP"
        elif t1_row['High'] >= stop_loss:
            exit_price = stop_loss
            outcome = "STOP_LOSS"
        elif t1_row['Low'] <= target_price:
            exit_price = target_price
            outcome = "TARGET_HIT"
        else:
            exit_price = t1_row['Close']
            outcome = "MOC_EXIT"

        ret_pct = (entry_price - exit_price) / entry_price

    return {
        "strategy": "Intraday",
        "entry_date": t1_date,
        "direction": direction,
        "entry_price": entry_price,
        "exit_price": exit_price,
        "stop_loss": stop_loss,
        "target_price": target_price,
        "return_pct": ret_pct,
        "holding_days": 1,
        "outcome": outcome,
        "catalyst_score": cat["score"],
        "rvol": cat["rvol"]
    }


def simulate_short_term_trade(df: pd.DataFrame, cat: Dict[str, Any], max_hold_bars: int = 20) -> Dict[str, Any]:
    """
    Simulates Short-Term Delivery (Swing) Trade (up to 20 trading days):
    - Entry: Day T+1 Open * 1.005 (BUY) or Open * 0.995 (SELL)
    - Stop Loss: 5.2% below entry
    - Target: +18% to +38% (aiming for 10% to 50% target range)
    - Evaluated bar-by-bar until Stop, Target, or Max Holding Expiry
    """
    idx = cat["index_i"]
    t1_row = df.iloc[idx + 1]
    entry_date = df.index[idx + 1]

    direction = cat["direction"]
    score = cat["score"]
    conviction_mult = max(0.8, min(1.3, score / 75.0))

    if score >= 90:
        base_reward = 0.32
    elif score >= 82:
        base_reward = 0.22
    else:
        base_reward = 0.15

    target_roi = max(0.10, min(0.50, base_reward * conviction_mult))

    if direction == "BUY":
        entry_price = t1_row['Open'] * 1.005
        stop_loss = entry_price * (1.0 - 0.052)
        target_price = entry_price * (1.0 + target_roi)
    else:
        entry_price = t1_row['Open'] * 0.995
        stop_loss = entry_price * (1.0 + 0.052)
        target_price = entry_price * (1.0 - target_roi)

    exit_price = None
    outcome = "TIME_EXPIRY"
    holding_days = 0

    end_idx = min(len(df), idx + 1 + max_hold_bars)

    for bar_offset in range(1, end_idx - idx):
        bar = df.iloc[idx + bar_offset]
        holding_days = bar_offset

        if direction == "BUY":
            # Check gap down
            if bar['Open'] <= stop_loss:
                exit_price = bar['Open']
                outcome = "GAP_STOP"
                break
            elif bar['Low'] <= stop_loss:
                exit_price = stop_loss
                outcome = "STOP_LOSS"
                break
            elif bar['High'] >= target_price:
                exit_price = target_price
                outcome = "TARGET_HIT"
                break
        else:  # SELL
            if bar['Open'] >= stop_loss:
                exit_price = bar['Open']
                outcome = "GAP_STOP"
                break
            elif bar['High'] >= stop_loss:
                exit_price = stop_loss
                outcome = "STOP_LOSS"
                break
            elif bar['Low'] <= target_price:
                exit_price = target_price
                outcome = "TARGET_HIT"
                break

    if exit_price is None:
        last_bar = df.iloc[end_idx - 1]
        exit_price = last_bar['Close']
        outcome = "TIME_EXPIRY"
        holding_days = end_idx - (idx + 1)

    if direction == "BUY":
        ret_pct = (exit_price - entry_price) / entry_price
    else:
        ret_pct = (entry_price - exit_price) / entry_price

    return {
        "strategy": "Short-Term Delivery",
        "entry_date": entry_date,
        "direction": direction,
        "entry_price": entry_price,
        "exit_price": exit_price,
        "stop_loss": stop_loss,
        "target_price": target_price,
        "return_pct": ret_pct,
        "holding_days": holding_days,
        "outcome": outcome,
        "catalyst_score": score,
        "rvol": cat["rvol"]
    }


def compute_metrics(trades: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Computes standard institutional performance metrics for a list of trades."""
    if not trades:
        return {
            "total_trades": 0,
            "win_rate": 0.0,
            "avg_win": 0.0,
            "avg_loss": 0.0,
            "win_loss_ratio": 0.0,
            "profit_factor": 0.0,
            "expectancy_pct": 0.0,
            "max_drawdown_pct": 0.0,
            "total_cumulative_return_pct": 0.0
        }

    returns = [t["return_pct"] for t in trades]
    wins = [r for r in returns if r > 0]
    losses = [r for r in returns if r < 0]

    total_trades = len(trades)
    win_count = len(wins)
    loss_count = len(losses)

    win_rate = (win_count / total_trades) * 100.0 if total_trades > 0 else 0.0
    loss_rate = (loss_count / total_trades) * 100.0 if total_trades > 0 else 0.0

    avg_win = float(np.mean(wins)) * 100.0 if wins else 0.0
    avg_loss = float(np.mean(losses)) * 100.0 if losses else 0.0

    win_loss_ratio = abs(avg_win / avg_loss) if avg_loss != 0 else 0.0

    sum_wins = sum(wins)
    sum_losses = abs(sum(losses))
    profit_factor = (sum_wins / sum_losses) if sum_losses > 0 else (99.0 if sum_wins > 0 else 0.0)

    expectancy = (win_rate / 100.0 * avg_win) + (loss_rate / 100.0 * avg_loss)

    # Max Drawdown calculation using compounded equity curve
    equity = 1.0
    equity_curve = [equity]
    for r in returns:
        equity *= (1.0 + r)
        equity_curve.append(equity)

    peak = equity_curve[0]
    max_dd = 0.0
    for val in equity_curve:
        if val > peak:
            peak = val
        dd = (peak - val) / peak
        if dd > max_dd:
            max_dd = dd

    cum_return = (equity - 1.0) * 100.0

    return {
        "total_trades": total_trades,
        "win_count": win_count,
        "loss_count": loss_count,
        "win_rate": round(win_rate, 2),
        "avg_win": round(avg_win, 2),
        "avg_loss": round(avg_loss, 2),
        "win_loss_ratio": round(win_loss_ratio, 2),
        "profit_factor": round(profit_factor, 2),
        "expectancy_pct": round(expectancy, 2),
        "max_drawdown_pct": round(max_dd * 100.0, 2),
        "total_cumulative_return_pct": round(cum_return, 2)
    }


def run_full_backtest():
    """Runs full backtest across both markets and regimes."""
    print("================================================================")
    print("🚀 STARTING QUANTITATIVE BACKTEST: STOCK CATALYST SCREENER")
    print("================================================================")

    # 1. Download Benchmarks
    bench_data = fetch_historical_data([BENCHMARK_US, BENCHMARK_INDIA], period="2y")
    regimes_us = classify_market_regimes(bench_data[BENCHMARK_US]) if BENCHMARK_US in bench_data else None
    regimes_india = classify_market_regimes(bench_data[BENCHMARK_INDIA]) if BENCHMARK_INDIA in bench_data else None

    # 2. Download Stock Data
    all_stocks = UNIVERSE_US + UNIVERSE_INDIA
    stock_data = fetch_historical_data(all_stocks, period="2y")

    all_intraday_trades = []
    all_short_term_trades = []

    # Map tickers to their regimes
    for ticker, df in stock_data.items():
        is_us = ticker in UNIVERSE_US
        regimes_series = regimes_us if is_us else regimes_india
        market_label = "US" if is_us else "India"

        catalysts = identify_catalysts(df)

        for cat in catalysts:
            date_key = cat["date"]
            # Look up regime on catalyst day
            regime = "Choppy"
            if regimes_series is not None:
                # Find matching date in benchmark
                matching_dates = regimes_series.index[regimes_series.index <= date_key]
                if len(matching_dates) > 0:
                    regime = regimes_series.loc[matching_dates[-1]]

            # Run Intraday simulation
            intra_res = simulate_intraday_trade(df, cat)
            intra_res["ticker"] = ticker
            intra_res["market"] = market_label
            intra_res["market_regime"] = regime
            all_intraday_trades.append(intra_res)

            # Run Short-Term Delivery simulation
            swing_res = simulate_short_term_trade(df, cat, max_hold_bars=20)
            swing_res["ticker"] = ticker
            swing_res["market"] = market_label
            swing_res["market_regime"] = regime
            all_short_term_trades.append(swing_res)

    print(f"\n📊 Total Intraday Trades Evaluated: {len(all_intraday_trades)}")
    print(f"📊 Total Short-Term Delivery Trades Evaluated: {len(all_short_term_trades)}")

    # Overall Metrics
    overall_intra = compute_metrics(all_intraday_trades)
    overall_swing = compute_metrics(all_short_term_trades)
    overall_combined = compute_metrics(all_intraday_trades + all_short_term_trades)

    # Breakdown by Market Regime
    regimes = ["Bull", "Choppy", "Bear"]
    regime_results = {}

    for r in regimes:
        intra_r = [t for t in all_intraday_trades if t["market_regime"] == r]
        swing_r = [t for t in all_short_term_trades if t["market_regime"] == r]
        comb_r = intra_r + swing_r

        regime_results[r] = {
            "intraday": compute_metrics(intra_r),
            "short_term": compute_metrics(swing_r),
            "combined": compute_metrics(comb_r)
        }

    # Breakdown by Market Geography
    geo_results = {}
    for m in ["US", "India"]:
        intra_m = [t for t in all_intraday_trades if t["market"] == m]
        swing_m = [t for t in all_short_term_trades if t["market"] == m]
        geo_results[m] = {
            "intraday": compute_metrics(intra_m),
            "short_term": compute_metrics(swing_m),
            "combined": compute_metrics(intra_m + swing_m)
        }

    # Outcomes breakdown
    def outcome_breakdown(trades):
        outcomes = {}
        for t in trades:
            o = t["outcome"]
            outcomes[o] = outcomes.get(o, 0) + 1
        return outcomes

    results_payload = {
        "timestamp": datetime.now().isoformat(),
        "period": "2 Years Historical Data",
        "assets_tested": len(stock_data),
        "overall": {
            "intraday": overall_intra,
            "short_term_delivery": overall_swing,
            "combined": overall_combined
        },
        "by_market_regime": regime_results,
        "by_geography": geo_results,
        "outcomes": {
            "intraday": outcome_breakdown(all_intraday_trades),
            "short_term": outcome_breakdown(all_short_term_trades)
        }
    }

    # Save to JSON
    output_path = os.path.join(os.path.dirname(__file__), "backtest_results.json")
    with open(output_path, "w") as f:
        json.dump(results_payload, f, indent=2)

    print(f"\n💾 Saved full backtest results to: {output_path}")

    # Print Formatted Executive Summary
    print("\n================================================================")
    print("📈 EXECUTIVE SUMMARY: PERFORMANCE METRICS")
    print("================================================================")
    print(f"{'Metric':<30} | {'Intraday':<15} | {'Short-Term Delivery':<18} | {'Combined':<12}")
    print("-" * 80)
    print(f"{'Total Trades':<30} | {overall_intra['total_trades']:<15} | {overall_swing['total_trades']:<18} | {overall_combined['total_trades']:<12}")
    print(f"{'Win Rate (%)':<30} | {overall_intra['win_rate']:<15.2f}% | {overall_swing['win_rate']:<18.2f}% | {overall_combined['win_rate']:<12.2f}%")
    print(f"{'Average Win (%)':<30} | +{overall_intra['avg_win']:<14.2f}% | +{overall_swing['avg_win']:<17.2f}% | +{overall_combined['avg_win']:<11.2f}%")
    print(f"{'Average Loss (%)':<30} | {overall_intra['avg_loss']:<15.2f}% | {overall_swing['avg_loss']:<18.2f}% | {overall_combined['avg_loss']:<12.2f}%")
    print(f"{'Win/Loss Ratio':<30} | {overall_intra['win_loss_ratio']:<15.2f} | {overall_swing['win_loss_ratio']:<18.2f} | {overall_combined['win_loss_ratio']:<12.2f}")
    print(f"{'Profit Factor':<30} | {overall_intra['profit_factor']:<15.2f} | {overall_swing['profit_factor']:<18.2f} | {overall_combined['profit_factor']:<12.2f}")
    print(f"{'Expectancy per Trade (%)':<30} | {overall_intra['expectancy_pct']:<15.2f}% | {overall_swing['expectancy_pct']:<18.2f}% | {overall_combined['expectancy_pct']:<12.2f}%")
    print(f"{'Worst Drop (Max Drawdown)':<30} | {overall_intra['max_drawdown_pct']:<15.2f}% | {overall_swing['max_drawdown_pct']:<18.2f}% | {overall_combined['max_drawdown_pct']:<12.2f}%")
    print(f"{'Cumulative Return (%)':<30} | +{overall_intra['total_cumulative_return_pct']:<14.2f}% | +{overall_swing['total_cumulative_return_pct']:<17.2f}% | +{overall_combined['total_cumulative_return_pct']:<11.2f}%")

    print("\n================================================================")
    print("🌐 PERFORMANCE ACROSS MARKET CONDITIONS (REGIMES)")
    print("================================================================")
    for r in ["Bull", "Choppy", "Bear"]:
        res = regime_results[r]["combined"]
        print(f"🔹 Regime: {r.upper():<7} | Trades: {res['total_trades']:<4} | Win Rate: {res['win_rate']:>5.2f}% | Profit Factor: {res['profit_factor']:>4.2f} | Avg Win: +{res['avg_win']:>4.2f}% | Avg Loss: {res['avg_loss']:>5.2f}% | Max DD: {res['max_drawdown_pct']:>5.2f}%")

    print("\n================================================================")
    print("🎯 OUTCOME DISTRIBUTION")
    print("================================================================")
    print("Intraday Outcomes:", results_payload["outcomes"]["intraday"])
    print("Short-Term Delivery Outcomes:", results_payload["outcomes"]["short_term"])

    return results_payload


if __name__ == "__main__":
    run_full_backtest()
