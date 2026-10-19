/**
 * Market Data Feed Service
 * Real-time quotes for US & Indian Stocks and Indices, dynamic option chain generation,
 * and live streaming market simulation.
 */

import { OPTION_UNIVERSE } from './stockUniverse.js';
import { calculateGreeks, calculateIV } from '../quant/blackScholes.js';

// Cache for live quotes
const liveQuotesCache = new Map();

/**
 * Generate standard option expiration dates (Weekly, Monthly, 45 DTE, Quarterly)
 */
export function getStandardExpirations() {
  const now = new Date();
  const expirations = [];

  // Helper to format date YYYY-MM-DD and friendly label
  const formatDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      iso: `${year}-${month}-${day}`,
      label: `${day} ${monthNames[d.getMonth()]} ${year}`,
      dte: Math.max(1, Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    };
  };

  // 1. Current Weekly (Next Friday)
  const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
  const thisFriday = new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
  const curExp = formatDate(thisFriday);
  expirations.push({ ...curExp, type: 'Weekly', isNear: true });

  // 2. Next Weekly (Following Friday)
  const nextFriday = new Date(thisFriday.getTime() + 7 * 24 * 60 * 60 * 1000);
  expirations.push({ ...formatDate(nextFriday), type: 'Weekly' });

  // 3. Monthly Expiration (Third Friday of next month or ~30 days out)
  const monthly = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
  expirations.push({ ...formatDate(monthly), type: 'Monthly', isOptimalTheta: true });

  // 4. Institutional 45 DTE (Ideal for Theta Spreads / Iron Condors)
  const dte45 = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
  expirations.push({ ...formatDate(dte45), type: '45-DTE' });

  // 5. Quarterly / 90 DTE
  const dte90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  expirations.push({ ...formatDate(dte90), type: 'Quarterly' });

  return expirations;
}

/**
 * Return synchronous baseline quote for immediate zero-latency initial UI render
 */
export function getBaseQuote(asset) {
  if (!asset) return null;
  const drift = (Math.random() - 0.48) * 0.008;
  const price = asset.basePrice * (1 + drift);
  const change = price - asset.basePrice;
  const changePercent = (change / asset.basePrice) * 100;
  return {
    ...asset,
    price: Number(price.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    volume: 1500000,
    dayHigh: Number((price * 1.01).toFixed(2)),
    dayLow: Number((price * 0.99).toFixed(2)),
    iv: asset.historicalIV,
    ivRank: asset.ivRank,
    pcr: asset.pcr,
    maxPain: asset.maxPain,
    lastUpdated: new Date().toLocaleTimeString()
  };
}

/**
 * Fetch live quote for an asset via local proxy with fallback
 */
export async function fetchLiveQuote(asset) {
  if (!asset) return null;

  // Check cache first
  const cached = liveQuotesCache.get(asset.ticker);
  const now = Date.now();
  if (cached && now - cached.timestamp < 15000) {
    return cached.quote;
  }

  let price = asset.basePrice;
  let change = 0;
  let changePercent = 0;
  let volume = 1500000;
  let dayHigh = price * 1.012;
  let dayLow = price * 0.988;
  let fetched = false;

  // Try local Vite proxy first with 2.5s AbortController timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const proxyUrl = `/api/yahoo/chart?symbol=${encodeURIComponent(asset.ticker)}&range=5d&interval=1d`;
    const res = await fetch(proxyUrl, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta && meta.regularMarketPrice) {
        price = meta.regularMarketPrice;
        const prevClose = meta.previousClose || meta.chartPreviousClose || price;
        change = price - prevClose;
        changePercent = ((price - prevClose) / prevClose) * 100;
        volume = meta.regularMarketVolume || volume;
        dayHigh = meta.regularMarketDayHigh || price * 1.01;
        dayLow = meta.regularMarketDayLow || price * 0.99;
        fetched = true;
      }
    }
  } catch (_) {}

  // If proxy did not return, try direct query with fast timeout
  if (!fetched) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.ticker)}?interval=1d&range=5d`;
      const res = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta && meta.regularMarketPrice) {
          price = meta.regularMarketPrice;
          const prevClose = meta.previousClose || meta.chartPreviousClose || price;
          change = price - prevClose;
          changePercent = ((price - prevClose) / prevClose) * 100;
          volume = meta.regularMarketVolume || volume;
          dayHigh = meta.regularMarketDayHigh || price * 1.01;
          dayLow = meta.regularMarketDayLow || price * 0.99;
          fetched = true;
        }
      }
    } catch (_) {}
  }

  // Realistic fallback if network unavailable
  if (!fetched) {
    const drift = (Math.random() - 0.48) * 0.008;
    price = asset.basePrice * (1 + drift);
    change = price - asset.basePrice;
    changePercent = (change / asset.basePrice) * 100;
  }

  const quote = {
    ...asset,
    price: Number(price.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    volume,
    dayHigh: Number(dayHigh.toFixed(2)),
    dayLow: Number(dayLow.toFixed(2)),
    iv: asset.historicalIV,
    ivRank: asset.ivRank,
    pcr: asset.pcr,
    maxPain: asset.maxPain,
    lastUpdated: new Date().toLocaleTimeString()
  };

  liveQuotesCache.set(asset.ticker, { timestamp: now, quote });
  return quote;
}

/**
 * Fetch all quotes in the universe
 */
export async function fetchAllUniverseQuotes() {
  const promises = OPTION_UNIVERSE.map(asset => fetchLiveQuote(asset));
  return Promise.all(promises);
}

/**
 * Generate full Option Chain for an asset at a specified expiration
 */
export function generateOptionChain(quote, selectedDte = 14) {
  if (!quote) return null;

  const S = quote.price;
  const r = quote.riskFreeRate || (quote.currency === 'INR' ? 0.065 : 0.045);
  const sigma = (quote.iv || 25) / 100;
  const T = Math.max(0.003, selectedDte / 365);
  const step = quote.strikeStep || 5;

  // Determine ATM strike (round S to nearest strikeStep)
  const atmStrike = Math.round(S / step) * step;

  // Number of strikes above and below ATM
  const numStrikes = quote.type === 'INDEX' ? 14 : 10;
  const strikes = [];

  for (let i = -numStrikes; i <= numStrikes; i++) {
    const K = atmStrike + i * step;
    if (K <= 0) continue;

    // Add skew: OTM Puts have slightly higher IV (Volatility Smile / Skew)
    const moneynessRatio = K / S;
    const skewFactor = moneynessRatio < 1 ? 1 + (1 - moneynessRatio) * 0.4 : 1 + (moneynessRatio - 1) * 0.2;
    const strikeIV = Math.max(0.08, sigma * skewFactor);

    // Calculate Call Greeks & Price
    const callGreeks = calculateGreeks('call', S, K, T, r, strikeIV);
    const callSpread = Math.max(0.05, callGreeks.price * 0.025);
    const callBid = Math.max(0.05, Number((callGreeks.price - callSpread / 2).toFixed(2)));
    const callAsk = Number((callGreeks.price + callSpread / 2).toFixed(2));

    // Calculate Put Greeks & Price
    const putGreeks = calculateGreeks('put', S, K, T, r, strikeIV);
    const putSpread = Math.max(0.05, putGreeks.price * 0.025);
    const putBid = Math.max(0.05, Number((putGreeks.price - putSpread / 2).toFixed(2)));
    const putAsk = Number((putGreeks.price + putSpread / 2).toFixed(2));

    // Simulated realistic Open Interest & Volume distributions
    const distFromATM = Math.abs(K - atmStrike) / step;
    const baseOI = Math.max(500, Math.round(50000 * Math.exp(-0.15 * distFromATM)));
    const callOI = Math.round(baseOI * (1 + (Math.sin(K) * 0.2)));
    const putOI = Math.round(baseOI * quote.pcr * (1 + (Math.cos(K) * 0.2)));

    const callVol = Math.round(callOI * (0.15 + Math.random() * 0.25));
    const putVol = Math.round(putOI * (0.15 + Math.random() * 0.25));

    strikes.push({
      strike: K,
      isATM: K === atmStrike,
      isMaxPain: Math.abs(K - quote.maxPain) < step / 2,
      strikeIV: Number((strikeIV * 100).toFixed(1)),
      call: {
        price: callGreeks.price,
        bid: callBid,
        ask: callAsk,
        delta: callGreeks.delta,
        gamma: callGreeks.gamma,
        theta: callGreeks.theta,
        vega: callGreeks.vega,
        iv: Number((strikeIV * 100).toFixed(1)),
        oi: callOI,
        volume: callVol,
        moneyness: callGreeks.moneyness,
        change: Number(((Math.random() - 0.45) * callGreeks.price * 0.12).toFixed(2))
      },
      put: {
        price: putGreeks.price,
        bid: putBid,
        ask: putAsk,
        delta: putGreeks.delta,
        gamma: putGreeks.gamma,
        theta: putGreeks.theta,
        vega: putGreeks.vega,
        iv: Number((strikeIV * 100).toFixed(1)),
        oi: putOI,
        volume: putVol,
        moneyness: putGreeks.moneyness,
        change: Number(((Math.random() - 0.45) * putGreeks.price * 0.12).toFixed(2))
      }
    });
  }

  // Calculate Total Call & Put OI to derive exact Chain PCR
  const totalCallOI = strikes.reduce((sum, s) => sum + s.call.oi, 0);
  const totalPutOI = strikes.reduce((sum, s) => sum + s.put.oi, 0);
  const chainPCR = totalCallOI > 0 ? Number((totalPutOI / totalCallOI).toFixed(2)) : quote.pcr;

  return {
    quote,
    dte: selectedDte,
    T,
    atmStrike,
    strikes,
    totalCallOI,
    totalPutOI,
    chainPCR
  };
}
