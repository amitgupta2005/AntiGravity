/**
 * Option Trading Strategy Scanner & Classification Engine
 * Quantitative multi-strategy detector for US & Indian Stocks and Indices
 */

import { calculateGreeks, calculatePOP } from './blackScholes.js';
import { calculatePayoffProfile } from './payoffCalculator.js';
import { getStandardExpirations } from '../data/marketDataFeed.js';

export const STRATEGY_CATEGORIES = {
  ALL: 'ALL',
  BULLISH_CALLS: 'BULLISH_CALLS',
  BEARISH_PUTS: 'BEARISH_PUTS',
  CREDIT_SPREADS: 'CREDIT_SPREADS',
  DEBIT_SPREADS: 'DEBIT_SPREADS',
  IRON_CONDORS: 'IRON_CONDORS',
  STRADDLES: 'STRADDLES'
};

/**
 * Scan an underlying asset quote and generate all valid option strategies
 */
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

  const expirations = getStandardExpirations();
  const nearExp = expirations[0];  // ~7-14 DTE
  const monthlyExp = expirations[2]; // ~28-35 DTE
  const thetaExp = expirations[3]; // ~45 DTE

  const strategies = [];

  // -------------------------------------------------------------
  // 1. STRATEGY: Long Call (Momentum Breakout)
  // Optimal when IV Rank is low to moderate (< 45%) and bullish trend
  // -------------------------------------------------------------
  {
    const dte = nearExp.dte;
    const T = dte / 365;
    const strike = atmStrike; // ATM or slightly OTM strike
    const greeks = calculateGreeks('call', S, strike, T, r, ivDecimal);
    const premium = greeks.price;
    const breakeven = Number((strike + premium).toFixed(2));
    const pop = calculatePOP(S, breakeven, T, ivDecimal, true);

    const legs = [
      { type: 'call', action: 'buy', strike, premium, contracts: 1, label: `Buy ${curr}${strike} Call` }
    ];

    const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);

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
      expiryLabel: nearExp.label,
      spotPrice: S,
      targetPrice: Number((S * 1.04).toFixed(2)),
      legs,
      netCost: Number((premium * lotSize).toFixed(2)),
      isCredit: false,
      maxProfit: 'Unlimited',
      maxLoss: Number((premium * lotSize).toFixed(2)),
      breakevens: [breakeven],
      riskReward: 'Unlimited Upside',
      pop,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: `Bullish momentum breakout with low IV Rank (${ivRank}%). Favorable theta profile with unlimited upside above breakeven ${curr}${breakeven}.`
    });
  }

  // -------------------------------------------------------------
  // 2. STRATEGY: Bull Call Spread (Debit Spread)
  // Buy ATM Call + Sell OTM Call (Caps risk, cuts cost by 40-50%)
  // -------------------------------------------------------------
  {
    const dte = monthlyExp.dte;
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
      expiryLabel: monthlyExp.label,
      spotPrice: S,
      targetPrice: Number(upperStrike.toFixed(2)),
      legs,
      netCost: Number((netDebit * lotSize).toFixed(2)),
      isCredit: false,
      maxProfit: Number((maxProfitPerShare * lotSize).toFixed(2)),
      maxLoss: Number((netDebit * lotSize).toFixed(2)),
      breakevens: [breakeven],
      riskReward: `1 : ${(maxProfitPerShare / netDebit).toFixed(2)}`,
      pop,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: `Defines upside target at ${curr}${upperStrike} while hedging against theta decay and IV deflation. Breakeven at ${curr}${breakeven}.`
    });
  }

  // -------------------------------------------------------------
  // 3. STRATEGY: Bull Put Spread (Credit Spread)
  // Sell OTM Put + Buy Lower OTM Put (High probability income)
  // -------------------------------------------------------------
  {
    const dte = thetaExp.dte;
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
      expiryLabel: thetaExp.label,
      spotPrice: S,
      targetPrice: Number((S * 1.02).toFixed(2)),
      legs,
      netCost: Number((netCredit * lotSize).toFixed(2)),
      isCredit: true,
      maxProfit: Number((netCredit * lotSize).toFixed(2)),
      maxLoss: Number((maxLossPerShare * lotSize).toFixed(2)),
      breakevens: [breakeven],
      riskReward: `1 : ${(netCredit / maxLossPerShare).toFixed(2)}`,
      pop,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: `High-probability theta harvest with cushion down to ${curr}${breakeven}. Win rate is ${pop}%, collecting upfront credit.`
    });
  }

  // -------------------------------------------------------------
  // 4. STRATEGY: Long Put (Bearish Breakdown)
  // Direct downside directional leverage
  // -------------------------------------------------------------
  {
    const dte = nearExp.dte;
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
      expiryLabel: nearExp.label,
      spotPrice: S,
      targetPrice: Number((S * 0.96).toFixed(2)),
      legs,
      netCost: Number((premium * lotSize).toFixed(2)),
      isCredit: false,
      maxProfit: Number(((strike - premium) * lotSize).toFixed(2)),
      maxLoss: Number((premium * lotSize).toFixed(2)),
      breakevens: [breakeven],
      riskReward: `1 : ${((strike - premium) / premium).toFixed(2)}`,
      pop,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: `Protective or speculative downside leverage. Unlocks exponential returns if underlying breaks below support ${curr}${breakeven}.`
    });
  }

  // -------------------------------------------------------------
  // 5. STRATEGY: Bear Put Spread (Debit Spread)
  // Buy Higher Put + Sell Lower Put
  // -------------------------------------------------------------
  {
    const dte = monthlyExp.dte;
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
      expiryLabel: monthlyExp.label,
      spotPrice: S,
      targetPrice: Number(lowerStrike.toFixed(2)),
      legs,
      netCost: Number((netDebit * lotSize).toFixed(2)),
      isCredit: false,
      maxProfit: Number((maxProfitPerShare * lotSize).toFixed(2)),
      maxLoss: Number((netDebit * lotSize).toFixed(2)),
      breakevens: [breakeven],
      riskReward: `1 : ${(maxProfitPerShare / netDebit).toFixed(2)}`,
      pop,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: `Limits downside premium cost by selling the ${curr}${lowerStrike} Put. Max profit achieved if price drops to or below ${curr}${lowerStrike}.`
    });
  }

  // -------------------------------------------------------------
  // 6. STRATEGY: Iron Condor (Range-Bound / Delta-Neutral)
  // Sell OTM Put Spread + Sell OTM Call Spread (4 legs)
  // Optimal when IV Rank is elevated (> 50%) and stock is consolidating
  // -------------------------------------------------------------
  {
    const dte = thetaExp.dte;
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

    // Approximate POP for Iron Condor (probability between lowerBE and upperBE)
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
      expiryLabel: thetaExp.label,
      spotPrice: S,
      targetPrice: S,
      legs,
      netCost: Number((totalCredit * lotSize).toFixed(2)),
      isCredit: true,
      maxProfit: Number((totalCredit * lotSize).toFixed(2)),
      maxLoss: Number((maxLossPerShare * lotSize).toFixed(2)),
      breakevens: [lowerBE, upperBE],
      riskReward: `1 : ${(totalCredit / maxLossPerShare).toFixed(2)}`,
      pop,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: `Profits from time decay and volatility contraction as long as underlying trades between ${curr}${lowerBE} and ${curr}${upperBE}. Estimated win rate: ${pop}%.`
    });
  }

  // -------------------------------------------------------------
  // 7. STRATEGY: Long Straddle (Volatility Expansion)
  // Buy ATM Call + Buy ATM Put (Explosive Breakout Play)
  // Optimal when IV Rank is very low (< 25%)
  // -------------------------------------------------------------
  {
    const dte = nearExp.dte;
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
      expiryLabel: nearExp.label,
      spotPrice: S,
      targetPrice: Number(upperBE.toFixed(2)),
      legs,
      netCost: Number((totalCost * lotSize).toFixed(2)),
      isCredit: false,
      maxProfit: 'Unlimited',
      maxLoss: Number((totalCost * lotSize).toFixed(2)),
      breakevens: [lowerBE, upperBE],
      riskReward: 'Unlimited Dual Wing',
      pop: 46.5,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: `Low IV rank (${ivRank}%) implies underpriced option premiums. Profits if underlying makes a violent move beyond ${curr}${lowerBE} or ${curr}${upperBE}.`
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
