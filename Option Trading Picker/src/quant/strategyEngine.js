/**
 * Option Trading Strategy Scanner & Classification Engine
 * Quantitative multi-strategy detector for US & Indian Stocks and Indices
 * with dynamic Stop Loss, Target Profit Booking, and Capital Preservation Exit Rules.
 */

import { calculateGreeks, calculatePOP } from './blackScholes.js';
import { calculatePayoffProfile } from './payoffCalculator.js';
import { getMarketExpirations } from '../data/marketDataFeed.js';

export const STRATEGY_CATEGORIES = {
  ALL: 'ALL',
  THETA_DECAY: 'THETA_DECAY',
  BULLISH_CALLS: 'BULLISH_CALLS',
  BEARISH_PUTS: 'BEARISH_PUTS',
  CREDIT_SPREADS: 'CREDIT_SPREADS',
  DEBIT_SPREADS: 'DEBIT_SPREADS',
  IRON_CONDORS: 'IRON_CONDORS',
  STRADDLES: 'STRADDLES'
};

export const RISK_PROFILES = {
  ALL: 'ALL',
  CONSERVATIVE: 'CONSERVATIVE', // Disciplined 35-40% stop loss & 50% profit booking
  BALANCED: 'BALANCED',         // Standard 50% stop loss & 60% profit booking
  AGGRESSIVE: 'AGGRESSIVE'      // Expiration hold
};

/**
 * Build structured Exit Plan with Stop Loss and Target Booking
 */
export function buildExitPlan({
  type,
  S,
  lotSize,
  netCost,
  maxProfit,
  maxLoss,
  isCredit,
  curr,
  upperStrike,
  lowerStrike,
  shortStrike,
  longStrike,
  atmStrike,
  premium,
  step
}) {
  let targetBooking = {};
  let stopLoss = {};
  let managedRiskReward = '1 : 2.0';
  let capitalPreservedPct = 60;
  let riskProfile = RISK_PROFILES.BALANCED;

  switch (type) {
    case 'LONG_CALL': {
      const targetSpot = Number((S * 1.04).toFixed(2));
      const targetProfitPerLot = Number((netCost * 0.55).toFixed(2));
      const targetOptPrice = Number((premium * 1.55).toFixed(2));

      const stopSpot = Number((S * 0.98).toFixed(2));
      const stopLossPerLot = Number((netCost * 0.40).toFixed(2));
      const stopOptPrice = Number((premium * 0.60).toFixed(2));

      targetBooking = {
        spotPrice: targetSpot,
        spotPct: '+4.0%',
        rule: `Book profit at +55% Premium ROI (${curr}${targetOptPrice}) near resistance`,
        profitPerLot: targetProfitPerLot,
        profitPct: '+55%'
      };
      stopLoss = {
        spotPrice: stopSpot,
        spotPct: '-2.0%',
        rule: `Stop loss: cut if call drops -40% (${curr}${stopOptPrice}) or underlying breaks ${curr}${stopSpot}`,
        lossPerLot: stopLossPerLot,
        lossPct: '-40%'
      };
      managedRiskReward = `1 : ${(targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(2)}`;
      capitalPreservedPct = 60;
      riskProfile = RISK_PROFILES.BALANCED;
      break;
    }

    case 'BULL_CALL_SPREAD': {
      const targetSpot = Number(upperStrike.toFixed(2));
      const targetProfitPerLot = Number((maxProfit * 0.70).toFixed(2));

      const stopSpot = Number((lowerStrike * 0.985).toFixed(2));
      const stopLossPerLot = Number((netCost * 0.45).toFixed(2));

      targetBooking = {
        spotPrice: targetSpot,
        spotPct: `+${(((targetSpot - S) / S) * 100).toFixed(1)}%`,
        rule: `Book early at 70% of max spread profit (${curr}${targetProfitPerLot.toLocaleString()})`,
        profitPerLot: targetProfitPerLot,
        profitPct: '+70% Spread'
      };
      stopLoss = {
        spotPrice: stopSpot,
        spotPct: '-1.5%',
        rule: `Stop loss: exit if debit spread loses 45% or spot breaks below ${curr}${stopSpot}`,
        lossPerLot: stopLossPerLot,
        lossPct: '-45%'
      };
      managedRiskReward = `1 : ${(targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(2)}`;
      capitalPreservedPct = 55;
      riskProfile = RISK_PROFILES.CONSERVATIVE;
      break;
    }

    case 'BULL_PUT_SPREAD': {
      const targetSpot = Number((S * 1.015).toFixed(2));
      const targetProfitPerLot = Number((netCost * 0.50).toFixed(2)); // netCost is credit

      const stopSpot = Number((shortStrike * 0.995).toFixed(2));
      const stopLossPerLot = Number((netCost * 1.50).toFixed(2));

      targetBooking = {
        spotPrice: targetSpot,
        spotPct: '+1.5%',
        rule: 'Book early at 50% max credit to eliminate tail risk (Tastytrade Standard)',
        profitPerLot: targetProfitPerLot,
        profitPct: '+50% Credit'
      };
      stopLoss = {
        spotPrice: stopSpot,
        spotPct: `-${(((S - stopSpot) / S) * 100).toFixed(1)}%`,
        rule: `Stop loss: exit if spread cost expands to 1.5x credit collected (protects wings)`,
        lossPerLot: stopLossPerLot,
        lossPct: '-1.5x Credit'
      };
      managedRiskReward = `1 : ${(targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(2)}`;
      capitalPreservedPct = 65;
      riskProfile = RISK_PROFILES.CONSERVATIVE;
      break;
    }

    case 'LONG_PUT': {
      const targetSpot = Number((S * 0.96).toFixed(2));
      const targetProfitPerLot = Number((netCost * 0.55).toFixed(2));
      const targetOptPrice = Number((premium * 1.55).toFixed(2));

      const stopSpot = Number((S * 1.02).toFixed(2));
      const stopLossPerLot = Number((netCost * 0.40).toFixed(2));
      const stopOptPrice = Number((premium * 0.60).toFixed(2));

      targetBooking = {
        spotPrice: targetSpot,
        spotPct: '-4.0%',
        rule: `Book profit at +55% Premium gain (${curr}${targetOptPrice}) on breakdown`,
        profitPerLot: targetProfitPerLot,
        profitPct: '+55%'
      };
      stopLoss = {
        spotPrice: stopSpot,
        spotPct: '+2.0%',
        rule: `Stop loss: cut if put drops -40% (${curr}${stopOptPrice}) or spot breaks above ${curr}${stopSpot}`,
        lossPerLot: stopLossPerLot,
        lossPct: '-40%'
      };
      managedRiskReward = `1 : ${(targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(2)}`;
      capitalPreservedPct = 60;
      riskProfile = RISK_PROFILES.BALANCED;
      break;
    }

    case 'BEAR_PUT_SPREAD': {
      const targetSpot = Number(lowerStrike.toFixed(2));
      const targetProfitPerLot = Number((maxProfit * 0.70).toFixed(2));

      const stopSpot = Number((upperStrike * 1.015).toFixed(2));
      const stopLossPerLot = Number((netCost * 0.45).toFixed(2));

      targetBooking = {
        spotPrice: targetSpot,
        spotPct: `-${(((S - targetSpot) / S) * 100).toFixed(1)}%`,
        rule: `Book early at 70% of max spread profit (${curr}${targetProfitPerLot.toLocaleString()})`,
        profitPerLot: targetProfitPerLot,
        profitPct: '+70% Spread'
      };
      stopLoss = {
        spotPrice: stopSpot,
        spotPct: '+1.5%',
        rule: `Stop loss: exit if spread loses 45% or spot breaks above ${curr}${stopSpot}`,
        lossPerLot: stopLossPerLot,
        lossPct: '-45%'
      };
      managedRiskReward = `1 : ${(targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(2)}`;
      capitalPreservedPct = 55;
      riskProfile = RISK_PROFILES.CONSERVATIVE;
      break;
    }

    case 'IRON_CONDOR': {
      const targetProfitPerLot = Number((netCost * 0.50).toFixed(2));
      const stopLossPerLot = Number((netCost * 1.50).toFixed(2));

      targetBooking = {
        spotPrice: S,
        spotPct: '0.0%',
        rule: 'Take profit at 50% max credit collected (Institutional Rule)',
        profitPerLot: targetProfitPerLot,
        profitPct: '+50% Credit'
      };
      stopLoss = {
        spotPrice: shortStrike || Number((S * 0.97).toFixed(2)),
        spotPct: 'Wing Test',
        rule: 'Stop loss: exit if either short strike is breached or loss reaches 1.5x credit',
        lossPerLot: stopLossPerLot,
        lossPct: '-1.5x Credit'
      };
      managedRiskReward = `1 : ${(targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(2)}`;
      capitalPreservedPct = 70;
      riskProfile = RISK_PROFILES.CONSERVATIVE;
      break;
    }

    case 'THETA_DECAY': {
      const targetProfitPerLot = Number((netCost * 0.50).toFixed(2));
      const stopLossPerLot = Number((netCost * 1.25).toFixed(2));
      const stopDistance = step * 1.5;
      const stopSpotUpper = Number(((atmStrike || S) + stopDistance).toFixed(2));
      const stopSpotLower = Number(((atmStrike || S) - stopDistance).toFixed(2));

      targetBooking = {
        spotPrice: atmStrike || S,
        spotPct: 'Pinning ATM',
        rule: `Capture Theta: Book 50% max credit (${curr}${targetProfitPerLot.toLocaleString()}) within 7-10 days`,
        profitPerLot: targetProfitPerLot,
        profitPct: '+50% Credit'
      };
      stopLoss = {
        spotPrice: stopSpotLower,
        spotPct: `±${((stopDistance / S) * 100).toFixed(1)}%`,
        rule: `Stop loss: close if spot breaks outside ${curr}${stopSpotLower} — ${curr}${stopSpotUpper} or loss reaches 1.25x credit`,
        lossPerLot: stopLossPerLot,
        lossPct: '-1.25x Credit'
      };
      managedRiskReward = `1 : ${(targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(2)}`;
      capitalPreservedPct = 70;
      riskProfile = RISK_PROFILES.CONSERVATIVE;
      break;
    }

    case 'LONG_STRADDLE':
    default: {
      const targetSpot = Number((S * 1.045).toFixed(2));
      const targetProfitPerLot = Number((netCost * 0.45).toFixed(2));
      const stopLossPerLot = Number((netCost * 0.35).toFixed(2));

      targetBooking = {
        spotPrice: targetSpot,
        spotPct: '±4.5%',
        rule: 'Book profit when implied volatility surges or position reaches +45%',
        profitPerLot: targetProfitPerLot,
        profitPct: '+45%'
      };
      stopLoss = {
        spotPrice: S,
        spotPct: 'Time Stop',
        rule: 'Time stop: exit if consolidation persists past 5 days or -35% loss',
        lossPerLot: stopLossPerLot,
        lossPct: '-35%'
      };
      managedRiskReward = `1 : ${(targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(2)}`;
      capitalPreservedPct = 65;
      riskProfile = RISK_PROFILES.BALANCED;
      break;
    }
  }

  return {
    targetBooking,
    stopLoss,
    managedRiskReward,
    capitalPreservedPct,
    riskProfile
  };
}

/**
 * Scan an underlying asset quote and generate all valid option strategies with exit plans
 */

/**
 * Build structured Transaction Execution Spec
 * Explicitly recommends which market, series, and expiration date to trade
 */
export function buildTransactSpec(quote, exp, stratName, dte) {
  const isIndia = quote.market === "IN";
  const isStock = quote.type === "STOCK";
  const ticker = quote.displayTicker;
  const day = exp.dayOfWeek || (isIndia ? "Thursday" : "Friday");
  const dateStr = exp.dateStr;
  const cycleType = exp.type;

  let instrumentTag = "";
  if (isIndia) {
    instrumentTag = isStock ? "NSE Stock F&O Series (Monthly Contract Only)" : "NSE Index Options Series";
  } else {
    instrumentTag = isStock ? "US Equity Option Contract" : "US Index Standard Series";
  }

  let contractCode = "";
  const cleanDate = dateStr.replace(/ /g, "").toUpperCase();
  if (stratName.includes("Call Spread") || stratName.includes("Long Call")) {
    contractCode = `${isIndia ? "NSE" : "US"}:${ticker} ${cleanDate} CALL`;
  } else if (stratName.includes("Put Spread") || stratName.includes("Long Put")) {
    contractCode = `${isIndia ? "NSE" : "US"}:${ticker} ${cleanDate} PUT`;
  } else {
    contractCode = `${isIndia ? "NSE" : "US"}:${ticker} ${cleanDate} MULTI-LEG`;
  }

  let rationale = "";
  if (isIndia && isStock) {
    rationale = `Transact specifically in the ${dateStr} Monthly Contract on NSE. SEBI regulations permit only monthly options for Indian equities.`;
  } else if (stratName.includes("Theta") || stratName.includes("Condor")) {
    rationale = `Transact specifically in the ${dateStr} (${cycleType}) cycle. High liquidity zone offering optimal exponential theta decay capture. Close early at 50% profit target.`;
  } else if (stratName.includes("Spread")) {
    rationale = `Transact in the ${dateStr} (${cycleType}) series to provide adequate runway for directional target achievement with capped debit.`;
  } else {
    rationale = `Transact specifically in the ${dateStr} (${cycleType}) series for optimal gamma responsiveness and liquidity.`;
  }

  return {
    expiryDate: dateStr,
    dte,
    dayOfWeek: day,
    cycleType,
    instrumentTag,
    contractSeries: contractCode,
    recommendationNote: rationale
  };
}

export function scanStrategiesForAsset(quote) {
  if (!quote) return [];

  const S = quote.price;
  const step = quote.strikeStep || 5;
  const atmStrike = Math.round(S / step) * step;
  const r = quote.riskFreeRate || (quote.currency === 'INR' ? 0.065 : 0.045);
  const ivDecimal = (quote.iv || 25) / 100;
  const ivRank = quote.ivRank || 45;
  const pcr = quote.pcr || 1.0;
  const lotSize = quote.lotSize || 100;
  const curr = quote.currencySymbol || '$';

  const expirations = getMarketExpirations(quote);
  const isIndia = quote.market === "IN";
  const isStock = quote.type === "STOCK";

  // 1. Weekly / Near-term cycle (for quick momentum breakouts)
  const weeklyExp = expirations[0];

  // 2. Current Monthly cycle (Core high-liquidity series)
  const currentMonthlyExp = (isIndia && !isStock) ? (expirations[1] || expirations[0]) : expirations[0];

  // 3. Next Monthly cycle (30-45 DTE institutional series)
  const nextMonthlyExp = (isIndia && isStock)
    ? (expirations[1] || currentMonthlyExp)
    : (isIndia ? (expirations[2] || currentMonthlyExp) : (expirations[2] || expirations[1]));

  const strategies = [];

  // -------------------------------------------------------------
  // 1. STRATEGY: Long Call (Momentum Breakout)
  // Optimal when IV Rank is low to moderate (< 45%) and bullish trend
  // -------------------------------------------------------------
  {
    const exp = (weeklyExp.dte >= 2) ? weeklyExp : currentMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;
    const strike = atmStrike;
    const greeks = calculateGreeks('call', S, strike, T, r, ivDecimal);
    const premium = greeks.price;
    const breakeven = Number((strike + premium).toFixed(2));
    const pop = calculatePOP(S, breakeven, T, ivDecimal, true);

    const legs = [
      { type: 'call', action: 'buy', strike, premium, contracts: 1, label: `Buy ${curr}${strike} Call` }
    ];

    const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
    const netCost = Number((premium * lotSize).toFixed(2));
    const maxLoss = netCost;

    const exitPlan = buildExitPlan({
      type: 'LONG_CALL',
      S,
      lotSize,
      netCost,
      maxProfit: 'Unlimited',
      maxLoss,
      isCredit: false,
      curr,
      premium,
      step
    });

    strategies.push({
      id: `${quote.ticker}-LONG-CALL-${strike}`,
      ticker: quote.ticker,
      displayTicker: quote.displayTicker,
      name: quote.name,
      market: quote.market,
      type: quote.type,
      currency: quote.currency,
      currencySymbol: curr,
      strategyName: 'Long Call (Breakout)',
      category: STRATEGY_CATEGORIES.BULLISH_CALLS,
      sentiment: 'Bullish',
      directionBadge: 'Bullish Call',
      badgeClass: 'badge-bullish',
      conviction: ivRank < 40 ? 'High Momentum' : 'Standard',
      dte,
      expiryDate: exp.dateStr,
      expiryLabel: `${exp.dateStr} (${exp.type})`,
      transactSpec: buildTransactSpec(quote, exp, 'Long Call', dte),
      spotPrice: S,
      targetPrice: exitPlan.targetBooking.spotPrice,
      stopLossPrice: exitPlan.stopLoss.spotPrice,
      exitPlan,
      legs,
      netCost,
      isCredit: false,
      maxProfit: 'Unlimited',
      maxLoss,
      breakevens: [breakeven],
      riskReward: 'Unlimited Upside',
      pop,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: `Bullish momentum breakout with low IV Rank (${ivRank}%). Provisioned with disciplined Stop Loss at ${curr}${exitPlan.stopLoss.spotPrice} and Target Booking at ${curr}${exitPlan.targetBooking.spotPrice}.`
    });
  }

  // -------------------------------------------------------------
  // 2. STRATEGY: Bull Call Spread (Debit Spread)
  // Buy ATM Call + Sell OTM Call (Caps risk, cuts cost by 40-50%)
  // -------------------------------------------------------------
  {
    const exp = currentMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;
    const lowerStrike = atmStrike;
    const upperStrike = atmStrike + step * 2;

    const lowerGreeks = calculateGreeks('call', S, lowerStrike, T, r, ivDecimal);
    const upperGreeks = calculateGreeks('call', S, upperStrike, T, r, ivDecimal);

    const netDebit = Math.max(0.05, Number((lowerGreeks.price - upperGreeks.price).toFixed(2)));
    const spreadWidth = upperStrike - lowerStrike;
    const maxProfitPerShare = spreadWidth - netDebit;
    const breakeven = Number((lowerStrike + netDebit).toFixed(2));
    const pop = calculatePOP(S, breakeven, T, ivDecimal, true);

    const legs = [
      { type: 'call', action: 'buy', strike: lowerStrike, premium: lowerGreeks.price, contracts: 1, label: `Buy ${curr}${lowerStrike} Call` },
      { type: 'call', action: 'sell', strike: upperStrike, premium: upperGreeks.price, contracts: 1, label: `Sell ${curr}${upperStrike} Call` }
    ];

    const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
    const netCost = Number((netDebit * lotSize).toFixed(2));
    const maxProfit = Number((maxProfitPerShare * lotSize).toFixed(2));
    const maxLoss = netCost;

    const exitPlan = buildExitPlan({
      type: 'BULL_CALL_SPREAD',
      S,
      lotSize,
      netCost,
      maxProfit,
      maxLoss,
      isCredit: false,
      curr,
      upperStrike,
      lowerStrike,
      step
    });

    strategies.push({
      id: `${quote.ticker}-BULL-CALL-SPREAD-${lowerStrike}-${upperStrike}`,
      ticker: quote.ticker,
      displayTicker: quote.displayTicker,
      name: quote.name,
      market: quote.market,
      type: quote.type,
      currency: quote.currency,
      currencySymbol: curr,
      strategyName: 'Bull Call Spread (Debit)',
      category: STRATEGY_CATEGORIES.DEBIT_SPREADS,
      sentiment: 'Bullish',
      directionBadge: 'Bullish Spread',
      badgeClass: 'badge-bullish',
      conviction: 'Defined Risk',
      dte,
      expiryDate: exp.dateStr,
      expiryLabel: `${exp.dateStr} (${exp.type})`,
      transactSpec: buildTransactSpec(quote, exp, 'Bull Call Spread', dte),
      spotPrice: S,
      targetPrice: exitPlan.targetBooking.spotPrice,
      stopLossPrice: exitPlan.stopLoss.spotPrice,
      exitPlan,
      legs,
      netCost,
      isCredit: false,
      maxProfit,
      maxLoss,
      breakevens: [breakeven],
      riskReward: `1 : ${(maxProfitPerShare / netDebit).toFixed(2)}`,
      pop,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: `Defines upside target at ${curr}${upperStrike}. Stop Loss limits loss to ${curr}${exitPlan.stopLoss.lossPerLot.toLocaleString()} while booking 70% max spread gain at ${curr}${exitPlan.targetBooking.spotPrice}.`
    });
  }

  // -------------------------------------------------------------
  // 3. STRATEGY: Bull Put Spread (Credit Spread)
  // Sell OTM Put + Buy Lower OTM Put (High probability income)
  // -------------------------------------------------------------
  {
    const exp = currentMonthlyExp.dte >= 7 ? currentMonthlyExp : nextMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;
    const shortStrike = atmStrike - step * 2;
    const longStrike = atmStrike - step * 4;

    const shortGreeks = calculateGreeks('put', S, shortStrike, T, r, ivDecimal);
    const longGreeks = calculateGreeks('put', S, longStrike, T, r, ivDecimal);

    const netCredit = Math.max(0.05, Number((shortGreeks.price - longGreeks.price).toFixed(2)));
    const spreadWidth = shortStrike - longStrike;
    const maxLossPerShare = spreadWidth - netCredit;
    const breakeven = Number((shortStrike - netCredit).toFixed(2));
    const pop = calculatePOP(S, breakeven, T, ivDecimal, true);

    const legs = [
      { type: 'put', action: 'sell', strike: shortStrike, premium: shortGreeks.price, contracts: 1, label: `Sell ${curr}${shortStrike} Put` },
      { type: 'put', action: 'buy', strike: longStrike, premium: longGreeks.price, contracts: 1, label: `Buy ${curr}${longStrike} Put` }
    ];

    const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
    const netCost = Number((netCredit * lotSize).toFixed(2));
    const maxProfit = netCost;
    const maxLoss = Number((maxLossPerShare * lotSize).toFixed(2));

    const exitPlan = buildExitPlan({
      type: 'BULL_PUT_SPREAD',
      S,
      lotSize,
      netCost,
      maxProfit,
      maxLoss,
      isCredit: true,
      curr,
      shortStrike,
      longStrike,
      step
    });

    strategies.push({
      id: `${quote.ticker}-BULL-PUT-SPREAD-${shortStrike}-${longStrike}`,
      ticker: quote.ticker,
      displayTicker: quote.displayTicker,
      name: quote.name,
      market: quote.market,
      type: quote.type,
      currency: quote.currency,
      currencySymbol: curr,
      strategyName: 'Bull Put Spread (Credit)',
      category: STRATEGY_CATEGORIES.CREDIT_SPREADS,
      sentiment: 'Bullish',
      directionBadge: 'Bullish Credit',
      badgeClass: 'badge-credit',
      conviction: pop > 70 ? 'High Win Rate (POP > 70%)' : 'Income Play',
      dte,
      expiryDate: exp.dateStr,
      expiryLabel: `${exp.dateStr} (${exp.type})`,
      transactSpec: buildTransactSpec(quote, exp, 'Iron Condor', dte),
      spotPrice: S,
      targetPrice: exitPlan.targetBooking.spotPrice,
      stopLossPrice: exitPlan.stopLoss.spotPrice,
      exitPlan,
      legs,
      netCost,
      isCredit: true,
      maxProfit,
      maxLoss,
      breakevens: [breakeven],
      riskReward: `1 : ${(netCredit / maxLossPerShare).toFixed(2)}`,
      pop,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: `High-probability theta harvest with cushion down to ${curr}${breakeven}. Disciplined exit books 50% credit (${curr}${exitPlan.targetBooking.profitPerLot.toLocaleString()}) and cuts loss at 1.5x credit to protect capital.`
    });
  }

  // -------------------------------------------------------------
  // 4. STRATEGY: Long Put (Bearish Breakdown)
  // Direct downside directional leverage
  // -------------------------------------------------------------
  {
    const exp = (weeklyExp.dte >= 2) ? weeklyExp : currentMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;
    const strike = atmStrike;
    const greeks = calculateGreeks('put', S, strike, T, r, ivDecimal);
    const premium = greeks.price;
    const breakeven = Number((strike - premium).toFixed(2));
    const pop = calculatePOP(S, breakeven, T, ivDecimal, false);

    const legs = [
      { type: 'put', action: 'buy', strike, premium, contracts: 1, label: `Buy ${curr}${strike} Put` }
    ];

    const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
    const netCost = Number((premium * lotSize).toFixed(2));
    const maxProfit = Number(((strike - premium) * lotSize).toFixed(2));
    const maxLoss = netCost;

    const exitPlan = buildExitPlan({
      type: 'LONG_PUT',
      S,
      lotSize,
      netCost,
      maxProfit,
      maxLoss,
      isCredit: false,
      curr,
      premium,
      step
    });

    strategies.push({
      id: `${quote.ticker}-LONG-PUT-${strike}`,
      ticker: quote.ticker,
      displayTicker: quote.displayTicker,
      name: quote.name,
      market: quote.market,
      type: quote.type,
      currency: quote.currency,
      currencySymbol: curr,
      strategyName: 'Long Put (Breakdown)',
      category: STRATEGY_CATEGORIES.BEARISH_PUTS,
      sentiment: 'Bearish',
      directionBadge: 'Bearish Put',
      badgeClass: 'badge-bearish',
      conviction: pcr > 1.2 ? 'Bearish Momentum' : 'Downside Hedge',
      dte,
      expiryDate: exp.dateStr,
      expiryLabel: `${exp.dateStr} (${exp.type})`,
      transactSpec: buildTransactSpec(quote, exp, 'Long Put', dte),
      spotPrice: S,
      targetPrice: exitPlan.targetBooking.spotPrice,
      stopLossPrice: exitPlan.stopLoss.spotPrice,
      exitPlan,
      legs,
      netCost,
      isCredit: false,
      maxProfit,
      maxLoss,
      breakevens: [breakeven],
      riskReward: `1 : ${((strike - premium) / premium).toFixed(2)}`,
      pop,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: `Protective downside momentum. Provisioned with strict Stop Loss at ${curr}${exitPlan.stopLoss.spotPrice} (-40% premium risk) and Target Profit Booking at ${curr}${exitPlan.targetBooking.spotPrice}.`
    });
  }

  // -------------------------------------------------------------
  // 5. STRATEGY: Bear Put Spread (Debit Spread)
  // Buy Higher Put + Sell Lower Put
  // -------------------------------------------------------------
  {
    const exp = currentMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;
    const higherStrike = atmStrike;
    const lowerStrike = atmStrike - step * 2;

    const higherGreeks = calculateGreeks('put', S, higherStrike, T, r, ivDecimal);
    const lowerGreeks = calculateGreeks('put', S, lowerStrike, T, r, ivDecimal);

    const netDebit = Math.max(0.05, Number((higherGreeks.price - lowerGreeks.price).toFixed(2)));
    const spreadWidth = higherStrike - lowerStrike;
    const maxProfitPerShare = spreadWidth - netDebit;
    const breakeven = Number((higherStrike - netDebit).toFixed(2));
    const pop = calculatePOP(S, breakeven, T, ivDecimal, false);

    const legs = [
      { type: 'put', action: 'buy', strike: higherStrike, premium: higherGreeks.price, contracts: 1, label: `Buy ${curr}${higherStrike} Put` },
      { type: 'put', action: 'sell', strike: lowerStrike, premium: lowerGreeks.price, contracts: 1, label: `Sell ${curr}${lowerStrike} Put` }
    ];

    const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
    const netCost = Number((netDebit * lotSize).toFixed(2));
    const maxProfit = Number((maxProfitPerShare * lotSize).toFixed(2));
    const maxLoss = netCost;

    const exitPlan = buildExitPlan({
      type: 'BEAR_PUT_SPREAD',
      S,
      lotSize,
      netCost,
      maxProfit,
      maxLoss,
      isCredit: false,
      curr,
      upperStrike: higherStrike,
      lowerStrike,
      step
    });

    strategies.push({
      id: `${quote.ticker}-BEAR-PUT-SPREAD-${higherStrike}-${lowerStrike}`,
      ticker: quote.ticker,
      displayTicker: quote.displayTicker,
      name: quote.name,
      market: quote.market,
      type: quote.type,
      currency: quote.currency,
      currencySymbol: curr,
      strategyName: 'Bear Put Spread (Debit)',
      category: STRATEGY_CATEGORIES.DEBIT_SPREADS,
      sentiment: 'Bearish',
      directionBadge: 'Bearish Spread',
      badgeClass: 'badge-bearish',
      conviction: 'Defined Risk',
      dte,
      expiryDate: exp.dateStr,
      expiryLabel: `${exp.dateStr} (${exp.type})`,
      transactSpec: buildTransactSpec(quote, exp, 'Bull Put Spread', dte),
      spotPrice: S,
      targetPrice: exitPlan.targetBooking.spotPrice,
      stopLossPrice: exitPlan.stopLoss.spotPrice,
      exitPlan,
      legs,
      netCost,
      isCredit: false,
      maxProfit,
      maxLoss,
      breakevens: [breakeven],
      riskReward: `1 : ${(maxProfitPerShare / netDebit).toFixed(2)}`,
      pop,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: `Limits downside cost by selling ${curr}${lowerStrike} Put. Exit rule secures 70% of max spread profit (${curr}${exitPlan.targetBooking.profitPerLot.toLocaleString()}) while cutting loss if spot rises above ${curr}${exitPlan.stopLoss.spotPrice}.`
    });
  }

  // -------------------------------------------------------------
  // 6. STRATEGY: Iron Condor (Range-Bound / Delta-Neutral)
  // Sell OTM Put Spread + Sell OTM Call Spread (4 legs)
  // Optimal when IV Rank is elevated (> 50%) and stock is consolidating
  // -------------------------------------------------------------
  {
    const exp = currentMonthlyExp.dte >= 7 ? currentMonthlyExp : nextMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;
    const putShort = atmStrike - step * 2;
    const putLong  = atmStrike - step * 4;
    const callShort = atmStrike + step * 2;
    const callLong  = atmStrike + step * 4;

    const psGreeks = calculateGreeks('put', S, putShort, T, r, ivDecimal);
    const plGreeks = calculateGreeks('put', S, putLong, T, r, ivDecimal);
    const csGreeks = calculateGreeks('call', S, callShort, T, r, ivDecimal);
    const clGreeks = calculateGreeks('call', S, callLong, T, r, ivDecimal);

    const putCredit = Math.max(0.02, psGreeks.price - plGreeks.price);
    const callCredit = Math.max(0.02, csGreeks.price - clGreeks.price);
    const totalCredit = Number((putCredit + callCredit).toFixed(2));

    const wingWidth = step * 2;
    const maxLossPerShare = Number((wingWidth - totalCredit).toFixed(2));
    const lowerBE = Number((putShort - totalCredit).toFixed(2));
    const upperBE = Number((callShort + totalCredit).toFixed(2));

    const popLower = calculatePOP(S, lowerBE, T, ivDecimal, true);
    const popUpper = calculatePOP(S, upperBE, T, ivDecimal, false);
    const pop = Number((Math.min(95, Math.max(50, (popLower + popUpper) / 2))).toFixed(1));

    const legs = [
      { type: 'put', action: 'buy', strike: putLong, premium: plGreeks.price, contracts: 1, label: `Buy ${curr}${putLong} Put` },
      { type: 'put', action: 'sell', strike: putShort, premium: psGreeks.price, contracts: 1, label: `Sell ${curr}${putShort} Put` },
      { type: 'call', action: 'sell', strike: callShort, premium: csGreeks.price, contracts: 1, label: `Sell ${curr}${callShort} Call` },
      { type: 'call', action: 'buy', strike: callLong, premium: clGreeks.price, contracts: 1, label: `Buy ${curr}${callLong} Call` }
    ];

    const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
    const netCost = Number((totalCredit * lotSize).toFixed(2));
    const maxProfit = netCost;
    const maxLoss = Number((maxLossPerShare * lotSize).toFixed(2));

    const exitPlan = buildExitPlan({
      type: 'IRON_CONDOR',
      S,
      lotSize,
      netCost,
      maxProfit,
      maxLoss,
      isCredit: true,
      curr,
      shortStrike: putShort,
      longStrike: putLong,
      step
    });

    strategies.push({
      id: `${quote.ticker}-IRON-CONDOR-${putShort}-${callShort}`,
      ticker: quote.ticker,
      displayTicker: quote.displayTicker,
      name: quote.name,
      market: quote.market,
      type: quote.type,
      currency: quote.currency,
      currencySymbol: curr,
      strategyName: 'Iron Condor (Delta-Neutral)',
      category: STRATEGY_CATEGORIES.IRON_CONDORS,
      sentiment: 'Neutral',
      directionBadge: 'Delta Neutral',
      badgeClass: 'badge-neutral',
      conviction: ivRank > 50 ? 'Prime Volatility Crush' : 'Income Range',
      dte,
      expiryDate: exp.dateStr,
      expiryLabel: `${exp.dateStr} (${exp.type})`,
      transactSpec: buildTransactSpec(quote, exp, 'Iron Condor', dte),
      spotPrice: S,
      targetPrice: S,
      stopLossPrice: putShort,
      exitPlan,
      legs,
      netCost,
      isCredit: true,
      maxProfit,
      maxLoss,
      breakevens: [lowerBE, upperBE],
      riskReward: `1 : ${(totalCredit / maxLossPerShare).toFixed(2)}`,
      pop,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: `Profits from time decay and IV crush between ${curr}${lowerBE} and ${curr}${upperBE}. Exit rule books 50% max credit (${curr}${exitPlan.targetBooking.profitPerLot.toLocaleString()}) and stops loss at 1.5x credit to protect capital.`
    });
  }

  // -------------------------------------------------------------
  // 7. STRATEGY: Long Straddle (Volatility Expansion)
  // Buy ATM Call + Buy ATM Put (Explosive Breakout Play)
  // -------------------------------------------------------------
  {
    const exp = (weeklyExp.dte >= 2) ? weeklyExp : currentMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;
    const callGreeks = calculateGreeks('call', S, atmStrike, T, r, ivDecimal);
    const putGreeks = calculateGreeks('put', S, atmStrike, T, r, ivDecimal);
    const totalCost = Number((callGreeks.price + putGreeks.price).toFixed(2));
    const lowerBE = Number((atmStrike - totalCost).toFixed(2));
    const upperBE = Number((atmStrike + totalCost).toFixed(2));

    const legs = [
      { type: 'call', action: 'buy', strike: atmStrike, premium: callGreeks.price, contracts: 1, label: `Buy ${curr}${atmStrike} Call` },
      { type: 'put', action: 'buy', strike: atmStrike, premium: putGreeks.price, contracts: 1, label: `Buy ${curr}${atmStrike} Put` }
    ];

    const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
    const netCost = Number((totalCost * lotSize).toFixed(2));
    const maxLoss = netCost;

    const exitPlan = buildExitPlan({
      type: 'LONG_STRADDLE',
      S,
      lotSize,
      netCost,
      maxProfit: 'Unlimited',
      maxLoss,
      isCredit: false,
      curr,
      premium: totalCost,
      step
    });

    strategies.push({
      id: `${quote.ticker}-LONG-STRADDLE-${atmStrike}`,
      ticker: quote.ticker,
      displayTicker: quote.displayTicker,
      name: quote.name,
      market: quote.market,
      type: quote.type,
      currency: quote.currency,
      currencySymbol: curr,
      strategyName: 'Long Straddle (Vol Breakout)',
      category: STRATEGY_CATEGORIES.STRADDLES,
      sentiment: 'Neutral',
      directionBadge: 'Vol Expansion',
      badgeClass: 'badge-volatility',
      conviction: ivRank < 30 ? 'Cheap Volatility' : 'Speculative',
      dte,
      expiryDate: exp.dateStr,
      expiryLabel: `${exp.dateStr} (${exp.type})`,
      transactSpec: buildTransactSpec(quote, exp, 'Long Straddle', dte),
      spotPrice: S,
      targetPrice: exitPlan.targetBooking.spotPrice,
      stopLossPrice: S,
      exitPlan,
      legs,
      netCost,
      isCredit: false,
      maxProfit: 'Unlimited',
      maxLoss,
      breakevens: [lowerBE, upperBE],
      riskReward: 'Unlimited Dual Wing',
      pop: 46.5,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: `Underpriced option volatility. Provisioned with +45% Target Booking (${curr}${exitPlan.targetBooking.profitPerLot.toLocaleString()}) and a strict 5-day / 35% time stop to prevent theta decay.`
    });
  }

  // -------------------------------------------------------------
  // 8. STRATEGY: Theta Decay Harvester (Iron Butterfly Pin)
  // Sell ATM Call + Sell ATM Put + Buy OTM Protective Wings (4 legs)
  // Maximum Positive Net Theta decay strategy at ATM strike
  // -------------------------------------------------------------
  {
    const exp = currentMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;
    const wingWidth = step * 3;
    const putWing = atmStrike - wingWidth;
    const callWing = atmStrike + wingWidth;

    const atmCallGreeks = calculateGreeks('call', S, atmStrike, T, r, ivDecimal);
    const atmPutGreeks = calculateGreeks('put', S, atmStrike, T, r, ivDecimal);
    const callWingGreeks = calculateGreeks('call', S, callWing, T, r, ivDecimal);
    const putWingGreeks = calculateGreeks('put', S, putWing, T, r, ivDecimal);

    const creditCollected = (atmCallGreeks.price + atmPutGreeks.price) - (callWingGreeks.price + putWingGreeks.price);
    const totalCredit = Math.max(0.10, Number(creditCollected.toFixed(2)));

    const maxLossPerShare = Number((wingWidth - totalCredit).toFixed(2));
    const lowerBE = Number((atmStrike - totalCredit).toFixed(2));
    const upperBE = Number((atmStrike + totalCredit).toFixed(2));

    const popLower = calculatePOP(S, lowerBE, T, ivDecimal, true);
    const popUpper = calculatePOP(S, upperBE, T, ivDecimal, false);
    const pop = Number((Math.min(95, Math.max(52, (popLower + popUpper) / 2))).toFixed(1));

    const legs = [
      { type: 'put', action: 'buy', strike: putWing, premium: putWingGreeks.price, contracts: 1, label: `Buy ${curr}${putWing} Put (Wing Protection)` },
      { type: 'put', action: 'sell', strike: atmStrike, premium: atmPutGreeks.price, contracts: 1, label: `Sell ${curr}${atmStrike} Put (Theta Decay)` },
      { type: 'call', action: 'sell', strike: atmStrike, premium: atmCallGreeks.price, contracts: 1, label: `Sell ${curr}${atmStrike} Call (Theta Decay)` },
      { type: 'call', action: 'buy', strike: callWing, premium: callWingGreeks.price, contracts: 1, label: `Buy ${curr}${callWing} Call (Wing Protection)` }
    ];

    const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
    const netCost = Number((totalCredit * lotSize).toFixed(2));
    const maxProfit = netCost;
    const maxLoss = Number((maxLossPerShare * lotSize).toFixed(2));

    const exitPlan = buildExitPlan({
      type: 'THETA_DECAY',
      S,
      lotSize,
      netCost,
      maxProfit,
      maxLoss,
      isCredit: true,
      curr,
      atmStrike,
      step
    });

    const netDailyThetaCurr = Math.abs(payoff.netTheta).toFixed(1);

    strategies.push({
      id: `${quote.ticker}-THETA-DECAY-${atmStrike}`,
      ticker: quote.ticker,
      displayTicker: quote.displayTicker,
      name: quote.name,
      market: quote.market,
      type: quote.type,
      currency: quote.currency,
      currencySymbol: curr,
      strategyName: 'Theta Decay Harvester (Iron Butterfly Pin)',
      category: STRATEGY_CATEGORIES.THETA_DECAY,
      sentiment: 'Neutral',
      directionBadge: 'Theta Decay',
      badgeClass: 'badge-theta',
      conviction: 'Pure Time Decay',
      dte,
      expiryDate: exp.dateStr,
      expiryLabel: `${exp.dateStr} (${exp.type})`,
      transactSpec: buildTransactSpec(quote, exp, 'Theta Decay Harvester', dte),
      spotPrice: S,
      targetPrice: atmStrike,
      stopLossPrice: exitPlan.stopLoss.spotPrice,
      exitPlan,
      legs,
      netCost,
      isCredit: true,
      maxProfit,
      maxLoss,
      breakevens: [lowerBE, upperBE],
      riskReward: `1 : ${(totalCredit / maxLossPerShare).toFixed(2)}`,
      pop,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: `Engineered for pure positive time decay. Generates +${curr}${netDailyThetaCurr}/day Theta harvest around ${curr}${atmStrike}. Exit rule books 50% credit (${curr}${exitPlan.targetBooking.profitPerLot.toLocaleString()}) within 7-10 days.`
    });
  }

  return strategies;
}

/**
 * Scan all quotes in the universe and return prioritized strategies
 */
export function scanAllUniverseStrategies(quotes) {
  if (!Array.isArray(quotes)) return [];
  const all = [];
  quotes.forEach(quote => {
    const assetStrats = scanStrategiesForAsset(quote);
    all.push(...assetStrats);
  });

  // Sort by Probability of Profit (POP) and Conviction
  return all.sort((a, b) => (b.pop || 50) - (a.pop || 50));
}
