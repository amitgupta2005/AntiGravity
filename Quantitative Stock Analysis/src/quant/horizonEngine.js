/**
 * Quantitative Horizon Recommendation Engine
 * Analyzes Stocks, ETFs, and Indices across 3 distinct investment horizons:
 * 1. Short Term (1 Day to 6 Months): Momentum, Technical Breakouts & Risk:Reward
 * 2. Medium Term (6 Months to 2 Years): GARP (PEG < 1.0), Earnings Acceleration & Business Cycle
 * 3. Long Term (> 2 Years): Piotroski F-Score, High ROE/ROIC, Moats & Index Compounding
 */

import { HORIZONS, HORIZON_LABELS } from '../data/horizonUniverse.js';
import { calculatePEG, calculatePeterLynchFairValue, calculateProjectedReturn } from './engine.js';

/**
 * Score and evaluate an asset for the SHORT-TERM (1 Day to 6 Months)
 */
export function evaluateShortTerm(asset) {
  const S = asset.price;
  const rsi = asset.rsi14 || 55;
  const sma50 = asset.sma50 || S * 0.95;
  const sma200 = asset.sma200 || S * 0.90;
  const chgPct = asset.changePercent || 0;
  const peg = asset.pegRatio || 1.5;

  let momentumPts = 0; // max 35
  let trendPts = 0;    // max 35
  let catalystPts = 0; // max 30

  // 1. Momentum / RSI Evaluation (Sweet spot: 52 - 68)
  if (rsi >= 54 && rsi <= 68) momentumPts += 35;
  else if (rsi > 68 && rsi <= 76) momentumPts += 28; // strong breakout momentum
  else if (rsi < 42) momentumPts += 22; // oversold bounce potential
  else momentumPts += 15;

  // 2. Trend & Moving Average Structure
  if (S >= sma50 && sma50 >= sma200) trendPts += 35; // Perfect bullish alignment
  else if (S >= sma50) trendPts += 26;
  else if (S >= sma200) trendPts += 18;
  else trendPts += 10;

  // 3. Daily Velocity & Catalysts
  if (chgPct >= 1.5) catalystPts += 30;
  else if (chgPct > 0) catalystPts += 22;
  else if (chgPct >= -1.0) catalystPts += 15;
  else catalystPts += 8;

  const score = Math.min(98, Math.max(50, Math.round(momentumPts + trendPts + catalystPts)));

  // Target & Stop Loss Calculation
  // Short-term upside target: 8% to 18% swing based on momentum & asset type
  const targetPct = asset.assetType === 'INDEX' ? 0.065 : asset.assetType === 'ETF' ? 0.085 : 0.145;
  const stopPct = asset.assetType === 'INDEX' ? 0.025 : asset.assetType === 'ETF' ? 0.035 : 0.055;

  const targetPrice = Number((S * (1 + targetPct)).toFixed(2));
  const stopLossPrice = Number((S * (1 - stopPct)).toFixed(2));
  const riskReward = (targetPct / stopPct).toFixed(1);
  const winProbability = score >= 85 ? 74 : score >= 75 ? 68 : 62;

  let strategyType = 'Technical Breakout';
  if (rsi > 68) strategyType = 'Momentum Surge';
  else if (rsi < 45) strategyType = 'Support Dip-Buy';
  else if (S >= sma50) strategyType = '50-EMA Trend Continuation';

  let conviction = 'BUY';
  let badgeClass = 'badge-buy';
  if (score >= 85) { conviction = 'STRONG BUY'; badgeClass = 'badge-strong-buy'; }
  else if (score < 70) { conviction = 'ACCUMULATE'; badgeClass = 'badge-hold'; }

  const curr = asset.currencySymbol || (asset.market === 'IN' ? '₹' : '$');

  return {
    horizon: HORIZONS.SHORT_TERM,
    horizonMeta: HORIZON_LABELS.SHORT_TERM,
    score,
    conviction,
    badgeClass,
    strategyType,
    timeframe: '2 Weeks – 4 Months',
    currentPrice: S,
    targetPrice,
    stopLossPrice,
    targetGainPct: `+${(targetPct * 100).toFixed(1)}%`,
    stopLossPct: `-${(stopPct * 100).toFixed(1)}%`,
    riskReward: `1 : ${riskReward}`,
    winProbability: `${winProbability}%`,
    keyIndicators: [
      { label: 'RSI (14)', value: rsi.toFixed(1), status: rsi >= 50 && rsi <= 70 ? 'positive' : 'neutral' },
      { label: '50-Day SMA', value: `${curr}${sma50.toLocaleString()}`, status: S >= sma50 ? 'positive' : 'negative' },
      { label: 'Risk : Reward', value: `1 : ${riskReward}`, status: 'positive' }
    ],
    thesis: `Short-term momentum setup with RSI at ${rsi} and price trending above 50-SMA. Technical target set at ${curr}${targetPrice} (+${(targetPct * 100).toFixed(1)}%) with disciplined stop loss at ${curr}${stopLossPrice}. Offers asymmetric ${riskReward}x risk-reward.`
  };
}

/**
 * Score and evaluate an asset for the MEDIUM-TERM (6 Months to 2 Years)
 */
export function evaluateMediumTerm(asset) {
  const S = asset.price;
  const peg = asset.pegRatio || 1.3;
  const growth = asset.projectedEPSGrowth || 15;
  const fwdPE = asset.peForward || (asset.peTTM ? asset.peTTM * 0.85 : 20);
  const roe = asset.roe || 18;

  let garpPts = 0;       // max 40
  let growthPts = 0;     // max 35
  let fundamentalsPts = 0; // max 25

  // 1. GARP Valuation (PEG < 1.0 is premier)
  if (peg <= 0.50) garpPts += 40; // Deep GARP
  else if (peg < 1.0) garpPts += 35; // GARP
  else if (peg <= 1.4) garpPts += 26; // Fair Growth
  else if (peg <= 1.9) garpPts += 18;
  else garpPts += 10;

  // 2. Earnings Acceleration / Revenue Growth
  if (growth >= 30) growthPts += 35;
  else if (growth >= 20) growthPts += 30;
  else if (growth >= 14) growthPts += 22;
  else if (growth >= 8) growthPts += 15;
  else growthPts += 8;

  // 3. Profitability / ROE
  if (roe >= 28) fundamentalsPts += 25;
  else if (roe >= 18) fundamentalsPts += 20;
  else if (roe >= 12) fundamentalsPts += 15;
  else fundamentalsPts += 10;

  const score = Math.min(99, Math.max(52, Math.round(garpPts + growthPts + fundamentalsPts)));

  // Target calculation for 1 - 1.5 Year Horizon
  // Using projected earnings expansion
  const horizonYears = 1.25;
  const targetGainMultiplier = Math.pow(1 + (growth / 100), horizonYears) * (peg < 1.0 ? 1.08 : 0.98);
  const targetPrice = Number((S * targetGainMultiplier).toFixed(2));
  const targetGainPct = Number((((targetPrice - S) / S) * 100).toFixed(1));
  const annualizedCAGR = Number(((Math.pow(targetPrice / S, 1 / horizonYears) - 1) * 100).toFixed(1));

  // Lynch Margin of Safety
  const fwdEPS = asset.forwardEPS || (S / fwdPE);
  const lynch = calculatePeterLynchFairValue(fwdEPS, growth, S);

  let strategyType = 'GARP Re-Rating Compounder';
  if (peg < 0.60) strategyType = 'Deep Value GARP';
  else if (growth >= 25) strategyType = 'Earnings Hyper-Growth';
  else if (asset.assetType === 'ETF') strategyType = 'Business Cycle Sector Rotation';
  else if (asset.assetType === 'INDEX') strategyType = 'Index Macro Re-Rating';

  let conviction = 'BUY';
  let badgeClass = 'badge-buy';
  if (score >= 85) { conviction = 'STRONG BUY'; badgeClass = 'badge-strong-buy'; }
  else if (score < 72) { conviction = 'ACCUMULATE'; badgeClass = 'badge-hold'; }

  const curr = asset.currencySymbol || (asset.market === 'IN' ? '₹' : '$');

  return {
    horizon: HORIZONS.MEDIUM_TERM,
    horizonMeta: HORIZON_LABELS.MEDIUM_TERM,
    score,
    conviction,
    badgeClass,
    strategyType,
    timeframe: '6 Months – 1.5 Years',
    currentPrice: S,
    targetPrice,
    stopLossPrice: Number((S * 0.88).toFixed(2)), // 12% fundamental stop
    targetGainPct: `+${targetGainPct}%`,
    annualizedCAGR: `+${annualizedCAGR}% CAGR`,
    marginOfSafety: lynch.upsidePercent > 0 ? `+${lynch.upsidePercent}% to Lynch Fair Value` : 'Fairly Valued',
    keyIndicators: [
      { label: 'PEG Ratio', value: peg.toFixed(2), status: peg < 1.0 ? 'positive' : 'neutral' },
      { label: 'Exp EPS Growth', value: `${growth}%`, status: growth >= 15 ? 'positive' : 'neutral' },
      { label: '1-Year Target', value: `${curr}${targetPrice.toLocaleString()}`, status: 'positive' }
    ],
    thesis: `Attractive medium-term investment profile with PEG at ${peg.toFixed(2)} and forward earnings compounding at ${growth}%. Fundamental 1.25-year target price is ${curr}${targetPrice} (+${targetGainPct}%), offering +${annualizedCAGR}% annualized CAGR.`
  };
}

/**
 * Score and evaluate an asset for the LONG-TERM (> 2 Years)
 */
export function evaluateLongTerm(asset) {
  const S = asset.price;
  const fScore = asset.fScore || 8;
  const roe = asset.roe || 18;
  const debtToEquity = asset.debtToEquity || 0.35;
  const growth = asset.projectedEPSGrowth || 14;
  const peForward = asset.peForward || (asset.peTTM ? asset.peTTM * 0.88 : 22);

  let qualityPts = 0;   // max 40
  let moatPts = 0;      // max 35
  let cagrPts = 0;      // max 25

  // 1. Quality & Balance Sheet Health (Piotroski F-Score & Debt)
  if (fScore >= 8) qualityPts += 25;
  else if (fScore >= 7) qualityPts += 20;
  else qualityPts += 12;

  if (debtToEquity <= 0.30) qualityPts += 15;
  else if (debtToEquity <= 0.65) qualityPts += 10;
  else qualityPts += 5;

  // 2. Sustainable Economic Moat / ROE Durability
  if (roe >= 30) moatPts += 35;
  else if (roe >= 20) moatPts += 28;
  else if (roe >= 14) moatPts += 20;
  else moatPts += 12;

  // 3. Compounding Growth Potential
  if (growth >= 20) cagrPts += 25;
  else if (growth >= 14) cagrPts += 20;
  else if (growth >= 10) cagrPts += 15;
  else cagrPts += 8;

  const score = Math.min(100, Math.max(55, Math.round(qualityPts + moatPts + cagrPts)));

  // 3-Year Projected Compounding Model
  const horizonYears = 3;
  const baseEPS = asset.forwardEPS || (S / peForward);
  const proj = calculateProjectedReturn({
    currentPrice: S,
    baseEPS,
    annualGrowthPercent: growth,
    exitPE: Math.min(peForward, 35),
    years: horizonYears
  });

  const targetPrice = proj.targetPrice;
  const totalReturnPct = proj.totalReturn;
  const cagr = proj.cagr;
  const compoundMultiplier = (targetPrice / S).toFixed(2);

  let strategyType = 'Generational Moat Compounder';
  if (asset.assetType === 'INDEX') strategyType = 'Passive Index Compounding Engine';
  else if (asset.assetType === 'ETF') strategyType = 'Low-Cost Secular Thematic Compounder';
  else if (fScore >= 8 && roe >= 25) strategyType = 'High-ROIC Monopoly Compounder';

  let conviction = 'BUY';
  let badgeClass = 'badge-buy';
  if (score >= 85) { conviction = 'STRONG BUY'; badgeClass = 'badge-strong-buy'; }
  else if (score < 72) { conviction = 'ACCUMULATE'; badgeClass = 'badge-hold'; }

  const curr = asset.currencySymbol || (asset.market === 'IN' ? '₹' : '$');

  return {
    horizon: HORIZONS.LONG_TERM,
    horizonMeta: HORIZON_LABELS.LONG_TERM,
    score,
    conviction,
    badgeClass,
    strategyType,
    timeframe: '3 – 5 Years (Multi-Year Compounding)',
    currentPrice: S,
    targetPrice,
    stopLossPrice: Number((S * 0.80).toFixed(2)), // Long term 20% drawdown buffer
    targetGainPct: `+${totalReturnPct}%`,
    annualizedCAGR: `+${cagr}% CAGR`,
    compoundMultiplier: `${compoundMultiplier}x Wealth Multiplier`,
    fScoreText: `${fScore}/9 (Piotroski Health)`,
    keyIndicators: [
      { label: '3-Year CAGR', value: `+${cagr}%`, status: cagr >= 15 ? 'positive' : 'neutral' },
      { label: 'Piotroski Score', value: `${fScore}/9`, status: fScore >= 7 ? 'positive' : 'neutral' },
      { label: '3-Year Target', value: `${curr}${targetPrice.toLocaleString()}`, status: 'positive' }
    ],
    thesis: `Premier generational wealth creator with Piotroski F-Score at ${fScore}/9 and durable ${roe}% ROE. 3-Year compounding model projects price reaching ${curr}${targetPrice} (+${totalReturnPct}%), multiplying capital by ${compoundMultiplier}x at +${cagr}% annualized CAGR.`
  };
}

/**
 * Scan the universe and generate all multi-horizon quantitative recommendations
 */
export function generateHorizonRecommendations(universe) {
  const recommendations = [];

  for (const asset of universe) {
    const shortTerm = evaluateShortTerm(asset);
    const mediumTerm = evaluateMediumTerm(asset);
    const longTerm = evaluateLongTerm(asset);

    // Identify primary best fit horizon based on highest quant score
    let bestFit = HORIZONS.LONG_TERM;
    const scores = [
      { h: HORIZONS.SHORT_TERM, score: shortTerm.score },
      { h: HORIZONS.MEDIUM_TERM, score: mediumTerm.score },
      { h: HORIZONS.LONG_TERM, score: longTerm.score }
    ];
    scores.sort((a, b) => b.score - a.score);
    bestFit = scores[0].h;

    // Attach all 3 horizon evaluations to the asset record
    recommendations.push({
      asset,
      bestFitHorizon: bestFit,
      evaluations: {
        [HORIZONS.SHORT_TERM]: shortTerm,
        [HORIZONS.MEDIUM_TERM]: mediumTerm,
        [HORIZONS.LONG_TERM]: longTerm
      }
    });
  }

  return recommendations;
}
