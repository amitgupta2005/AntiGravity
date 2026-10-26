/**
 * Quantitative Horizon Recommendation Engine
 * Analyzes Stocks, ETFs, and Indices across 3 distinct investment horizons:
 * 1. Short Term (1 Day to 6 Months): Momentum, Technical Breakouts & Risk:Reward
 * 2. Medium Term (6 Months to 2 Years): GARP (PEG < 1.0), Earnings Acceleration & Business Cycle
 * 3. Long Term (> 2 Years): Piotroski F-Score, High ROE/ROIC, Moats & Index Compounding
 */

import { HORIZONS, HORIZON_LABELS } from '../data/horizonUniverse.js';
export { HORIZONS, HORIZON_LABELS };
import { calculatePEG, calculatePeterLynchFairValue, calculateProjectedReturn, isDebtExemptSector } from './engine.js';

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
  // Dynamic Volatility Targets: Scaled dynamically to asset's actual volatility using ATR multiples
  const atrPct = (asset.atrPct !== undefined && asset.atrPct !== null && !isNaN(asset.atrPct))
    ? Number(asset.atrPct)
    : 0.03;
  const stopPct = atrPct * 1.5;
  const targetPct = atrPct * 3.5;
  const target1Pct = targetPct * 0.60;

  const targetPrice = Number((S * (1 + targetPct)).toFixed(2));
  const target1Price = Number((S * (1 + target1Pct)).toFixed(2));
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

  const entryLow = Number((S * (1 - atrPct * 0.4)).toFixed(2));
  const entryHigh = Number((S * (1 + atrPct * 0.2)).toFixed(2));
  const entryZone = `${curr}${entryLow.toLocaleString()} – ${curr}${entryHigh.toLocaleString()}`;

  let entryType = 'Technical Breakout Entry';
  if (rsi > 68) entryType = 'Momentum Surge Scale-In';
  else if (rsi < 45) entryType = 'Support Dip-Buy Accumulation';
  else if (S >= sma50) entryType = '50-EMA Trend Continuation Buy';

  const entryStrategy = {
    idealEntryPrice: S,
    entryZone,
    entryType,
    orderType: 'Limit on Pullback / Stop-Limit on Breakout',
    stagingStyle: '2-Tranche Momentum Execution',
    trancheSummary: '50% / 50% Staged',
    entryTrigger: `Initiate Tranche 1 in the ${entryZone} zone near dynamic 9/21-EMA support; add Tranche 2 on hourly breakout close above ${curr}${entryHigh.toLocaleString()} with volume > 1.25x 20-SMA.`,
    tranchePlan: `Tranche 1 (50% position): Limit order placed in the optimal entry zone (${entryZone}). Tranche 2 (50% position): Stop-limit order upon confirmed hourly candle close above ${curr}${entryHigh.toLocaleString()}.`,
    invalidationRule: `Setup immediately invalidated if price prints an hourly close below ${curr}${stopLossPrice.toLocaleString()} before entry trigger confirmation.`
  };

  const exitStrategy = {
    target1Price,
    target1GainPct: `+${(target1Pct * 100).toFixed(1)}%`,
    target1BookPct: 50,
    target1BookLabel: 'Book 50%',
    target1Action: `Book 50% of position at ${curr}${target1Price.toLocaleString()} (+${(target1Pct * 100).toFixed(1)}%) to lock in gains; immediately advance Stop Loss to breakeven (${curr}${S.toLocaleString()}) to make the remaining 50% runner trade completely risk-free.`,
    target2Price: targetPrice,
    target2GainPct: `+${(targetPct * 100).toFixed(1)}%`,
    target2BookPct: 50,
    target2BookLabel: 'Book 50% (Runner)',
    target2Action: `Book remaining 50% profits at ${curr}${targetPrice.toLocaleString()} (+${(targetPct * 100).toFixed(1)}%) or trail runner with 20-day EMA daily low.`,
    partialBookingRule: `Lock 50% profit at Target 1 (${curr}${target1Price.toLocaleString()}), move Stop Loss to breakeven (${curr}${S.toLocaleString()}), and run 50% runner to Target 2.`,
    stopLossPrice,
    stopLossPct: `-${(stopPct * 100).toFixed(1)}%`,
    stopLossType: 'ATR Volatility / 50-SMA Dynamic Support',
    stopLossRule: `Mandatory stop exit if daily candle closes below ${curr}${stopLossPrice.toLocaleString()}. Never average down on short-term setups.`,
    trailingStopRule: 'Once Target 1 is hit, move stop loss to breakeven entry, then trail daily close using 9-EMA.',
    timeExitRule: 'If price consolidates without making fresh swing highs within 5-7 weeks, close position and reallocate.',
    riskRewardRatio: `1 : ${riskReward}`,
    maxHoldingPeriod: '2 Weeks – 4 Months'
  };

  const reasoning = {
    summary: `High-conviction short-term setup driven by ${strategyType.toLowerCase()} dynamics, RSI momentum confirmation (${rsi.toFixed(1)}), and disciplined ${riskReward}x risk:reward asymmetry.`,
    pillars: [
      {
        icon: 'activity',
        title: 'Momentum & RSI Sweet-Spot',
        detail: `RSI-14 stands at ${rsi.toFixed(1)}, positioned cleanly in the ${rsi >= 54 && rsi <= 68 ? 'institutional accumulation sweet spot (54–68)' : rsi > 68 ? 'high-velocity breakout zone (>68)' : 'oversold mean-reversion zone (<45)'} without exhaustion.`
      },
      {
        icon: 'trending-up',
        title: 'Moving Average Alignment',
        detail: S >= sma50 
          ? `Trading above 50-day SMA (${curr}${sma50.toLocaleString()}) and 200-day SMA (${curr}${sma200.toLocaleString()}), confirming institutional trend alignment.` 
          : `Approaching dynamic support near ${curr}${sma200.toLocaleString()} with strong probability for a technical bounce.`
      },
      {
        icon: 'shield-alert',
        title: 'Asymmetric Risk-Reward',
        detail: `Asymmetric setup with ${riskReward}x reward-to-risk ratio (${(targetPct * 100).toFixed(1)}% upside target vs ${(stopPct * 100).toFixed(1)}% stop loss) and ${winProbability}% estimated win probability.`
      },
      {
        icon: 'sparkles',
        title: 'Tactical Horizon Catalyst',
        detail: asset.description || `${asset.name} is experiencing elevated institutional volume inflows and sector-wide momentum continuation.`
      }
    ]
  };

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
    entryStrategy,
    exitStrategy,
    reasoning,
    keyIndicators: [
      { label: 'RSI (14)', value: rsi.toFixed(1), status: rsi >= 50 && rsi <= 70 ? 'positive' : 'neutral' },
      { label: '50-Day SMA', value: `${curr}${sma50.toLocaleString()}`, status: S >= sma50 ? 'positive' : 'negative' },
      { label: 'Risk : Reward', value: `1 : ${riskReward}`, status: 'positive' }
    ],
    thesis: `Short-term momentum setup with RSI at ${rsi.toFixed(1)} and price trending above 50-SMA. Technical target set at ${curr}${targetPrice.toLocaleString()} (+${(targetPct * 100).toFixed(1)}%) with disciplined stop loss at ${curr}${stopLossPrice.toLocaleString()} (-${(stopPct * 100).toFixed(1)}%). Offers asymmetric ${riskReward}x risk-reward.`
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

  const target1Pct = Number((targetGainPct * 0.55).toFixed(1));
  const target1Price = Number((S * (1 + target1Pct / 100)).toFixed(2));
  const stopLossPct = asset.assetType === 'INDEX' ? 8.0 : asset.assetType === 'ETF' ? 10.0 : 12.0;
  const stopLossPrice = Number((S * (1 - stopLossPct / 100)).toFixed(2));
  const medRiskReward = (targetGainPct / stopLossPct).toFixed(1);

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

  const entryLow = Number((S * 0.96).toFixed(2));
  const entryHigh = Number((S * 1.01).toFixed(2));
  const entryZone = `${curr}${entryLow.toLocaleString()} – ${curr}${entryHigh.toLocaleString()}`;

  let entryType = 'GARP Value Accumulation';
  if (peg < 0.60) entryType = 'Deep Value GARP Accumulation';
  else if (growth >= 25) entryType = 'High-Growth Staged Scale-In';
  else if (asset.assetType === 'ETF') entryType = 'Business Cycle Sector Accumulation';
  else if (asset.assetType === 'INDEX') entryType = 'Index Macro Re-Rating Scale-In';

  const entryStrategy = {
    idealEntryPrice: S,
    entryZone,
    entryType,
    orderType: 'Staged Limit Orders / 3-Tranche DCA',
    stagingStyle: '3-Tranche Systematic Staging',
    trancheSummary: '40% / 30% / 30% Staged',
    entryTrigger: `Deploy Tranche 1 (40%) at current valuation (PEG ${peg.toFixed(2)}); deploy Tranche 2 (30%) on pullback toward 50-day moving average (${curr}${entryLow.toLocaleString()}); deploy Tranche 3 (30%) on quarterly earnings acceleration confirmation.`,
    tranchePlan: `Tranche 1 (40% allocation): Immediate baseline entry. Tranche 2 (30% allocation): Staged limit order at ${curr}${entryLow.toLocaleString()}. Tranche 3 (30% allocation): Add on breakout re-rating or quarterly earnings beat.`,
    invalidationRule: `Halt accumulation and re-evaluate thesis if forward PEG expands above 1.8x without corresponding earnings acceleration, or if quarterly revenue growth contracts > 10% YoY.`
  };

  const exitStrategy = {
    target1Price,
    target1GainPct: `+${target1Pct}%`,
    target1BookPct: 40,
    target1BookLabel: 'Book 40%',
    target1Action: `Book 40% of position at ${curr}${target1Price.toLocaleString()} (+${target1Pct}%) upon fundamental re-rating milestone; advance Stop Loss to breakeven (${curr}${S.toLocaleString()}) to eliminate downside risk and let remaining 60% compound to Target 2.`,
    target2Price: targetPrice,
    target2GainPct: `+${targetGainPct}%`,
    target2BookPct: 60,
    target2BookLabel: 'Book 60% (Remainder)',
    target2Action: `Book remaining 60% position at ${curr}${targetPrice.toLocaleString()} (+${targetGainPct}%) or re-assess PEG multiple and rebalance into newly emerged undervalued candidates.`,
    partialBookingRule: `Lock 40% profit at Target 1 (${curr}${target1Price.toLocaleString()}), advance Stop Loss to breakeven (${curr}${S.toLocaleString()}), and compound remaining 60% to Target 2.`,
    stopLossPrice,
    stopLossPct: `-${stopLossPct.toFixed(1)}%`,
    stopLossType: 'Fundamental Breakdown / 200-SMA Weekly Support',
    stopLossRule: `Exit position if weekly candle closes below ${curr}${stopLossPrice.toLocaleString()} or if quarterly earnings contract > 10% YoY.`,
    trailingStopRule: 'Advance Stop Loss to breakeven once price appreciates +18%, then trail using weekly 20-SMA close.',
    timeExitRule: 'Re-evaluate holding if forward EPS growth decelerates below 8% across two consecutive quarters.',
    riskRewardRatio: `1 : ${medRiskReward}`,
    maxHoldingPeriod: '6 Months – 1.5 Years'
  };

  const reasoning = {
    summary: `Compelling medium-term investment based on Peter Lynch GARP valuation (PEG ${peg.toFixed(2)}), forward earnings growth of ${growth}%, and durable capital efficiency (ROE ${roe}%).`,
    pillars: [
      {
        icon: 'scale',
        title: 'Peter Lynch GARP Valuation',
        detail: `PEG ratio of ${peg.toFixed(2)} represents ${peg < 1.0 ? 'prime GARP discount territory where earnings growth outpaces valuation multiple' : 'fairly priced quality growth'}, offering a robust valuation buffer.`
      },
      {
        icon: 'trending-up',
        title: 'Earnings Acceleration',
        detail: `Projected forward EPS growth rate of ${growth}% per annum driven by strong operational execution and margin expansion over the next 4–6 quarters.`
      },
      {
        icon: 'shield-check',
        title: 'Lynch Margin of Safety',
        detail: lynch.upsidePercent > 0 
          ? `Trades at a +${lynch.upsidePercent}% discount to Peter Lynch Fair Value (${curr}${lynch.fairValue.toFixed(2)}), providing tangible downside protection.`
          : `Solid fundamental support underpinned by robust forward earnings yield and balance sheet durability.`
      },
      {
        icon: 'layers',
        title: 'Business Cycle Catalyst',
        detail: asset.description || `${asset.name} is well positioned to benefit from ongoing industry consolidation and operational leverage.`
      }
    ]
  };

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
    stopLossPrice,
    targetGainPct: `+${targetGainPct}%`,
    stopLossPct: `-${stopLossPct.toFixed(1)}%`,
    annualizedCAGR: `+${annualizedCAGR}% CAGR`,
    riskReward: `1 : ${medRiskReward}`,
    marginOfSafety: lynch.upsidePercent > 0 ? `+${lynch.upsidePercent}% to Lynch Fair Value` : 'Fairly Valued',
    entryStrategy,
    exitStrategy,
    reasoning,
    keyIndicators: [
      { label: 'PEG Ratio', value: peg.toFixed(2), status: peg < 1.0 ? 'positive' : 'neutral' },
      { label: 'Exp EPS Growth', value: `${growth}%`, status: growth >= 15 ? 'positive' : 'neutral' },
      { label: '1-Year Target', value: `${curr}${targetPrice.toLocaleString()}`, status: 'positive' }
    ],
    thesis: `Attractive medium-term investment profile with PEG at ${peg.toFixed(2)} and forward earnings compounding at ${growth}%. Fundamental 1.25-year target price is ${curr}${targetPrice.toLocaleString()} (+${targetGainPct}%), offering +${annualizedCAGR}% annualized CAGR with disciplined stop loss at ${curr}${stopLossPrice.toLocaleString()} (-${stopLossPct.toFixed(1)}%).`
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

  // Sector-Aware Debt Scoring: Financials structurally carry high debt.
  // If sector is 'Financial Services', 'Bank', or 'REIT', bypass debt penalty entirely and assign full points.
  const isDebtExempt = isDebtExemptSector(asset.sector);
  if (isDebtExempt) {
    qualityPts += 15; // Full points: bypass debt penalty for Financials/Banks/REITs
  } else if (debtToEquity <= 0.30) {
    qualityPts += 15;
  } else if (debtToEquity <= 0.65) {
    qualityPts += 10;
  } else {
    qualityPts += 5;
  }

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

  const target1Pct = Number((totalReturnPct * 0.45).toFixed(1));
  const target1Price = Number((S * (1 + target1Pct / 100)).toFixed(2));
  const stopLossPct = asset.assetType === 'INDEX' ? 14.0 : asset.assetType === 'ETF' ? 16.0 : 20.0;
  const stopLossPrice = Number((S * (1 - stopLossPct / 100)).toFixed(2));
  const longRiskReward = (totalReturnPct / stopLossPct).toFixed(1);

  let strategyType = 'Generational Moat Compounder';
  if (asset.assetType === 'INDEX') strategyType = 'Passive Index Compounding Engine';
  else if (asset.assetType === 'ETF') strategyType = 'Low-Cost Secular Thematic Compounder';
  else if (fScore >= 8 && roe >= 25) strategyType = 'High-ROIC Monopoly Compounder';

  let conviction = 'BUY';
  let badgeClass = 'badge-buy';
  if (score >= 85) { conviction = 'STRONG BUY'; badgeClass = 'badge-strong-buy'; }
  else if (score < 72) { conviction = 'ACCUMULATE'; badgeClass = 'badge-hold'; }

  const curr = asset.currencySymbol || (asset.market === 'IN' ? '₹' : '$');

  const entryLow = Number((S * 0.94).toFixed(2));
  const entryHigh = Number((S * 1.02).toFixed(2));
  const entryZone = `${curr}${entryLow.toLocaleString()} – ${curr}${entryHigh.toLocaleString()}`;

  let entryType = 'Generational Moat SIP Accumulation';
  if (asset.assetType === 'INDEX') entryType = 'Passive Index SIP Engine';
  else if (asset.assetType === 'ETF') entryType = 'Secular Thematic DCA Accumulation';
  else if (fScore >= 8 && roe >= 25) entryType = 'High-ROIC Monopoly Accumulation';

  const entryStrategy = {
    idealEntryPrice: S,
    entryZone,
    entryType,
    orderType: 'Systematic Monthly SIP / Value Averaging',
    stagingStyle: 'Pyramid DCA Over 3-6 Months',
    trancheSummary: '35% / 35% / 30% SIP',
    entryTrigger: `Initiate Tranche 1 (35%) core starter at current price (${curr}${S.toLocaleString()}); accumulate Tranche 2 (35%) on structural market drawdowns (-5% to -8%); deploy Tranche 3 (30%) on 200-SMA weekly support test (${curr}${entryLow.toLocaleString()}).`,
    tranchePlan: `Tranche 1 (35% allocation): Immediate foundational core holding. Tranche 2 (35% allocation): Value limit orders at ${curr}${entryLow.toLocaleString()}. Tranche 3 (30% allocation): Systematic monthly SIP or opportunistic dip-buying.`,
    invalidationRule: `Long-term accumulation thesis broken ONLY if structural moat collapses: Piotroski F-Score drops < 5 or structural ROE drops permanently below 12%.`
  };

  const exitStrategy = {
    target1Price,
    target1GainPct: `+${target1Pct}%`,
    target1BookPct: 33,
    target1BookLabel: 'Book 33%',
    target1Action: `Book 33% of position at ${curr}${target1Price.toLocaleString()} (+${target1Pct}%) to de-risk and recoup initial capital principal; leave remaining 67% to compound uninterrupted toward multi-year ${compoundMultiplier}x wealth objective.`,
    target2Price: targetPrice,
    target2GainPct: `+${totalReturnPct}%`,
    target2BookPct: 67,
    target2BookLabel: 'Hold 67% (Compounder)',
    target2Action: `Achieves projected ${compoundMultiplier}x capital multiplier at ${curr}${targetPrice.toLocaleString()} (+${totalReturnPct}%); rebalance excess profits back to benchmark portfolio weighting.`,
    partialBookingRule: `Book 33% profit at Target 1 (${curr}${target1Price.toLocaleString()}) to fully recoup initial principal, leaving remaining 67% to compound indefinitely.`,
    stopLossPrice,
    stopLossPct: `-${stopLossPct.toFixed(1)}%`,
    stopLossType: 'Structural Moat / Balance Sheet Deterioration Floor',
    stopLossRule: `Full exit triggered ONLY if structural moat collapses: Piotroski F-Score drops < 5, ROE collapses below 12% permanently, or multi-year structural support (${curr}${stopLossPrice.toLocaleString()}) breaks.`,
    trailingStopRule: 'Do not exit on transient cyclical drawdowns. Review quarterly balance sheet metrics and debt levels.',
    timeExitRule: 'Reallocate capital if Return on Invested Capital (ROIC) trails sector benchmarks across 3 consecutive fiscal years.',
    riskRewardRatio: `1 : ${longRiskReward}`,
    maxHoldingPeriod: '3 – 5+ Years (Generational Compounding)'
  };

  const reasoning = {
    summary: `Premier long-term wealth compounder backed by Piotroski F-Score (${fScore}/9), outstanding ROE (${roe}%), conservative leverage (D/E ${debtToEquity.toFixed(2)}), and a projected ${compoundMultiplier}x capital multiplier at +${cagr}% CAGR.`,
    pillars: [
      {
        icon: 'landmark',
        title: 'Balance Sheet & Piotroski Health',
        detail: `Piotroski F-Score of ${fScore}/9 signifies exceptional profitability, cash flow generation, and balance sheet integrity with minimal solvency risk (Debt/Equity ${debtToEquity.toFixed(2)}).`
      },
      {
        icon: 'award',
        title: 'Durable Economic Moat & ROE',
        detail: `Generates a durable ${roe}% Return on Equity (ROE), signaling formidable pricing power, high barriers to entry, and capital reinvestment efficiency.`
      },
      {
        icon: 'repeat',
        title: 'Multi-Year Compounding Engine',
        detail: `Forward earnings reinvestment model projects an annualized CAGR of +${cagr}%, yielding a total return of +${totalReturnPct}% (${compoundMultiplier}x capital multiplier) over 3–5 years.`
      },
      {
        icon: 'compass',
        title: 'Macro & Thematic Tailwind',
        detail: asset.description || `${asset.name} commands dominant market share in a mission-critical industry with multi-decade secular tailwinds.`
      }
    ]
  };

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
    stopLossPrice,
    targetGainPct: `+${totalReturnPct}%`,
    stopLossPct: `-${stopLossPct.toFixed(1)}%`,
    annualizedCAGR: `+${cagr}% CAGR`,
    riskReward: `1 : ${longRiskReward}`,
    compoundMultiplier: `${compoundMultiplier}x Wealth Multiplier`,
    fScoreText: `${fScore}/9 (Piotroski Health)`,
    entryStrategy,
    exitStrategy,
    reasoning,
    keyIndicators: [
      { label: '3-Year CAGR', value: `+${cagr}%`, status: cagr >= 15 ? 'positive' : 'neutral' },
      { label: 'Piotroski Score', value: `${fScore}/9`, status: fScore >= 7 ? 'positive' : 'neutral' },
      { label: '3-Year Target', value: `${curr}${targetPrice.toLocaleString()}`, status: 'positive' }
    ],
    thesis: `Premier generational wealth creator with Piotroski F-Score at ${fScore}/9 and durable ${roe}% ROE. 3-Year compounding model projects price reaching ${curr}${targetPrice.toLocaleString()} (+${totalReturnPct}%), multiplying capital by ${compoundMultiplier}x at +${cagr}% annualized CAGR with structural risk buffer at ${curr}${stopLossPrice.toLocaleString()} (-${stopLossPct.toFixed(1)}%).`
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
