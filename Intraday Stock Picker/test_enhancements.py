"""
Testing Recommended Enhancements:
1. Macro Regime & ADX Trend Filter (ADX >= 20 or expanding volume).
2. Strict Execution Timing Gate (9:45-11:30 AM & 1:30-2:45 PM; block midday chop).
3. Decisive Breakout Confirmation (0.15% clear margin + RVOL >= 1.3x).
4. Lock-in Trailing Stop on Runners (Move stop to +0.5R upon hitting T1).
"""

import os
import time
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, time as dt_time
import pandas as pd
import numpy as np
import yfinance as yf

from analysis_engine import calculate_intraday_indicators, analyze_stock_setup
from backtest_engine import TEST_UNIVERSE, ROUNDTRIP_SLIPPAGE_PCT, compute_performance_metrics

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("enhancement_tester")


def run_enhanced_backtest(period="7d", interval="1m") -> Dict[str, Any]:
    trades = []
    daily_summaries = []

    logger.info("Running Enhanced Strategy Backtest with the 4 Recommendations...")

    for item in TEST_UNIVERSE:
        ticker = item["ticker"]
        cap = item["cap"]
        is_india = ".NS" in ticker or ".BO" in ticker
        tz_name = "Asia/Kolkata" if is_india else "America/New_York"

        try:
            df_raw = yf.Ticker(ticker).history(period=period, interval=interval)
        except Exception:
            continue

        if df_raw.empty or len(df_raw) < 60:
            continue

        df_raw = df_raw.dropna(subset=['Open', 'High', 'Low', 'Close'])
        df_raw = df_raw[df_raw['Volume'] >= 0]
        df_raw = df_raw[~df_raw.index.duplicated(keep='last')].sort_index()

        if df_raw.index.tz is None:
            df_raw.index = df_raw.index.tz_localize(tz_name)
        else:
            df_raw.index = df_raw.index.tz_convert(tz_name)

        df_all = calculate_intraday_indicators(df_raw, light=False)

        # Precompute ADX 14 for regime filtering
        high_low = (df_all['High'] - df_all['Low']).values
        high_close = (df_all['High'] - df_all['Close'].shift(1)).abs().values
        low_close = (df_all['Low'] - df_all['Close'].shift(1)).abs().values
        tr = np.maximum(high_low, np.maximum(high_close, low_close))
        atr14 = pd.Series(tr, index=df_all.index).rolling(window=14, min_periods=1).mean()

        up_move = df_all['High'].diff()
        down_move = -df_all['Low'].diff()
        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

        plus_di = 100 * (pd.Series(plus_dm, index=df_all.index).ewm(alpha=1/14, min_periods=1).mean() / atr14.replace(0, np.nan))
        minus_di = 100 * (pd.Series(minus_dm, index=df_all.index).ewm(alpha=1/14, min_periods=1).mean() / atr14.replace(0, np.nan))
        dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
        df_all['ADX14'] = dx.ewm(alpha=1/14, min_periods=1).mean().fillna(20.0)

        trading_days = np.unique(df_all.index.date)

        for d in trading_days:
            df_day = df_all[df_all.index.date == d]
            if len(df_day) < 30:
                continue

            day_open = float(df_day.iloc[0]['Open'])
            day_close = float(df_day.iloc[-1]['Close'])
            day_change_pct = ((day_close - day_open) / day_open) * 100.0 if day_open > 0 else 0.0

            if day_change_pct >= 0.75:
                regime = "BULLISH_TREND"
            elif day_change_pct <= -0.75:
                regime = "BEARISH_TREND"
            else:
                regime = "CHOPPY_SIDEWAYS"

            daily_summaries.append({
                "ticker": ticker,
                "date": str(d),
                "regime": regime,
                "day_change_pct": round(day_change_pct, 2)
            })

            active_trade = None
            step_stride = 2

            for i in range(16, len(df_day) - 5, step_stride):
                curr_bar = df_day.iloc[i]
                curr_time = curr_bar.name.time()

                # 1. MANAGE ACTIVE TRADE (with Enhanced Trailing Stop Rule)
                if active_trade is not None:
                    trade = active_trade
                    entry_p = trade["entry_price"]
                    sl_p = trade["stop_loss"]
                    t1_p = trade["target_1"]
                    t2_p = trade["target_2"]
                    action = trade["action"]
                    risk_amt = trade["risk_amount"]

                    bar_h = float(curr_bar['High'])
                    bar_l = float(curr_bar['Low'])

                    if action == "LONG":
                        # Check Target 1 Hit
                        if not trade["t1_hit"] and bar_h >= t1_p:
                            trade["t1_hit"] = True
                            trade["t1_bar_time"] = str(curr_time)
                            # ENHANCEMENT 4: Instead of just breakeven (0R), trail runner stop to +0.5R!
                            # Locks in guaranteed profit on the remaining 50% position
                            trade["stop_loss"] = round(entry_p + (0.5 * risk_amt), 2)

                        # Check Target 2 Hit
                        if trade["t1_hit"] and bar_h >= t2_p:
                            trade["t2_hit"] = True
                            trade["exit_price"] = t2_p
                            trade["exit_time"] = str(curr_time)
                            trade["exit_reason"] = "TARGET_2_HIT"
                            ret1 = ((t1_p - entry_p) / entry_p) * 100.0
                            ret2 = ((t2_p - entry_p) / entry_p) * 100.0
                            raw_ret = (0.5 * ret1) + (0.5 * ret2)
                            trade["net_pnl_pct"] = round(raw_ret - ROUNDTRIP_SLIPPAGE_PCT, 3)
                            trades.append(trade)
                            active_trade = None
                            continue

                        # Check Stop Loss Hit
                        if bar_l <= trade["stop_loss"]:
                            trade["exit_price"] = trade["stop_loss"]
                            trade["exit_time"] = str(curr_time)
                            if trade["t1_hit"]:
                                # 50% booked at +1.5R, remaining 50% exited at +0.5R
                                ret1 = ((t1_p - entry_p) / entry_p) * 100.0
                                ret2 = ((trade["stop_loss"] - entry_p) / entry_p) * 100.0
                                raw_ret = (0.5 * ret1) + (0.5 * ret2)
                                trade["exit_reason"] = "TRAIL_SL_PROFIT"
                            else:
                                raw_ret = ((trade["stop_loss"] - entry_p) / entry_p) * 100.0
                                trade["exit_reason"] = "STOP_LOSS_HIT"
                            trade["net_pnl_pct"] = round(raw_ret - ROUNDTRIP_SLIPPAGE_PCT, 3)
                            trades.append(trade)
                            active_trade = None
                            continue

                    else:  # SHORT
                        # Check Target 1 Hit
                        if not trade["t1_hit"] and bar_l <= t1_p:
                            trade["t1_hit"] = True
                            trade["t1_bar_time"] = str(curr_time)
                            # Trail stop to +0.5R in profit for Short
                            trade["stop_loss"] = round(entry_p - (0.5 * risk_amt), 2)

                        # Check Target 2 Hit
                        if trade["t1_hit"] and bar_l <= t2_p:
                            trade["t2_hit"] = True
                            trade["exit_price"] = t2_p
                            trade["exit_time"] = str(curr_time)
                            trade["exit_reason"] = "TARGET_2_HIT"
                            ret1 = ((entry_p - t1_p) / entry_p) * 100.0
                            ret2 = ((entry_p - t2_p) / entry_p) * 100.0
                            raw_ret = (0.5 * ret1) + (0.5 * ret2)
                            trade["net_pnl_pct"] = round(raw_ret - ROUNDTRIP_SLIPPAGE_PCT, 3)
                            trades.append(trade)
                            active_trade = None
                            continue

                        # Check Stop Loss Hit
                        if bar_h >= trade["stop_loss"]:
                            trade["exit_price"] = trade["stop_loss"]
                            trade["exit_time"] = str(curr_time)
                            if trade["t1_hit"]:
                                ret1 = ((entry_p - t1_p) / entry_p) * 100.0
                                ret2 = ((entry_p - trade["stop_loss"]) / entry_p) * 100.0
                                raw_ret = (0.5 * ret1) + (0.5 * ret2)
                                trade["exit_reason"] = "TRAIL_SL_PROFIT"
                            else:
                                raw_ret = ((entry_p - trade["stop_loss"]) / entry_p) * 100.0
                                trade["exit_reason"] = "STOP_LOSS_HIT"
                            trade["net_pnl_pct"] = round(raw_ret - ROUNDTRIP_SLIPPAGE_PCT, 3)
                            trades.append(trade)
                            active_trade = None
                            continue

                # 2. EVALUATE ENTRY FILTERS
                if active_trade is None:
                    # ENHANCEMENT 2: Strict Time-of-Day Execution Window
                    # Prime Morning: 09:45 to 11:30
                    # Prime Afternoon: 13:30 to 14:45
                    # Midday Chop (11:30 to 13:30) and Late Session (after 14:45) blocked
                    is_morning_prime = dt_time(9, 45) <= curr_time <= dt_time(11, 30)
                    is_afternoon_prime = dt_time(13, 30) <= curr_time <= dt_time(14, 45)

                    if not (is_morning_prime or is_afternoon_prime):
                        continue

                    # ENHANCEMENT 1: Macro Regime / ADX Trend Strength Filter
                    # If ADX < 20 and RVOL < 1.6, market is in non-directional chop; do not enter
                    adx_val = float(curr_bar.get('ADX14', 20.0))
                    rvol_val = float(curr_bar.get('RVOL', 1.0))
                    if adx_val < 20.0 and rvol_val < 1.6:
                        continue

                    # Slice data up to current bar i
                    df_slice = df_day.iloc[:i + 1]

                    try:
                        analysis = analyze_stock_setup(ticker, df_slice, company_name=item["name"], cap=cap)
                    except Exception:
                        continue

                    signal = analysis.get("signal", "")
                    is_rec = analysis.get("is_recommended", False)
                    plan = analysis.get("trade_plan")

                    if is_rec and signal in ["STRONG BUY", "BUY", "STRONG SELL", "SELL"] and plan:
                        setup = analysis.get("setup_name", "")
                        close_p = float(curr_bar['Close'])
                        orb_h = float(curr_bar.get('ORB_High', 0))
                        orb_l = float(curr_bar.get('ORB_Low', 0))

                        # ENHANCEMENT 3: Decisive Breakout Margin (Anti-Fakeout)
                        # Avoid entering on a bare touch of ORB level without clear penetration
                        if "ORB Breakout" in setup and orb_h > 0:
                            if close_p < orb_h * 1.0015 or rvol_val < 1.3:
                                continue
                        if "ORB Breakdown" in setup and orb_l > 0:
                            if close_p > orb_l * 0.9985 or rvol_val < 1.3:
                                continue

                        action = "LONG" if "BUY" in signal else "SHORT"

                        # Bear-Trap Shield & Bull-Trap Shield
                        # Do NOT short into green days (bear trap); do NOT buy ORB breakout into red gap-down days (bull trap)
                        if action == "SHORT" and (close_p >= day_open or day_change_pct > 0):
                            continue
                        if action == "LONG" and "ORB Breakout" in setup and (close_p <= day_open or day_change_pct < 0):
                            continue

                        risk_amount = abs(float(plan["entry_price"]) - float(plan["stop_loss"]))
                        if risk_amount <= 0:
                            continue

                        active_trade = {
                            "ticker": ticker,
                            "market": item["market"],
                            "cap": cap,
                            "date": str(d),
                            "entry_time": str(curr_time),
                            "signal": signal,
                            "action": action,
                            "setup_name": setup,
                            "score": analysis.get("score", 0),
                            "display_score": analysis.get("display_score", 0),
                            "rvol": rvol_val,
                            "adx": adx_val,
                            "entry_price": float(plan["entry_price"]),
                            "stop_loss": float(plan["stop_loss"]),
                            "initial_sl": float(plan["stop_loss"]),
                            "risk_amount": risk_amount,
                            "target_1": float(plan["target_1"]),
                            "target_2": float(plan["target_2"]),
                            "target_3": float(plan["target_3"]),
                            "t1_hit": False,
                            "t2_hit": False,
                            "regime": regime
                        }

            # EOD Square-off
            if active_trade is not None:
                trade = active_trade
                entry_p = trade["entry_price"]
                last_bar = df_day.iloc[-1]
                exit_p = float(last_bar['Close'])
                trade["exit_price"] = exit_p
                trade["exit_time"] = str(last_bar.name.time())
                trade["exit_reason"] = "EOD_MARKET_CLOSE"

                if trade["action"] == "LONG":
                    if trade["t1_hit"]:
                        ret1 = ((trade["target_1"] - entry_p) / entry_p) * 100.0
                        ret2 = ((exit_p - entry_p) / entry_p) * 100.0
                        raw_ret = (0.5 * ret1) + (0.5 * ret2)
                    else:
                        raw_ret = ((exit_p - entry_p) / entry_p) * 100.0
                else:
                    if trade["t1_hit"]:
                        ret1 = ((entry_p - trade["target_1"]) / entry_p) * 100.0
                        ret2 = ((entry_p - exit_p) / entry_p) * 100.0
                        raw_ret = (0.5 * ret1) + (0.5 * ret2)
                    else:
                        raw_ret = ((entry_p - exit_p) / entry_p) * 100.0

                trade["net_pnl_pct"] = round(raw_ret - ROUNDTRIP_SLIPPAGE_PCT, 3)
                trades.append(trade)
                active_trade = None

    return compute_performance_metrics(trades, daily_summaries)


if __name__ == "__main__":
    results = run_enhanced_backtest()
    out_file = os.path.join(os.path.dirname(__file__), "enhanced_backtest_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    ov = results["overview"]
    print("\n" + "="*70)
    print("ENHANCED STRATEGY BACKTEST RESULTS:")
    print("="*70)
    print(f"Total Trades Executed: {ov['total_trades']}")
    print(f"Win Rate:              {ov['win_rate_pct']}% ({ov['win_count']} Wins / {ov['loss_count']} Losses)")
    print(f"Average Win:           +{ov['avg_win_pct']}%")
    print(f"Average Loss:          {ov['avg_loss_pct']}%")
    print(f"Win / Loss Ratio:      {ov['win_loss_ratio']}:1")
    print(f"Profit Factor:         {ov['profit_factor']}")
    print(f"Expectancy Per Trade:  {ov['expectancy_pct_per_trade']:+.3f}%")
    print(f"Total Net PnL:         {ov['total_net_pnl_pct']:+.2f}%")
    print(f"Worst Drop (Max DD):   -{ov['max_drawdown_pct']}%")
    print(f"Exit Breakdown:        {ov['exit_reasons']}")
    print("="*70)
