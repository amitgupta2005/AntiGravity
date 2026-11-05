"""
Quantitative Trade Parameter & Risk Management Engine:
Calculates disciplined Entry, Stop Loss, and Target Prices for:
1. Immediate Next-Day Intraday Trades (+2% to +6% expected move)
2. Short-Term Delivery Trades (+10% to +50% expected return)
"""

from typing import Dict, Any, Literal
import math

def calculate_trade_parameters(
    current_price: float,
    direction: Literal["BUY", "SELL"],
    timeframe: Literal["Intraday", "Short-term"],
    catalyst_strength: float = 85.0,  # 0 to 100 scale
    volatility_factor: float = 1.0     # Beta / historical ATR multiplier
) -> Dict[str, Any]:
    """
    Computes institutional trade levels adhering to strict risk management rules.
    """
    if current_price <= 0:
        current_price = 100.0

    # Dynamic scaling based on catalyst conviction (0.7 to 1.3x)
    conviction_mult = max(0.7, min(1.3, catalyst_strength / 75.0))
    vol_scale = max(0.8, min(1.5, volatility_factor))

    if timeframe == "Intraday":
        # Intraday: Fast, tight invalidation stop, 2% to 6% target
        if direction == "BUY":
            # Entry on momentum confirmation (slight buffer above current spot)
            entry_buffer = 0.003 * vol_scale
            entry_price = current_price * (1.0 + entry_buffer)
            # Stop loss at 1.2% - 1.6% below entry
            risk_pct = 0.014 * vol_scale
            stop_loss = entry_price * (1.0 - risk_pct)
            # Target 2.8% - 5.5% above entry (giving R:R >= 1:2.0)
            reward_pct = max(0.025, min(0.065, 0.038 * conviction_mult * vol_scale))
            target_price = entry_price * (1.0 + reward_pct)
        else: # SELL
            entry_buffer = 0.003 * vol_scale
            entry_price = current_price * (1.0 - entry_buffer)
            risk_pct = 0.014 * vol_scale
            stop_loss = entry_price * (1.0 + risk_pct)
            reward_pct = max(0.025, min(0.065, 0.035 * conviction_mult * vol_scale))
            target_price = entry_price * (1.0 - reward_pct)

    else:
        # Short-term Delivery / Swing: Post-earnings drift / structural turnaround
        # Target: 10% to 50% return!
        if direction == "BUY":
            # Entry near current price or slight breakout buffer
            entry_buffer = 0.005
            entry_price = current_price * (1.0 + entry_buffer)
            # Stop Loss: 4.5% to 6.5% below entry (anchored below swing support)
            risk_pct = 0.052 * vol_scale
            stop_loss = entry_price * (1.0 - risk_pct)
            # Target: 12% to 48% depending on catalyst strength
            base_reward = 0.16  # baseline 16% return
            if catalyst_strength >= 90:
                base_reward = 0.38  # High conviction multi-week target ~38%
            elif catalyst_strength >= 80:
                base_reward = 0.24  # Strong catalyst ~24%
            elif catalyst_strength >= 70:
                base_reward = 0.15  # Solid catalyst ~15%
            
            reward_pct = max(0.10, min(0.50, base_reward * conviction_mult))
            target_price = entry_price * (1.0 + reward_pct)
        else: # SELL / Short Delivery
            entry_buffer = 0.005
            entry_price = current_price * (1.0 - entry_buffer)
            risk_pct = 0.055 * vol_scale
            stop_loss = entry_price * (1.0 + risk_pct)
            reward_pct = max(0.10, min(0.35, 0.18 * conviction_mult))
            target_price = entry_price * (1.0 - reward_pct)

    # Risk vs Reward calculations
    abs_risk = abs(entry_price - stop_loss)
    abs_reward = abs(target_price - entry_price)
    rr_numeric = round(abs_reward / abs_risk, 2) if abs_risk > 0 else 2.5
    rr_str = f"1 : {rr_numeric}"

    projected_roi = round(reward_pct * 100, 2)
    risk_pct_val = round(risk_pct * 100, 2)

    return {
        "current_price": round(current_price, 2),
        "entry_price": round(entry_price, 2),
        "stop_loss_price": round(stop_loss, 2),
        "target_price": round(target_price, 2),
        "risk_pct": risk_pct_val,
        "projected_roi_pct": projected_roi,
        "risk_reward_ratio": rr_str,
        "risk_reward_numeric": rr_numeric,
    }
