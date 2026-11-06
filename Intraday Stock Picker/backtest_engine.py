"""
Comprehensive Backtesting Engine for Intraday Stock Picker
Evaluates the strategy on historical 1-minute intraday bars across Indian NSE and US equities.
Computes:
- Total trades, win rate, average win, average loss
- Win/loss ratio, profit factor, expectancy
- Worst drop (maximum drawdown)
- Overall cumulative PnL
- Performance across different market conditions (Bullish trend, Bearish trend, Choppy/Sideways, High vs Low Volatility)
"""

import os
import time
import json
import logging
from datetime import datetime, time as dt_time
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np
import yfinance as yf

from analysis_engine import calculate_intraday_indicators, analyze_stock_setup

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("backtester")

# Representative universe of liquid stocks across markets
TEST_UNIVERSE = [
    # Indian NSE Large-Caps
    {"ticker": "RELIANCE.NS", "name": "Reliance Industries", "market": "NSE", "cap": "LARGE"},
    {"ticker": "TCS.NS", "name": "Tata Consultancy Services", "market": "NSE", "cap": "LARGE"},
    {"ticker": "HDFCBANK.NS", "name": "HDFC Bank", "market": "NSE", "cap": "LARGE"},
    {"ticker": "INFY.NS", "name": "Infosys", "market": "NSE", "cap": "LARGE"},
    {"ticker": "ICICIBANK.NS", "name": "ICICI Bank", "market": "NSE", "cap": "LARGE"},
    {"ticker": "SBIN.NS", "name": "State Bank of India", "market": "NSE", "cap": "LARGE"},
    {"ticker": "BHARTIARTL.NS", "name": "Bharti Airtel", "market": "NSE", "cap": "LARGE"},
    # Indian NSE Midcaps
    {"ticker": "DIXON.NS", "name": "Dixon Tech", "market": "NSE", "cap": "MID"},
    {"ticker": "POLYCAB.NS", "name": "Polycab India", "market": "NSE", "cap": "MID"},
    {"ticker": "TRENT.NS", "name": "Trent Ltd", "market": "NSE", "cap": "MID"},
    # US Mega-Cap & Momentum
    {"ticker": "NVDA", "name": "NVIDIA", "market": "US", "cap": "LARGE"},
    {"ticker": "TSLA", "name": "Tesla", "market": "US", "cap": "LARGE"},
    {"ticker": "AAPL", "name": "Apple", "market": "US", "cap": "LARGE"},
    {"ticker": "AMD", "name": "AMD", "market": "US", "cap": "LARGE"},
    {"ticker": "MSFT", "name": "Microsoft", "market": "US", "cap": "LARGE"},
    {"ticker": "AMZN", "name": "Amazon", "market": "US", "cap": "LARGE"},
    # US Midcaps
    {"ticker": "PLTR", "name": "Palantir", "market": "US", "cap": "MID"},
    {"ticker": "CRWD", "name": "CrowdStrike", "market": "US", "cap": "MID"},
]

# Execution Cost: 0.04% roundtrip slippage + broker commissions
ROUNDTRIP_SLIPPAGE_PCT = 0.04


def run_intraday_backtest(universe=TEST_UNIVERSE, period="7d", interval="1m") -> Dict[str, Any]:
    trades = []
    daily_summaries = []

    logger.info(f"Starting historical intraday backtest across {len(universe)} symbols (Period: {period}, Interval: {interval})...")

    for item in universe:
        ticker = item["ticker"]
        cap = item["cap"]
        is_india = ".NS" in ticker or ".BO" in ticker
        tz_name = "Asia/Kolkata" if is_india else "America/New_York"

        logger.info(f"Fetching {period} 1m data for {ticker}...")
        try:
            df_raw = yf.Ticker(ticker).history(period=period, interval=interval)
        except Exception as e:
            logger.warning(f"Failed to fetch {ticker}: {e}")
            continue

        if df_raw.empty or len(df_raw) < 60:
            logger.warning(f"Insufficient bars for {ticker}: {len(df_raw)}")
            continue

        # Clean dataframe
        df_raw = df_raw.dropna(subset=['Open', 'High', 'Low', 'Close'])
        df_raw = df_raw[df_raw['Volume'] >= 0]
        df_raw = df_raw[~df_raw.index.duplicated(keep='last')].sort_index()

        if df_raw.index.tz is None:
            df_raw.index = df_raw.index.tz_localize(tz_name)
        else:
            df_raw.index = df_raw.index.tz_convert(tz_name)

        # Precompute indicators across the entire dataset
        df_all = calculate_intraday_indicators(df_raw, light=False)

        # Group bars by trading day
        trading_days = np.unique(df_all.index.date)
        logger.info(f"{ticker}: {len(df_all)} bars across {len(trading_days)} days ({trading_days[0]} to {trading_days[-1]})")

        for d in trading_days:
            df_day = df_all[df_all.index.date == d]
            if len(df_day) < 30:
                continue

            day_open = float(df_day.iloc[0]['Open'])
            day_close = float(df_day.iloc[-1]['Close'])
            day_high = float(df_day['High'].max())
            day_low = float(df_day['Low'].min())
            day_change_pct = ((day_close - day_open) / day_open) * 100.0 if day_open > 0 else 0.0
            day_atr_pct = (df_day['High'] - df_day['Low']).mean() / day_open * 100.0 if day_open > 0 else 0.0

            # Classify Market Condition for the Day
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
                "day_change_pct": round(day_change_pct, 2),
                "day_atr_pct": round(day_atr_pct, 2)
            })

            # Simulate bar-by-bar progression
            # Start after first 15 bars (ORB formation period)
            active_trade = None
            step_stride = 2  # Evaluate every 2 bars to optimize speed while catching all intraday setups

            for i in range(16, len(df_day) - 5, step_stride):
                curr_bar = df_day.iloc[i]
                curr_time = curr_bar.name.time()

                # If we have an active trade, manage it
                if active_trade is not None:
                    trade = active_trade
                    entry_p = trade["entry_price"]
                    sl_p = trade["stop_loss"]
                    t1_p = trade["target_1"]
                    t2_p = trade["target_2"]
                    action = trade["action"]

                    bar_h = float(curr_bar['High'])
                    bar_l = float(curr_bar['Low'])
                    bar_c = float(curr_bar['Close'])

                    risk_amt = trade.get("risk_amount", abs(entry_p - sl_p))

                    if action == "LONG":
                        # Check Target 1
                        if not trade["t1_hit"] and bar_h >= t1_p:
                            trade["t1_hit"] = True
                            trade["t1_bar_time"] = str(curr_time)
                            # Trail stop loss to lock in +0.5R profit on runner
                            trade["stop_loss"] = round(entry_p + (0.5 * risk_amt), 2)

                        # Check Target 2
                        if trade["t1_hit"] and bar_h >= t2_p:
                            trade["t2_hit"] = True
                            trade["exit_price"] = t2_p
                            trade["exit_time"] = str(curr_time)
                            trade["exit_reason"] = "TARGET_2_HIT"
                            # 50% at T1, 50% at T2
                            ret1 = ((t1_p - entry_p) / entry_p) * 100.0
                            ret2 = ((t2_p - entry_p) / entry_p) * 100.0
                            raw_ret = (0.5 * ret1) + (0.5 * ret2)
                            trade["net_pnl_pct"] = round(raw_ret - ROUNDTRIP_SLIPPAGE_PCT, 3)
                            trades.append(trade)
                            active_trade = None
                            continue

                        # Check Stop Loss
                        if bar_l <= trade["stop_loss"]:
                            trade["exit_price"] = trade["stop_loss"]
                            trade["exit_time"] = str(curr_time)
                            if trade["t1_hit"]:
                                # 50% booked at T1, remaining 50% exited with trailing +0.5R lock-in profit
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
                        # Check Target 1
                        if not trade["t1_hit"] and bar_l <= t1_p:
                            trade["t1_hit"] = True
                            trade["t1_bar_time"] = str(curr_time)
                            # Trail stop loss to lock in +0.5R profit on runner
                            trade["stop_loss"] = round(entry_p - (0.5 * risk_amt), 2)

                        # Check Target 2
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

                        # Check Stop Loss
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

                # If no active trade, evaluate entry signal at this bar
                if active_trade is None:
                    # Slice data up to current bar i (strictly no lookahead)
                    df_slice = df_day.iloc[:i + 1]

                    # Run exact production analysis setup
                    try:
                        analysis = analyze_stock_setup(ticker, df_slice, company_name=item["name"], cap=cap)
                    except Exception:
                        continue

                    signal = analysis.get("signal", "")
                    is_rec = analysis.get("is_recommended", False)
                    plan = analysis.get("trade_plan")

                    # We only trade high-conviction recommended setups that satisfy 4-TF confluence
                    if is_rec and signal in ["STRONG BUY", "BUY", "STRONG SELL", "SELL", "STRONG SHORT", "SHORT"] and plan:
                        action = "LONG" if "BUY" in signal else "SHORT"
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
                            "setup_name": analysis.get("setup_name", ""),
                            "score": analysis.get("score", 0),
                            "display_score": analysis.get("display_score", 0),
                            "rvol": analysis.get("rvol", 1.0),
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

            # If trade is still open at the end of the day, force EOD square-off at last bar close
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

    logger.info(f"Backtest completed! Total trades executed: {len(trades)}")
    return compute_performance_metrics(trades, daily_summaries)


def compute_performance_metrics(trades: List[Dict[str, Any]], daily_summaries: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not trades:
        return {"total_trades": 0, "message": "No trades triggered under strict 4-TF confluence."}

    df_trades = pd.DataFrame(trades)

    total_trades = len(df_trades)
    wins = df_trades[df_trades["net_pnl_pct"] > 0]
    losses = df_trades[df_trades["net_pnl_pct"] < 0]
    scratch = df_trades[df_trades["net_pnl_pct"] == 0]

    win_count = len(wins)
    loss_count = len(losses)
    win_rate = (win_count / total_trades) * 100.0

    avg_win = float(wins["net_pnl_pct"].mean()) if win_count > 0 else 0.0
    avg_loss = float(losses["net_pnl_pct"].mean()) if loss_count > 0 else 0.0
    win_loss_ratio = abs(avg_win / avg_loss) if avg_loss != 0 else float("inf")

    gross_profit = float(wins["net_pnl_pct"].sum()) if win_count > 0 else 0.0
    gross_loss = abs(float(losses["net_pnl_pct"].sum())) if loss_count > 0 else 0.0
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (float("inf") if gross_profit > 0 else 0.0)

    total_net_pnl = float(df_trades["net_pnl_pct"].sum())
    expectancy = (win_rate / 100.0 * avg_win) + ((1 - win_rate / 100.0) * avg_loss)

    # Calculate Drawdown Curve
    # Cumulative equity progression assuming 100 base
    cum_returns = df_trades["net_pnl_pct"].cumsum()
    equity_curve = 100.0 + cum_returns
    peak = equity_curve.cummax()
    drawdown = ((equity_curve - peak) / peak) * 100.0
    max_drawdown = abs(float(drawdown.min())) if len(drawdown) > 0 else 0.0

    # Exit reason breakdown
    exit_counts = df_trades["exit_reason"].value_counts().to_dict()

    # Direction breakdown
    long_trades = df_trades[df_trades["action"] == "LONG"]
    short_trades = df_trades[df_trades["action"] == "SHORT"]

    def _sub_stats(sub_df):
        if sub_df.empty:
            return {"trades": 0, "win_rate": 0, "pnl": 0}
        w = len(sub_df[sub_df["net_pnl_pct"] > 0])
        return {
            "trades": len(sub_df),
            "win_rate": round((w / len(sub_df)) * 100.0, 1),
            "pnl": round(float(sub_df["net_pnl_pct"].sum()), 2),
            "avg_win": round(float(sub_df[sub_df["net_pnl_pct"] > 0]["net_pnl_pct"].mean()), 2) if w > 0 else 0,
            "avg_loss": round(float(sub_df[sub_df["net_pnl_pct"] < 0]["net_pnl_pct"].mean()), 2) if len(sub_df[sub_df["net_pnl_pct"] < 0]) > 0 else 0
        }

    # Market Condition breakdown
    regime_stats = {}
    for r in ["BULLISH_TREND", "BEARISH_TREND", "CHOPPY_SIDEWAYS"]:
        regime_df = df_trades[df_trades["regime"] == r]
        regime_stats[r] = _sub_stats(regime_df)

    # Market Geo breakdown (NSE vs US)
    market_stats = {}
    for m in ["NSE", "US"]:
        m_df = df_trades[df_trades["market"] == m]
        market_stats[m] = _sub_stats(m_df)

    # Cap category breakdown (LARGE vs MID)
    cap_stats = {}
    for c in ["LARGE", "MID"]:
        c_df = df_trades[df_trades["cap"] == c]
        cap_stats[c] = _sub_stats(c_df)

    # Best setups breakdown
    setup_stats = {}
    for s_name, group in df_trades.groupby("setup_name"):
        setup_stats[s_name] = _sub_stats(group)

    # Compile structured results
    return {
        "status": "OK",
        "overview": {
            "total_trades": total_trades,
            "win_count": win_count,
            "loss_count": loss_count,
            "scratch_count": len(scratch),
            "win_rate_pct": round(win_rate, 2),
            "avg_win_pct": round(avg_win, 2),
            "avg_loss_pct": round(avg_loss, 2),
            "win_loss_ratio": round(win_loss_ratio, 2),
            "profit_factor": round(profit_factor, 2),
            "expectancy_pct_per_trade": round(expectancy, 3),
            "total_net_pnl_pct": round(total_net_pnl, 2),
            "max_drawdown_pct": round(max_drawdown, 2),
            "exit_reasons": exit_counts
        },
        "by_direction": {
            "long": _sub_stats(long_trades),
            "short": _sub_stats(short_trades)
        },
        "by_market_condition": regime_stats,
        "by_geography": market_stats,
        "by_market_cap": cap_stats,
        "by_setup": setup_stats,
        "all_trades": trades
    }


if __name__ == "__main__":
    results = run_intraday_backtest()
    # Save results to json for detailed reporting
    out_file = os.path.join(os.path.dirname(__file__), "backtest_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print("\n" + "="*70)
    print("BACKTEST SUMMARY RESULTS:")
    print("="*70)
    ov = results["overview"]
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
