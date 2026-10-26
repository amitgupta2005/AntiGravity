"""
Intraday Trading Technical Analysis Engine
Calculates institutional intraday indicators on 1-minute Yahoo Finance data:
- VWAP & VWAP Standard Deviation Bands
- EMA Ribbon (9, 21, 50)
- RSI (14)
- Average True Range (ATR 14)
- Relative Volume (RVOL) & 20-period Volume MA
- Opening Range Breakout (ORB 15m)
- Day High (HOD) and Day Low (LOD)
- Precise Intraday Stop Loss & Target 1, 2, 3 calculations
- Algorithmic Scoring & Expert Technical Analysis Rationale
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from datetime import datetime


def calculate_intraday_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes all intraday technical indicators on a 1-minute OHLCV DataFrame.
    """
    if df.empty:
        return df

    df = df.copy()
    
    # Ensure columns exist and are numeric
    for col in ['Open', 'High', 'Low', 'Close', 'Volume']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # 1. Typical Price for VWAP
    df['Typical_Price'] = (df['High'] + df['Low'] + df['Close']) / 3.0
    
    # 2. VWAP (Volume Weighted Average Price)
    # Intraday VWAP resets each calendar day
    dates = df.index.date
    df['DateGroup'] = dates
    
    # Compute cumulative volume and cumulative price*volume per day
    df['Vol_x_TP'] = df['Typical_Price'] * df['Volume']
    df['Cum_Vol'] = df.groupby('DateGroup')['Volume'].cumsum()
    df['Cum_Vol_TP'] = df.groupby('DateGroup')['Vol_x_TP'].cumsum()
    
    # Avoid division by zero
    df['VWAP'] = np.where(df['Cum_Vol'] > 0, df['Cum_Vol_TP'] / df['Cum_Vol'], df['Typical_Price'])
    
    # VWAP Standard Deviation Bands
    # Deviation = sqrt( cumsum(Vol * (TP - VWAP)^2) / cumsum(Vol) )
    df['Dev_Sq'] = df['Volume'] * ((df['Typical_Price'] - df['VWAP']) ** 2)
    df['Cum_Dev_Sq'] = df.groupby('DateGroup')['Dev_Sq'].cumsum()
    df['VWAP_Std'] = np.where(df['Cum_Vol'] > 0, np.sqrt(df['Cum_Dev_Sq'] / df['Cum_Vol']), 0.0)
    df['VWAP_Upper'] = df['VWAP'] + (1.5 * df['VWAP_Std'])
    df['VWAP_Lower'] = df['VWAP'] - (1.5 * df['VWAP_Std'])
    
    # Clean up intermediate cols
    df.drop(columns=['DateGroup', 'Vol_x_TP', 'Cum_Vol', 'Cum_Vol_TP', 'Dev_Sq', 'Cum_Dev_Sq'], inplace=True, errors='ignore')

    # 3. Exponential Moving Averages (EMA 9, 21, 50)
    df['EMA9'] = df['Close'].ewm(span=9, adjust=False).mean()
    df['EMA21'] = df['Close'].ewm(span=21, adjust=False).mean()
    df['EMA50'] = df['Close'].ewm(span=50, adjust=False).mean()

    # 4. Relative Strength Index (RSI 14)
    delta = df['Close'].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    
    # Wilder's exponential smoothing
    avg_gain = gain.ewm(alpha=1/14, min_periods=1, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/14, min_periods=1, adjust=False).mean()
    rs = avg_gain / (avg_loss.replace(0, np.nan))
    df['RSI'] = 100 - (100 / (1 + rs))
    df['RSI'] = df['RSI'].fillna(50.0)

    # 5. Volume Moving Average (20) & Relative Volume (RVOL)
    df['Vol_MA20'] = df['Volume'].rolling(window=20, min_periods=1).mean()
    df['RVOL'] = np.where(df['Vol_MA20'] > 0, df['Volume'] / df['Vol_MA20'], 1.0)
    
    # 6. Average True Range (ATR 14)
    high_low = df['High'] - df['Low']
    high_close_prev = (df['High'] - df['Close'].shift(1)).abs()
    low_close_prev = (df['Low'] - df['Close'].shift(1)).abs()
    tr = pd.concat([high_low, high_close_prev, low_close_prev], axis=1).max(axis=1)
    df['ATR14'] = tr.rolling(window=14, min_periods=1).mean()
    df['ATR14'] = df['ATR14'].bfill().fillna(df['Close'] * 0.005)

    # 7. Opening Range (First 15 bars of session)
    # Mark first 15 bars per session
    session_dates = df.index.date
    df['SessionDate'] = session_dates
    # Calculate ORB per day
    orb_highs = {}
    orb_lows = {}
    for dt, group in df.groupby('SessionDate'):
        first_15 = group.iloc[:15]
        orb_highs[dt] = first_15['High'].max()
        orb_lows[dt] = first_15['Low'].min()
    
    df['ORB_High'] = df['SessionDate'].map(orb_highs)
    df['ORB_Low'] = df['SessionDate'].map(orb_lows)
    df.drop(columns=['SessionDate'], inplace=True, errors='ignore')

    return df


def analyze_stock_setup(ticker: str, df: pd.DataFrame, company_name: str = "") -> Dict[str, Any]:
    """
    Evaluates intraday technical setup, generates trade rationale,
    calculates Stop Loss, Target 1, Target 2, Target 3, and scoring.
    """
    if df.empty or len(df) < 3:
        return {
            "ticker": ticker,
            "status": "INSUFFICIENT_DATA",
            "message": "Not enough 1-minute bars available for analysis"
        }

    # Extract latest bars
    last_idx = -1
    curr = df.iloc[last_idx]
    prev = df.iloc[last_idx - 1] if len(df) > 1 else curr
    
    close = float(curr['Close'])
    curr_date = curr.name.date() if hasattr(curr.name, 'date') else df.index.date[-1]
    today_bars = df[df.index.date == curr_date]
    open_price = float(today_bars.iloc[0]['Open']) if not today_bars.empty else float(df.iloc[0]['Open'])
    day_high = float(today_bars['High'].max()) if not today_bars.empty else float(df['High'].max())
    day_low = float(today_bars['Low'].min()) if not today_bars.empty else float(df['Low'].min())
    day_change_pct = ((close - open_price) / open_price) * 100.0 if open_price > 0 else 0.0

    vwap = float(curr.get('VWAP', close))
    vwap_upper = float(curr.get('VWAP_Upper', vwap * 1.005))
    vwap_lower = float(curr.get('VWAP_Lower', vwap * 0.995))
    ema9 = float(curr.get('EMA9', close))
    ema21 = float(curr.get('EMA21', close))
    ema50 = float(curr.get('EMA50', close))
    rsi = float(curr.get('RSI', 50.0))
    atr = float(curr.get('ATR14', close * 0.005))
    rvol = float(curr.get('RVOL', 1.0))
    volume = float(curr.get('Volume', 0))
    vol_ma20 = float(curr.get('Vol_MA20', volume))
    orb_high = float(curr['ORB_High']) if ('ORB_High' in curr and not pd.isna(curr['ORB_High'])) else day_high
    orb_low = float(curr['ORB_Low']) if ('ORB_Low' in curr and not pd.isna(curr['ORB_Low'])) else day_low

    # 10-bar recent swing low and swing high
    recent_len = min(10, len(df))
    recent_10 = df.iloc[-recent_len:]
    recent_swing_low = float(recent_10['Low'].min())
    recent_swing_high = float(recent_10['High'].max())

    # --- TECHNICAL SCORING SYSTEM (-100 to +100) ---
    score = 0
    checks = []
    
    # 1. VWAP Structure
    vwap_diff_pct = ((close - vwap) / vwap) * 100.0 if vwap > 0 else 0.0
    if close > vwap:
        if vwap_diff_pct > 0.15:
            score += 25
            checks.append({
                "factor": "VWAP Alignment",
                "status": "Bullish",
                "score": "+25",
                "detail": f"Price ₹{close:,.2f} is {vwap_diff_pct:+.2f}% above institutional VWAP (₹{vwap:,.2f}), confirming buyer dominance."
            })
        else:
            score += 15
            checks.append({
                "factor": "VWAP Alignment",
                "status": "Mildly Bullish",
                "score": "+15",
                "detail": f"Price hovering just above VWAP (₹{vwap:,.2f}), potential launchpad for intraday expansion."
            })
    else:
        if vwap_diff_pct < -0.15:
            score -= 25
            checks.append({
                "factor": "VWAP Alignment",
                "status": "Bearish",
                "score": "-25",
                "detail": f"Price ₹{close:,.2f} is {vwap_diff_pct:.2f}% below VWAP (₹{vwap:,.2f}), showing persistent seller supply."
            })
        else:
            score -= 15
            checks.append({
                "factor": "VWAP Alignment",
                "status": "Mildly Bearish",
                "score": "-15",
                "detail": f"Price is trapped below VWAP (₹{vwap:,.2f}), facing overhead supply."
            })

    # 2. Moving Average Alignment (EMA Ribbon 9 / 21 / 50)
    ema_bullish_stack = (close > ema9) and (ema9 > ema21) and (ema21 > ema50)
    ema_bearish_stack = (close < ema9) and (ema9 < ema21) and (ema21 < ema50)
    
    if ema_bullish_stack:
        score += 25
        checks.append({
            "factor": "EMA Ribbon",
            "status": "Bullish Stack",
            "score": "+25",
            "detail": f"Perfect Bullish Trend Stack: Price > 9 EMA (₹{ema9:,.2f}) > 21 EMA (₹{ema21:,.2f}) > 50 EMA (₹{ema50:,.2f})."
        })
    elif ema_bearish_stack:
        score -= 25
        checks.append({
            "factor": "EMA Ribbon",
            "status": "Bearish Stack",
            "score": "-25",
            "detail": f"Bearish Trend Stack: Price < 9 EMA (₹{ema9:,.2f}) < 21 EMA (₹{ema21:,.2f}) < 50 EMA (₹{ema50:,.2f})."
        })
    elif close > ema21 and ema9 > ema21:
        score += 12
        checks.append({
            "factor": "EMA Ribbon",
            "status": "Moderate Bullish",
            "score": "+12",
            "detail": f"Short-term momentum positive with 9 EMA above 21 EMA."
        })
    elif close < ema21 and ema9 < ema21:
        score -= 12
        checks.append({
            "factor": "EMA Ribbon",
            "status": "Moderate Bearish",
            "score": "-12",
            "detail": f"Short-term momentum negative with 9 EMA below 21 EMA."
        })
    else:
        checks.append({
            "factor": "EMA Ribbon",
            "status": "Neutral / Sideways",
            "score": "0",
            "detail": "Moving averages are converging; price is in intraday consolidation."
        })

    # 3. Volume & RVOL (Relative Volume Surge)
    if rvol >= 2.0:
        if close >= prev['Close']:
            score += 20
            checks.append({
                "factor": "Volume & RVOL",
                "status": "High Volume Surge",
                "score": "+20",
                "detail": f"Institutional Volume Surge! RVOL is {rvol:.2f}x (current 1m volume {volume:,.0f} vs avg {vol_ma20:,.0f})."
            })
        else:
            score -= 20
            checks.append({
                "factor": "Volume & RVOL",
                "status": "High Volume Selloff",
                "score": "-20",
                "detail": f"Heavy Institutional Selling! RVOL is {rvol:.2f}x on down candle."
            })
    elif rvol >= 1.3:
        if close >= prev['Close']:
            score += 12
            checks.append({
                "factor": "Volume & RVOL",
                "status": "Above Average Volume",
                "score": "+12",
                "detail": f"Healthy buying volume expansion with RVOL at {rvol:.2f}x."
            })
        else:
            score -= 12
            checks.append({
                "factor": "Volume & RVOL",
                "status": "Above Average Selling",
                "score": "-12",
                "detail": f"Selling pressure confirmed by RVOL at {rvol:.2f}x."
            })
    else:
        checks.append({
            "factor": "Volume & RVOL",
            "status": "Average / Low Volume",
            "score": "0",
            "detail": f"RVOL at {rvol:.2f}x (normal liquidity, awaiting volume ignition)."
        })

    # 4. Momentum Oscillators (RSI 14)
    if 55.0 <= rsi <= 72.0:
        score += 15
        checks.append({
            "factor": "RSI Momentum",
            "status": "Bullish Sweetspot",
            "score": "+15",
            "detail": f"RSI is {rsi:.1f} in prime intraday expansion zone (55–72) without being overextended."
        })
    elif rsi > 72.0:
        score += 8  # Still bullish but risk of pullback
        checks.append({
            "factor": "RSI Momentum",
            "status": "Overbought Caution",
            "score": "+8",
            "detail": f"RSI is {rsi:.1f} (Overbought > 72); strong momentum but wait for pullback to 9 EMA for entry."
        })
    elif 28.0 <= rsi <= 45.0:
        score -= 15
        checks.append({
            "factor": "RSI Momentum",
            "status": "Bearish Pressure",
            "score": "-15",
            "detail": f"RSI is {rsi:.1f} in strong bearish continuation zone (28–45)."
        })
    elif rsi < 28.0:
        score -= 8
        checks.append({
            "factor": "RSI Momentum",
            "status": "Oversold Caution",
            "score": "-8",
            "detail": f"RSI is {rsi:.1f} (Oversold < 28); extreme weakness with potential for mean reversion bounce."
        })
    else:
        checks.append({
            "factor": "RSI Momentum",
            "status": "Neutral (45-55)",
            "score": "0",
            "detail": f"RSI is {rsi:.1f} in equilibrium zone; awaiting directional breakout."
        })

    # 5. Breakout Structure (ORB & Day High/Low)
    is_orb_breakout = close >= (orb_high * 0.999)
    is_orb_breakdown = close <= (orb_low * 1.001)
    near_day_high = close >= (day_high * 0.997)
    near_day_low = close <= (day_low * 1.003)

    if near_day_high:
        score += 15
        checks.append({
            "factor": "Breakout / Range",
            "status": "Day High Breakout",
            "score": "+15",
            "detail": f"Trading within 0.3% of High of the Day (Day High ₹{day_high:,.2f}), clear continuation setup."
        })
    elif is_orb_breakout:
        score += 12
        checks.append({
            "factor": "Breakout / Range",
            "status": "ORB Breakout",
            "score": "+12",
            "detail": f"Trading above 15-Minute Opening Range High (₹{orb_high:,.2f})."
        })
    elif near_day_low:
        score -= 15
        checks.append({
            "factor": "Breakout / Range",
            "status": "Day Low Breakdown",
            "score": "-15",
            "detail": f"Trading within 0.3% of Low of the Day (Day Low ₹{day_low:,.2f}), aggressive downside pressure."
        })
    elif is_orb_breakdown:
        score -= 12
        checks.append({
            "factor": "Breakout / Range",
            "status": "ORB Breakdown",
            "score": "-12",
            "detail": f"Trading below 15-Minute Opening Range Low (₹{orb_low:,.2f})."
        })
    else:
        checks.append({
            "factor": "Breakout / Range",
            "status": "Within Range",
            "score": "0",
            "detail": f"Trading inside Opening Range (ORB Low ₹{orb_low:,.2f} - ORB High ₹{orb_high:,.2f})."
        })

    # Normalize score between -100 and +100
    score = max(-100, min(100, score))
    
    # Intraday Normalized Score (0 to 100) for UI display
    display_score = int(round((score + 100) / 2))

    # --- SIGNAL DETERMINATION ---
    if score >= 65:
        signal = "STRONG BUY"
        action = "LONG"
        color = "#10B981"  # Emerald Green
    elif score >= 35:
        signal = "BUY"
        action = "LONG"
        color = "#34D399"
    elif score <= -65:
        signal = "STRONG SELL"
        action = "SHORT"
        color = "#EF4444"  # Red
    elif score <= -35:
        signal = "SELL"
        action = "SHORT"
        color = "#F87171"
    else:
        signal = "NEUTRAL"
        action = "WATCH"
        color = "#9CA3AF"  # Gray

    # --- SETUP IDENTIFICATION ---
    if action == "LONG":
        if near_day_high and rvol >= 1.5:
            setup_name = "Day-High Momentum Breakout"
            setup_desc = "Stock is attacking Day High with heavy institutional volume surge."
        elif is_orb_breakout:
            setup_name = "15-Min Opening Range Breakout (ORB High)"
            setup_desc = "Clean expansion above the initial 15-minute high with trend continuation."
        elif close > vwap and prev['Close'] <= prev['VWAP']:
            setup_name = "Bullish VWAP Reclaim"
            setup_desc = "Price successfully recovered above VWAP from below with aggressive buyer absorbsion."
        elif (close - ema21) / ema21 < 0.003 and close > ema21:
            setup_name = "EMA 21 Trend Pullback Bounce"
            setup_desc = "Healthy shallow pullback to 21 EMA support followed by green reversal bar."
        else:
            setup_name = "Intraday Trend Continuation (Long)"
            setup_desc = "Price maintains consistent higher-high / higher-low structure above VWAP."
    elif action == "SHORT":
        if near_day_low and rvol >= 1.5:
            setup_name = "Day-Low Breakdown"
            setup_desc = "Stock breaking fresh Day Lows with volume selling pressure."
        elif is_orb_breakdown:
            setup_name = "15-Min Opening Range Breakdown (ORB Low)"
            setup_desc = "Price slipped below the initial 15-minute low indicating strong supply."
        elif close < vwap and prev['Close'] >= prev['VWAP']:
            setup_name = "Bearish VWAP Breakdown"
            setup_desc = "Failed VWAP defense; buyers trapped as price sinks under VWAP."
        else:
            setup_name = "Intraday Trend Continuation (Short)"
            setup_desc = "Sustained downward momentum with resistance at 9/21 EMA."
    else:
        setup_name = "Range Consolidation / No Direction"
        setup_desc = "Price oscillating around VWAP without decisive volume impulse."

    # --- CALCULATE PRECISE STOP LOSS & TARGETS ---
    # Intraday risk rules:
    # Stop loss must be structurally placed behind key levels (VWAP, recent swing low/high, or 1.5x ATR).
    # Risk per share is bounded to realistic intraday volatility (0.3% - 1.5%).
    entry_price = round(close, 2)
    atr_val = max(atr, close * 0.002)  # Floor ATR at 0.2%

    if action in ["LONG", "WATCH"]:
        # Primary SL candidate 1: Swing low of last 10 candles with a tiny buffer
        cand_sl1 = recent_swing_low - (0.2 * atr_val)
        # Primary SL candidate 2: Just below VWAP (if close is above VWAP)
        cand_sl2 = vwap - (0.3 * atr_val) if close > vwap else (entry_price - 1.5 * atr_val)
        # Volatility SL candidate 3: Entry - 1.5x ATR
        cand_sl3 = entry_price - (1.5 * atr_val)

        # We take the nearest logical structural support level, but at least 0.4% away
        chosen_sl = max(cand_sl1, cand_sl2)
        # Guardrails: Ensure risk is not too tiny (< 0.25%) or too loose (> 2.0%)
        min_sl = entry_price * 0.980  # Max 2% loss
        max_sl = entry_price * 0.9975 # Min 0.25% buffer
        sl_price = round(min(max(chosen_sl, min_sl), max_sl), 2)

        risk_amount = round(entry_price - sl_price, 2)
        if risk_amount <= 0:
            risk_amount = round(atr_val * 1.5, 2)
            sl_price = round(entry_price - risk_amount, 2)

        sl_pct = round(((sl_price - entry_price) / entry_price) * 100.0, 2)

        # Targets based on Risk Multiple:
        # Target 1 (Scalp / Partial Profit Booking at 1:1.5 R:R)
        t1_price = round(entry_price + (1.5 * risk_amount), 2)
        t1_pct = round(((t1_price - entry_price) / entry_price) * 100.0, 2)

        # Target 2 (Main Day Target at 1:2.5 R:R, or Day High + expansion)
        t2_price = round(max(entry_price + (2.5 * risk_amount), day_high + (0.5 * atr_val) if day_high > entry_price else entry_price + (2.5 * risk_amount)), 2)
        t2_pct = round(((t2_price - entry_price) / entry_price) * 100.0, 2)

        # Target 3 (Trend Runner at 1:3.5 R:R)
        t3_price = round(entry_price + (3.5 * risk_amount), 2)
        t3_pct = round(((t3_price - entry_price) / entry_price) * 100.0, 2)

        rrr = "1 : 2.5"

    else:  # SHORT
        cand_sl1 = recent_swing_high + (0.2 * atr_val)
        cand_sl2 = vwap + (0.3 * atr_val) if close < vwap else (entry_price + 1.5 * atr_val)
        chosen_sl = min(cand_sl1, cand_sl2)
        
        min_sl = entry_price * 1.0025 # Min 0.25% buffer
        max_sl = entry_price * 1.020  # Max 2% loss
        sl_price = round(max(min(chosen_sl, max_sl), min_sl), 2)

        risk_amount = round(sl_price - entry_price, 2)
        if risk_amount <= 0:
            risk_amount = round(atr_val * 1.5, 2)
            sl_price = round(entry_price + risk_amount, 2)

        sl_pct = round(((sl_price - entry_price) / entry_price) * 100.0, 2)

        # Targets for Short
        t1_price = round(entry_price - (1.5 * risk_amount), 2)
        t1_pct = round(((t1_price - entry_price) / entry_price) * 100.0, 2)

        t2_price = round(min(entry_price - (2.5 * risk_amount), day_low - (0.5 * atr_val) if day_low < entry_price else entry_price - (2.5 * risk_amount)), 2)
        t2_pct = round(((t2_price - entry_price) / entry_price) * 100.0, 2)

        t3_price = round(entry_price - (3.5 * risk_amount), 2)
        t3_pct = round(((t3_price - entry_price) / entry_price) * 100.0, 2)

        rrr = "1 : 2.5"

    # --- SYNTHESIZE EXPERT CHART ANALYSIS RATIONALE ---
    currency_symbol = "₹" if (".NS" in ticker or ".BO" in ticker) else "$"
    
    rationale_points = [
        f"**1. Trend & VWAP Structure**: Trading at {currency_symbol}{close:,.2f} ({vwap_diff_pct:+.2f}% vs VWAP {currency_symbol}{vwap:,.2f}). EMA 9 ({currency_symbol}{ema9:,.2f}) and EMA 21 ({currency_symbol}{ema21:,.2f}) indicate {'strong upward momentum' if ema9 > ema21 else 'downward pressure'}.",
        f"**2. Institutional Volume Flow**: RVOL is **{rvol:.2f}x** with current 1-min candle volume at {volume:,.0f} shares. {'Institutional volume accumulation confirms buying interest.' if rvol >= 1.5 and close >= prev['Close'] else 'Volume aligns with current momentum.'}",
        f"**3. Price Action & Range**: Day High is {currency_symbol}{day_high:,.2f} and Day Low is {currency_symbol}{day_low:,.2f}. 15-Min Opening Range: {currency_symbol}{orb_low:,.2f} - {currency_symbol}{orb_high:,.2f}. Setup: **{setup_name}**.",
        f"**4. Momentum (RSI 14)**: RSI is currently **{rsi:.1f}**. {'Optimal bullish trajectory, plenty of headroom before overbought exhaustion.' if 50 <= rsi <= 72 else ('High momentum, watch for pullback' if rsi > 72 else 'Bearish momentum dominance.')}",
        f"**5. Volatility & Stop Loss Rule**: 1-minute ATR is {currency_symbol}{atr_val:,.2f}. Strict Stop Loss placed at **{currency_symbol}{sl_price:,.2f}** ({sl_pct:+.2f}% risk), safely anchored below key structural support (Swing Low / VWAP buffer).",
        f"**6. Target Projections**: Target 1 at **{currency_symbol}{t1_price:,.2f}** ({t1_pct:+.2f}%, 1:1.5 R:R); Target 2 at **{currency_symbol}{t2_price:,.2f}** ({t2_pct:+.2f}%, 1:2.5 R:R); Target 3 runner at **{currency_symbol}{t3_price:,.2f}** ({t3_pct:+.2f}%)."
    ]

    roi_pct = round(abs(t2_pct), 2)

    trade_plan = {
        "action": action,
        "entry_range": f"{currency_symbol}{entry_price * 0.999:,.2f} - {currency_symbol}{entry_price * 1.001:,.2f}",
        "entry_price": entry_price,
        "stop_loss": sl_price,
        "stop_loss_pct": sl_pct,
        "target_1": t1_price,
        "target_1_pct": t1_pct,
        "target_2": t2_price,
        "target_2_pct": t2_pct,
        "target_3": t3_price,
        "target_3_pct": t3_pct,
        "roi_pct": roi_pct,
        "t1_roi_pct": round(abs(t1_pct), 2),
        "t2_roi_pct": round(abs(t2_pct), 2),
        "t3_roi_pct": round(abs(t3_pct), 2),
        "risk_reward_ratio": rrr,
        "risk_per_share": risk_amount,
        "execution_strategy": f"Book 50% position at Target 1 ({currency_symbol}{t1_price:,.2f}), trail Stop Loss to Cost/Entry ({currency_symbol}{entry_price:,.2f}), and ride remaining 50% towards Target 2 ({currency_symbol}{t2_price:,.2f})."
    }

    # Compute Multi-Timeframe Alignment
    mtf_data = compute_mtf_alignment(df)

    # Detect visual chart markers for patterns & triggers
    markers = detect_candlestick_patterns_and_markers(df, action=action)

    return {
        "ticker": ticker,
        "company_name": company_name or ticker,
        "currency_symbol": currency_symbol,
        "timestamp": int(curr.name.timestamp()) if hasattr(curr.name, 'timestamp') else 0,
        "time_str": curr.name.strftime('%Y-%m-%d %H:%M:%S') if hasattr(curr.name, 'strftime') else str(curr.name),
        "price": entry_price,
        "change_pct": round(day_change_pct, 2),
        "day_high": day_high,
        "day_low": day_low,
        "vwap": round(vwap, 2),
        "vwap_upper": round(vwap_upper, 2),
        "vwap_lower": round(vwap_lower, 2),
        "ema9": round(ema9, 2),
        "ema21": round(ema21, 2),
        "ema50": round(ema50, 2),
        "rsi": round(rsi, 1),
        "atr": round(atr_val, 2),
        "rvol": round(rvol, 2),
        "volume": int(volume),
        "score": score,
        "display_score": display_score,
        "signal": signal,
        "roi_pct": roi_pct,
        "color": color,
        "setup_name": setup_name,
        "setup_desc": setup_desc,
        "checks": checks,
        "rationale_points": rationale_points,
        "trade_plan": trade_plan,
        "mtf_alignment": mtf_data,
        "chart_markers": markers
    }


def detect_candlestick_patterns_and_markers(df: pd.DataFrame, action: str = "LONG") -> List[Dict[str, Any]]:
    """
    Detects key institutional candlestick patterns and returns visual markers
    formatted for TradingView Lightweight Charts.
    """
    if df.empty or len(df) < 5:
        return []

    markers = []
    highs = df['High'].values
    lows = df['Low'].values
    opens = df['Open'].values
    closes = df['Close'].values
    rvols = df['RVOL'].values if 'RVOL' in df.columns else np.ones(len(df))
    timestamps = [int(idx.timestamp()) if hasattr(idx, 'timestamp') else 0 for idx in df.index]

    running_max_high = np.maximum.accumulate(highs)
    running_min_low = np.minimum.accumulate(lows)

    for i in range(1, len(df)):
        o = opens[i]
        h = highs[i]
        l = lows[i]
        c = closes[i]
        t = timestamps[i]
        if t <= 0:
            continue

        po = opens[i - 1]
        pc = closes[i - 1]
        body = abs(c - o)
        prev_body = abs(pc - po)
        lower_shadow = min(o, c) - l
        upper_shadow = h - max(o, c)
        rvol = rvols[i]

        # 1. High-Volume Breakout Bar
        if rvol >= 2.2 and c > o and i > 15:
            if c >= running_max_high[i - 1] * 0.9995:
                markers.append({
                    "time": t,
                    "position": "belowBar",
                    "color": "#10b981",
                    "shape": "arrowUp",
                    "text": f"BREAKOUT ({rvol:.1f}x)"
                })
                continue
            elif c <= running_min_low[i - 1] * 1.0005 and c < o:
                markers.append({
                    "time": t,
                    "position": "aboveBar",
                    "color": "#ef4444",
                    "shape": "arrowDown",
                    "text": f"BREAKDOWN ({rvol:.1f}x)"
                })
                continue

        # 2. Bullish Engulfing
        if pc < po and c > o and o <= pc and c >= po and body > prev_body * 1.1:
            if rvol >= 1.2:
                markers.append({
                    "time": t,
                    "position": "belowBar",
                    "color": "#34d399",
                    "shape": "circle",
                    "text": "BULL ENGULF"
                })
                continue

        # 3. Bearish Engulfing
        if pc > po and c < o and o >= pc and c <= po and body > prev_body * 1.1:
            if rvol >= 1.2:
                markers.append({
                    "time": t,
                    "position": "aboveBar",
                    "color": "#f87171",
                    "shape": "circle",
                    "text": "BEAR ENGULF"
                })
                continue

        # 4. Hammer Reversal
        if lower_shadow >= 1.8 * body and upper_shadow <= 0.35 * body and body > (c * 0.0003):
            if c > o:
                markers.append({
                    "time": t,
                    "position": "belowBar",
                    "color": "#10b981",
                    "shape": "arrowUp",
                    "text": "HAMMER"
                })
                continue

        # 5. Shooting Star Reversal
        if upper_shadow >= 1.8 * body and lower_shadow <= 0.35 * body and body > (c * 0.0003):
            if c < o:
                markers.append({
                    "time": t,
                    "position": "aboveBar",
                    "color": "#ef4444",
                    "shape": "arrowDown",
                    "text": "SHOOTING STAR"
                })
                continue

    # Add Latest Trigger marker on the latest candle
    last_t = timestamps[-1]
    if action == "LONG":
        markers.append({
            "time": last_t,
            "position": "belowBar",
            "color": "#10b981",
            "shape": "arrowUp",
            "text": "BUY ZONE"
        })
    elif action == "SHORT":
        markers.append({
            "time": last_t,
            "position": "aboveBar",
            "color": "#ef4444",
            "shape": "arrowDown",
            "text": "SHORT ZONE"
        })

    # Sort markers strictly by time and ensure unique timestamps
    markers.sort(key=lambda m: m["time"])
    unique_markers = []
    seen_times = set()
    for m in markers:
        if m["time"] not in seen_times:
            unique_markers.append(m)
            seen_times.add(m["time"])

    return unique_markers


def compute_mtf_alignment(df_1m: pd.DataFrame) -> Dict[str, Any]:
    """
    Computes multi-timeframe alignment across 1m, 5m, and 15m intervals.
    """
    if df_1m.empty or len(df_1m) < 15:
        return {
            "confluence_level": "NEUTRAL",
            "confluence_score": "1/3",
            "badge_color": "#94a3b8",
            "verdict": "Awaiting sufficient intraday bars to compute MTF alignment.",
            "timeframes": {}
        }

    last_1m = df_1m.iloc[-1]
    close_1m = float(last_1m['Close'])
    vwap_1m = float(last_1m.get('VWAP', close_1m))
    rsi_1m = float(last_1m.get('RSI', 50.0))
    ema9_1m = float(last_1m.get('EMA9', close_1m))
    ema21_1m = float(last_1m.get('EMA21', close_1m))

    bias_1m = "BULLISH" if (close_1m > vwap_1m and ema9_1m > ema21_1m) else ("BEARISH" if (close_1m < vwap_1m and ema9_1m < ema21_1m) else "NEUTRAL")

    # 5-min resample
    agg_rules = {'Open': 'first', 'High': 'max', 'Low': 'min', 'Close': 'last', 'Volume': 'sum'}
    df_5m = df_1m.resample('5min').agg(agg_rules).dropna()
    df_5m = calculate_intraday_indicators(df_5m)
    
    if not df_5m.empty and 'VWAP' in df_5m.columns:
        last_5m = df_5m.iloc[-1]
        close_5m = float(last_5m['Close'])
        vwap_5m = float(last_5m.get('VWAP', close_5m))
        rsi_5m = float(last_5m.get('RSI', 50.0))
        ema9_5m = float(last_5m.get('EMA9', close_5m))
        ema21_5m = float(last_5m.get('EMA21', close_5m))
        bias_5m = "BULLISH" if (close_5m > vwap_5m and ema9_5m > ema21_5m) else ("BEARISH" if (close_5m < vwap_5m and ema9_5m < ema21_5m) else "NEUTRAL")
    else:
        close_5m, vwap_5m, rsi_5m, bias_5m = close_1m, vwap_1m, rsi_1m, bias_1m

    # 15-min resample
    df_15m = df_1m.resample('15min').agg(agg_rules).dropna()
    df_15m = calculate_intraday_indicators(df_15m)
    
    if not df_15m.empty and 'VWAP' in df_15m.columns:
        last_15m = df_15m.iloc[-1]
        close_15m = float(last_15m['Close'])
        vwap_15m = float(last_15m.get('VWAP', close_15m))
        rsi_15m = float(last_15m.get('RSI', 50.0))
        ema9_15m = float(last_15m.get('EMA9', close_15m))
        ema21_15m = float(last_15m.get('EMA21', close_15m))
        bias_15m = "BULLISH" if (close_15m > vwap_15m and ema9_15m > ema21_15m) else ("BEARISH" if (close_15m < vwap_15m and ema9_15m < ema21_15m) else "NEUTRAL")
    else:
        close_15m, vwap_15m, rsi_15m, bias_15m = close_5m, vwap_5m, rsi_5m, bias_5m

    # Confluence calculation
    bulls = [b == "BULLISH" for b in [bias_1m, bias_5m, bias_15m]].count(True)
    bears = [b == "BEARISH" for b in [bias_1m, bias_5m, bias_15m]].count(True)

    if bulls == 3:
        confluence_level = "FULL BULLISH ALIGNMENT"
        confluence_score = "3/3 High Conviction"
        badge_color = "#10b981"
        verdict = "All 3 Timeframes (1m, 5m, 15m) are in Bullish Trend alignment above VWAP. Maximum probability institutional setup."
    elif bears == 3:
        confluence_level = "FULL BEARISH ALIGNMENT"
        confluence_score = "3/3 High Conviction"
        badge_color = "#ef4444"
        verdict = "All 3 Timeframes are in Bearish Trend alignment below VWAP. High conviction short setup."
    elif bulls == 2:
        confluence_level = "MODERATE BULLISH CONFLUENCE"
        confluence_score = "2/3 Good Confluence"
        badge_color = "#34d399"
        verdict = "2 of 3 Timeframes confirm bullish momentum; watch for pullback retests to 21 EMA."
    elif bears == 2:
        confluence_level = "MODERATE BEARISH CONFLUENCE"
        confluence_score = "2/3 Good Confluence"
        badge_color = "#f87171"
        verdict = "2 of 3 Timeframes confirm downward supply pressure."
    else:
        confluence_level = "MIXED / CONFLICTED"
        confluence_score = "1/3 Low Confluence"
        badge_color = "#94a3b8"
        verdict = "Timeframes are out of sync (chop/consolidation). Wait for higher timeframe breakout."

    return {
        "confluence_level": confluence_level,
        "confluence_score": confluence_score,
        "badge_color": badge_color,
        "verdict": verdict,
        "timeframes": {
            "1m": { "bias": bias_1m, "vwap": round(vwap_1m, 2), "rsi": round(rsi_1m, 1) },
            "5m": { "bias": bias_5m, "vwap": round(vwap_5m, 2), "rsi": round(rsi_5m, 1) },
            "15m": { "bias": bias_15m, "vwap": round(vwap_15m, 2), "rsi": round(rsi_15m, 1) }
        }
    }

