/**
 * Market Data Feed Service
 * Real-time quotes for US & Indian Stocks and Indices, dynamic option chain generation,
 * and live streaming market simulation.
 */

import { OPTION_UNIVERSE } from './stockUniverse.js';
import { calculateGreeks, calculateIV, calculateOptionBeta, calculateOptionAlpha } from '../quant/blackScholes.js';

// Cache for live quotes
const liveQuotesCache = new Map();

/**
 * Generate standard option expiration dates (Weekly, Monthly, 45 DTE, Quarterly)
 */
/**
 * Compute institutional, market-accurate option expiration dates
 * Handles:
 * 1. Indian Indices (NSE: NIFTY 50 -> Thu, BANKNIFTY -> Wed, FINNIFTY -> Tue, BSE: SENSEX -> Fri)
 * 2. Indian Equities (NSE F&O Stocks -> strictly Last Thursday of each month, no weeklies)
 * 3. US Equities & Benchmark Indices (Fridays weekly, 3rd Friday monthly)
 */
export function getMarketExpirations(asset = null) {
  const now = new Date();
  const isIndia = asset ? (asset.market === 'IN' || (asset.ticker && (asset.ticker.includes('.NS') || asset.ticker.includes('.BO') || asset.ticker.includes('NSE')))) : false;
  const isStock = asset ? asset.type === 'STOCK' : false;
  const ticker = asset ? (asset.ticker || asset.displayTicker || '') : '';

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function formatDate(d, typeLabel, note = '') {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const monthStr = monthNames[d.getMonth()];
    const msDiff = d.getTime() - now.getTime();
    const dte = Math.max(1, Math.round(msDiff / (1000 * 60 * 60 * 24)));
    const dayOfWeek = dayNames[d.getDay()];

    return {
      iso: `${year}-${month}-${day}`,
      dateStr: `${day} ${monthStr} ${year}`,
      label: `${day} ${monthStr} ${year}`,
      dte,
      type: typeLabel,
      dayOfWeek,
      note
    };
  }

  function getNextDayOfWeek(fromD, targetDay) {
    const d = new Date(fromD.getFullYear(), fromD.getMonth(), fromD.getDate());
    const cur = d.getDay();
    let diff = (targetDay - cur + 7) % 7;
    if (diff === 0) diff = 7; // next week if today
    d.setDate(d.getDate() + diff);
    return d;
  }

  function getLastDayOfWeekOfMonth(year, month, targetDay) {
    const lastDay = new Date(year, month + 1, 0); // last day of month
    const cur = lastDay.getDay();
    const diff = (cur >= targetDay) ? (cur - targetDay) : (cur + 7 - targetDay);
    return new Date(year, month, lastDay.getDate() - diff);
  }

  function getThirdFriday(year, month) {
    const firstDay = new Date(year, month, 1);
    const cur = firstDay.getDay();
    const firstFriDate = (5 - cur + 7) % 7 + 1;
    return new Date(year, month, firstFriDate + 14);
  }

  const results = [];
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  if (isIndia) {
    if (isStock) {
      // 1. Indian Single Stocks: SEBI permits ONLY Monthly contracts expiring on Last Thursday of the Month
      const thisMonthExpiry = getLastDayOfWeekOfMonth(curYear, curMonth, 4);
      if (thisMonthExpiry > now) {
        results.push(formatDate(thisMonthExpiry, `${monthNames[curMonth]} Monthly`, 'Current NSE Monthly Contract (No weeklies for Indian stocks)'));
      }
      const nextMonthExpiry = getLastDayOfWeekOfMonth(curYear, curMonth + 1, 4);
      results.push(formatDate(nextMonthExpiry, `${monthNames[(curMonth + 1) % 12]} Monthly`, 'Next NSE Monthly Contract'));

      const farMonthExpiry = getLastDayOfWeekOfMonth(curYear, curMonth + 2, 4);
      results.push(formatDate(farMonthExpiry, `${monthNames[(curMonth + 2) % 12]} Monthly`, 'Far NSE Monthly Contract'));

      const qtrExpiry = getLastDayOfWeekOfMonth(curYear, curMonth + 3, 4);
      results.push(formatDate(qtrExpiry, `${monthNames[(curMonth + 3) % 12]} Quarterly`, 'Quarterly Series'));
    } else {
      // 2. Indian Index Options (NIFTY 50 -> Thu, BANKNIFTY -> Wed, FINNIFTY -> Tue, MIDCPNIFTY -> Mon, SENSEX -> Fri)
      let expiryDay = 4; // Default Thursday for NIFTY
      let indexExchange = 'NSE';
      if (ticker === '^NSEBANK' || ticker.includes('BANKNIFTY')) {
        expiryDay = 3; // Wednesday
      } else if (ticker.includes('FIN_SERVICE') || ticker.includes('FINNIFTY')) {
        expiryDay = 2; // Tuesday
      } else if (ticker.includes('MIDCPNIFTY') || ticker.includes('MIDCAP')) {
        expiryDay = 1; // Monday (NSE Nifty Midcap Select F&O)
      } else if (ticker === '^BSESN' || ticker.includes('SENSEX')) {
        expiryDay = 5; // Friday
        indexExchange = 'BSE';
      }

      // Next Weekly
      const weekly1 = getNextDayOfWeek(now, expiryDay);
      results.push(formatDate(weekly1, 'Current Weekly', `${indexExchange} Primary Weekly Series`));

      // Following Weekly
      const weekly2 = new Date(weekly1);
      weekly2.setDate(weekly2.getDate() + 7);

      const thisMonthMonthly = getLastDayOfWeekOfMonth(curYear, curMonth, expiryDay);
      const isWeekly2Monthly = Math.abs(weekly2.getTime() - thisMonthMonthly.getTime()) < 24 * 60 * 60 * 1000;

      if (isWeekly2Monthly) {
        results.push(formatDate(thisMonthMonthly, `${monthNames[curMonth]} Monthly Expiry`, 'NSE Monthly Series & Contract Expiry'));
      } else {
        results.push(formatDate(weekly2, 'Next Weekly', 'Weekly Series'));
        if (thisMonthMonthly > now && Math.abs(weekly1.getTime() - thisMonthMonthly.getTime()) >= 24 * 60 * 60 * 1000) {
          results.push(formatDate(thisMonthMonthly, `${monthNames[curMonth]} Monthly Expiry`, 'NSE Monthly Series & Contract Expiry'));
        }
      }

      // Next Month Monthly
      const nextMonthMonthly = getLastDayOfWeekOfMonth(curYear, curMonth + 1, expiryDay);
      results.push(formatDate(nextMonthMonthly, `${monthNames[(curMonth + 1) % 12]} Monthly`, 'Next Month Core Series'));

      // Far Month Monthly
      const farMonthMonthly = getLastDayOfWeekOfMonth(curYear, curMonth + 2, expiryDay);
      results.push(formatDate(farMonthMonthly, `${monthNames[(curMonth + 2) % 12]} Monthly`, 'Far Month Core Series'));
    }
  } else {
    // 3. USA Markets (Fridays weekly, 3rd Friday monthly)
    const weekly1 = getNextDayOfWeek(now, 5);
    results.push(formatDate(weekly1, 'Current Weekly', 'CBOE/NYSE Weekly Series'));

    const weekly2 = new Date(weekly1);
    weekly2.setDate(weekly2.getDate() + 7);
    results.push(formatDate(weekly2, 'Next Weekly', 'Weekly Series'));

    // Next Month 3rd Friday
    const nextMonthThirdFri = getThirdFriday(curYear, curMonth + 1);
    results.push(formatDate(nextMonthThirdFri, `${monthNames[(curMonth + 1) % 12]} Monthly`, 'Standard Monthly (3rd Friday)'));

    // Far Month 3rd Friday
    const farMonthThirdFri = getThirdFriday(curYear, curMonth + 2);
    results.push(formatDate(farMonthThirdFri, `${monthNames[(curMonth + 2) % 12]} Monthly`, 'Quarterly / Far Monthly'));
  }

  return results;
}

/**
 * Backward compatibility wrapper
 */
export function getStandardExpirations(asset = null) {
  return getMarketExpirations(asset);
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
  const historicalIV = (quote.historicalIV || quote.iv || 25) / 100;
  const assetBeta = quote.beta != null ? quote.beta : 1.0;
  const assetAlpha = quote.alpha != null ? quote.alpha : 0.0;
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
    const callBeta = calculateOptionBeta(callGreeks.delta, S, callGreeks.price, assetBeta);
    const callAlpha = calculateOptionAlpha('call', callGreeks.delta, S, callGreeks.price, strikeIV, historicalIV, assetAlpha, T);

    // Calculate Put Greeks & Price
    const putGreeks = calculateGreeks('put', S, K, T, r, strikeIV);
    const putSpread = Math.max(0.05, putGreeks.price * 0.025);
    const putBid = Math.max(0.05, Number((putGreeks.price - putSpread / 2).toFixed(2)));
    const putAsk = Number((putGreeks.price + putSpread / 2).toFixed(2));
    const putBeta = calculateOptionBeta(putGreeks.delta, S, putGreeks.price, assetBeta);
    const putAlpha = calculateOptionAlpha('put', putGreeks.delta, S, putGreeks.price, strikeIV, historicalIV, assetAlpha, T);

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
        beta: callBeta,
        alpha: callAlpha,
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
        beta: putBeta,
        alpha: putAlpha,
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

  // Extract ATM Greeks & Chain Risk metrics
  const atmRow = strikes.find(s => s.isATM) || strikes[Math.floor(strikes.length / 2)];
  const atmGamma = atmRow ? atmRow.call.gamma : 0;
  const atmTheta = atmRow ? atmRow.call.theta : 0;
  const avgAlpha = atmRow ? Number(((atmRow.call.alpha + atmRow.put.alpha) / 2).toFixed(1)) : 0;

  return {
    quote,
    dte: selectedDte,
    T,
    atmStrike,
    strikes,
    totalCallOI,
    totalPutOI,
    chainPCR,
    atmGamma,
    atmTheta,
    assetBeta,
    assetAlpha,
    avgAlpha
  };
}
