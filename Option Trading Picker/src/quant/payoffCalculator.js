/**
 * Payoff Curve & Risk Profile Calculator
 * Computes multi-leg option payoffs at expiration and today (T+0 line)
 */

import { calculateGreeks } from './blackScholes.js';

/**
 * Calculate multi-leg option payoff across an underlying price spectrum
 * @param {Array} legs - Array of option leg objects
 * @param {number} currentPrice - Current underlying asset price
 * @param {number} lotSize - Contract multiplier (e.g. 100 for US, 25/75 for India)
 * @param {number} dte - Remaining days to expiration
 * @param {number} sigma - Implied volatility (e.g. 0.25)
 * @param {number} r - Risk-free interest rate
 * @returns {object} Payoff analysis data and coordinates for charting
 */
export function calculatePayoffProfile(legs, currentPrice, lotSize = 100, dte = 14, sigma = 0.25, r = 0.05) {
  if (!legs || legs.length === 0) {
    return null;
  }

  currentPrice = Number(currentPrice) || 100;
  lotSize = Number(lotSize) || 100;
  dte = Math.max(1, Number(dte) || 14);
  sigma = Math.max(0.01, Number(sigma) || 0.25);
  r = Number(r) || 0.05;

  // Find minimum and maximum strikes
  const strikes = legs.map(l => Number(l.strike) || currentPrice);
  const minStrike = Math.min(...strikes, currentPrice);
  const maxStrike = Math.max(...strikes, currentPrice);

  // Define chart price spectrum (+/- 25% or 3x strike spread)
  const spread = Math.max(maxStrike - minStrike, currentPrice * 0.15);
  const minPrice = Math.max(0.01, Number((minStrike - spread * 1.5).toFixed(2)));
  const maxPrice = Number((maxStrike + spread * 1.5).toFixed(2));
  const numSteps = 70;
  const step = (maxPrice - minPrice) / numSteps;

  const pricePoints = [];
  const expiryPnL = [];
  const currentPnL = [];

  const T_today = dte / 365;

  // Net Net Greeks at current spot price
  let netDelta = 0;
  let netGamma = 0;
  let netTheta = 0;
  let netVega = 0;
  let netPremiumPaid = 0; // Total debit (negative) or credit (positive)

  legs.forEach(leg => {
    const qty = (leg.contracts || 1) * lotSize;
    const sign = leg.action === 'buy' ? 1 : -1;
    const prem = Number(leg.premium) || 0;

    netPremiumPaid -= sign * prem * qty;

    const greeks = calculateGreeks(leg.type, currentPrice, leg.strike, T_today, r, sigma);
    netDelta += sign * greeks.delta * qty;
    netGamma += sign * greeks.gamma * qty;
    netTheta += sign * greeks.theta * qty;
    netVega += sign * greeks.vega * qty;
  });

  // Calculate payoff curves
  for (let i = 0; i <= numSteps; i++) {
    const S = minPrice + i * step;
    let pnlAtExpiry = 0;
    let pnlToday = 0;

    legs.forEach(leg => {
      const qty = (leg.contracts || 1) * lotSize;
      const sign = leg.action === 'buy' ? 1 : -1;
      const K = Number(leg.strike);
      const prem = Number(leg.premium) || 0;

      // 1. Expiration Payoff (Intrinsic - Cost)
      let intrinsic = 0;
      if (leg.type === 'call') {
        intrinsic = Math.max(0, S - K);
      } else {
        intrinsic = Math.max(0, K - S);
      }

      const expiryProfitPerShare = sign === 1 ? (intrinsic - prem) : (prem - intrinsic);
      pnlAtExpiry += expiryProfitPerShare * qty;

      // 2. Today PnL (T+0 Black-Scholes curve)
      const greeksToday = calculateGreeks(leg.type, S, K, T_today, r, sigma);
      const todayProfitPerShare = sign === 1 ? (greeksToday.price - prem) : (prem - greeksToday.price);
      pnlToday += todayProfitPerShare * qty;
    });

    pricePoints.push(Number(S.toFixed(2)));
    expiryPnL.push(Number(pnlAtExpiry.toFixed(2)));
    currentPnL.push(Number(pnlToday.toFixed(2)));
  }

  // Find Breakevens (zero crossings in expiryPnL)
  const breakevens = [];
  for (let i = 0; i < expiryPnL.length - 1; i++) {
    if ((expiryPnL[i] <= 0 && expiryPnL[i + 1] > 0) || (expiryPnL[i] >= 0 && expiryPnL[i + 1] < 0)) {
      // Linear interpolation
      const x0 = pricePoints[i];
      const x1 = pricePoints[i + 1];
      const y0 = expiryPnL[i];
      const y1 = expiryPnL[i + 1];
      const be = x0 - y0 * (x1 - x0) / (y1 - y0);
      breakevens.push(Number(be.toFixed(2)));
    }
  }

  // Calculate Max Profit & Max Loss
  const maxPnl = Math.max(...expiryPnL);
  const minPnl = Math.min(...expiryPnL);

  // Check if unbounded
  const isCallUnbounded = legs.some(l => l.type === 'call' && l.action === 'buy');
  const isShortCallUnbounded = legs.some(l => l.type === 'call' && l.action === 'sell' && !legs.some(c => c.type === 'call' && c.action === 'buy' && c.strike > l.strike));

  const maxProfit = isCallUnbounded && maxPnl > 500000 ? 'Unlimited' : Math.max(0, maxPnl);
  const maxLoss = isShortCallUnbounded ? 'Undefined / High' : Math.abs(Math.min(0, minPnl));

  // Risk / Reward Ratio
  let riskReward = 'N/A';
  if (typeof maxProfit === 'number' && typeof maxLoss === 'number' && maxLoss > 0) {
    riskReward = `1 : ${(maxProfit / maxLoss).toFixed(2)}`;
  } else if (maxProfit === 'Unlimited') {
    riskReward = 'Unlimited Upside';
  }

  return {
    pricePoints,
    expiryPnL,
    currentPnL,
    breakevens,
    maxProfit,
    maxLoss,
    riskReward,
    netPremiumPaid: Number(netPremiumPaid.toFixed(2)),
    isCredit: netPremiumPaid > 0,
    netDelta: Number(netDelta.toFixed(2)),
    netGamma: Number(netGamma.toFixed(4)),
    netTheta: Number(netTheta.toFixed(2)),
    netVega: Number(netVega.toFixed(2)),
    minPrice,
    maxPrice
  };
}
