/**
 * Black-Scholes-Merton Quantitative Option Pricing & Greeks Engine
 * High-precision numerical computing for European & American options
 */

/**
 * Standard Normal Cumulative Distribution Function N(x)
 * High accuracy polynomial approximation (Abramowitz & Stegun 7.1.26, precision > 1e-7)
 */
export function cdfNormal(x) {
  if (isNaN(x)) return 0.5;
  if (x > 8.0) return 1.0;
  if (x < -8.0) return 0.0;

  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;

  // Horner's method for A&S erf approximation
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Standard Normal Probability Density Function N'(x)
 */
export function pdfNormal(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Calculate Black-Scholes option price and full Greeks suite
 * @param {string} type - 'call' or 'put'
 * @param {number} S - Current Underlying Price
 * @param {number} K - Strike Price
 * @param {number} T - Time to Expiration in Years (DTE / 365)
 * @param {number} r - Risk-free interest rate (e.g. 0.045 for 4.5% US, 0.065 for 6.5% India)
 * @param {number} sigma - Implied Volatility (annualized, e.g. 0.28 for 28%)
 * @returns {object} { price, delta, gamma, theta, vega, rho, intrinsic, extrinsic, moneyness }
 */
export function calculateGreeks(type, S, K, T, r, sigma) {
  type = (type || 'call').toLowerCase();
  S = Math.max(0.001, Number(S) || 100);
  K = Math.max(0.001, Number(K) || 100);
  r = Number(r) || 0.05;
  sigma = Math.max(0.01, Number(sigma) || 0.25);
  
  // Guard against expired options (T <= 0)
  if (T <= 0.0001) {
    const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    return {
      price: intrinsic,
      delta: type === 'call' ? (S >= K ? 1.0 : 0.0) : (S <= K ? -1.0 : 0.0),
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
      intrinsic,
      extrinsic: 0,
      moneyness: S === K ? 'ATM' : (type === 'call' ? (S > K ? 'ITM' : 'OTM') : (S < K ? 'ITM' : 'OTM'))
    };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const Nd1 = cdfNormal(d1);
  const Nd2 = cdfNormal(d2);
  const N_minus_d1 = cdfNormal(-d1);
  const N_minus_d2 = cdfNormal(-d2);
  const nPrimeD1 = pdfNormal(d1);

  const discount = Math.exp(-r * T);

  let price, delta, theta, rho;

  if (type === 'call') {
    price = S * Nd1 - K * discount * Nd2;
    delta = Nd1;
    // Theta in currency per day
    const thetaAnnual = -(S * nPrimeD1 * sigma) / (2 * sqrtT) - r * K * discount * Nd2;
    theta = thetaAnnual / 365;
    rho = (K * T * discount * Nd2) / 100;
  } else {
    price = K * discount * N_minus_d2 - S * N_minus_d1;
    delta = Nd1 - 1;
    // Theta in currency per day
    const thetaAnnual = -(S * nPrimeD1 * sigma) / (2 * sqrtT) + r * K * discount * N_minus_d2;
    theta = thetaAnnual / 365;
    rho = (-K * T * discount * N_minus_d2) / 100;
  }

  // Ensure price doesn't fall below intrinsic
  const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
  price = Math.max(intrinsic, price);
  const extrinsic = Math.max(0, price - intrinsic);

  // Gamma and Vega are identical for Calls and Puts
  const gamma = nPrimeD1 / (S * sigma * sqrtT);
  const vega = (S * sqrtT * nPrimeD1) / 100; // per 1% change in volatility

  let moneyness = 'ATM';
  const diffPct = ((S - K) / S) * 100;
  if (Math.abs(diffPct) < 0.75) {
    moneyness = 'ATM';
  } else if (type === 'call') {
    moneyness = S > K ? 'ITM' : 'OTM';
  } else {
    moneyness = S < K ? 'ITM' : 'OTM';
  }

  return {
    price: Math.max(0.01, Number(price.toFixed(3))),
    delta: Number(delta.toFixed(4)),
    gamma: Number(gamma.toFixed(5)),
    theta: Number(theta.toFixed(4)),
    vega: Number(vega.toFixed(4)),
    rho: Number(rho.toFixed(4)),
    intrinsic: Number(intrinsic.toFixed(2)),
    extrinsic: Number(extrinsic.toFixed(2)),
    d1: Number(d1.toFixed(4)),
    d2: Number(d2.toFixed(4)),
    moneyness
  };
}

/**
 * Calculate Implied Volatility using Newton-Raphson with Bisection fallback
 */
export function calculateIV(type, targetPrice, S, K, T, r, initialGuess = 0.3) {
  if (targetPrice <= 0 || T <= 0) return 0.2;
  const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
  if (targetPrice < intrinsic) targetPrice = intrinsic + 0.05;

  let sigma = initialGuess;
  const maxIterations = 30;
  const tolerance = 1e-4;

  for (let i = 0; i < maxIterations; i++) {
    const greeks = calculateGreeks(type, S, K, T, r, sigma);
    const diff = greeks.price - targetPrice;

    if (Math.abs(diff) < tolerance) {
      return sigma;
    }

    const vega = greeks.vega * 100; // unscaled vega
    if (vega < 1e-5) break;

    const nextSigma = sigma - diff / vega;
    if (nextSigma <= 0.001 || nextSigma > 5.0) {
      break; // Fallback to bisection
    }
    sigma = nextSigma;
  }

  // Bisection Fallback
  let low = 0.01;
  let high = 4.0;
  for (let i = 0; i < 25; i++) {
    const mid = (low + high) / 2;
    const p = calculateGreeks(type, S, K, T, r, mid).price;
    if (Math.abs(p - targetPrice) < tolerance) return mid;
    if (p < targetPrice) low = mid;
    else high = mid;
  }

  return (low + high) / 2;
}

/**
 * Probability of Profit (POP %) estimation
 * Calculates log-normal probability that underlying finishes past breakeven at expiration
 */
export function calculatePOP(S, breakeven, T, sigma, isBullish) {
  if (T <= 0.0001 || sigma <= 0.001) return 50.0;
  
  // Standard deviation of log price
  const stdDev = sigma * Math.sqrt(T);
  // Drift adjusted expected log return (using risk neutral or slight drift)
  const drift = (0.05 - 0.5 * sigma * sigma) * T;
  const zScore = (Math.log(breakeven / S) - drift) / stdDev;

  let pop;
  if (isBullish) {
    // Probability that price finishes ABOVE breakeven
    pop = (1.0 - cdfNormal(zScore)) * 100;
  } else {
    // Probability that price finishes BELOW breakeven
    pop = cdfNormal(zScore) * 100;
  }

  return Math.min(99.0, Math.max(1.0, Number(pop.toFixed(1))));
}

/**
 * Expected Move calculation (+/- $)
 * Standard 1 standard deviation move over expiration period
 */
export function calculateExpectedMove(S, sigma, T) {
  if (T <= 0 || sigma <= 0) return 0;
  const move = S * sigma * Math.sqrt(T);
  const movePct = (move / S) * 100;
  return {
    absolute: Number(move.toFixed(2)),
    percent: Number(movePct.toFixed(2)),
    upper: Number((S + move).toFixed(2)),
    lower: Number(Math.max(0, S - move).toFixed(2))
  };
}

/**
 * Calculate Option Beta (Systematic market exposure multiplier)
 * β_opt = Ω * β_asset = (Delta * S / OptionPrice) * β_asset
 * @param {number} delta - Option Delta
 * @param {number} S - Underlying Spot Price
 * @param {number} optionPrice - Option Market Price (LTP or Mid)
 * @param {number} assetBeta - Underlying Asset Beta relative to benchmark (default: 1.0)
 * @returns {number} Option Beta (multiplier, e.g. 15.4 for Call or -14.2 for Put)
 */
export function calculateOptionBeta(delta, S, optionPrice, assetBeta = 1.0) {
  if (!optionPrice || optionPrice <= 0.001 || !S || S <= 0) return 0;
  const gearing = (S / Math.max(0.05, optionPrice)) * delta;
  // Clamp gearing to reasonable financial bounds [-45, +45] to avoid extreme deep OTM distortion
  const clampedGearing = Math.min(45, Math.max(-45, gearing));
  const beta = clampedGearing * (Number(assetBeta) || 1.0);
  return Number(beta.toFixed(2));
}

/**
 * Calculate Option Alpha (Theoretical Edge & Risk-Adjusted Excess Yield %)
 * Derived from Volatility Pricing Edge (Fair HV vs Market IV) + Leveraged Asset Alpha
 * @param {string} type - 'call' or 'put'
 * @param {number} delta - Option Delta
 * @param {number} S - Underlying Spot Price
 * @param {number} optionPrice - Option Market Price
 * @param {number} strikeIV - Strike Implied Volatility (decimal, e.g. 0.28)
 * @param {number} historicalIV - Asset Historical Volatility (decimal, e.g. 0.25)
 * @param {number} assetAlpha - Asset Jensen's Alpha % (e.g. 5.5)
 * @param {number} T - Time to expiration in years
 * @returns {number} Option Alpha in percent (e.g. +3.8% or -2.4%)
 */
export function calculateOptionAlpha(type, delta, S, optionPrice, strikeIV, historicalIV, assetAlpha = 0, T = 0.05) {
  if (!optionPrice || optionPrice <= 0.001 || !strikeIV || strikeIV <= 0) return 0;
  const hv = historicalIV > 0 ? historicalIV : strikeIV;
  // Volatility edge: positive for buyers when IV is cheap (IV < HV), negative when IV is rich
  const volSpreadPct = ((hv - strikeIV) / strikeIV) * 100;
  // Leveraged directional alpha from underlying asset drift
  const gearing = Math.min(30, Math.max(-30, (S / Math.max(0.1, optionPrice)) * delta));
  const driftAlpha = gearing * ((Number(assetAlpha) || 0) / 100) * Math.max(0.01, T) * 100;
  const alpha = (volSpreadPct * 0.4) + driftAlpha;
  return Number(Math.min(99.0, Math.max(-99.0, alpha)).toFixed(1));
}

/**
 * Format Gamma with high precision (avoid scientific notation)
 */
export function formatGamma(gamma) {
  const g = Number(gamma) || 0;
  if (g < 0.0001) return g.toFixed(6);
  if (g < 0.001) return g.toFixed(5);
  return g.toFixed(4);
}

/**
 * Format Theta with currency sign and daily rate
 */
export function formatTheta(theta, curr = '$') {
  const th = Number(theta) || 0;
  const sign = th < 0 ? '-' : '';
  return `${sign}${curr}${Math.abs(th).toFixed(2)}`;
}

