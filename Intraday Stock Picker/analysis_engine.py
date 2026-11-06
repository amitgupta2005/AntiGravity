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
from datetime import datetime, time as dt_time
import pytz

# Risk-Management Guardrail Defaults
DEFAULT_MIN_LIQUIDITY_VOL_MA = 15000.0  # Min 1-minute volume MA (shares)
DEFAULT_MAX_ATR_PCT = 1.5               # Max 1-minute ATR as % of price


def calculate_intraday_indicators(df: pd.DataFrame, light: bool = False) -> pd.DataFrame:
    """
    Computes intraday technical indicators on an OHLCV DataFrame.
    When light=True (used during multi-timeframe resampled checks), calculates only
    essential directional indicators (VWAP, EMA9, EMA21, RSI) for 3-5x faster processing
    and minimal memory allocation.
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
    
    if not light:
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
    if not light:
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

    if not light:
        # 5. Volume Moving Average (20) & Relative Volume (RVOL)
        df['Vol_MA20'] = df['Volume'].rolling(window=20, min_periods=1).mean()
        df['RVOL'] = np.where(df['Vol_MA20'] > 0, df['Volume'] / df['Vol_MA20'], 1.0)
        
        # 6. Average True Range (ATR 14) - Vectorized with zero intermediate DataFrame allocations
        high_low = (df['High'] - df['Low']).values
        high_close_prev = (df['High'] - df['Close'].shift(1)).abs().values
        low_close_prev = (df['Low'] - df['Close'].shift(1)).abs().values
        tr = np.maximum(high_low, np.maximum(high_close_prev, low_close_prev))
        df['ATR14'] = pd.Series(tr, index=df.index).rolling(window=14, min_periods=1).mean()
        df['ATR14'] = df['ATR14'].bfill().fillna(df['Close'] * 0.005)

        # 7. ADX 14 (Average Directional Index) for Macro Trend Regime Filtering
        up_move = df['High'].diff()
        down_move = -df['Low'].diff()
        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)
        atr_series = df['ATR14'].replace(0, np.nan)
        plus_di = 100 * (pd.Series(plus_dm, index=df.index).ewm(alpha=1/14, min_periods=1).mean() / atr_series)
        minus_di = 100 * (pd.Series(minus_dm, index=df.index).ewm(alpha=1/14, min_periods=1).mean() / atr_series)
        dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
        df['ADX14'] = dx.ewm(alpha=1/14, min_periods=1).mean().fillna(20.0)

        # 8. Opening Range (First 15 bars of session) - Fast path for single session
        session_dates = df.index.date
        unique_dates = np.unique(session_dates)
        if len(unique_dates) == 1:
            first_15 = df.iloc[:15]
            df['ORB_High'] = float(first_15['High'].max())
            df['ORB_Low'] = float(first_15['Low'].min())
        else:
            df['SessionDate'] = session_dates
            orb_highs = {}
            orb_lows = {}
            for dt, group in df.groupby('SessionDate'):
                first_15 = group.iloc[:15]
                orb_highs[dt] = float(first_15['High'].max())
                orb_lows[dt] = float(first_15['Low'].min())
            
            df['ORB_High'] = df['SessionDate'].map(orb_highs)
            df['ORB_Low'] = df['SessionDate'].map(orb_lows)
            df.drop(columns=['SessionDate'], inplace=True, errors='ignore')

    return df


def analyze_stock_setup(
    ticker: str,
    df: pd.DataFrame,
    company_name: str = "",
    cap: str = "LARGE",
    min_liquidity_vol_ma: float = DEFAULT_MIN_LIQUIDITY_VOL_MA,
    max_atr_pct: float = DEFAULT_MAX_ATR_PCT,
    feed_source: str = "YAHOO_FINANCE",
    live_quote: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Evaluates intraday technical setup, generates trade rationale,
    calculates Stop Loss, Target 1, Target 2, Target 3, and scoring.
    """
    if df.empty or len(df) < 3:
        return {
            "ticker": ticker,
            "company_name": company_name or ticker,
            "cap": cap,
            "status": "INSUFFICIENT_DATA",
            "message": "Not enough 1-minute bars available for analysis"
        }

    # Extract latest bars
    last_idx = -1
    curr = df.iloc[last_idx]
    prev = df.iloc[last_idx - 1] if len(df) > 1 else curr
    
    close = float(curr['Close'])
    curr_date = curr.name.date() if hasattr(curr.name, 'date') else df.index.date[-1]
    if hasattr(df.index[0], 'date') and df.index[0].date() == curr_date:
        today_bars = df
    else:
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
    adx14 = float(curr.get('ADX14', 20.0))
    rvol = float(curr.get('RVOL', 1.0))
    volume = float(curr.get('Volume', 0))
    vol_ma20 = float(curr.get('Vol_MA20', volume))
    if pd.isna(vol_ma20) or vol_ma20 <= 0:
        vol_ma20 = float(volume)
    orb_high = float(curr['ORB_High']) if ('ORB_High' in curr and not pd.isna(curr['ORB_High'])) else day_high
    orb_low = float(curr['ORB_Low']) if ('ORB_Low' in curr and not pd.isna(curr['ORB_Low'])) else day_low

    # 1. Hard Liquidity Floor & Volatility Risk Checks
    # Check share volume and turnover (to accommodate high-priced midcaps like DIXON, POLYCAB, PAGEIND, etc.)
    is_inr = (".NS" in ticker or ".BO" in ticker)
    curr_sym = "₹" if is_inr else "$"
    currency_symbol = curr_sym
    min_turnover = 250000.0 if is_inr else 20000.0  # ₹2.5 Lakhs/min or $20k/min
    turnover_ma = vol_ma20 * close
    has_sufficient_liquidity = (vol_ma20 >= min_liquidity_vol_ma) or (turnover_ma >= min_turnover and (vol_ma20 >= 10.0 or close >= 500.0))

    # 2. Volatility Cap
    atr_pct = (atr / close) * 100.0 if close > 0 else 0.0
    effective_max_atr = 2.5 if cap == "SMALL" else max(max_atr_pct, 1.8)
    has_acceptable_volatility = (atr_pct <= effective_max_atr)

    # 4. Factor MTF Alignment - Precompute MTF alignment before scoring section
    mtf_data = compute_mtf_alignment(df)
    bull_tfs = mtf_data.get("bull_count", 0)
    bear_tfs = mtf_data.get("bear_count", 0)
    tf_count = mtf_data.get("total_timeframes", 4)

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
    if rsi > 80.0:
        score -= 10
        checks.append({
            "factor": "RSI Momentum",
            "status": "Extreme Overbought / Climax Risk",
            "score": "-10",
            "detail": f"Extreme Overbought / Climax Risk (RSI {rsi:.1f} > 80.0); high risk of exhaustion. Advise waiting for a pullback to the 9 EMA."
        })
    elif 55.0 <= rsi <= 72.0:
        score += 15
        checks.append({
            "factor": "RSI Momentum",
            "status": "Bullish Sweetspot",
            "score": "+15",
            "detail": f"RSI is {rsi:.1f} in prime intraday expansion zone (55–72) without being overextended."
        })
    elif 72.0 < rsi <= 80.0:
        score += 8  # Still bullish momentum but approaching overbought territory
        checks.append({
            "factor": "RSI Momentum",
            "status": "Overbought Caution",
            "score": "+8",
            "detail": f"RSI is {rsi:.1f} (Overbought > 72); strong momentum but wait for pullback to 9 EMA for entry."
        })
    elif rsi < 20.0:
        score -= 10
        checks.append({
            "factor": "RSI Momentum",
            "status": "Extreme Oversold Risk",
            "score": "-10",
            "detail": f"Extreme Oversold Risk (RSI {rsi:.1f} < 20.0); extreme selling exhaustion with potential bounce/whipsaw risk."
        })
    elif 28.0 <= rsi <= 45.0:
        score -= 15
        checks.append({
            "factor": "RSI Momentum",
            "status": "Bearish Pressure",
            "score": "-15",
            "detail": f"RSI is {rsi:.1f} in strong bearish continuation zone (28–45)."
        })
    elif 20.0 <= rsi < 28.0:
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

    # 5. Breakout Structure (ORB & Day High/Low) with Decisive Confirmation Margin
    # Strict 0.15% margin + volume confirmation (RVOL >= 1.3x) to avoid entering on false wicks
    is_orb_breakout = (close >= orb_high * 1.0015) and (rvol >= 1.3) and (close >= open_price)
    is_orb_breakdown = (close <= orb_low * 0.9985) and (rvol >= 1.3) and (close <= open_price)
    near_day_high = (close >= day_high * 0.9985) and (rvol >= 1.2)
    near_day_low = (close <= day_low * 1.0015) and (rvol >= 1.2)

    # Detect Trap Conditions
    is_bear_trap_risk = (close <= orb_low * 1.001) and (close >= open_price or day_change_pct > 0)
    is_bull_trap_risk = (close >= orb_high * 0.999) and (close <= open_price or day_change_pct < -0.5)

    if near_day_high:
        score += 15
        checks.append({
            "factor": "Breakout / Range",
            "status": "Day High Breakout",
            "score": "+15",
            "detail": f"Trading within 0.15% of High of the Day (Day High {curr_sym}{day_high:,.2f}) with volume expansion (RVOL {rvol:.2f}x)."
        })
    elif is_orb_breakout:
        score += 15
        checks.append({
            "factor": "Breakout / Range",
            "status": "ORB Breakout Confirmed",
            "score": "+15",
            "detail": f"Trading decisively above 15-Min ORB High ({curr_sym}{orb_high:,.2f}) with RVOL {rvol:.2f}x >= 1.3x and green day alignment."
        })
    elif near_day_low:
        score -= 15
        checks.append({
            "factor": "Breakout / Range",
            "status": "Day Low Breakdown",
            "score": "-15",
            "detail": f"Trading within 0.15% of Low of the Day (Day Low {curr_sym}{day_low:,.2f}) with heavy volume selling (RVOL {rvol:.2f}x)."
        })
    elif is_orb_breakdown:
        score -= 15
        checks.append({
            "factor": "Breakout / Range",
            "status": "ORB Breakdown Confirmed",
            "score": "-15",
            "detail": f"Trading decisively below 15-Min ORB Low ({curr_sym}{orb_low:,.2f}) with RVOL {rvol:.2f}x >= 1.3x and red day alignment."
        })
    elif is_bear_trap_risk:
        checks.append({
            "factor": "Breakout / Range",
            "status": "Bear Trap Warning",
            "score": "+5",
            "detail": f"Price testing ORB Low ({curr_sym}{orb_low:,.2f}) but stock is positive on the day (+{day_change_pct:.2f}%). Dip-buying absorption likely; shorting blocked."
        })
    elif is_bull_trap_risk:
        checks.append({
            "factor": "Breakout / Range",
            "status": "Bull Trap Warning",
            "score": "-5",
            "detail": f"Price testing ORB High ({curr_sym}{orb_high:,.2f}) but stock is down on the day ({day_change_pct:.2f}%). Overhead supply resistance active; buying blocked."
        })
    else:
        checks.append({
            "factor": "Breakout / Range",
            "status": "Within Range",
            "score": "0",
            "detail": f"Trading inside Opening Range (ORB Low {curr_sym}{orb_low:,.2f} - ORB High {curr_sym}{orb_high:,.2f})."
        })

    # 6. Time-of-Day Execution Window
    candle_ts = curr.name
    local_time = None
    is_india_stock = bool(".NS" in ticker or ".BO" in ticker or currency_symbol == "₹")
    market_tz_name = "Asia/Kolkata" if is_india_stock else "America/New_York"
    market_tz_label = "IST" if is_india_stock else "EST"
    market_tz = pytz.timezone(market_tz_name)

    if hasattr(candle_ts, 'time'):
        try:
            if hasattr(candle_ts, 'tzinfo') and candle_ts.tzinfo is not None:
                local_time = candle_ts.astimezone(market_tz).time()
            else:
                local_time = candle_ts.time()
        except Exception:
            local_time = candle_ts.time()

    is_midday_chop = False
    is_late_session = False
    is_prime_window = False

    if local_time is not None:
        is_midday_chop = (dt_time(11, 30) <= local_time < dt_time(13, 30))
        is_late_session = (local_time >= dt_time(14, 45))
        is_prime_window = (
            (dt_time(9, 45) <= local_time <= dt_time(11, 30)) or
            (dt_time(13, 30) <= local_time < dt_time(14, 45))
        )

        if is_midday_chop:
            score -= 20
            checks.append({
                "factor": "Execution Window",
                "status": f"Mid-day Chop Zone ({market_tz_label})",
                "score": "-20",
                "detail": f"Mid-day Chop Zone (11:30 AM to 1:30 PM {market_tz_label}): Volume traditionally dries up; high whipsaw risk. Setup held on WATCH."
            })
        elif is_late_session:
            score -= 25
            checks.append({
                "factor": "Execution Window",
                "status": f"Late Session / Square-off ({market_tz_label})",
                "score": "-25",
                "detail": f"Late intraday session ({local_time.strftime('%I:%M %p')} {market_tz_label}): Approaching market close. Insufficient time for multi-stage targets."
            })
        elif is_prime_window:
            score += 10
            checks.append({
                "factor": "Execution Window",
                "status": f"Prime Window ({market_tz_label})",
                "score": "+10",
                "detail": f"High liquidity institutional momentum window ({local_time.strftime('%I:%M %p')} {market_tz_label}). Optimal directional follow-through."
            })
        else:
            checks.append({
                "factor": "Execution Window",
                "status": f"Open Range Discovery ({market_tz_label})",
                "score": "0",
                "detail": f"Opening session price discovery ({local_time.strftime('%I:%M %p')} {market_tz_label})."
            })

    # 4. Factor MTF Alignment into the Score
    # Extract confluence:
    # If action == "LONG" and 3/3 timeframes are bullish, add +15 to score. If 0/3 are bullish (fighting trend), subtract -30.
    # Apply inverse logic for action == "SHORT".
    # 4. Factor Multi-Timeframe Alignment (1m, 5m, 15m, 30m) into the Score
    direction_bias = "LONG" if (score > 0 or (score == 0 and close >= vwap)) else "SHORT"
    if tf_count >= 3:
        if direction_bias == "LONG":
            if bull_tfs == 4:
                score += 30
                checks.append({
                    "factor": "MTF Confluence (1m, 5m, 15m, 30m)",
                    "status": "Full 4-TF Bullish Alignment (4/4) - Recommended",
                    "score": "+30",
                    "detail": "All 4 Timeframes (1m, 5m, 15m, 30m) satisfy bullish criteria above VWAP. Maximum probability institutional breakout setup."
                })
            elif bull_tfs == 3:
                score += 15
                checks.append({
                    "factor": "MTF Confluence (1m, 5m, 15m, 30m)",
                    "status": "Partial Bullish Confluence (3/4) - Not Recommended Yet",
                    "score": "+15",
                    "detail": "3 of 4 Timeframes confirm bullish momentum; awaiting all 4 timeframes (1m, 5m, 15m, 30m) before issuing Buy recommendation."
                })
            elif bull_tfs <= 1:
                score -= 30
                checks.append({
                    "factor": "MTF Confluence (1m, 5m, 15m, 30m)",
                    "status": "Fighting Higher Timeframe Trend",
                    "score": "-30",
                    "detail": f"Only {bull_tfs} of 4 timeframes are Bullish. 1-minute rally is fighting prevailing 5m/15m/30m supply resistance."
                })
            else:
                checks.append({
                    "factor": "MTF Confluence (1m, 5m, 15m, 30m)",
                    "status": f"{bull_tfs}/4 Bullish Timeframes",
                    "score": "0",
                    "detail": f"{bull_tfs} of 4 timeframes show bullish momentum; awaiting full confluence."
                })
        else:
            # action == "SHORT" inverse logic:
            if bear_tfs == 4:
                score -= 30
                checks.append({
                    "factor": "MTF Confluence (1m, 5m, 15m, 30m)",
                    "status": "Full 4-TF Bearish Alignment (4/4) - Recommended",
                    "score": "-30",
                    "detail": "All 4 Timeframes (1m, 5m, 15m, 30m) satisfy bearish criteria below VWAP. High conviction institutional short setup."
                })
            elif bear_tfs == 3:
                score -= 15
                checks.append({
                    "factor": "MTF Confluence (1m, 5m, 15m, 30m)",
                    "status": "Partial Bearish Confluence (3/4) - Not Recommended Yet",
                    "score": "-15",
                    "detail": "3 of 4 Timeframes confirm downward supply pressure; awaiting all 4 timeframes (1m, 5m, 15m, 30m) before issuing Short recommendation."
                })
            elif bear_tfs <= 1:
                score += 30
                checks.append({
                    "factor": "MTF Confluence (1m, 5m, 15m, 30m)",
                    "status": "Shorting into Higher TF Support",
                    "score": "+30",
                    "detail": f"Only {bear_tfs} of 4 timeframes are Bearish. Shorting into prevailing 5m/15m/30m buyer support."
                })
            else:
                checks.append({
                    "factor": "MTF Confluence (1m, 5m, 15m, 30m)",
                    "status": f"{bear_tfs}/4 Bearish Timeframes",
                    "score": "0",
                    "detail": f"{bear_tfs} of 4 timeframes show bearish momentum."
                })

    # 7. Macro Regime & ADX Trend Strength Check
    if adx14 >= 25.0:
        score += 15 if (direction_bias == "LONG") else -15
        checks.append({
            "factor": "Trend Regime (ADX 14)",
            "status": f"Strong Directional Trend (ADX {adx14:.1f})",
            "score": "+15" if direction_bias == "LONG" else "-15",
            "detail": f"1-minute ADX ({adx14:.1f} >= 25) confirms strong trend strength with institutional directional flow."
        })
    elif adx14 < 18.0 and rvol < 1.6:
        score -= 20 if (direction_bias == "LONG") else +20
        checks.append({
            "factor": "Trend Regime (ADX 14)",
            "status": f"Low-ADX Chop Risk (ADX {adx14:.1f})",
            "score": "-20" if direction_bias == "LONG" else "+20",
            "detail": f"1-minute ADX ({adx14:.1f} < 18) indicates sideways compression. Elevated risk of false breakouts."
        })
    else:
        checks.append({
            "factor": "Trend Regime (ADX 14)",
            "status": f"Moderate Trend (ADX {adx14:.1f})",
            "score": "0",
            "detail": f"1-minute ADX ({adx14:.1f}) indicates standard trending conditions."
        })

    # 8. Risk Guardrails (Liquidity & Volatility Checks)
    if not has_sufficient_liquidity:
        score -= 40
        checks.append({
            "factor": "Liquidity Floor",
            "status": "Thin Intraday Volume",
            "score": "-40",
            "detail": f"1-minute volume ({vol_ma20:,.0f} shares / {curr_sym}{turnover_ma:,.0f} turnover) is below standard institutional floor ({min_liquidity_vol_ma:,.0f} shares or {curr_sym}{min_turnover:,.0f} turnover)."
        })
    else:
        checks.append({
            "factor": "Liquidity Floor",
            "status": "Adequate Liquidity",
            "score": "+10",
            "detail": f"1-minute volume ({vol_ma20:,.0f} shares / {curr_sym}{turnover_ma:,.0f} turnover) meets intraday execution standards."
        })

    if not has_acceptable_volatility:
        score -= 40
        checks.append({
            "factor": "Volatility Cap",
            "status": "Excessive Intraday ATR",
            "score": "-40",
            "detail": f"1-minute ATR volatility ({atr_pct:.2f}%) exceeds safety cap ({effective_max_atr:.2f}%). Erratic swings risk premature stop loss hit."
        })

    # Normalize score between -100 and +100
    score = max(-100, min(100, score))
    
    # Intraday Normalized Score (0 to 100) for UI display
    display_score = int(round((score + 100) / 2))

    # --- SIGNAL DETERMINATION (STRICT 4-TIMEFRAME & EXECUTION GATES) ---
    is_recommended = False
    setup_name = ""
    setup_desc = ""

    if not has_sufficient_liquidity:
        signal = "AVOID - ILLIQUID"
        action = "WATCH"
        color = "#9CA3AF"
        setup_name = "Caution: Low Liquidity Order Book"
        setup_desc = f"Order book volume ({vol_ma20:,.0f} shares/min) is thin. Intraday execution risks elevated slippage."
    elif not has_acceptable_volatility:
        signal = "AVOID - HIGH VOLATILITY"
        action = "WATCH"
        color = "#F87171"
        setup_name = "Caution: High Intraday Volatility"
        setup_desc = f"1-minute ATR volatility ({atr_pct:.2f}%) exceeds safety ceiling. Whipsaws likely to trigger stops."
    elif bull_tfs == 4 and score >= 35:
        if is_midday_chop:
            signal = "WATCH - MIDDAY CHOP"
            action = "WATCH"
            color = "#FB923C"
            setup_name = f"Midday Chop Zone ({market_tz_label})"
            setup_desc = f"Midday volume lull (11:30 AM to 1:30 PM {market_tz_label}). Historically elevated whipsaw risk. Recommendation withheld until afternoon session."
            is_recommended = False
        elif is_late_session:
            signal = "WATCH - LATE SESSION"
            action = "WATCH"
            color = "#9CA3AF"
            setup_name = f"Late Session / Square-off Zone ({market_tz_label})"
            setup_desc = f"Approaching market close ({local_time.strftime('%I:%M %p') if local_time else ''} {market_tz_label}). Insufficient time remaining for intraday targets."
            is_recommended = False
        elif adx14 < 18.0 and rvol < 1.6:
            signal = "WATCH - LOW ADX CHOP"
            action = "WATCH"
            color = "#9CA3AF"
            setup_name = f"Low-ADX Range Compression (ADX {adx14:.1f})"
            setup_desc = f"1-minute ADX ({adx14:.1f} < 18) and RVOL ({rvol:.2f}x) show lack of directional expansion. Held on WATCH to avoid mean-reversion chop."
            is_recommended = False
        elif close < open_price and day_change_pct < -0.5:
            signal = "WATCH - BULL TRAP SHIELD"
            action = "WATCH"
            color = "#38BDF8"
            setup_name = "Bull-Trap Shield: Red Day Bounce"
            setup_desc = f"Stock is testing highs but opened with a gap down and remains red on the day ({day_change_pct:+.2f}%). Overhead supply active. Longs blocked."
            is_recommended = False
        else:
            signal = "STRONG BUY" if score >= 60 else "BUY"
            action = "LONG"
            color = "#10B981" if score >= 60 else "#34D399"
            is_recommended = True
    elif bear_tfs == 4 and score <= -35:
        if is_midday_chop:
            signal = "WATCH - MIDDAY CHOP"
            action = "WATCH"
            color = "#FB923C"
            setup_name = f"Midday Chop Zone ({market_tz_label})"
            setup_desc = f"Midday volume lull (11:30 AM to 1:30 PM {market_tz_label}). Historically elevated whipsaw risk. Recommendation withheld until afternoon session."
            is_recommended = False
        elif is_late_session:
            signal = "WATCH - LATE SESSION"
            action = "WATCH"
            color = "#9CA3AF"
            setup_name = f"Late Session / Square-off Zone ({market_tz_label})"
            setup_desc = f"Approaching market close ({local_time.strftime('%I:%M %p') if local_time else ''} {market_tz_label}). Insufficient time remaining for intraday targets."
            is_recommended = False
        elif adx14 < 18.0 and rvol < 1.6:
            signal = "WATCH - LOW ADX CHOP"
            action = "WATCH"
            color = "#9CA3AF"
            setup_name = f"Low-ADX Range Compression (ADX {adx14:.1f})"
            setup_desc = f"1-minute ADX ({adx14:.1f} < 18) and RVOL ({rvol:.2f}x) show lack of directional expansion. Held on WATCH to avoid false breakdown chop."
            is_recommended = False
        elif close >= open_price or day_change_pct > 0:
            signal = "WATCH - BEAR TRAP SHIELD"
            action = "WATCH"
            color = "#FB923C"
            setup_name = "Bear-Trap Shield: Green Day Dip"
            setup_desc = f"Stock is testing lows but is green on the day (+{day_change_pct:.2f}%). Dips into green days are frequently bought by institutional algos. Shorting blocked."
            is_recommended = False
        else:
            signal = "STRONG SHORT" if score <= -60 else "SHORT"
            action = "SHORT"
            color = "#EF4444" if score <= -60 else "#F87171"
            is_recommended = True
    elif bull_tfs == 3 and score >= 35:
        signal = "WATCH - 3/4 MTF"
        action = "WATCH"
        color = "#38BDF8"
        setup_name = "Awaiting 4-TF Confluence (3/4 Bullish)"
        setup_desc = "Satisfies 3 of 4 timeframes (1m, 5m, 15m, 30m). Awaiting all 4 timeframes to align before recommending."
    elif bear_tfs == 3 and score <= -35:
        signal = "WATCH - 3/4 MTF"
        action = "WATCH"
        color = "#FB923C"
        setup_name = "Awaiting 4-TF Confluence (3/4 Bearish)"
        setup_desc = "Satisfies 3 of 4 timeframes (1m, 5m, 15m, 30m). Awaiting all 4 timeframes to align before recommending."
    elif (score >= 35 and bull_tfs < 3) or (score <= -35 and bear_tfs < 3):
        signal = "WATCH - MTF CONFLICT"
        action = "WATCH"
        color = "#EAB308"
        setup_name = f"MTF Divergence ({bull_tfs}/4 Bullish)" if score > 0 else f"MTF Divergence ({bear_tfs}/4 Bearish)"
        setup_desc = "1-minute momentum is contradicted across 5m, 15m, and 30m charts. Awaiting higher timeframe alignment."
    else:
        signal = "NEUTRAL"
        action = "WATCH"
        color = "#9CA3AF"

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
    elif setup_name:
        pass  # Retain specific setup_name from gating checks (e.g. Midday Chop, Bear Trap, MTF Conflict)
    elif not has_sufficient_liquidity:
        setup_name = "Caution: Low Liquidity Order Book"
        setup_desc = f"Order book volume ({vol_ma20:,.0f} shares/min) is thin. Intraday execution risks elevated slippage."
    elif not has_acceptable_volatility:
        setup_name = "Caution: High Intraday Volatility"
        setup_desc = f"1-minute ATR volatility ({atr_pct:.2f}%) exceeds safety ceiling. Whipsaws likely to trigger stops."
    else:
        setup_name = "Range Consolidation / No Direction"
        setup_desc = "Price oscillating around VWAP without decisive volume impulse."

    # --- CALCULATE PRECISE STOP LOSS & TARGETS (REALISTIC 0-3% INTRADAY PROFIT) ---
    # Realistic Intraday Risk & Return Rules:
    # Intraday single-session equity targets realistically fall within 0.5% - 3.0% (instead of 2-5%).
    # Stop loss is structurally anchored behind VWAP, 9-EMA, or 10-bar swing (0.30% - 0.85% risk).
    # Target 1: Quick scalp / partial profit at 0.6% - 1.2% (1:1.5 R:R).
    # Target 2: Main session target at 1.5% - 2.5% (1:2.5 R:R, strictly within realistic 0-3% range).
    # Target 3: Extended runner at max 3.0% (1:3.5 R:R ceiling).
    entry_price = round(close, 2)
    atr_val = max(atr, close * 0.002)  # Floor ATR at 0.2%

    if action == "LONG" or (action == "WATCH" and score >= 0):
        # Primary SL candidate 1: Swing low of last 10 candles with a tiny buffer
        cand_sl1 = recent_swing_low - (0.2 * atr_val)
        # Primary SL candidate 2: Just below VWAP (if close is above VWAP)
        cand_sl2 = vwap - (0.25 * atr_val) if close > vwap else (entry_price - 1.2 * atr_val)
        # Volatility SL candidate 3: Entry - 1.2x ATR
        cand_sl3 = entry_price - (1.2 * atr_val)

        # Nearest logical structural support level
        chosen_sl = max(cand_sl1, cand_sl2)
        # Guardrails: Disciplined intraday risk: Min 0.30% buffer, Max 0.85% loss
        min_sl = entry_price * 0.9915 # Max 0.85% loss
        max_sl = entry_price * 0.9970 # Min 0.30% buffer
        sl_price = round(min(max(chosen_sl, min_sl), max_sl), 2)

        risk_amount = round(entry_price - sl_price, 2)
        if risk_amount <= 0:
            risk_amount = round(max(atr_val * 1.0, entry_price * 0.004), 2)
            sl_price = round(entry_price - risk_amount, 2)

        sl_pct = round(((sl_price - entry_price) / entry_price) * 100.0, 2)

        # Realistic Intraday Targets (0% - 3% profit profile):
        # Target 1 (Scalp / Partial Profit Booking at 1:1.5 R:R, bounded to 0.6% - 1.2%)
        t1_raw = entry_price + (1.5 * risk_amount)
        t1_clamped = min(max(t1_raw, entry_price * 1.006), entry_price * 1.012)
        t1_price = round(t1_clamped, 2)
        t1_pct = round(((t1_price - entry_price) / entry_price) * 100.0, 2)

        # Target 2 (Main Session Target at 1:2.5 R:R, bounded to realistic 1.5% - 2.5%, max 2.8%)
        t2_raw = entry_price + (2.5 * risk_amount)
        if day_high > entry_price:
            t2_raw = min(max(t2_raw, day_high), entry_price * 1.026)
        t2_clamped = min(max(t2_raw, entry_price * 1.015), entry_price * 1.028)
        t2_price = round(t2_clamped, 2)
        t2_pct = round(((t2_price - entry_price) / entry_price) * 100.0, 2)

        # Target 3 (Trend Runner capped at 3.0% maximum realistic intraday target)
        t3_raw = entry_price + (3.5 * risk_amount)
        t3_clamped = min(max(t3_raw, entry_price * 1.022), entry_price * 1.030)
        t3_price = round(t3_clamped, 2)
        t3_pct = round(((t3_price - entry_price) / entry_price) * 100.0, 2)

        rrr = "1 : 2.5"

    else:  # SHORT
        # Primary SL candidate 1: Swing high of last 10 candles with a tiny buffer
        cand_sl1 = recent_swing_high + (0.2 * atr_val)
        # Primary SL candidate 2: Just above VWAP (if close is below VWAP)
        cand_sl2 = vwap + (0.25 * atr_val) if close < vwap else (entry_price + 1.2 * atr_val)
        chosen_sl = min(cand_sl1, cand_sl2)
        
        # Guardrails: Disciplined intraday risk for short: Min 0.30% buffer, Max 0.85% loss
        min_sl = entry_price * 1.0030 # Min 0.30% buffer
        max_sl = entry_price * 1.0085 # Max 0.85% loss
        sl_price = round(max(min(chosen_sl, max_sl), min_sl), 2)

        risk_amount = round(sl_price - entry_price, 2)
        if risk_amount <= 0:
            risk_amount = round(max(atr_val * 1.0, entry_price * 0.004), 2)
            sl_price = round(entry_price + risk_amount, 2)

        sl_pct = round(((sl_price - entry_price) / entry_price) * 100.0, 2)

        # Realistic Intraday Targets for Short (0% - 3% profit profile):
        # Target 1 (Scalp / Partial Cover at 1:1.5 R:R, bounded to 0.6% - 1.2% downside)
        t1_raw = entry_price - (1.5 * risk_amount)
        t1_clamped = max(min(t1_raw, entry_price * 0.994), entry_price * 0.988)
        t1_price = round(t1_clamped, 2)
        t1_pct = round(((t1_price - entry_price) / entry_price) * 100.0, 2)

        # Target 2 (Main Session Target at 1:2.5 R:R, bounded to realistic 1.5% - 2.5%, max 2.8% downside)
        t2_raw = entry_price - (2.5 * risk_amount)
        if day_low < entry_price:
            t2_raw = max(min(t2_raw, day_low), entry_price * 0.974)
        t2_clamped = max(min(t2_raw, entry_price * 0.985), entry_price * 0.972)
        t2_price = round(t2_clamped, 2)
        t2_pct = round(((t2_price - entry_price) / entry_price) * 100.0, 2)

        # Target 3 (Trend Runner capped at 3.0% maximum realistic downside target)
        t3_raw = entry_price - (3.5 * risk_amount)
        t3_clamped = max(min(t3_raw, entry_price * 0.978), entry_price * 0.970)
        t3_price = round(t3_clamped, 2)
        t3_pct = round(((t3_price - entry_price) / entry_price) * 100.0, 2)

        rrr = "1 : 2.5"

    # --- SYNTHESIZE EXPERT CHART ANALYSIS RATIONALE ---
    currency_symbol = "₹" if (".NS" in ticker or ".BO" in ticker) else "$"
    
    rationale_points = [
        f"**1. Trend & VWAP Structure**: Trading at {currency_symbol}{close:,.2f} ({vwap_diff_pct:+.2f}% vs VWAP {currency_symbol}{vwap:,.2f}). EMA 9 ({currency_symbol}{ema9:,.2f}) and EMA 21 ({currency_symbol}{ema21:,.2f}) indicate {'strong upward momentum' if ema9 > ema21 else 'downward pressure'}.",
        f"**2. Institutional Volume Flow**: RVOL is **{rvol:.2f}x** with current 1-min candle volume at {volume:,.0f} shares. {'Institutional volume accumulation confirms buying interest.' if rvol >= 1.5 and close >= prev['Close'] else 'Volume aligns with current momentum.'}",
        f"**3. Price Action & Range**: Day High is {currency_symbol}{day_high:,.2f} and Day Low is {currency_symbol}{day_low:,.2f}. 15-Min Opening Range: {currency_symbol}{orb_low:,.2f} - {currency_symbol}{orb_high:,.2f}. Setup: **{setup_name}**.",
        f"**4. Momentum (RSI 14)**: RSI is currently **{rsi:.1f}**. {'Optimal bullish trajectory, plenty of headroom before overbought exhaustion.' if 50 <= rsi <= 72 else ('High momentum, watch for pullback' if rsi > 72 else 'Bearish momentum dominance.')}",
        f"**5. Volatility & Stop Loss Rule**: 1-minute ATR is {currency_symbol}{atr_val:,.2f}. Strict Stop Loss placed at **{currency_symbol}{sl_price:,.2f}** ({sl_pct:+.2f}% risk), safely anchored behind key structural support (Swing Low / VWAP buffer).",
        f"**6. Target Projections & Runner Lock-in**: Target 1 at **{currency_symbol}{t1_price:,.2f}** ({t1_pct:+.2f}%, 1:1.5 R:R); Target 2 at **{currency_symbol}{t2_price:,.2f}** ({t2_pct:+.2f}%, 1:2.5 R:R) within the realistic 0-3% intraday profit zone. Upon reaching Target 1, 50% is booked and runner Stop Loss trails to +0.5R (**{currency_symbol}{round(entry_price + (0.5 * risk_amount), 2) if action == 'LONG' else round(entry_price - (0.5 * risk_amount), 2):,.2f}**), ensuring the trade cannot regress to a loss.",
        (
            f"**7. Multi-Timeframe Alignment (1m, 5m, 15m, 30m)**: FULL 4-TF CONFLUENCE (RECOMMENDED - {mtf_data.get('confluence_score', '')}). "
            f"[1m: {mtf_data.get('timeframes', {}).get('1m', {}).get('bias', 'N/A')} | "
            f"5m: {mtf_data.get('timeframes', {}).get('5m', {}).get('bias', 'N/A')} | "
            f"15m: {mtf_data.get('timeframes', {}).get('15m', {}).get('bias', 'N/A')} | "
            f"30m: {mtf_data.get('timeframes', {}).get('30m', {}).get('bias', 'N/A')}]. "
            "Satisfies ALL 4 time periods (1m, 5m, 15m, 30m) simultaneously. Validated for institutional recommendation."
        ) if is_recommended else (
            f"**7. Multi-Timeframe Alignment (1m, 5m, 15m, 30m)**: PARTIAL / CONFLICTED ({mtf_data.get('confluence_score', '')}) - NOT RECOMMENDED. "
            f"[1m: {mtf_data.get('timeframes', {}).get('1m', {}).get('bias', 'N/A')} | "
            f"5m: {mtf_data.get('timeframes', {}).get('5m', {}).get('bias', 'N/A')} | "
            f"15m: {mtf_data.get('timeframes', {}).get('15m', {}).get('bias', 'N/A')} | "
            f"30m: {mtf_data.get('timeframes', {}).get('30m', {}).get('bias', 'N/A')}]. "
            "Fails full 4-timeframe criteria. Recommendation withheld until 1m, 5m, 15m, and 30m align in unison."
        )
    ]

    # Optimal Pick Time Window and Holding Duration Window calculations
    time_str = local_time.strftime('%I:%M %p') if local_time is not None else "Current Session"
    if action == "LONG":
        pick_time_window = (
            f"Optimal Pick Window: Enter on 1m/5m green confirmation candle holding above VWAP ({currency_symbol}{vwap:,.2f}) "
            f"or on pullback retest to 9-EMA ({currency_symbol}{ema9:,.2f}) / 15m ORB High ({currency_symbol}{orb_high:,.2f}) between {time_str} - 11:30 AM {market_tz_label}. "
            f"Limit slippage: Avoid buying if price expands > 0.4% above {currency_symbol}{entry_price:,.2f}."
        )
        holding_time_window = (
            f"Holding Duration: 35 to 75 minutes. Lock 50% profit at Target 1 ({currency_symbol}{t1_price:,.2f}, +{abs(t1_pct):.2f}%), immediately shift Stop Loss to Entry ({currency_symbol}{entry_price:,.2f}) for a risk-free runner. "
            f"Trail remaining position toward Target 2 ({currency_symbol}{t2_price:,.2f}, +{abs(t2_pct):.2f}% realistic target) using 5m 21-EMA support. Mandatory intraday square-off before 15:15 {market_tz_label}."
        )
    elif action == "SHORT":
        pick_time_window = (
            f"Optimal Pick Window: Enter Short on 1m/5m red confirmation candle breaking below VWAP ({currency_symbol}{vwap:,.2f}) "
            f"or on rejection from 9-EMA ({currency_symbol}{ema9:,.2f}) / 15m ORB Low ({currency_symbol}{orb_low:,.2f}) between {time_str} - 11:30 AM {market_tz_label}."
        )
        holding_time_window = (
            f"Holding Duration: 35 to 75 minutes. Lock 50% profit at Target 1 ({currency_symbol}{t1_price:,.2f}, +{abs(t1_pct):.2f}% profit), shift Stop Loss to Entry ({currency_symbol}{entry_price:,.2f}). "
            f"Trail balance toward Target 2 ({currency_symbol}{t2_price:,.2f}, +{abs(t2_pct):.2f}% realistic target) with 5m 21-EMA resistance. Mandatory auto-square-off before 15:15 {market_tz_label}."
        )
    else:
        pick_time_window = f"Awaiting multi-timeframe directional alignment across 1m, 5m, 15m, and 30m candles ({time_str} {market_tz_label})."
        holding_time_window = "Setup on WATCH. Do not enter until all 4 timeframes align."

    rationale_points.append(f"**8. Execution Timing**: {pick_time_window}")
    rationale_points.append(f"**9. Holding Period**: {holding_time_window}")

    roi_pct = round(abs(t2_pct), 2)
    locked_sl_price = round(entry_price + (0.5 * risk_amount), 2) if action == "LONG" else round(entry_price - (0.5 * risk_amount), 2)
    locked_sl_pct = round(((locked_sl_price - entry_price) / entry_price) * 100.0, 2) if action == "LONG" else round(((entry_price - locked_sl_price) / entry_price) * 100.0, 2)

    # Tailor execution strategy for LONG vs SHORT with realistic 0-3% profit targets
    if action == "LONG":
        exec_strategy = (
            f"Book 50% position at Target 1 ({currency_symbol}{t1_price:,.2f}, +{abs(t1_pct):.2f}% profit, +1.5R). "
            f"Immediately trail Stop Loss to Lock-in Profit at +0.5R ({currency_symbol}{locked_sl_price:,.2f}) to guarantee positive expectancy, "
            f"and let remaining 50% runner target Target 2 ({currency_symbol}{t2_price:,.2f}, +{abs(t2_pct):.2f}% realistic intraday profit, +2.5R)."
        )
    elif action == "SHORT":
        exec_strategy = (
            f"Execute Short Sell order (MIS/Intraday). Cover 50% position at Target 1 ({currency_symbol}{t1_price:,.2f}, +{abs(t1_pct):.2f}% profit, +1.5R). "
            f"Immediately trail Stop Loss to Lock-in Profit at +0.5R ({currency_symbol}{locked_sl_price:,.2f}) to eliminate upside risk, "
            f"and let remaining 50% runner target Target 2 ({currency_symbol}{t2_price:,.2f}, +{abs(t2_pct):.2f}% realistic intraday profit, +2.5R)."
        )
    else:
        exec_strategy = "Setup on WATCH. Awaiting 4-timeframe alignment before initiating position."

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
        "locked_stop_loss": locked_sl_price,
        "locked_stop_loss_pct": locked_sl_pct,
        "roi_pct": roi_pct,
        "t1_roi_pct": round(abs(t1_pct), 2),
        "t2_roi_pct": round(abs(t2_pct), 2),
        "t3_roi_pct": round(abs(t3_pct), 2),
        "risk_reward_ratio": rrr,
        "risk_per_share": risk_amount,
        "pick_time_window": pick_time_window,
        "holding_time_window": holding_time_window,
        "execution_strategy": exec_strategy
    }

    # Detect visual chart markers for patterns & triggers
    markers = detect_candlestick_patterns_and_markers(df, action=action)

    # Timezone Normalization:
    # Intraday stocks picked for INDIA strictly use IST (Asia/Kolkata).
    # US stocks strictly use EST (America/New_York) and do not use IST.
    is_india = bool(".NS" in ticker or ".BO" in ticker or currency_symbol == "₹")
    target_tz_name = "Asia/Kolkata" if is_india else "America/New_York"
    target_tz_label = "IST" if is_india else "EST"
    target_tz = pytz.timezone(target_tz_name)

    dt_local = None
    if hasattr(curr.name, 'tzinfo') and curr.name.tzinfo is not None:
        dt_local = curr.name.astimezone(target_tz)
    elif hasattr(curr.name, 'timestamp'):
        try:
            dt_local = curr.name.tz_localize(target_tz) if hasattr(curr.name, 'tz_localize') else target_tz.localize(curr.name)
        except Exception:
            dt_local = datetime.fromtimestamp(curr.name.timestamp(), tz=pytz.utc).astimezone(target_tz)
    else:
        dt_local = datetime.now(tz=target_tz)

    timestamp_sec = int(dt_local.timestamp())
    formatted_time = dt_local.strftime('%I:%M:%S %p') + f" {target_tz_label}"
    formatted_short_time = dt_local.strftime('%I:%M %p') + f" {target_tz_label}"
    formatted_datetime = dt_local.strftime('%Y-%m-%d %I:%M:%S %p') + f" {target_tz_label}"

    return {
        "ticker": ticker,
        "company_name": company_name or ticker,
        "cap": cap,
        "status": "OK",
        "currency_symbol": currency_symbol,
        "is_india": is_india,
        "market_tz": target_tz_name,
        "tz_label": target_tz_label,
        "timestamp": timestamp_sec,
        "time_str": formatted_datetime,
        "pick_time": formatted_time,
        "pick_time_short": formatted_short_time,
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
        "adx": round(adx14, 1),
        "rvol": round(rvol, 2),
        "volume": int(volume),
        "score": score,
        "display_score": display_score,
        "signal": signal,
        "action": action,
        "is_sell_zone": bool(score < 0 or close < vwap or bear_tfs >= 3 or action == "SHORT"),
        "market_zone": "SELL_ZONE" if (score < 0 or close < vwap or bear_tfs >= 3 or action == "SHORT") else "BUY_ZONE",
        "market_zone_label": "Sell Zone (Shorting)" if (score < 0 or close < vwap or bear_tfs >= 3 or action == "SHORT") else "Buy Zone (Long)",
        "is_recommended": is_recommended,
        "roi_pct": roi_pct,
        "color": color,
        "setup_name": setup_name,
        "setup_desc": setup_desc,
        "feed_source": feed_source,
        "feed_source_label": "⚡ Angel One Smart API (Live NSE)" if "ANGEL" in feed_source.upper() else "📡 Yahoo Finance (Real-Time)",
        "circuit_limits": {
            "upper": live_quote.get("upper_circuit") if live_quote else None,
            "lower": live_quote.get("lower_circuit") if live_quote else None
        } if live_quote else None,
        "market_depth": live_quote.get("depth") if live_quote else None,
        "checks": checks,
        "rationale_points": rationale_points,
        "trade_plan": trade_plan,
        "pick_time_window": pick_time_window,
        "holding_time_window": holding_time_window,
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
    Computes multi-timeframe alignment across 1m, 5m, 15m, and 30m intervals.
    Recommends high-conviction trades when all 4 timeframes satisfy the directional trend.
    """
    if df_1m.empty or len(df_1m) < 10:
        return {
            "confluence_level": "NEUTRAL",
            "confluence_score": "0/4",
            "all_aligned": False,
            "badge_color": "#94a3b8",
            "verdict": "Awaiting sufficient intraday bars to compute MTF alignment.",
            "bull_count": 0,
            "bear_count": 0,
            "total_timeframes": 4,
            "timeframes": {}
        }

    agg_rules = {'Open': 'first', 'High': 'max', 'Low': 'min', 'Close': 'last', 'Volume': 'sum'}

    # 1. 1-Minute (Trigger)
    last_1m = df_1m.iloc[-1]
    close_1m = float(last_1m['Close'])
    vwap_1m = float(last_1m.get('VWAP', close_1m))
    rsi_1m = float(last_1m.get('RSI', 50.0))
    ema9_1m = float(last_1m.get('EMA9', close_1m))
    ema21_1m = float(last_1m.get('EMA21', close_1m))
    bias_1m = "BULLISH" if (close_1m >= vwap_1m and ema9_1m >= ema21_1m and rsi_1m >= 48.0) else (
        "BEARISH" if (close_1m < vwap_1m and ema9_1m <= ema21_1m and rsi_1m <= 52.0) else "NEUTRAL"
    )

    # 2. 5-Minute (Tactical)
    df_5m = df_1m.resample('5min').agg(agg_rules).dropna()
    df_5m = calculate_intraday_indicators(df_5m, light=True)
    if not df_5m.empty and 'VWAP' in df_5m.columns:
        last_5m = df_5m.iloc[-1]
        close_5m = float(last_5m['Close'])
        vwap_5m = float(last_5m.get('VWAP', close_5m))
        rsi_5m = float(last_5m.get('RSI', 50.0))
        ema9_5m = float(last_5m.get('EMA9', close_5m))
        ema21_5m = float(last_5m.get('EMA21', close_5m))
        bias_5m = "BULLISH" if (close_5m >= vwap_5m and ema9_5m >= ema21_5m and rsi_5m >= 48.0) else (
            "BEARISH" if (close_5m < vwap_5m and ema9_5m <= ema21_5m and rsi_5m <= 52.0) else "NEUTRAL"
        )
    else:
        close_5m, vwap_5m, rsi_5m, ema9_5m, ema21_5m, bias_5m = close_1m, vwap_1m, rsi_1m, ema9_1m, ema21_1m, bias_1m

    # 3. 15-Minute (ORB & Breakout Structure)
    df_15m = df_1m.resample('15min').agg(agg_rules).dropna()
    df_15m = calculate_intraday_indicators(df_15m, light=True)
    if not df_15m.empty and 'VWAP' in df_15m.columns:
        last_15m = df_15m.iloc[-1]
        close_15m = float(last_15m['Close'])
        vwap_15m = float(last_15m.get('VWAP', close_15m))
        rsi_15m = float(last_15m.get('RSI', 50.0))
        ema9_15m = float(last_15m.get('EMA9', close_15m))
        ema21_15m = float(last_15m.get('EMA21', close_15m))
        bias_15m = "BULLISH" if (close_15m >= vwap_15m and ema9_15m >= ema21_15m and rsi_15m >= 48.0) else (
            "BEARISH" if (close_15m < vwap_15m and ema9_15m <= ema21_15m and rsi_15m <= 52.0) else "NEUTRAL"
        )
    else:
        close_15m, vwap_15m, rsi_15m, ema9_15m, ema21_15m, bias_15m = close_5m, vwap_5m, rsi_5m, ema9_5m, ema21_5m, bias_5m

    # 4. 30-Minute (Macro Trend & Intraday Structure Anchor)
    df_30m = df_1m.resample('30min').agg(agg_rules).dropna()
    df_30m = calculate_intraday_indicators(df_30m, light=True)
    if not df_30m.empty and 'VWAP' in df_30m.columns:
        last_30m = df_30m.iloc[-1]
        close_30m = float(last_30m['Close'])
        vwap_30m = float(last_30m.get('VWAP', close_30m))
        rsi_30m = float(last_30m.get('RSI', 50.0))
        ema9_30m = float(last_30m.get('EMA9', close_30m))
        ema21_30m = float(last_30m.get('EMA21', close_30m))
        bias_30m = "BULLISH" if (close_30m >= vwap_30m and ema9_30m >= ema21_30m and rsi_30m >= 48.0) else (
            "BEARISH" if (close_30m < vwap_30m and ema9_30m <= ema21_30m and rsi_30m <= 52.0) else "NEUTRAL"
        )
    else:
        close_30m, vwap_30m, rsi_30m, ema9_30m, ema21_30m, bias_30m = close_15m, vwap_15m, rsi_15m, ema9_15m, ema21_15m, bias_15m

    # Optional 10-minute for backwards compatibility
    df_10m = df_1m.resample('10min').agg(agg_rules).dropna()
    df_10m = calculate_intraday_indicators(df_10m, light=True)
    if not df_10m.empty and 'VWAP' in df_10m.columns:
        last_10m = df_10m.iloc[-1]
        close_10m = float(last_10m['Close'])
        vwap_10m = float(last_10m.get('VWAP', close_10m))
        rsi_10m = float(last_10m.get('RSI', 50.0))
        ema9_10m = float(last_10m.get('EMA9', close_10m))
        ema21_10m = float(last_10m.get('EMA21', close_10m))
        bias_10m = "BULLISH" if (close_10m >= vwap_10m and ema9_10m >= ema21_10m and rsi_10m >= 48.0) else (
            "BEARISH" if (close_10m < vwap_10m and ema9_10m <= ema21_10m and rsi_10m <= 52.0) else "NEUTRAL"
        )
    else:
        close_10m, vwap_10m, rsi_10m, ema9_10m, ema21_10m, bias_10m = close_5m, vwap_5m, rsi_5m, ema9_5m, ema21_5m, bias_5m

    # Confluence calculation across 4 primary time periods: 1m, 5m, 15m, 30m
    all_biases = [bias_1m, bias_5m, bias_15m, bias_30m]
    bulls = all_biases.count("BULLISH")
    bears = all_biases.count("BEARISH")
    all_aligned = (bulls == 4 or bears == 4)

    if bulls == 4:
        confluence_level = "FULL 4-TF BULLISH ALIGNMENT"
        confluence_score = "4/4 High Conviction"
        badge_color = "#10b981"
        verdict = "All 4 Timeframes (1m, 5m, 15m, 30m) satisfy bullish criteria above VWAP. Maximum probability institutional breakout setup."
    elif bears == 4:
        confluence_level = "FULL 4-TF BEARISH ALIGNMENT"
        confluence_score = "4/4 High Conviction"
        badge_color = "#ef4444"
        verdict = "All 4 Timeframes (1m, 5m, 15m, 30m) satisfy bearish criteria below VWAP. High conviction institutional short setup."
    elif bulls == 3:
        confluence_level = "STRONG BULLISH CONFLUENCE"
        confluence_score = "3/4 Good Confluence"
        badge_color = "#34d399"
        verdict = "3 of 4 Timeframes (1m, 5m, 15m, 30m) satisfy bullish momentum; watch for 1m/5m pullback retest to 21 EMA."
    elif bears == 3:
        confluence_level = "STRONG BEARISH CONFLUENCE"
        confluence_score = "3/4 Good Confluence"
        badge_color = "#f87171"
        verdict = "3 of 4 Timeframes (1m, 5m, 15m, 30m) confirm persistent downward supply pressure."
    elif bulls == 2 and bears == 0:
        confluence_level = "MILD BULLISH BIAS"
        confluence_score = "2/4 Developing"
        badge_color = "#60a5fa"
        verdict = "2 of 4 Timeframes turning bullish; awaiting 15m and 30m confirmation."
    elif bears == 2 and bulls == 0:
        confluence_level = "MILD BEARISH BIAS"
        confluence_score = "2/4 Developing"
        badge_color = "#fb923c"
        verdict = "2 of 4 Timeframes turning bearish; awaiting 15m and 30m breakdown confirmation."
    else:
        confluence_level = "MIXED / MTF CONFLICT"
        confluence_score = f"{max(bulls, bears)}/4 Conflicted"
        badge_color = "#94a3b8"
        verdict = "Timeframes are out of sync across 1m, 5m, 15m, 30m. Waiting for alignment to prevent chop whipsaws."

    return {
        "confluence_level": confluence_level,
        "confluence_score": confluence_score,
        "all_aligned": all_aligned,
        "badge_color": badge_color,
        "verdict": verdict,
        "bull_count": bulls,
        "bear_count": bears,
        "total_timeframes": 4,
        "timeframes": {
            "1m": {
                "bias": bias_1m,
                "close": round(close_1m, 2),
                "vwap": round(vwap_1m, 2),
                "rsi": round(rsi_1m, 1),
                "ema9": round(ema9_1m, 2),
                "ema21": round(ema21_1m, 2),
                "above_vwap": close_1m >= vwap_1m,
                "ema_bullish": ema9_1m >= ema21_1m
            },
            "5m": {
                "bias": bias_5m,
                "close": round(close_5m, 2),
                "vwap": round(vwap_5m, 2),
                "rsi": round(rsi_5m, 1),
                "ema9": round(ema9_5m, 2),
                "ema21": round(ema21_5m, 2),
                "above_vwap": close_5m >= vwap_5m,
                "ema_bullish": ema9_5m >= ema21_5m
            },
            "10m": {
                "bias": bias_10m,
                "close": round(close_10m, 2),
                "vwap": round(vwap_10m, 2),
                "rsi": round(rsi_10m, 1),
                "ema9": round(ema9_10m, 2),
                "ema21": round(ema21_10m, 2),
                "above_vwap": close_10m >= vwap_10m,
                "ema_bullish": ema9_10m >= ema21_10m
            },
            "15m": {
                "bias": bias_15m,
                "close": round(close_15m, 2),
                "vwap": round(vwap_15m, 2),
                "rsi": round(rsi_15m, 1),
                "ema9": round(ema9_15m, 2),
                "ema21": round(ema21_15m, 2),
                "above_vwap": close_15m >= vwap_15m,
                "ema_bullish": ema9_15m >= ema21_15m
            },
            "30m": {
                "bias": bias_30m,
                "close": round(close_30m, 2),
                "vwap": round(vwap_30m, 2),
                "rsi": round(rsi_30m, 1),
                "ema9": round(ema9_30m, 2),
                "ema21": round(ema21_30m, 2),
                "above_vwap": close_30m >= vwap_30m,
                "ema_bullish": ema9_30m >= ema21_30m
            }
        }
    }

