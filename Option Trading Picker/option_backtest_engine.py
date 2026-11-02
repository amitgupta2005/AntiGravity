"""
Quantitative Backtest Engine for Option Trading Picker
Simulates Black-Scholes multi-leg options strategies, disciplined exit plans,
and market regime performance across US and Indian equities and indices.
"""

import math
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd
import yfinance as yf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("option_backtest")

# -----------------------------------------------------------------------------
# Black-Scholes Mathematical Pricing Model
# -----------------------------------------------------------------------------
def cdf_normal(x: float) -> float:
    """Cumulative distribution function for standard normal distribution."""
    if math.isnan(x):
        return 0.5
    if x > 8.0:
        return 1.0
    if x < -8.0:
        return 0.0

    a1 = 0.254829592
    a2 = -0.284496736
    a3 = 1.421413741
    a4 = -1.453152027
    a5 = 1.061405429
    p = 0.3275911

    sign = -1.0 if x < 0 else 1.0
    abs_x = abs(x) / math.sqrt(2.0)
    t = 1.0 / (1.0 + p * abs_x)
    y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-abs_x * abs_x)
    return 0.5 * (1.0 + sign * y)


def bs_price(call_or_put: str, S: float, K: float, T: float, r: float, sigma: float) -> float:
    """Calculates Black-Scholes price for European Call or Put."""
    call_or_put = call_or_put.lower()
    S = max(0.01, float(S))
    K = max(0.01, float(K))
    sigma = max(0.01, float(sigma))

    if T <= 0.0001:
        if call_or_put == "call":
            return max(0.0, S - K)
        else:
            return max(0.0, K - S)

    sqrt_t = math.sqrt(T)
    d1 = (math.log(S / K) + (r + (sigma ** 2) / 2.0) * T) / (sigma * sqrt_t)
    d2 = d1 - sigma * sqrt_t

    discount = math.exp(-r * T)
    if call_or_put == "call":
        return S * cdf_normal(d1) - K * discount * cdf_normal(d2)
    else:
        return K * discount * cdf_normal(-d2) - S * cdf_normal(-d1)


# -----------------------------------------------------------------------------
# Data Loader and Technical Indicator Enrichment
# -----------------------------------------------------------------------------
UNIVERSE_CONFIG = [
    {"ticker": "SPY", "market": "US", "name": "S&P 500 ETF", "currency": "$", "r": 0.045, "lot": 100},
    {"ticker": "QQQ", "market": "US", "name": "Invesco QQQ Trust", "currency": "$", "r": 0.045, "lot": 100},
    {"ticker": "IWM", "market": "US", "name": "Russell 2000 Small-Cap", "currency": "$", "r": 0.045, "lot": 100},
    {"ticker": "NVDA", "market": "US", "name": "NVIDIA Corporation", "currency": "$", "r": 0.045, "lot": 100},
    {"ticker": "AAPL", "market": "US", "name": "Apple Inc", "currency": "$", "r": 0.045, "lot": 100},
    {"ticker": "^NSEI", "display": "NIFTY 50", "market": "INDIA", "name": "NIFTY 50 Index", "currency": "₹", "r": 0.065, "lot": 75},
    {"ticker": "^NSEBANK", "display": "BANKNIFTY", "market": "INDIA", "name": "Bank Nifty Index", "currency": "₹", "r": 0.065, "lot": 30},
    {"ticker": "RELIANCE.NS", "display": "RELIANCE", "market": "INDIA", "name": "Reliance Industries", "currency": "₹", "r": 0.065, "lot": 250},
    {"ticker": "HDFCBANK.NS", "display": "HDFCBANK", "market": "INDIA", "name": "HDFC Bank Ltd", "currency": "₹", "r": 0.065, "lot": 550},
    {"ticker": "TRENT.NS", "display": "TRENT", "market": "INDIA", "name": "Trent Ltd", "currency": "₹", "r": 0.065, "lot": 100}
]


def load_historical_data(ticker: str, start_date: str = "2023-01-01", end_date: str = "2026-11-01") -> pd.DataFrame:
    """Fetches daily price history and computes technical indicators, volatility, and regimes."""
    t = yf.Ticker(ticker)
    df = t.history(start=start_date, end=end_date, interval="1d")
    if df.empty or len(df) < 50:
        logger.warning(f"Insufficient history for {ticker}")
        return pd.DataFrame()

    df = df.dropna(subset=['Open', 'High', 'Low', 'Close']).copy()

    # Moving averages
    df['SMA20'] = df['Close'].rolling(20).mean()
    df['SMA50'] = df['Close'].rolling(50).mean()
    df['SMA200'] = df['Close'].rolling(200).mean().bfill()

    # Realized Historical Volatility (20-day annualized)
    log_ret = np.log(df['Close'] / df['Close'].shift(1))
    df['HV20'] = log_ret.rolling(20).std() * math.sqrt(252)
    df['HV20'] = df['HV20'].bfill().fillna(0.20)

    # Implied Volatility model: Realized vol + Volatility Risk Premium (1.15x HV)
    df['IV'] = (df['HV20'] * 1.15).clip(lower=0.10, upper=0.90)
    df['HV20_pct'] = df['HV20'] * 100.0
    df['IV_pct'] = df['IV'] * 100.0
    df['VRP'] = df['IV_pct'] - df['HV20_pct']

    # IV Rank (252-day rolling min-max percentile)
    iv_min = df['IV'].rolling(252, min_periods=30).min()
    iv_max = df['IV'].rolling(252, min_periods=30).max()
    df['IV_Rank'] = ((df['IV'] - iv_min) / (iv_max - iv_min + 1e-6) * 100.0).clip(0, 100).fillna(45.0)

    # 14-day RSI
    delta = df['Close'].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(14, min_periods=1).mean()
    avg_loss = loss.rolling(14, min_periods=1).mean()
    rs = avg_gain / (avg_loss + 1e-6)
    df['RSI14'] = 100.0 - (100.0 / (1.0 + rs))

    # Average Directional Index (ADX 14) for trend strength
    high_low = df['High'] - df['Low']
    high_close = (df['High'] - df['Close'].shift(1)).abs()
    low_close = (df['Low'] - df['Close'].shift(1)).abs()
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    atr = tr.rolling(14, min_periods=1).mean()

    up_move = df['High'].diff()
    down_move = -df['Low'].diff()
    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)
    plus_di = 100 * (pd.Series(plus_dm, index=df.index).ewm(alpha=1/14).mean() / atr.replace(0, np.nan))
    minus_di = 100 * (pd.Series(minus_dm, index=df.index).ewm(alpha=1/14).mean() / atr.replace(0, np.nan))
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
    df['ADX14'] = dx.ewm(alpha=1/14).mean().fillna(20.0)

    # Market Regime Tagging
    regimes = []
    for idx, row in df.iterrows():
        c = row['Close']
        s50 = row['SMA50']
        s200 = row['SMA200']
        iv_r = row['IV_Rank']
        adx = row['ADX14']

        if iv_r >= 65:
            regimes.append("HIGH_VOLATILITY")
        elif c > s50 and s50 >= s200:
            regimes.append("BULLISH_TREND")
        elif c < s50 and s50 < s200:
            regimes.append("BEARISH_CORRECTION")
        elif adx < 22:
            regimes.append("LOW_VOL_RANGE")
        else:
            regimes.append("BULLISH_TREND" if c >= s50 else "BEARISH_CORRECTION")

    df['Regime'] = regimes
    return df


# -----------------------------------------------------------------------------
# Strategy Trade Simulation Core
# -----------------------------------------------------------------------------
class OptionTradeSimulator:
    """Simulates option lifecycle, mark-to-market pricing, and disciplined exits."""

    @staticmethod
    def simulate_trade(
        strategy_type: str,
        entry_idx: int,
        df: pd.DataFrame,
        asset_meta: Dict[str, Any],
        target_dte: int = 35
    ) -> Optional[Dict[str, Any]]:
        """
        Executes an option strategy trade on entry date, models daily price path,
        and evaluates profit booking, stop loss triggers, or expiration.
        """
        if entry_idx + target_dte >= len(df):
            return None

        entry_row = df.iloc[entry_idx]
        S0 = float(entry_row['Close'])
        iv0 = float(entry_row['IV'])
        r = float(asset_meta['r'])
        lot = int(asset_meta['lot'])
        curr = str(asset_meta['currency'])
        regime = str(entry_row['Regime'])

        # Determine strike interval step based on asset price level
        if S0 > 5000:
            step = 100.0
        elif S0 > 1000:
            step = 50.0
        elif S0 > 200:
            step = 10.0
        elif S0 > 50:
            step = 5.0
        else:
            step = 1.0

        atm_strike = round(S0 / step) * step

        # Strategy Construction
        T0 = target_dte / 365.0
        legs = []
        is_credit = False
        net_premium = 0.0
        target_profit_amt = 0.0
        stop_loss_amt = 0.0

        # Quantitative Anti-Curve-Fitting Rule 1: Volatility Risk Premium (VRP) Gate
        # Only allow credit selling strategies when Implied Volatility exceeds Historical Volatility by >= +3.0%
        vrp = float(entry_row.get('VRP', (iv0 - float(entry_row['HV20'])) * 100.0))
        is_credit_strategy = strategy_type in ["BULL_PUT_SPREAD", "BEAR_CALL_SPREAD", "IRON_CONDOR", "THETA_DECAY"]
        if is_credit_strategy and vrp < 3.0:
            return None

        # Quantitative Anti-Curve-Fitting Rule 3: Trend Regime Alignment Gate
        # Bull Put Spreads allowed only when underlying is in an upward trend (Price >= SMA50)
        # Bear Call Spreads allowed only when underlying is in a downward trend (Price < SMA50)
        if strategy_type == "BULL_PUT_SPREAD" and S0 < float(entry_row['SMA50']):
            return None
        if strategy_type == "BEAR_CALL_SPREAD" and S0 >= float(entry_row['SMA50']):
            return None

        if strategy_type == "BULL_PUT_SPREAD":
            # Sell OTM Put (~0.30 Delta) + Buy lower OTM Put wing (~0.15 Delta)
            short_k = atm_strike - step
            long_k = atm_strike - step * 2
            p_short = bs_price("put", S0, short_k, T0, r, iv0)
            p_long = bs_price("put", S0, long_k, T0, r, iv0)
            net_credit = p_short - p_long
            if net_credit <= 0.05:
                return None
            is_credit = True
            net_premium = net_credit
            legs = [
                {"type": "put", "action": "sell", "k": short_k},
                {"type": "put", "action": "buy", "k": long_k}
            ]
            # Exit Plan: Take profit at +50% credit; Stop loss at -1.5x credit
            target_profit_amt = net_credit * 0.50
            stop_loss_amt = net_credit * 1.50

        elif strategy_type == "BEAR_CALL_SPREAD":
            # Sell OTM Call + Buy higher OTM Call wing
            short_k = atm_strike + step
            long_k = atm_strike + step * 2
            p_short = bs_price("call", S0, short_k, T0, r, iv0)
            p_long = bs_price("call", S0, long_k, T0, r, iv0)
            net_credit = p_short - p_long
            if net_credit <= 0.05:
                return None
            is_credit = True
            net_premium = net_credit
            legs = [
                {"type": "call", "action": "sell", "k": short_k},
                {"type": "call", "action": "buy", "k": long_k}
            ]
            target_profit_amt = net_credit * 0.50
            stop_loss_amt = net_credit * 1.50

        elif strategy_type == "BULL_CALL_SPREAD":
            # Buy ATM Call + Sell OTM Call (Debit spread)
            long_k = atm_strike
            short_k = atm_strike + step * 2
            p_long = bs_price("call", S0, long_k, T0, r, iv0)
            p_short = bs_price("call", S0, short_k, T0, r, iv0)
            net_debit = p_long - p_short
            if net_debit <= 0.05:
                return None
            is_credit = False
            net_premium = net_debit
            legs = [
                {"type": "call", "action": "buy", "k": long_k},
                {"type": "call", "action": "sell", "k": short_k}
            ]
            # Exit Plan: Book at 70% of max spread profit; cut at -45% of debit
            spread_width = short_k - long_k
            max_spread_profit = spread_width - net_debit
            target_profit_amt = max_spread_profit * 0.70
            stop_loss_amt = net_debit * 0.45

        elif strategy_type == "BEAR_PUT_SPREAD":
            # Buy ATM Put + Sell lower OTM Put (Debit spread)
            long_k = atm_strike
            short_k = atm_strike - step * 2
            p_long = bs_price("put", S0, long_k, T0, r, iv0)
            p_short = bs_price("put", S0, short_k, T0, r, iv0)
            net_debit = p_long - p_short
            if net_debit <= 0.05:
                return None
            is_credit = False
            net_premium = net_debit
            legs = [
                {"type": "put", "action": "buy", "k": long_k},
                {"type": "put", "action": "sell", "k": short_k}
            ]
            spread_width = long_k - short_k
            max_spread_profit = spread_width - net_debit
            target_profit_amt = max_spread_profit * 0.70
            stop_loss_amt = net_debit * 0.45

        elif strategy_type == "IRON_CONDOR":
            # Bull Put Spread + Bear Call Spread (Delta Neutral Income)
            put_short_k = atm_strike - step
            put_long_k = atm_strike - step * 2
            call_short_k = atm_strike + step
            call_long_k = atm_strike + step * 2

            p_put_s = bs_price("put", S0, put_short_k, T0, r, iv0)
            p_put_l = bs_price("put", S0, put_long_k, T0, r, iv0)
            p_call_s = bs_price("call", S0, call_short_k, T0, r, iv0)
            p_call_l = bs_price("call", S0, call_long_k, T0, r, iv0)

            net_credit = (p_put_s - p_put_l) + (p_call_s - p_call_l)
            if net_credit <= 0.10:
                return None
            is_credit = True
            net_premium = net_credit
            legs = [
                {"type": "put", "action": "sell", "k": put_short_k},
                {"type": "put", "action": "buy", "k": put_long_k},
                {"type": "call", "action": "sell", "k": call_short_k},
                {"type": "call", "action": "buy", "k": call_long_k}
            ]
            target_profit_amt = net_credit * 0.50
            stop_loss_amt = net_credit * 1.50

        elif strategy_type == "THETA_DECAY":
            # Quantitative Anti-Curve-Fitting Rule 4: 16-Delta Asymmetric Strangle Condor
            # Replaces narrow ATM pinning butterfly with 1-sigma safe buffer & asymmetric crash protection
            put_short_k = atm_strike - step * 2
            put_long_k = atm_strike - step * 5  # Asymmetric wide put wing for tail safety
            call_short_k = atm_strike + step * 2
            call_long_k = atm_strike + step * 4  # 2-step call wing

            p_put_s = bs_price("put", S0, put_short_k, T0, r, iv0)
            p_put_l = bs_price("put", S0, put_long_k, T0, r, iv0)
            p_call_s = bs_price("call", S0, call_short_k, T0, r, iv0)
            p_call_l = bs_price("call", S0, call_long_k, T0, r, iv0)

            net_credit = (p_put_s - p_put_l) + (p_call_s - p_call_l)
            if net_credit <= 0.08:
                return None
            is_credit = True
            net_premium = net_credit
            legs = [
                {"type": "put", "action": "buy", "k": put_long_k},
                {"type": "put", "action": "sell", "k": put_short_k},
                {"type": "call", "action": "sell", "k": call_short_k},
                {"type": "call", "action": "buy", "k": call_long_k}
            ]
            target_profit_amt = net_credit * 0.50
            stop_loss_amt = net_credit * 1.50

        elif strategy_type == "LONG_CALL":
            # Outright Momentum Breakout
            p_call = bs_price("call", S0, atm_strike, T0, r, iv0)
            if p_call <= 0.05:
                return None
            is_credit = False
            net_premium = p_call
            legs = [{"type": "call", "action": "buy", "k": atm_strike}]
            target_profit_amt = p_call * 0.55
            stop_loss_amt = p_call * 0.40

        elif strategy_type == "LONG_PUT":
            # Outright Momentum Breakdown
            p_put = bs_price("put", S0, atm_strike, T0, r, iv0)
            if p_put <= 0.05:
                return None
            is_credit = False
            net_premium = p_put
            legs = [{"type": "put", "action": "buy", "k": atm_strike}]
            target_profit_amt = p_put * 0.55
            stop_loss_amt = p_put * 0.40

        elif strategy_type == "LONG_STRADDLE":
            # Volatility Squeeze / Breakout
            p_call = bs_price("call", S0, atm_strike, T0, r, iv0)
            p_put = bs_price("put", S0, atm_strike, T0, r, iv0)
            total_premium = p_call + p_put
            if total_premium <= 0.10:
                return None
            is_credit = False
            net_premium = total_premium
            legs = [
                {"type": "call", "action": "buy", "k": atm_strike},
                {"type": "put", "action": "buy", "k": atm_strike}
            ]
            target_profit_amt = total_premium * 0.45
            stop_loss_amt = total_premium * 0.35
        else:
            return None

        # -----------------------------------------------------------------
        # Daily Mark-to-Market Walkforward
        # -----------------------------------------------------------------
        days_held = 0
        final_pnl_per_share = 0.0
        exit_reason = "EXPIRATION"
        exit_date = None

        for day in range(1, target_dte + 1):
            curr_idx = entry_idx + day
            if curr_idx >= len(df):
                break

            curr_row = df.iloc[curr_idx]
            S_curr = float(curr_row['Close'])
            S_high = float(curr_row['High'])
            S_low = float(curr_row['Low'])
            iv_curr = float(curr_row['IV'])
            remaining_dte = target_dte - day
            T_curr = max(0.0001, remaining_dte / 365.0)

            # Mark position value at current spot
            def valuate_position(s_eval: float) -> float:
                val = 0.0
                for leg in legs:
                    p = bs_price(leg['type'], s_eval, leg['k'], T_curr, r, iv_curr)
                    if leg['action'] == "buy":
                        val += p
                    else:
                        val -= p
                return val

            pos_val_close = valuate_position(S_curr)

            if is_credit:
                # Started with net_premium cash in pocket, liability is -pos_val_close
                pnl = net_premium + pos_val_close
            else:
                # Paid net_premium cash, asset is pos_val_close
                pnl = pos_val_close - net_premium

            # Also check intraday triggers at High/Low
            pos_val_high = valuate_position(S_high)
            pnl_high = (net_premium + pos_val_high) if is_credit else (pos_val_high - net_premium)

            pos_val_low = valuate_position(S_low)
            pnl_low = (net_premium + pos_val_low) if is_credit else (pos_val_low - net_premium)

            max_pnl_today = max(pnl, pnl_high, pnl_low)
            min_pnl_today = min(pnl, pnl_high, pnl_low)

            # Check 1: Target Profit Booking Hit
            if max_pnl_today >= target_profit_amt:
                final_pnl_per_share = target_profit_amt
                exit_reason = "TARGET_PROFIT_BOOKED"
                days_held = day
                exit_date = curr_row.name
                break

            # Check 2: Stop Loss Hit
            if min_pnl_today <= -stop_loss_amt:
                final_pnl_per_share = -stop_loss_amt
                exit_reason = "STOP_LOSS_TRIGGERED"
                days_held = day
                exit_date = curr_row.name
                break

            # Check 3: 21-DTE Gamma Armor Cutoff Rule for Credit Positions (CBOE / Tastytrade Standard)
            # Strictly close credit positions when remaining DTE reaches 21 to avoid the exponential gamma spike zone
            if is_credit and remaining_dte <= 21:
                final_pnl_per_share = pnl
                exit_reason = "21_DTE_GAMMA_ARMOR"
                days_held = day
                exit_date = curr_row.name
                break

            # Check 4: Time Stop for Long Straddle (5 days without breakout)
            if strategy_type == "LONG_STRADDLE" and day >= 5 and pnl <= 0:
                final_pnl_per_share = pnl
                exit_reason = "TIME_STOP_CONSOLIDATION"
                days_held = day
                exit_date = curr_row.name
                break

            # If reached final day
            if remaining_dte <= 0:
                final_pnl_per_share = pnl
                exit_reason = "EXPIRATION"
                days_held = day
                exit_date = curr_row.name
                break

        # Transaction cost & slippage friction (0.5% of premium per roundtrip)
        friction = net_premium * 0.015
        final_pnl_per_share -= friction

        cash_pnl = final_pnl_per_share * lot
        margin_allocated = (net_premium if not is_credit else max(net_premium * 2, step)) * lot
        roi_pct = (cash_pnl / max(1.0, margin_allocated)) * 100.0

        return {
            "strategy": strategy_type,
            "ticker": asset_meta.get("display", asset_meta["ticker"]),
            "market": asset_meta["market"],
            "currency": curr,
            "entry_date": str(entry_row.name.date()) if hasattr(entry_row.name, 'date') else str(entry_row.name),
            "exit_date": str(exit_date.date()) if hasattr(exit_date, 'date') else str(exit_date),
            "days_held": days_held,
            "regime": regime,
            "exit_reason": exit_reason,
            "cash_pnl": round(cash_pnl, 2),
            "roi_pct": round(roi_pct, 2),
            "margin_allocated": round(margin_allocated, 2),
            "is_win": bool(cash_pnl > 0)
        }


# -----------------------------------------------------------------------------
# Backtest Runner Across All Strategies & Regimes
# -----------------------------------------------------------------------------
def run_full_option_backtest() -> Dict[str, Any]:
    """Runs systematic walkforward simulation over 2.5 years of market data."""
    all_trades: List[Dict[str, Any]] = []

    STRATEGIES_MAP = {
        # Bullish Regime Strategies
        "BULLISH_TREND": ["BULL_CALL_SPREAD", "BULL_PUT_SPREAD", "LONG_CALL"],
        # Bearish Regime Strategies
        "BEARISH_CORRECTION": ["BEAR_PUT_SPREAD", "BEAR_CALL_SPREAD", "LONG_PUT"],
        # High Volatility Regime Strategies
        "HIGH_VOLATILITY": ["BULL_PUT_SPREAD", "BEAR_CALL_SPREAD", "IRON_CONDOR"],
        # Low Volatility Range Strategies
        "LOW_VOL_RANGE": ["THETA_DECAY", "IRON_CONDOR", "LONG_STRADDLE"]
    }

    logger.info("Downloading historical market data for option universe...")

    for asset in UNIVERSE_CONFIG:
        ticker = asset["ticker"]
        display_name = asset.get("display", ticker)
        logger.info(f"Analyzing {display_name} ({asset['market']})...")
        df = load_historical_data(ticker, start_date="2023-01-01", end_date="2026-11-01")
        if df.empty:
            continue

        # Stagger trade entries every 7 trading days (~1 trade per week per underlying)
        for i in range(50, len(df) - 35, 7):
            regime = df.iloc[i]['Regime']
            candidate_strats = STRATEGIES_MAP.get(regime, ["BULL_PUT_SPREAD", "BULL_CALL_SPREAD"])

            for strat in candidate_strats:
                trade = OptionTradeSimulator.simulate_trade(
                    strat,
                    i,
                    df,
                    asset,
                    target_dte=35
                )
                if trade:
                    all_trades.append(trade)

    logger.info(f"Backtest completed! Generated {len(all_trades)} simulated option trades.")

    # -------------------------------------------------------------------------
    # Performance Metrics Aggregation
    # -------------------------------------------------------------------------
    df_trades = pd.DataFrame(all_trades)
    if df_trades.empty:
        return {"status": "ERROR", "message": "No trades generated."}

    total_trades = len(df_trades)
    winning_trades = df_trades[df_trades['is_win'] == True]
    losing_trades = df_trades[df_trades['is_win'] == False]

    win_count = len(winning_trades)
    loss_count = len(losing_trades)
    win_rate_pct = round((win_count / total_trades) * 100.0, 2)

    avg_win_roi = round(float(winning_trades['roi_pct'].mean()), 2) if not winning_trades.empty else 0.0
    avg_loss_roi = round(float(losing_trades['roi_pct'].mean()), 2) if not losing_trades.empty else 0.0

    # Payoff ratio
    payoff_ratio = round(abs(avg_win_roi / avg_loss_roi), 2) if avg_loss_roi != 0 else 0.0

    # Profit Factor
    gross_profits = winning_trades['roi_pct'].sum()
    gross_losses = abs(losing_trades['roi_pct'].sum())
    profit_factor = round(float(gross_profits / gross_losses), 2) if gross_losses > 0 else 999.0

    # Cumulative Return & Drawdown Curve
    df_trades['entry_date_dt'] = pd.to_datetime(df_trades['entry_date'])
    df_trades = df_trades.sort_values('entry_date_dt').reset_index(drop=True)
    cumulative_roi = df_trades['roi_pct'].cumsum()
    running_max = cumulative_roi.cummax()
    drawdown = running_max - cumulative_roi
    max_drawdown_roi = round(float(drawdown.max()), 2)
    overall_roi_sum = round(float(df_trades['roi_pct'].sum()), 2)
    avg_trade_roi = round(float(df_trades['roi_pct'].mean()), 2)

    # Breakdown by Strategy Category
    strategy_breakdown = {}
    for strat_name, group in df_trades.groupby('strategy'):
        wins = group[group['is_win'] == True]
        losses = group[group['is_win'] == False]
        strat_win_rate = round((len(wins) / len(group)) * 100.0, 1)
        strat_avg_win = round(float(wins['roi_pct'].mean()), 2) if not wins.empty else 0.0
        strat_avg_loss = round(float(losses['roi_pct'].mean()), 2) if not losses.empty else 0.0
        strategy_breakdown[strat_name] = {
            "trades": len(group),
            "win_rate_pct": strat_win_rate,
            "avg_win_roi": strat_avg_win,
            "avg_loss_roi": strat_avg_loss,
            "total_roi": round(float(group['roi_pct'].sum()), 2),
            "avg_roi_per_trade": round(float(group['roi_pct'].mean()), 2),
            "profit_factor": round(float(wins['roi_pct'].sum() / abs(losses['roi_pct'].sum())), 2) if abs(losses['roi_pct'].sum()) > 0 else 999.0
        }

    # Breakdown by Market Regime
    regime_breakdown = {}
    for reg_name, group in df_trades.groupby('regime'):
        wins = group[group['is_win'] == True]
        losses = group[group['is_win'] == False]
        reg_win_rate = round((len(wins) / len(group)) * 100.0, 1)
        regime_breakdown[reg_name] = {
            "trades": len(group),
            "win_rate_pct": reg_win_rate,
            "total_roi": round(float(group['roi_pct'].sum()), 2),
            "avg_roi": round(float(group['roi_pct'].mean()), 2),
            "profit_factor": round(float(wins['roi_pct'].sum() / abs(losses['roi_pct'].sum())), 2) if abs(losses['roi_pct'].sum()) > 0 else 999.0
        }

    # Breakdown by Market (US vs India)
    market_breakdown = {}
    for mkt_name, group in df_trades.groupby('market'):
        wins = group[group['is_win'] == True]
        losses = group[group['is_win'] == False]
        market_breakdown[mkt_name] = {
            "trades": len(group),
            "win_rate_pct": round((len(wins) / len(group)) * 100.0, 1),
            "total_roi": round(float(group['roi_pct'].sum()), 2),
            "avg_roi": round(float(group['roi_pct'].mean()), 2)
        }

    # Exit reason distribution
    exit_reasons = df_trades['exit_reason'].value_counts().to_dict()

    summary_results = {
        "status": "OK",
        "backtest_period": "Jan 2023 - Nov 2026 (~3.8 Years)",
        "total_trades": total_trades,
        "win_count": win_count,
        "loss_count": loss_count,
        "win_rate_pct": win_rate_pct,
        "avg_win_roi_pct": avg_win_roi,
        "avg_loss_roi_pct": avg_loss_roi,
        "payoff_ratio": payoff_ratio,
        "profit_factor": profit_factor,
        "max_drawdown_pct": max_drawdown_roi,
        "total_pnl_roi_pct": overall_roi_sum,
        "avg_roi_per_trade_pct": avg_trade_roi,
        "exit_reasons": exit_reasons,
        "strategy_breakdown": strategy_breakdown,
        "regime_breakdown": regime_breakdown,
        "market_breakdown": market_breakdown,
        "sample_trades": df_trades.drop(columns=['entry_date_dt'], errors='ignore').head(10).astype(str).to_dict(orient="records")
    }

    # Save results to JSON file
    # Save results to JSON file
    out_file = "option_backtest_results_enhanced.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary_results, f, indent=2, default=str)
    logger.info(f"Enhanced results saved to {out_file}")

    return summary_results


if __name__ == "__main__":
    results = run_full_option_backtest()
    print("\n" + "="*75)
    print("OPTION TRADING PICKER ENHANCED QUANTITATIVE BACKTEST SUMMARY")
    print("="*75)
    print(f"Total Trades Made:      {results['total_trades']}")
    print(f"Overall Win Rate:       {results['win_rate_pct']}% ({results['win_count']} Wins / {results['loss_count']} Losses)")
    print(f"Average Win:            +{results['avg_win_roi_pct']}%")
    print(f"Average Loss:           {results['avg_loss_roi_pct']}%")
    print(f"Payoff Ratio (W/L):     {results['payoff_ratio']}x")
    print(f"Profit Factor:          {results['profit_factor']}")
    print(f"Worst Drop (Max DD):    -{results['max_drawdown_pct']}%")
    print(f"Total Portfolio Return: +{results['total_pnl_roi_pct']}%")
    print(f"Average Return/Trade:   +{results['avg_roi_per_trade_pct']}%")
    print("\nSTRATEGY BREAKDOWN:")
    for k, v in results['strategy_breakdown'].items():
        print(f"  • {k:22}: Win Rate {v['win_rate_pct']:5.1f}% | Total ROI: {v['total_roi']:+8.1f}% | PF: {v['profit_factor']}")
    print("\nREGIME BREAKDOWN:")
    for k, v in results['regime_breakdown'].items():
        print(f"  • {k:20}: Win Rate {v['win_rate_pct']:5.1f}% | Total ROI: {v['total_roi']:+8.1f}% | PF: {v['profit_factor']}")
    print("\nEXIT REASONS DISTRIBUTION:")
    for k, v in results['exit_reasons'].items():
        print(f"  • {k:24}: {v} trades")
    print("="*75)
