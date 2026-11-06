"""
Quantitative Trade Parameter & Risk Management Engine:
Calculates disciplined Entry, Stop Loss, and Tiered Target Prices for:
1. Immediate Next-Day Intraday Trades (+2% to +6% expected move, with 15-min ORB rule)
2. Short-Term Delivery Trades (Tier 1: +5% to +8% base exit + breakeven shift; Tier 2: +15% to +50% runner)

Incorporates:
- Volatility-adjusted (ATR) dynamic stop losses
- Tiered profit scaling (1R/2R base target + trailing runner)
- Execution triggers (Opening Range Breakout for Intraday, PEAD Retest for Swing)
- Macro Regime Gatekeeper classification
"""

from typing import Dict, Any, Literal, Optional
import math

def calculate_trade_parameters(
    current_price: float,
    direction: Literal["BUY", "SELL"],
    timeframe: Literal["Intraday", "Short-term"],
    catalyst_strength: float = 85.0,     # 0 to 100 scale
    volatility_factor: float = 1.0,        # Historical ATR / Beta multiplier
    market_regime: str = "BULL"           # "BULL", "CHOPPY", "BEAR"
) -> Dict[str, Any]:
    """
    Computes institutional trade levels adhering to disciplined, volatility-anchored risk rules.
    """
    if current_price <= 0:
        current_price = 100.0

    conviction_mult = max(0.7, min(1.3, catalyst_strength / 75.0))
    vol_scale = max(0.8, min(1.6, volatility_factor))

    # Regime Gatekeeper Advice
    regime_upper = market_regime.upper()
    if "BEAR" in regime_upper:
        regime_status = "BEARISH_HEADWIND"
        regime_advice = "Market index < 50-DMA. High false-breakout risk. Reduce position size by 50% or focus on SELL breakdown setups."
    elif "CHOP" in regime_upper:
        regime_status = "CHOPPY_RANGE"
        regime_advice = "Market index in consolidation chop. Only enter on high RVOL (> 2.5x) or wait for a pullback retest."
    else:
        regime_status = "BULLISH_EXPANSION"
        regime_advice = "Market index > 50-DMA & 200-DMA. Institutional expansion regime with strong follow-through probability."

    if timeframe == "Intraday":
        if direction == "BUY":
            execution_protocol = "15-Min ORB Rule: Enter only if price breaks above 15-minute opening candle high on above-average volume. Avoid entering at open tick."
            entry_buffer = 0.002 * vol_scale
            entry_price = current_price * (1.0 + entry_buffer)
            # Disciplined intraday stop loss (0.45% - 0.95%)
            risk_pct = 0.0065 * vol_scale
            stop_loss = entry_price * (1.0 - risk_pct)

            # Tier 1 Target (Realistic Scalp / Base exit): +0.6% to +1.4%
            t1_roi = max(0.006, min(0.014, 0.010 * conviction_mult * vol_scale))
            target_t1 = entry_price * (1.0 + t1_roi)

            # Tier 2 Target (Realistic Main Intraday Target 0-3%): +1.5% to +3.0%
            t2_roi = max(0.015, min(0.030, 0.022 * conviction_mult * vol_scale))
            target_t2 = entry_price * (1.0 + t2_roi)

            target_price = target_t2
            reward_pct = t2_roi
        else: # SELL / SHORT (Sell Zone)
            execution_protocol = "15-Min ORB Breakdown Rule: Enter Short on breakdown below 15-minute opening candle low / VWAP with above-average volume."
            entry_buffer = 0.002 * vol_scale
            entry_price = current_price * (1.0 - entry_buffer)
            # Disciplined intraday stop loss for short (0.45% - 0.95%)
            risk_pct = 0.0065 * vol_scale
            stop_loss = entry_price * (1.0 + risk_pct)

            # Tier 1 Target (Realistic Short Cover / Scalp): +0.6% to +1.4% downside
            t1_roi = max(0.006, min(0.014, 0.010 * conviction_mult * vol_scale))
            target_t1 = entry_price * (1.0 - t1_roi)

            # Tier 2 Target (Realistic Main Short Target 0-3%): +1.5% to +3.0% downside
            t2_roi = max(0.015, min(0.030, 0.022 * conviction_mult * vol_scale))
            target_t2 = entry_price * (1.0 - t2_roi)

            target_price = target_t2
            reward_pct = t2_roi

    else:
        # Short-term Delivery / Swing: Tiered Profit Scaling + PEAD Pullback Retest
        execution_protocol = "PEAD Retest Setup: Enter on Day 2–4 pullback retesting 8-EMA or former base breakout. Move stop to breakeven once T1 is hit."

        if direction == "BUY":
            entry_buffer = 0.005
            entry_price = current_price * (1.0 + entry_buffer)
            # Volatility-anchored stop loss (4.8% to 6.5%)
            risk_pct = 0.052 * vol_scale
            stop_loss = entry_price * (1.0 - risk_pct)

            # Tier 1 Target (Base Profit Booking & Breakeven Shift): +6.0% to +8.5%
            t1_roi = max(0.060, min(0.085, 0.072 * vol_scale))
            target_t1 = entry_price * (1.0 + t1_roi)

            # Tier 2 Target (Multi-Week Runner with Trailing Stop): +18% to +48%!
            base_reward = 0.16
            if catalyst_strength >= 90:
                base_reward = 0.38
            elif catalyst_strength >= 80:
                base_reward = 0.24
            elif catalyst_strength >= 70:
                base_reward = 0.15

            t2_roi = max(0.12, min(0.50, base_reward * conviction_mult))
            target_t2 = entry_price * (1.0 + t2_roi)

            target_price = target_t2
            reward_pct = t2_roi
        else: # SELL / Short Delivery
            entry_buffer = 0.005
            entry_price = current_price * (1.0 - entry_buffer)
            risk_pct = 0.055 * vol_scale
            stop_loss = entry_price * (1.0 + risk_pct)

            t1_roi = max(0.060, min(0.085, 0.068 * vol_scale))
            target_t1 = entry_price * (1.0 - t1_roi)

            t2_roi = max(0.10, min(0.35, 0.18 * conviction_mult))
            target_t2 = entry_price * (1.0 - t2_roi)

            target_price = target_t2
            reward_pct = t2_roi

    # Risk vs Reward calculations
    abs_risk = abs(entry_price - stop_loss)
    abs_reward = abs(target_price - entry_price)
    rr_numeric = round(abs_reward / abs_risk, 2) if abs_risk > 0 else 2.5
    rr_str = f"1 : {rr_numeric}"

    abs_reward_t1 = abs(target_t1 - entry_price)
    rr_t1_numeric = round(abs_reward_t1 / abs_risk, 2) if abs_risk > 0 else 1.5

    projected_roi = round(reward_pct * 100, 2)
    risk_pct_val = round(risk_pct * 100, 2)
    t1_roi_val = round(t1_roi * 100, 2)
    t2_roi_val = round(t2_roi * 100, 2)

    return {
        "current_price": round(current_price, 2),
        "entry_price": round(entry_price, 2),
        "stop_loss_price": round(stop_loss, 2),
        "target_price": round(target_price, 2),
        "target_price_t1": round(target_t1, 2),
        "target_price_t2": round(target_t2, 2),
        "t1_roi_pct": t1_roi_val,
        "t2_roi_pct": t2_roi_val,
        "risk_pct": risk_pct_val,
        "projected_roi_pct": projected_roi,
        "risk_reward_ratio": rr_str,
        "risk_reward_numeric": rr_numeric,
        "rr_t1_ratio": f"1 : {rr_t1_numeric}",
        "execution_protocol": execution_protocol,
        "market_regime": regime_status,
        "regime_advice": regime_advice,
        "breakeven_rule": f"Move stop loss to {round(entry_price, 2)} once Target 1 ({round(target_t1, 2)}) is achieved."
    }
