/**
 * Quant Financial Engineering Models
 * Implements PEG ratio, Peter Lynch GARP valuation, EPS compounding,
 * expected CAGR projections, multi-factor scoring, and sensitivity matrix.
 */

export function calculatePEG(pe, epsGrowthPercent) {
  if (!epsGrowthPercent || epsGrowthPercent <= 0) return 999.0;
  return Number((pe / epsGrowthPercent).toFixed(2));
}

export function getPEGClassification(peg) {
  if (peg <= 0) return { label: 'Negative / Loss', class: 'tag-neutral', garp: false };
  if (peg <= 0.50) return { label: 'Extreme Deep GARP (PEG ≤ 0.50)', class: 'tag-emerald-glow', garp: true };
  if (peg < 1.0) return { label: 'GARP Undervalued (PEG < 1.0)', class: 'tag-emerald', garp: true };
  if (peg <= 1.5) return { label: 'Fair Valuation (1.0 ≤ PEG ≤ 1.5)', class: 'tag-amber', garp: false };
  if (peg <= 2.2) return { label: 'Growth Premium (1.5 < PEG ≤ 2.2)', class: 'tag-orange', garp: false };
  return { label: 'High Valuation (PEG > 2.2)', class: 'tag-rose', garp: false };
}

/**
 * Peter Lynch Fair Value Model
 * Lynch postulated: A fairly valued growth stock has P/E equal to its growth rate.
 * Fair Value = Forward EPS * EPS Growth Rate (%)
 */
export function calculatePeterLynchFairValue(forwardEPS, epsGrowthPercent, currentPrice) {
  // Fair P/E is set equal to growth rate capped at 45x to prevent absurd extrapolations
  const fairMultiple = Math.min(Math.max(epsGrowthPercent, 8), 45);
  const fairValue = Number((forwardEPS * fairMultiple).toFixed(2));
  const upsidePercent = Number((((fairValue - currentPrice) / currentPrice) * 100).toFixed(1));
  const marginOfSafety = Number((((fairValue - currentPrice) / fairValue) * 100).toFixed(1));

  return {
    fairValue,
    fairMultiple,
    upsidePercent,
    marginOfSafety,
    isUndervalued: fairValue > currentPrice
  };
}

/**
 * EPS Projections and Stock Return Model
 * Future EPS = Base EPS * (1 + g)^n
 * Target Price = Future EPS * Exit PE
 * Return (%) = (Target Price - Current Price) / Current Price * 100
 * CAGR (%) = ((Target Price / Current Price) ^ (1/n) - 1) * 100
 */
export function calculateProjectedReturn({
  currentPrice,
  baseEPS,
  annualGrowthPercent,
  exitPE,
  years = 3
}) {
  const g = annualGrowthPercent / 100;
  const projectedEPS = Number((baseEPS * Math.pow(1 + g, years)).toFixed(2));
  const targetPrice = Number((projectedEPS * exitPE).toFixed(2));
  
  const totalReturn = Number((((targetPrice - currentPrice) / currentPrice) * 100).toFixed(1));
  const cagr = Number(((Math.pow(targetPrice / currentPrice, 1 / years) - 1) * 100).toFixed(1));
  
  return {
    projectedEPS,
    targetPrice,
    totalReturn,
    cagr,
    dollarGain: Number((targetPrice - currentPrice).toFixed(2)),
    years
  };
}

/**
 * Scenario Analysis: Bear, Base, Bull Cases
 */
export function calculateScenarios({
  currentPrice,
  baseEPS,
  growthBase,
  peBase,
  years = 3
}) {
  // Bear case: 30% lower growth, 20% multiple compression
  const bearGrowth = Math.max(5, growthBase * 0.70);
  const bearPE = Math.max(10, peBase * 0.80);
  const bear = calculateProjectedReturn({
    currentPrice,
    baseEPS,
    annualGrowthPercent: bearGrowth,
    exitPE: bearPE,
    years
  });

  // Base case: baseline consensus
  const base = calculateProjectedReturn({
    currentPrice,
    baseEPS,
    annualGrowthPercent: growthBase,
    exitPE: peBase,
    years
  });

  // Bull case: 25% higher growth, 15% multiple expansion
  const bullGrowth = growthBase * 1.25;
  const bullPE = peBase * 1.15;
  const bull = calculateProjectedReturn({
    currentPrice,
    baseEPS,
    annualGrowthPercent: bullGrowth,
    exitPE: bullPE,
    years
  });

  // Probability-weighted expected CAGR (Bear 25%, Base 50%, Bull 25%)
  const weightedCAGR = Number((bear.cagr * 0.25 + base.cagr * 0.50 + bull.cagr * 0.25).toFixed(1));
  const weightedTarget = Number((bear.targetPrice * 0.25 + base.targetPrice * 0.50 + bull.targetPrice * 0.25).toFixed(2));

  return {
    bear: { ...bear, growth: Number(bearGrowth.toFixed(1)), exitPE: Number(bearPE.toFixed(1)), weight: 25 },
    base: { ...base, growth: Number(growthBase.toFixed(1)), exitPE: Number(peBase.toFixed(1)), weight: 50 },
    bull: { ...bull, growth: Number(bullGrowth.toFixed(1)), exitPE: Number(bullPE.toFixed(1)), weight: 25 },
    weightedCAGR,
    weightedTarget
  };
}

/**
 * 2D Sensitivity Matrix for Sensitivity Heatmap
 * Generates combinations of Growth Rates x Exit P/E Multiples
 */
export function generateSensitivityMatrix({
  currentPrice,
  baseEPS,
  growthBase,
  peBase,
  years = 3
}) {
  // Growth steps: -8%, -4%, 0%, +4%, +8%
  const growthOffsets = [-8, -4, 0, 4, 8];
  // P/E steps: -6x, -3x, 0x, +3x, +6x
  const peOffsets = [-6, -3, 0, 3, 6];

  const matrix = [];

  for (const gOff of growthOffsets) {
    const rowGrowth = Math.max(4, Number((growthBase + gOff).toFixed(1)));
    const row = {
      growth: rowGrowth,
      cells: []
    };

    for (const peOff of peOffsets) {
      const colPE = Math.max(8, Number((peBase + peOff).toFixed(1)));
      const result = calculateProjectedReturn({
        currentPrice,
        baseEPS,
        annualGrowthPercent: rowGrowth,
        exitPE: colPE,
        years
      });
      row.cells.push({
        pe: colPE,
        cagr: result.cagr,
        targetPrice: result.targetPrice,
        isBase: gOff === 0 && peOff === 0
      });
    }
    matrix.push(row);
  }

  return {
    peHeaders: peOffsets.map(off => Math.max(8, Number((peBase + off).toFixed(1)))),
    rows: matrix
  };
}

/**
 * Multi-Factor Quantitative Rating Engine (Score 0 - 100)
 */
export function calculateQuantScore(stock) {
  let valScore = 0; // max 30
  let growthScore = 0; // max 25
  let qualityScore = 0; // max 25
  let momentumScore = 0; // max 20

  const peg = stock.pegRatio;
  const fwdPE = stock.peForward;
  const epsGrowth = stock.projectedEPSGrowth;

  // 1. Valuation Factor (0 - 30)
  if (peg <= 0.60) valScore += 30;
  else if (peg < 1.0) valScore += 26;
  else if (peg <= 1.3) valScore += 20;
  else if (peg <= 1.8) valScore += 14;
  else if (peg <= 2.5) valScore += 8;
  else valScore += 4;

  // 2. Growth Factor (0 - 25)
  if (epsGrowth >= 30) growthScore += 25;
  else if (epsGrowth >= 22) growthScore += 21;
  else if (epsGrowth >= 15) growthScore += 16;
  else if (epsGrowth >= 10) growthScore += 11;
  else growthScore += 6;

  // 3. Quality Factor (0 - 25)
  // ROE component (max 10)
  if (stock.roe >= 35) qualityScore += 10;
  else if (stock.roe >= 20) qualityScore += 8;
  else if (stock.roe >= 12) qualityScore += 5;
  else qualityScore += 2;

  // Net Margin component (max 8)
  if (stock.netMargin >= 30) qualityScore += 8;
  else if (stock.netMargin >= 18) qualityScore += 6;
  else if (stock.netMargin >= 10) qualityScore += 4;
  else qualityScore += 2;

  // Balance sheet health / Debt to Equity (max 7)
  if (stock.debtToEquity <= 0.25) qualityScore += 7;
  else if (stock.debtToEquity <= 0.60) qualityScore += 5;
  else if (stock.debtToEquity <= 1.20) qualityScore += 3;
  else qualityScore += 1;

  // 4. Momentum & Technicals (0 - 20)
  // RSI (max 7)
  if (stock.rsi14 >= 50 && stock.rsi14 <= 68) momentumScore += 7; // sweet spot
  else if (stock.rsi14 < 40) momentumScore += 5; // oversold bounce potential
  else momentumScore += 3;

  // Price vs 50 SMA (max 7)
  if (stock.price >= stock.sma50) momentumScore += 7;
  else if (stock.price >= stock.sma50 * 0.95) momentumScore += 4;
  else momentumScore += 1;

  // Golden Cross (50 SMA > 200 SMA) (max 6)
  if (stock.sma50 > stock.sma200) momentumScore += 6;
  else momentumScore += 2;

  const totalScore = Math.min(100, Math.round(valScore + growthScore + qualityScore + momentumScore));

  let rating = 'HOLD';
  let badgeClass = 'badge-hold';
  let summary = 'Neutral risk-adjusted profile with balanced growth & multiple.';

  if (totalScore >= 85) {
    rating = 'STRONG BUY';
    badgeClass = 'badge-strong-buy';
    summary = 'High quantitative conviction: Superior earnings growth with favorable PEG < 1 GARP valuation.';
  } else if (totalScore >= 72) {
    rating = 'BUY';
    badgeClass = 'badge-buy';
    summary = 'Positive factor alignment across earnings momentum, profitability, and reasonable multiples.';
  } else if (totalScore >= 55) {
    rating = 'HOLD / ACCUMULATE';
    badgeClass = 'badge-hold';
    summary = 'Solid fundamentals, but valuation or near-term momentum limits immediate margin of safety.';
  } else if (totalScore >= 42) {
    rating = 'UNDERWEIGHT';
    badgeClass = 'badge-underweight';
    summary = 'Elevated valuation multiple relative to projected EPS growth rate (PEG > 2.0).';
  } else {
    rating = 'SELL / TRIM';
    badgeClass = 'badge-sell';
    summary = 'Unfavorable factor mix: growth deceleration or rich multiple relative to industry peers.';
  }

  return {
    totalScore,
    rating,
    badgeClass,
    summary,
    breakdown: {
      valuation: valScore,
      growth: growthScore,
      quality: qualityScore,
      momentum: momentumScore
    }
  };
}
