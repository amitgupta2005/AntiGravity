/**
 * Market Data Feed Service
 * Real-time quotes for US & Indian Stocks and Indices, dynamic option chain generation,
 * and live streaming market simulation.
 */

import { OPTION_UNIVERSE } from './stockUniverse.js';
import { calculateGreeks, calculateIV, calculateOptionBeta, calculateOptionAlpha } from '../quant/blackScholes.js';

// Bounded cache for live quotes to prevent memory leaks
const MAX_CACHE_SIZE = 150;
const liveQuotesCache = new Map();

/**
 * Flush live quotes cache (useful for cleanups, tab changes, and tests)
 */
export function clearMarketDataCache() {
  liveQuotesCache.clear();
}

/**
 * Get current live quotes cache entry count
 */
export function getMarketDataCacheSize() {
  return liveQuotesCache.size;
}

/**
 * Generate standard option expiration dates (Weekly, Monthly, 45 DTE, Quarterly)
 */
// Known Indian Exchange (NSE / BSE) Trading Holidays (2025, 2026, 2027)
export const INDIAN_HOLIDAYS = new Set([
  // 2025
  '2025-01-26', // Republic Day
  '2025-02-26', // Maha Shivratri
  '2025-03-14', // Holi
  '2025-03-31', // Id-Ul-Fitr
  '2025-04-10', // Mahavir Jayanti
  '2025-04-14', // Dr. B.R. Ambedkar Jayanti
  '2025-04-18', // Good Friday
  '2025-05-01', // Maharashtra Day
  '2025-06-07', // Bakri Id
  '2025-08-15', // Independence Day
  '2025-08-27', // Ganesh Chaturthi
  '2025-10-02', // Mahatma Gandhi Jayanti
  '2025-10-21', // Diwali Laxmi Pujan
  '2025-10-22', // Diwali Balipratipada
  '2025-11-05', // Gurunanak Jayanti
  '2025-12-25', // Christmas
  // 2026
  '2026-01-26', // Republic Day
  '2026-02-17', // Maha Shivratri
  '2026-03-03', // Holi
  '2026-03-20', // Id-ul-Fitr
  '2026-03-31', // Mahavir Jayanti
  '2026-04-03', // Good Friday
  '2026-04-14', // Dr. Ambedkar Jayanti
  '2026-05-01', // Maharashtra Day
  '2026-05-27', // Bakrid
  '2026-08-15', // Independence Day
  '2026-09-14', // Ganesh Chaturthi
  '2026-10-02', // Mahatma Gandhi Jayanti
  '2026-10-20', // Dussehra
  '2026-11-08', // Diwali Laxmi Pujan
  '2026-11-10', // Diwali Balipratipada
  '2026-11-24', // Guru Nanak Jayanti
  '2026-12-25', // Christmas
  // 2027
  '2027-01-26', // Republic Day
  '2027-03-06', // Maha Shivratri
  '2027-03-22', // Holi
  '2027-03-26', // Good Friday
  '2027-04-14', // Dr. Ambedkar Jayanti
  '2027-05-01', // Maharashtra Day
  '2027-08-15', // Independence Day
  '2027-10-02', // Gandhi Jayanti
  '2027-10-29', // Diwali
  '2027-11-14', // Guru Nanak Jayanti
  '2027-12-25', // Christmas
]);

/**
 * Adjust an expiry date if it falls on an exchange holiday or weekend
 * Exchange Rule: If scheduled expiry is a trading holiday, expiry rolls to PRECEDING trading day.
 */
export function getPrecedingTradingDay(date, isIndia = true) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  while (true) {
    const day = d.getDay(); // 0 is Sunday, 6 is Saturday
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (day === 0 || day === 6 || (isIndia && INDIAN_HOLIDAYS.has(iso))) {
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return d;
}

/**
 * Compute institutional, market-accurate option expiration dates
 * Handles:
 * 1. Indian Individual Stocks (NSE F&O Stocks -> strictly Last Tuesday of each month, no weeklies)
 * 2. Indian Indices (NSE: NIFTY 50 -> Tuesday weekly & monthly; BANKNIFTY / FINNIFTY / MIDCPNIFTY -> Last Tuesday monthly only; BSE: SENSEX -> Thursday weekly & monthly)
 * 3. Holiday adjustments: If scheduled expiry is on an exchange holiday, it automatically rolls to preceding trading day
 * 4. US Equities & Benchmark Indices (Fridays weekly, 3rd Friday monthly)
 */
export function getMarketExpirations(asset = null) {
  const now = new Date();
  const isIndia = asset ? (asset.market === 'IN' || (asset.ticker && (asset.ticker.includes('.NS') || asset.ticker.includes('.BO') || asset.ticker.includes('NSE')))) : false;
  const isStock = asset ? asset.type === 'STOCK' : false;
  const ticker = asset ? (asset.ticker || asset.displayTicker || '') : '';
  const displayTicker = asset ? (asset.displayTicker || asset.ticker || '') : '';

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function isDateExpired(d) {
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (targetMidnight < todayMidnight) return true;
    if (targetMidnight.getTime() === todayMidnight.getTime()) {
      // Options expire at 15:30 IST for Indian market, 16:00 for US market
      const closeHour = isIndia ? 15 : 16;
      const closeMin = isIndia ? 30 : 0;
      return (now.getHours() > closeHour || (now.getHours() === closeHour && now.getMinutes() >= closeMin));
    }
    return false;
  }

  function formatDate(d, typeLabel, note = '') {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const monthStr = monthNames[d.getMonth()];
    
    // Calendar day based integer DTE
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const msDiff = targetMidnight.getTime() - todayMidnight.getTime();
    const dte = Math.max(0, Math.round(msDiff / (1000 * 60 * 60 * 24)));
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

  function getNextDayOfWeek(fromD, targetDay, isIndiaMarket = true) {
    const d = new Date(fromD.getFullYear(), fromD.getMonth(), fromD.getDate());
    const cur = d.getDay();
    let diff = (targetDay - cur + 7) % 7;
    if (diff === 0) {
      // If today is the target day but past market close, roll to next week
      const closeHour = isIndiaMarket ? 15 : 16;
      const closeMin = isIndiaMarket ? 30 : 0;
      if (fromD.getHours() > closeHour || (fromD.getHours() === closeHour && fromD.getMinutes() >= closeMin)) {
        diff = 7;
      }
    }
    d.setDate(d.getDate() + diff);
    return getPrecedingTradingDay(d, isIndiaMarket);
  }

  function getLastDayOfWeekOfMonth(year, month, targetDay, isIndiaMarket = true) {
    const lastDay = new Date(year, month + 1, 0); // last day of month
    const cur = lastDay.getDay();
    const diff = (cur >= targetDay) ? (cur - targetDay) : (cur + 7 - targetDay);
    const raw = new Date(year, month, lastDay.getDate() - diff);
    return getPrecedingTradingDay(raw, isIndiaMarket);
  }

  function getThirdFriday(year, month, isIndiaMarket = false) {
    const firstDay = new Date(year, month, 1);
    const cur = firstDay.getDay();
    const firstFriDate = (5 - cur + 7) % 7 + 1;
    const raw = new Date(year, month, firstFriDate + 14);
    return getPrecedingTradingDay(raw, isIndiaMarket);
  }

  const results = [];
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  if (isIndia) {
    if (isStock) {
      // 1. Indian Individual Stocks:
      // SEBI permits ONLY Monthly contracts expiring on the Last Tuesday of the Month (effective Sept 2025 onwards)
      // Expiry rolls to previous trading day if Last Tuesday is a trading holiday
      const stockExpiryDay = 2; // Tuesday
      
      const thisMonthExpiry = getLastDayOfWeekOfMonth(curYear, curMonth, stockExpiryDay, true);
      let startMonthOffset = 0;
      if (isDateExpired(thisMonthExpiry)) {
        startMonthOffset = 1;
      }

      for (let offset = startMonthOffset; offset < startMonthOffset + 3; offset++) {
        const m = (curMonth + offset) % 12;
        const y = curYear + Math.floor((curMonth + offset) / 12);
        const expDate = getLastDayOfWeekOfMonth(y, m, stockExpiryDay, true);
        const cycleName = offset === startMonthOffset ? `${monthNames[m]} Monthly Expiry` : (offset === startMonthOffset + 1 ? `${monthNames[m]} Next Monthly` : `${monthNames[m]} Far Monthly`);
        const note = offset === startMonthOffset 
          ? 'Current NSE Monthly Contract (Last Tuesday of Month • No weeklies for Indian stocks)'
          : `NSE ${monthNames[m]} Monthly Series (Last Tuesday of Month)`;
        results.push(formatDate(expDate, cycleName, note));
      }

      // Add 4th Quarter contract
      const qtrOffset = startMonthOffset + 3;
      const qm = (curMonth + qtrOffset) % 12;
      const qy = curYear + Math.floor((curMonth + qtrOffset) / 12);
      const qtrExpiry = getLastDayOfWeekOfMonth(qy, qm, stockExpiryDay, true);
      results.push(formatDate(qtrExpiry, `${monthNames[qm]} Quarterly`, `NSE ${monthNames[qm]} Quarterly Contract`));

    } else {
      // 2. Indian Index Options:
      // SEBI Circular & Exchange Revision:
      // - NSE NIFTY 50: ONLY NSE index with weekly contracts. Expiry on TUESDAY (weekly & monthly).
      // - BSE SENSEX: ONLY BSE index with weekly contracts. Expiry on THURSDAY (weekly & monthly).
      // - Other NSE Indices (BANKNIFTY, FINNIFTY, MIDCPNIFTY, NIFTY_SMALLCAP): Weekly options DISCONTINUED!
      //   They offer ONLY MONTHLY contracts expiring on the LAST TUESDAY of the month.

      const isNifty50 = (ticker === '^NSEI' || ticker.includes('NIFTY 50') || ticker === 'NIFTY' || displayTicker === 'NIFTY 50');
      const isSensex = (ticker === '^BSESN' || ticker.includes('SENSEX') || displayTicker === 'SENSEX');

      if (isNifty50) {
        // NIFTY 50: Weekly & Monthly on Tuesday
        const expiryDay = 2; // Tuesday
        const weekly1 = getNextDayOfWeek(now, expiryDay, true);
        results.push(formatDate(weekly1, 'Current Weekly', 'NSE NIFTY 50 Primary Weekly Series (Tuesday Expiry)'));

        const weekly2 = new Date(weekly1);
        weekly2.setDate(weekly2.getDate() + 7);
        const weekly2Adj = getPrecedingTradingDay(weekly2, true);

        const thisMonthMonthly = getLastDayOfWeekOfMonth(curYear, curMonth, expiryDay, true);
        const isWeekly2Monthly = Math.abs(weekly2Adj.getTime() - thisMonthMonthly.getTime()) < 24 * 60 * 60 * 1000;
        const isWeekly1Monthly = Math.abs(weekly1.getTime() - thisMonthMonthly.getTime()) < 24 * 60 * 60 * 1000;

        if (isWeekly1Monthly) {
          // Weekly 1 is the monthly contract
          results[0] = formatDate(weekly1, `${monthNames[curMonth]} Monthly Expiry`, 'NSE NIFTY 50 Monthly Series (Last Tuesday of Month)');
          results.push(formatDate(weekly2Adj, 'Next Weekly', 'NSE NIFTY 50 Weekly Series'));
        } else if (isWeekly2Monthly) {
          // Weekly 2 is the monthly contract
          results.push(formatDate(thisMonthMonthly, `${monthNames[curMonth]} Monthly Expiry`, 'NSE NIFTY 50 Monthly Series (Last Tuesday of Month)'));
        } else {
          results.push(formatDate(weekly2Adj, 'Next Weekly', 'NSE NIFTY 50 Weekly Series'));
          if (!isDateExpired(thisMonthMonthly)) {
            results.push(formatDate(thisMonthMonthly, `${monthNames[curMonth]} Monthly Expiry`, 'NSE NIFTY 50 Monthly Series (Last Tuesday of Month)'));
          }
        }

        // Next Month Monthly
        const nextMonthMonthly = getLastDayOfWeekOfMonth(curYear, curMonth + 1, expiryDay, true);
        results.push(formatDate(nextMonthMonthly, `${monthNames[(curMonth + 1) % 12]} Monthly`, 'NSE NIFTY 50 Next Month Core Series (Last Tuesday)'));

        // Far Month Monthly
        const farMonthMonthly = getLastDayOfWeekOfMonth(curYear, curMonth + 2, expiryDay, true);
        results.push(formatDate(farMonthMonthly, `${monthNames[(curMonth + 2) % 12]} Monthly`, 'NSE NIFTY 50 Far Month Core Series (Last Tuesday)'));

      } else if (isSensex) {
        // BSE SENSEX: Weekly & Monthly on Thursday
        const expiryDay = 4; // Thursday
        const weekly1 = getNextDayOfWeek(now, expiryDay, true);
        results.push(formatDate(weekly1, 'Current Weekly', 'BSE SENSEX Primary Weekly Series (Thursday Expiry)'));

        const weekly2 = new Date(weekly1);
        weekly2.setDate(weekly2.getDate() + 7);
        const weekly2Adj = getPrecedingTradingDay(weekly2, true);

        const thisMonthMonthly = getLastDayOfWeekOfMonth(curYear, curMonth, expiryDay, true);
        const isWeekly2Monthly = Math.abs(weekly2Adj.getTime() - thisMonthMonthly.getTime()) < 24 * 60 * 60 * 1000;
        const isWeekly1Monthly = Math.abs(weekly1.getTime() - thisMonthMonthly.getTime()) < 24 * 60 * 60 * 1000;

        if (isWeekly1Monthly) {
          results[0] = formatDate(weekly1, `${monthNames[curMonth]} Monthly Expiry`, 'BSE SENSEX Monthly Series (Last Thursday of Month)');
          results.push(formatDate(weekly2Adj, 'Next Weekly', 'BSE SENSEX Weekly Series'));
        } else if (isWeekly2Monthly) {
          results.push(formatDate(thisMonthMonthly, `${monthNames[curMonth]} Monthly Expiry`, 'BSE SENSEX Monthly Series (Last Thursday of Month)'));
        } else {
          results.push(formatDate(weekly2Adj, 'Next Weekly', 'BSE SENSEX Weekly Series'));
          if (!isDateExpired(thisMonthMonthly)) {
            results.push(formatDate(thisMonthMonthly, `${monthNames[curMonth]} Monthly Expiry`, 'BSE SENSEX Monthly Series (Last Thursday of Month)'));
          }
        }

        const nextMonthMonthly = getLastDayOfWeekOfMonth(curYear, curMonth + 1, expiryDay, true);
        results.push(formatDate(nextMonthMonthly, `${monthNames[(curMonth + 1) % 12]} Monthly`, 'BSE SENSEX Next Month Series (Last Thursday)'));

        const farMonthMonthly = getLastDayOfWeekOfMonth(curYear, curMonth + 2, expiryDay, true);
        results.push(formatDate(farMonthMonthly, `${monthNames[(curMonth + 2) % 12]} Monthly`, 'BSE SENSEX Far Month Series (Last Thursday)'));

      } else {
        // BANKNIFTY, FINNIFTY, MIDCPNIFTY, NIFTY_SMALLCAP:
        // SEBI Rule: Weekly options DISCONTINUED. Only Monthly contracts expiring on Last Tuesday of the month!
        const expiryDay = 2; // Tuesday
        const thisMonthMonthly = getLastDayOfWeekOfMonth(curYear, curMonth, expiryDay, true);
        let startMonthOffset = 0;
        if (isDateExpired(thisMonthMonthly)) {
          startMonthOffset = 1;
        }

        for (let offset = startMonthOffset; offset < startMonthOffset + 3; offset++) {
          const m = (curMonth + offset) % 12;
          const y = curYear + Math.floor((curMonth + offset) / 12);
          const expDate = getLastDayOfWeekOfMonth(y, m, expiryDay, true);
          const cycleName = offset === startMonthOffset ? `${monthNames[m]} Monthly Expiry` : (offset === startMonthOffset + 1 ? `${monthNames[m]} Next Monthly` : `${monthNames[m]} Far Monthly`);
          const note = offset === startMonthOffset
            ? `NSE Monthly Series (SEBI: Weekly contracts discontinued for ${displayTicker}; Expires Last Tuesday)`
            : `NSE ${displayTicker} ${monthNames[m]} Series (Last Tuesday of Month)`;
          results.push(formatDate(expDate, cycleName, note));
        }

        const qtrOffset = startMonthOffset + 3;
        const qm = (curMonth + qtrOffset) % 12;
        const qy = curYear + Math.floor((curMonth + qtrOffset) / 12);
        const qtrExpiry = getLastDayOfWeekOfMonth(qy, qm, expiryDay, true);
        results.push(formatDate(qtrExpiry, `${monthNames[qm]} Quarterly`, `NSE ${displayTicker} Quarterly Contract`));
      }
    }

  } else {
    // 3. USA Markets (Fridays weekly, 3rd Friday monthly)
    const weekly1 = getNextDayOfWeek(now, 5, false);
    results.push(formatDate(weekly1, 'Current Weekly', 'CBOE/NYSE Weekly Series'));

    const weekly2 = new Date(weekly1);
    weekly2.setDate(weekly2.getDate() + 7);
    const weekly2Adj = getPrecedingTradingDay(weekly2, false);
    results.push(formatDate(weekly2Adj, 'Next Weekly', 'Weekly Series'));

    // Next Month 3rd Friday
    const nextMonthThirdFri = getThirdFriday(curYear, curMonth + 1, false);
    results.push(formatDate(nextMonthThirdFri, `${monthNames[(curMonth + 1) % 12]} Monthly`, 'Standard Monthly (3rd Friday)'));

    // Far Month 3rd Friday
    const farMonthThirdFri = getThirdFriday(curYear, curMonth + 2, false);
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
    try {
      const proxyUrl = `/api/yahoo/chart?symbol=${encodeURIComponent(asset.ticker)}&range=5d&interval=1d`;
      const res = await fetch(proxyUrl, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
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
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (_) {}

  // If proxy did not return, try direct query with fast timeout
  if (!fetched) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.ticker)}?interval=1d&range=5d`;
        const res = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
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
      } finally {
        clearTimeout(timeoutId);
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

  // Enforce bounded cache size with FIFO eviction to prevent memory leaks
  if (liveQuotesCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = liveQuotesCache.keys().next().value;
    if (oldestKey) liveQuotesCache.delete(oldestKey);
  }
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
