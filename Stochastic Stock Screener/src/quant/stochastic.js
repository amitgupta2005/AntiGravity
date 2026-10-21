/**
 * Stochastic Oscillator on a Closing Basis Engine
 * Default parameters: %K = 4, %K Smoothing = 3, %D Signal = 3
 * Evaluated strictly on Closing Prices (Close-Only Stochastic)
 */

export const DEFAULT_STOCHASTIC_PARAMS = {
  kPeriod: 4,
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

  // Determine Divergence Pattern across last 15-20 bars
  const divergence = detectDivergence(series.slice(-20));

  // Check 3-bar velocity of %K
  let velocity = 0;
  if (prev1 && prev1.slowK !== null && latest.slowK !== null) {
    velocity = Number((latest.slowK - prev1.slowK).toFixed(2));
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
    isOverbought: latest.slowK >= opts.overboughtThreshold,
    isOversold: latest.slowK <= opts.oversoldThreshold,
    isBullishCross: latest.signalType.includes('BULLISH_CROSSOVER'),
    isBearishCross: latest.signalType.includes('BEARISH_CROSSOVER'),
    kPeriod: opts.kPeriod,
    kSmoothing: opts.kSmoothing,
    dPeriod: opts.dPeriod,
    useClosingOnly: opts.useClosingOnly,
    history: series.slice(-30) // last 30 bars for mini sparkline or modal inspection
  };
}

/**
 * Detect Regular Bullish and Bearish Divergences on a Closing Basis
 */
function detectDivergence(recentBars) {
  if (recentBars.length < 8) return null;

  // Find swing lows and swing highs on close
  let lowestBarIdx = 0;
  let secondLowestBarIdx = -1;

  for (let i = 1; i < recentBars.length - 2; i++) {
    const cur = recentBars[i];
    const prev = recentBars[i - 1];
    const next = recentBars[i + 1];

    if (cur.close < prev.close && cur.close < next.close) {
      if (secondLowestBarIdx === -1) {
        secondLowestBarIdx = i;
      } else {
        lowestBarIdx = i;
      }
    }
  }

  if (secondLowestBarIdx !== -1 && lowestBarIdx !== -1 && lowestBarIdx > secondLowestBarIdx) {
    const p1 = recentBars[secondLowestBarIdx];
    const p2 = recentBars[lowestBarIdx];

    // Bullish Divergence: Price makes Lower Low, but %K makes Higher Low
    if (p2.close < p1.close && p2.slowK !== null && p1.slowK !== null && p2.slowK > p1.slowK && p2.slowK < 35) {
      return {
        type: 'BULLISH_DIVERGENCE',
        label: 'Bullish Divergence (Price Lower Low vs Stochastic Higher Low)',
        severity: 'bullish'
      };
    }

    // Bearish Divergence: Price makes Higher High, but %K makes Lower High
    if (p2.close > p1.close && p2.slowK !== null && p1.slowK !== null && p2.slowK < p1.slowK && p2.slowK > 65) {
      return {
        type: 'BEARISH_DIVERGENCE',
        label: 'Bearish Divergence (Price Higher High vs Stochastic Lower High)',
        severity: 'bearish'
      };
    }
  }

  return null;
}
