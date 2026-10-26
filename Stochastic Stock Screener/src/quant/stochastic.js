/**
 * Stochastic Oscillator on a Closing Basis Engine
 * Default parameters: %K = 14, %K Smoothing = 3, %D Signal = 3
 * Evaluated strictly on Closing Prices (Close-Only Stochastic)
 */

export const DEFAULT_STOCHASTIC_PARAMS = {
  kPeriod: 14,
  kSmoothing: 3,
  dPeriod: 3,
  overboughtThreshold: 80,
  oversoldThreshold: 20,
  useClosingOnly: true // Closing price basis as requested
};

/**
 * Calculate Stochastic Oscillator series on a Closing Basis (or High/Low)
 *
 * @param {Array<Object>} candles - Array of candles { date, open, high, low, close, volume }
 * @param {Object} options - Parameter options
 * @returns {Array<Object>} Array of results with date, close, fastK, slowK (%K), d (%D), signal
 */
export function calculateStochasticSeries(candles, options = {}) {
  const opts = { ...DEFAULT_STOCHASTIC_PARAMS, ...options };
  const { kPeriod, kSmoothing, dPeriod, useClosingOnly } = opts;

  if (!Array.isArray(candles) || candles.length === 0) {
    return [];
  }

  const n = candles.length;
  const rawFastK = new Array(n).fill(null);

  // Step 1: Calculate Fast %K for each bar
  for (let i = 0; i < n; i++) {
    if (i < kPeriod - 1) {
      continue;
    }

    const windowSlice = candles.slice(i - kPeriod + 1, i + 1);
    let minVal, maxVal;

    if (useClosingOnly) {
      // On a closing basis: Evaluate lowest and highest close over window
      const closes = windowSlice.map(c => c.close).filter(c => c != null && !isNaN(c));
      if (closes.length === 0) continue;
      minVal = Math.min(...closes);
      maxVal = Math.max(...closes);
    } else {
      // Standard High/Low basis
      const highs = windowSlice.map(c => c.high ?? c.close).filter(h => h != null && !isNaN(h));
      const lows = windowSlice.map(c => c.low ?? c.close).filter(l => l != null && !isNaN(l));
      if (highs.length === 0 || lows.length === 0) continue;
      maxVal = Math.max(...highs);
      minVal = Math.min(...lows);
    }

    const currentClose = candles[i].close;
    const range = maxVal - minVal;

    if (range === 0) {
      rawFastK[i] = 50.0;
    } else {
      const fastVal = ((currentClose - minVal) / range) * 100;
      rawFastK[i] = Math.max(0, Math.min(100, fastVal));
    }
  }

  // Step 2: Calculate Slow %K (SMA of Fast %K over kSmoothing period, default 3)
  const slowK = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (i < kPeriod - 1 + kSmoothing - 1) {
      continue;
    }
    const kSlice = rawFastK.slice(i - kSmoothing + 1, i + 1);
    const valid = kSlice.filter(v => v !== null && !isNaN(v));
    if (valid.length === kSmoothing) {
      const sum = valid.reduce((acc, v) => acc + v, 0);
      slowK[i] = Number((sum / kSmoothing).toFixed(2));
    }
  }

  // Step 3: Calculate %D (SMA of Slow %K over dPeriod, default 3)
  const dSeries = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (i < kPeriod - 1 + kSmoothing - 1 + dPeriod - 1) {
      continue;
    }
    const dSlice = slowK.slice(i - dPeriod + 1, i + 1);
    const valid = dSlice.filter(v => v !== null && !isNaN(v));
    if (valid.length === dPeriod) {
      const sum = valid.reduce((acc, v) => acc + v, 0);
      dSeries[i] = Number((sum / dPeriod).toFixed(2));
    }
  }

  // Step 4: Assemble results with signal annotations
  const results = [];
  for (let i = 0; i < n; i++) {
    const kVal = slowK[i];
    const dVal = dSeries[i];
    const prevK = i > 0 ? slowK[i - 1] : null;
    const prevD = i > 0 ? dSeries[i - 1] : null;

    let signalType = 'NEUTRAL';
    let signalLabel = 'In Range (Neutral)';
    let signalSeverity = 'neutral'; // 'bullish', 'bearish', 'warning', 'neutral'

    if (kVal !== null && dVal !== null && prevK !== null && prevD !== null) {
      const isGoldenCross = prevK <= prevD && kVal > dVal;
      const isDeathCross = prevK >= prevD && kVal < dVal;

      if (isGoldenCross) {
        if (kVal <= opts.oversoldThreshold) {
          signalType = 'BULLISH_CROSSOVER_OVERSOLD';
          signalLabel = '★ Bullish Golden Cross (Oversold)';
          signalSeverity = 'bullish';
        } else {
          signalType = 'BULLISH_CROSSOVER';
          signalLabel = 'Bullish Crossover (%K > %D)';
          signalSeverity = 'bullish';
        }
      } else if (isDeathCross) {
        if (kVal >= opts.overboughtThreshold) {
          signalType = 'BEARISH_CROSSOVER_OVERBOUGHT';
          signalLabel = '⚠ Bearish Death Cross (Overbought)';
          signalSeverity = 'bearish';
        } else {
          signalType = 'BEARISH_CROSSOVER';
          signalLabel = 'Bearish Crossover (%K < %D)';
          signalSeverity = 'bearish';
        }
      } else if (kVal <= 10 && dVal <= 15) {
        signalType = 'EXTREME_OVERSOLD';
        signalLabel = 'Deep Oversold (%K < 10)';
        signalSeverity = 'bullish';
      } else if (kVal >= 90 && dVal >= 85) {
        signalType = 'EXTREME_OVERBOUGHT';
        signalLabel = 'Extreme Overbought (%K > 90)';
        signalSeverity = 'bearish';
      } else if (kVal <= opts.oversoldThreshold) {
        signalType = 'OVERSOLD';
        signalLabel = 'Oversold Zone (< 20)';
        signalSeverity = 'bullish';
      } else if (kVal >= opts.overboughtThreshold) {
        signalType = 'OVERBOUGHT';
        signalLabel = 'Overbought Zone (> 80)';
        signalSeverity = 'bearish';
      } else if (kVal > dVal) {
        signalType = 'BULLISH_MOMENTUM';
        signalLabel = 'Bullish Momentum (%K > %D)';
        signalSeverity = 'bullish';
      } else if (kVal < dVal) {
        signalType = 'BEARISH_MOMENTUM';
        signalLabel = 'Bearish Momentum (%K < %D)';
        signalSeverity = 'bearish';
      }
    }

    results.push({
      date: candles[i].date,
      timestamp: candles[i].timestamp,
      close: candles[i].close,
      open: candles[i].open,
      high: candles[i].high,
      low: candles[i].low,
      volume: candles[i].volume,
      fastK: rawFastK[i],
      slowK: kVal,
      d: dVal,
      spread: (kVal !== null && dVal !== null) ? Number((kVal - dVal).toFixed(2)) : null,
      signalType,
      signalLabel,
      signalSeverity
    });
  }

  return results;
}

/**
 * Screen a single stock given its historical candles
 * Returns rich quantitative summary metrics
 */
export function screenStockStochastic(ticker, name, candles, options = {}) {
  const opts = { ...DEFAULT_STOCHASTIC_PARAMS, ...options };
  const series = calculateStochasticSeries(candles, opts);

  if (series.length === 0) {
    return null;
  }

  const latest = series[series.length - 1];
  const prev1 = series.length > 1 ? series[series.length - 2] : null;
  const prev2 = series.length > 2 ? series[series.length - 3] : null;

  const currentClose = latest.close;
  const prevClose = prev1?.close ?? currentClose;
  const change = Number((currentClose - prevClose).toFixed(2));
  const changePct = Number(((change / Math.max(0.01, prevClose)) * 100).toFixed(2));

  // 50-period SMA Calculation / Baseline Trend Filter
  let sma50 = candles?.sma50 ?? options?.sma50 ?? (Array.isArray(candles) ? candles[candles.length - 1]?.sma50 : null) ?? null;
  if (sma50 === null || isNaN(sma50)) {
    const allCloses = Array.isArray(candles)
      ? candles.map(c => c?.close).filter(c => typeof c === 'number' && !isNaN(c))
      : [];
    if (allCloses.length >= 50) {
      const slice50 = allCloses.slice(-50);
      const sum50 = slice50.reduce((acc, c) => acc + c, 0);
      sma50 = Number((sum50 / 50).toFixed(2));
    }
  }

  const isBelowSma50 = sma50 != null && currentClose < sma50 * 0.95;
  const sma50DiffPct = sma50 != null ? Number((((currentClose - sma50) / sma50) * 100).toFixed(2)) : null;

  // Determine Divergence Pattern across last 15-20 bars
  const divergence = detectDivergence(series.slice(-20));

  // Check 3-bar velocity of %K
  let velocity = 0;
  if (prev1 && prev1.slowK !== null && latest.slowK !== null) {
    velocity = Number((latest.slowK - prev1.slowK).toFixed(2));
  }

  // Quantitative Entry & Exit Strategy Formulation
  const strategyOpts = { ...opts, sma50 };
  const strategy = computeEntryExitStrategy(ticker, currentClose, series, strategyOpts);

  // Baseline Trend Filter Guardrail:
  // If price is significantly below 50-SMA (> 5% below) and a Golden Cross occurs,
  // downgrade action to COUNTER_TREND_WATCH and conviction to 'Low - Fighting Primary Downtrend'
  const isGoldenCross = latest.signalType.includes('BULLISH_CROSSOVER');
  if (isBelowSma50 && isGoldenCross) {
    strategy.action = 'COUNTER_TREND_WATCH';
    strategy.actionLabel = 'Counter-Trend Watch (Below 50-SMA)';
    strategy.actionBadge = 'badge-counter-trend';
    strategy.conviction = 'Low - Fighting Primary Downtrend';
  }

  return {
    ticker: ticker.toUpperCase(),
    name: name || ticker,
    price: currentClose,
    change,
    changePct,
    volume: latest.volume,
    slowK: latest.slowK,
    d: latest.d,
    spread: latest.spread,
    velocity,
    signalType: latest.signalType,
    signalLabel: latest.signalLabel,
    signalSeverity: latest.signalSeverity,
    divergence,
    strategy,
    sma50,
    isBelowSma50,
    sma50DiffPct,
    isOverbought: latest.slowK >= opts.overboughtThreshold,
    isOversold: latest.slowK <= opts.oversoldThreshold,
    isBullishCross: isGoldenCross,
    isBearishCross: latest.signalType.includes('BEARISH_CROSSOVER'),
    kPeriod: opts.kPeriod,
    kSmoothing: opts.kSmoothing,
    dPeriod: opts.dPeriod,
    useClosingOnly: opts.useClosingOnly,
    history: series.slice(-30) // last 30 bars for mini sparkline or modal inspection
  };
}

/**
 * Formulate Quantitative Entry and Exit Strategy for Screened / Oversold Stocks
 */
export function computeEntryExitStrategy(ticker, currentPrice, series, opts = {}) {
  const recentBars = series.slice(-20);
  const closes = recentBars.map(b => b.close).filter(c => c != null && !isNaN(c));
  const latest = series[series.length - 1];
  const kVal = latest?.slowK ?? 50;
  const dVal = latest?.d ?? 50;
  const spread = latest?.spread ?? (kVal - dVal);
  const isGoldenCross = latest?.signalType?.includes('BULLISH_CROSSOVER');
  const isOversold = kVal <= (opts.oversoldThreshold || 20);
  const isDeepOversold = kVal <= 10;

  // 50-SMA Baseline Trend Filter
  const sma50 = opts.sma50 ?? null;
  const isBelowSma50 = sma50 != null && currentPrice < sma50 * 0.95;
  const sma50DiffPct = sma50 != null ? Number((((currentPrice - sma50) / sma50) * 100).toFixed(2)) : null;

  // Calculate Support & Range
  const kWindow = Math.max(4, opts.kPeriod || 14);
  const minCloseWindow = Math.min(...closes.slice(-kWindow));
  const swingLow = Math.min(...closes);
  const swingHigh = Math.max(...closes);

  // Volatility proxy (Average Absolute Day Move)
  let sumMoves = 0;
  let moveCount = 0;
  for (let i = 1; i < closes.length; i++) {
    sumMoves += Math.abs(closes[i] - closes[i - 1]);
    moveCount++;
  }
  const avgMove = moveCount > 0 ? (sumMoves / moveCount) : (currentPrice * 0.015);

  // Strategy Action State
  let action = 'WATCHLIST';
  let actionLabel = 'Pending Reversal (Watch for %K > %D)';
  let actionBadge = 'badge-neutral';
  let conviction = 'Moderate';

  if (isGoldenCross) {
    if (isBelowSma50) {
      // Trend Filter: Downgrade when fighting primary downtrend (>5% below 50-SMA)
      action = 'COUNTER_TREND_WATCH';
      actionLabel = 'Counter-Trend Watch (Below 50-SMA)';
      actionBadge = 'badge-counter-trend';
      conviction = 'Low - Fighting Primary Downtrend';
    } else if (isOversold) {
      action = 'BUY_CONFIRMED';
      actionLabel = '★ Actionable Buy (Golden Cross in Oversold)';
      actionBadge = 'badge-golden-cross';
      conviction = 'High (Momentum Reversal Trigger)';
    } else {
      action = 'BUY_MOMENTUM';
      actionLabel = 'Bullish Crossover Entry';
      actionBadge = 'badge-bullish-cross';
      conviction = 'Moderate-High';
    }
  } else if (isDeepOversold) {
    action = 'ACCUMULATE_DIP';
    actionLabel = 'Extreme Capitulation Buy Bracket (%K < 10)';
    actionBadge = 'badge-deep-oversold';
    conviction = 'High Reversal Discount';
  } else if (isOversold) {
    action = 'OVERSOLD_WATCH';
    actionLabel = 'Oversold Discount (Await %K Cross Above %D)';
    actionBadge = 'badge-oversold';
    conviction = 'Moderate (Wait for Hook)';
  } else if (kVal > 80) {
    action = 'OVERBOUGHT_EXIT';
    actionLabel = 'Overbought Zone (Take Profits / Avoid Longs)';
    actionBadge = 'badge-overbought';
    conviction = 'Exhaustion Warning';
  }

  // Exact Price Levels
  const entryMin = Number(Math.min(currentPrice, minCloseWindow * 0.998).toFixed(2));
  const entryMax = Number((currentPrice * 1.004).toFixed(2));
  const entryMid = currentPrice;

  // Stop Loss: Below Lowest Close / Swing Low with safety buffer (1.2% - 2.5% risk)
  const technicalFloor = Math.min(minCloseWindow, swingLow);
  const rawSL = Math.min(currentPrice - avgMove * 1.2, technicalFloor * 0.985);
  const stopLoss = Number(Math.max(0.01, rawSL).toFixed(2));
  const riskAmount = Number(Math.max(0.01, currentPrice - stopLoss).toFixed(2));
  const riskPct = Number(((riskAmount / currentPrice) * 100).toFixed(2));

  // Profit Target 1: Mid-Band Rebound (%K = 50 area -> ~1.5R or 45% of swing range)
  const target1Distance = Math.max(riskAmount * 1.5, (swingHigh - currentPrice) * 0.45);
  const target1 = Number((currentPrice + target1Distance).toFixed(2));
  const target1GainPct = Number((((target1 - currentPrice) / currentPrice) * 100).toFixed(2));

  // Profit Target 2: Overbought Exhaustion (%K > 80 area -> ~2.8R - 3.2R or swing high test)
  const target2Distance = Math.max(riskAmount * 2.8, (swingHigh - currentPrice) * 0.95);
  const target2 = Number((currentPrice + Math.max(target1Distance * 1.8, target2Distance)).toFixed(2));
  const target2GainPct = Number((((target2 - currentPrice) / currentPrice) * 100).toFixed(2));

  // Risk to Reward Ratio
  const rrRatio = riskAmount > 0 ? Number(((target2 - currentPrice) / riskAmount).toFixed(1)) : 2.5;

  const isINR = ticker.endsWith('.NS') || ticker.endsWith('.BO');
  const curr = isINR ? '₹' : '$';

  // Step-by-Step Tactical Rules Playbook
  const playbook = [
    isBelowSma50
      ? `1. Counter-Trend Warning: Price (${curr}${currentPrice.toLocaleString()}) is trading ${Math.abs(sma50DiffPct)}% below its 50-day SMA (${curr}${sma50.toLocaleString()}). Fighting primary downtrend; consider watching for base confirmation or keep position size minimal.`
      : `1. Entry Zone: Initiate long positions inside ${curr}${entryMin.toLocaleString()} - ${curr}${entryMax.toLocaleString()} as Stochastic %K confirms upward momentum.`,
    `2. Capital Protection: Place hard Stop Loss at ${curr}${stopLoss.toLocaleString()} (-${riskPct}%). Risk strictly limited to 1-2% portfolio allocation.`,
    `3. Profit Taking Milestone 1: At Target 1 (${curr}${target1.toLocaleString()}, +${target1GainPct}%), liquidate 50% position and advance Stop Loss to Breakeven (${curr}${currentPrice.toLocaleString()}).`,
    `4. Profit Taking Milestone 2: At Target 2 (${curr}${target2.toLocaleString()}, +${target2GainPct}%), liquidate remaining 50% as Stochastic %K touches the 80 overbought exhaustion band.`,
    `5. Invalidation Rule: Exit position immediately if daily closing price closes below Stop Loss (${curr}${stopLoss.toLocaleString()}) before %K reclaims 50.`
  ];

  return {
    action,
    actionLabel,
    actionBadge,
    conviction,
    entryMin,
    entryMax,
    entryMid,
    entryRangeStr: `${curr}${entryMin.toLocaleString()} - ${curr}${entryMax.toLocaleString()}`,
    stopLoss,
    riskAmount,
    riskPct,
    target1,
    target1GainPct,
    target1Condition: 'Mid-Band Equilibrium (%K ~ 50)',
    target2,
    target2GainPct,
    target2Condition: 'Overbought Peak (%K > 80)',
    rrRatio: `1 : ${rrRatio}`,
    rrValue: rrRatio,
    sma50,
    isBelowSma50,
    sma50DiffPct,
    playbook
  };
}

/**
 * Detect Regular Bullish and Bearish Divergences on a Closing Basis
 * Independently tracks swing lows and swing highs
 */
export function detectDivergence(recentBars) {
  if (!Array.isArray(recentBars) || recentBars.length < 8) return null;

  // Independently track both swing lows and swing highs on close
  const swingLows = [];
  const swingHighs = [];

  for (let i = 1; i < recentBars.length - 1; i++) {
    const cur = recentBars[i];
    const prev = recentBars[i - 1];
    const next = recentBars[i + 1];

    if (cur.close != null && prev.close != null && next.close != null) {
      if (cur.close < prev.close && cur.close < next.close) {
        swingLows.push({ index: i, bar: cur });
      }
      if (cur.close > prev.close && cur.close > next.close) {
        swingHighs.push({ index: i, bar: cur });
      }
    }
  }

  let bullishDiv = null;
  let bullishIdx = -1;
  // 1. Evaluate Bullish Divergence using the last two swingLows
  if (swingLows.length >= 2) {
    const p1 = swingLows[swingLows.length - 2].bar;
    const p2 = swingLows[swingLows.length - 1].bar;

    // Bullish Divergence: Price makes Lower Low, but %K makes Higher Low
    if (
      p2.close < p1.close &&
      p2.slowK !== null &&
      p1.slowK !== null &&
      p2.slowK > p1.slowK &&
      p2.slowK < 35
    ) {
      bullishDiv = {
        type: 'BULLISH_DIVERGENCE',
        label: 'Bullish Divergence (Price Lower Low vs Stochastic Higher Low)',
        severity: 'bullish'
      };
      bullishIdx = swingLows[swingLows.length - 1].index;
    }
  }

  let bearishDiv = null;
  let bearishIdx = -1;
  // 2. Evaluate Bearish Divergence using the last two swingHighs
  if (swingHighs.length >= 2) {
    const p1 = swingHighs[swingHighs.length - 2].bar;
    const p2 = swingHighs[swingHighs.length - 1].bar;

    // Bearish Divergence: Price makes Higher High, but %K makes Lower High
    if (
      p2.close > p1.close &&
      p2.slowK !== null &&
      p1.slowK !== null &&
      p2.slowK < p1.slowK &&
      p2.slowK > 65
    ) {
      bearishDiv = {
        type: 'BEARISH_DIVERGENCE',
        label: 'Bearish Divergence (Price Higher High vs Stochastic Lower High)',
        severity: 'bearish'
      };
      bearishIdx = swingHighs[swingHighs.length - 1].index;
    }
  }

  // If both patterns occurred, return the one whose swing pivot formed most recently
  if (bullishDiv && bearishDiv) {
    return bullishIdx >= bearishIdx ? bullishDiv : bearishDiv;
  }
  return bullishDiv || bearishDiv || null;
}
