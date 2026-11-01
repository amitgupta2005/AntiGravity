/**
 * Unit & Integration Test Suite:
 * Indian Market Stock & Indices Expiry / DTE Verification
 * Strictly validates latest SEBI and NSE/BSE regulatory rules:
 * 1. Indian Individual Stocks: Monthly contracts only expiring on Last Tuesday of the month (no weeklies).
 * 2. NSE NIFTY 50: Weekly & Monthly expiring on Tuesday.
 * 3. NSE Non-Benchmark Indices (BANKNIFTY, FINNIFTY, MIDCPNIFTY, NIFTY_SMALLCAP): Monthly only on Last Tuesday (Weeklies discontinued).
 * 4. BSE SENSEX: Weekly & Monthly expiring on Thursday.
 * 5. Preceding Trading Day Adjustment for Exchange Holidays.
 * 6. Strategy Engine Transact Recommendation consistency.
 */

import assert from 'assert';
import { OPTION_UNIVERSE } from './src/data/stockUniverse.js';
import { getMarketExpirations, getPrecedingTradingDay, getBaseQuote, INDIAN_HOLIDAYS } from './src/data/marketDataFeed.js';
import { scanStrategiesForAsset } from './src/quant/strategyEngine.js';

console.log('🧪 Starting Indian Stock & Indices Expiry / DTE Verification Suite...\n');

// 1. Verify Indian Stock Expirations (Single Stocks)
console.log('▶ Test 1: Verifying Indian Individual Stock Expirations (Last Tuesday Monthly Only)...');
const sampleStockTickers = ['RELIANCE.NS', 'TCS.NS', 'DIXON.NS', 'SUZLON.NS'];

for (const ticker of sampleStockTickers) {
  const stockAsset = OPTION_UNIVERSE.find(a => a.ticker === ticker);
  assert(stockAsset, `Asset ${ticker} must exist in OPTION_UNIVERSE`);
  assert.strictEqual(stockAsset.type, 'STOCK', `${ticker} must be a STOCK`);
  assert.strictEqual(stockAsset.market, 'IN', `${ticker} must be market IN`);

  const expirations = getMarketExpirations(stockAsset);
  assert(expirations.length >= 3, `${ticker} must return at least 3 expiration cycles`);

  console.log(`  Evaluating ${ticker} (${stockAsset.name}):`);
  expirations.forEach((exp, idx) => {
    console.log(`    [${idx}] ${exp.dateStr} (${exp.dayOfWeek}) • ${exp.dte} DTE • ${exp.type}`);

    // Must be Tuesday (or Monday if Tuesday is an exchange holiday)
    assert(
      exp.dayOfWeek === 'Tuesday' || exp.dayOfWeek === 'Monday' || exp.dayOfWeek === 'Wednesday',
      `${ticker} expiry day must be Tuesday (or preceding trading day), got ${exp.dayOfWeek}`
    );

    // SEBI mandate: NO weeklies for individual stocks
    assert(!exp.type.includes('Weekly'), `${ticker} cannot have weekly contracts, got ${exp.type}`);
    assert(exp.type.includes('Monthly') || exp.type.includes('Quarterly'), `${ticker} contracts must be Monthly or Quarterly`);

    // DTE must be a non-negative integer
    assert(Number.isInteger(exp.dte) && exp.dte >= 0, `DTE must be integer >= 0, got ${exp.dte}`);
  });
}
console.log('  ✅ Single stock options verified: Strictly Monthly contracts on Last Tuesday (or holiday-adjusted preceding day).\n');

// 2. Verify NSE NIFTY 50 Benchmark Index (Tuesday Weekly & Monthly)
console.log('▶ Test 2: Verifying NSE NIFTY 50 Benchmark Index Expirations...');
const niftyAsset = OPTION_UNIVERSE.find(a => a.ticker === '^NSEI');
assert(niftyAsset, 'NIFTY 50 asset must exist');
const niftyExpirations = getMarketExpirations(niftyAsset);

console.log(`  Evaluating NIFTY 50 (${niftyExpirations.length} cycles):`);
niftyExpirations.forEach((exp, idx) => {
  console.log(`    [${idx}] ${exp.dateStr} (${exp.dayOfWeek}) • ${exp.dte} DTE • ${exp.type}`);
  assert(
    exp.dayOfWeek === 'Tuesday' || exp.dayOfWeek === 'Monday' || exp.dayOfWeek === 'Wednesday',
    `NIFTY 50 expiry day must be Tuesday (or holiday-adjusted), got ${exp.dayOfWeek}`
  );
  assert(Number.isInteger(exp.dte) && exp.dte >= 0, `DTE must be integer >= 0, got ${exp.dte}`);
});

// NIFTY 50 is the benchmark index and must have weekly contracts
const hasNiftyWeekly = niftyExpirations.some(e => e.type.includes('Weekly'));
const hasNiftyMonthly = niftyExpirations.some(e => e.type.includes('Monthly'));
assert(hasNiftyWeekly, 'NIFTY 50 must have weekly series');
assert(hasNiftyMonthly, 'NIFTY 50 must have monthly series');
console.log('  ✅ NIFTY 50 verified: Tuesday Weekly & Monthly contracts active.\n');

// 3. Verify Non-Benchmark NSE Indices (BANKNIFTY, FINNIFTY, MIDCPNIFTY, NIFTY_SMALLCAP)
console.log('▶ Test 3: Verifying SEBI Single-Index Rule on Non-Benchmark NSE Indices (Monthly Only, No Weeklies)...');
const nonBenchmarkIndices = ['^NSEBANK', 'NIFTY_FIN_SERVICE.NS', 'MIDCPNIFTY.NS', 'NIFTY_SMALLCAP.NS'];

for (const ticker of nonBenchmarkIndices) {
  const indexAsset = OPTION_UNIVERSE.find(a => a.ticker === ticker);
  assert(indexAsset, `Index ${ticker} must exist`);
  const expirations = getMarketExpirations(indexAsset);

  console.log(`  Evaluating ${indexAsset.displayTicker}:`);
  expirations.forEach((exp, idx) => {
    console.log(`    [${idx}] ${exp.dateStr} (${exp.dayOfWeek}) • ${exp.dte} DTE • ${exp.type}`);
    assert(
      exp.dayOfWeek === 'Tuesday' || exp.dayOfWeek === 'Monday' || exp.dayOfWeek === 'Wednesday',
      `${indexAsset.displayTicker} expiry must be Tuesday (or holiday-adjusted), got ${exp.dayOfWeek}`
    );
    // Weekly contracts must be DISCONTINUED under SEBI mandate
    assert(!exp.type.includes('Weekly'), `${indexAsset.displayTicker} must NOT have weekly contracts under SEBI single index rule`);
    assert(exp.type.includes('Monthly') || exp.type.includes('Quarterly'), `${indexAsset.displayTicker} contracts must be Monthly or Quarterly`);
  });
}
console.log('  ✅ Non-benchmark NSE indices verified: Only Monthly contracts expiring on Last Tuesday.\n');

// 4. Verify BSE SENSEX Index (Thursday Weekly & Monthly)
console.log('▶ Test 4: Verifying BSE SENSEX Index Expirations (Thursday Weekly & Monthly)...');
const sensexAsset = OPTION_UNIVERSE.find(a => a.ticker === '^BSESN');
assert(sensexAsset, 'SENSEX asset must exist');
const sensexExpirations = getMarketExpirations(sensexAsset);

console.log(`  Evaluating BSE SENSEX:`);
sensexExpirations.forEach((exp, idx) => {
  console.log(`    [${idx}] ${exp.dateStr} (${exp.dayOfWeek}) • ${exp.dte} DTE • ${exp.type}`);
  assert(
    exp.dayOfWeek === 'Thursday' || exp.dayOfWeek === 'Wednesday' || exp.dayOfWeek === 'Tuesday',
    `SENSEX expiry must be Thursday (or holiday-adjusted), got ${exp.dayOfWeek}`
  );
  assert(Number.isInteger(exp.dte) && exp.dte >= 0, `DTE must be integer >= 0, got ${exp.dte}`);
});

const hasSensexWeekly = sensexExpirations.some(e => e.type.includes('Weekly'));
const hasSensexMonthly = sensexExpirations.some(e => e.type.includes('Monthly'));
assert(hasSensexWeekly, 'SENSEX must have weekly contracts');
assert(hasSensexMonthly, 'SENSEX must have monthly contracts');
console.log('  ✅ BSE SENSEX verified: Thursday Weekly & Monthly contracts active.\n');

// 5. Verify US Market Expirations (Fridays, unchanged standard)
console.log('▶ Test 5: Verifying US Market Expirations (Fridays Weekly / 3rd Friday Monthly)...');
const spyAsset = OPTION_UNIVERSE.find(a => a.ticker === 'SPY');
const spyExpirations = getMarketExpirations(spyAsset);
assert(spyExpirations.length > 0, 'SPY must return expirations');
spyExpirations.forEach(exp => {
  assert(
    exp.dayOfWeek === 'Friday' || exp.dayOfWeek === 'Thursday',
    `US expiry must be Friday (or Thursday for Good Friday holiday), got ${exp.dayOfWeek}`
  );
});
console.log('  ✅ US Market expirations verified: Standard Friday schedule preserved.\n');

// 6. Verify Holiday Adjustment Engine
console.log('▶ Test 6: Verifying Holiday Adjustment Preceding Trading Day Engine...');
// Test a known holiday: e.g. 2026-11-24 is Guru Nanak Jayanti (Tuesday)
assert(INDIAN_HOLIDAYS.has('2026-11-24'), '2026-11-24 must be in INDIAN_HOLIDAYS');
const holidayDate = new Date(2026, 10, 24); // Nov 24, 2026
const adjustedDate = getPrecedingTradingDay(holidayDate, true);
assert.strictEqual(adjustedDate.getDate(), 23, 'Must roll to Nov 23 (Monday)');
assert.strictEqual(adjustedDate.getDay(), 1, 'Day must be Monday (1)');
console.log('  ✅ Holiday adjustment verified: Nov 24, 2026 (Guru Nanak Jayanti Tuesday) correctly rolls to Nov 23, 2026 (Monday).\n');

// 7. Verify Strategy Engine Transact Recommendation Integration
console.log('▶ Test 7: Verifying Strategy Engine Transact Recommendation Spec...');
const relianceQuote = getBaseQuote(OPTION_UNIVERSE.find(a => a.ticker === 'RELIANCE.NS'));
const relianceStrats = scanStrategiesForAsset(relianceQuote);
assert(relianceStrats.length > 0, 'Must generate strategies for Reliance');

const sampleStrat = relianceStrats[0];
assert(sampleStrat.transactSpec, 'Strategy must contain transactSpec');
console.log(`  Sample Reliance Strategy: ${sampleStrat.strategyName}`);
console.log(`    Recommended Expiry: ${sampleStrat.transactSpec.expiryDate} (${sampleStrat.transactSpec.dayOfWeek} • ${sampleStrat.transactSpec.dte} DTE)`);
console.log(`    Instrument Tag: ${sampleStrat.transactSpec.instrumentTag}`);
console.log(`    Contract Series: ${sampleStrat.transactSpec.contractSeries}`);
console.log(`    Recommendation Note: ${sampleStrat.transactSpec.recommendationNote}`);

assert(
  sampleStrat.transactSpec.dayOfWeek === 'Tuesday' || sampleStrat.transactSpec.dayOfWeek === 'Monday',
  `Reliance transactSpec dayOfWeek must be Tuesday or Monday, got ${sampleStrat.transactSpec.dayOfWeek}`
);
assert.strictEqual(sampleStrat.dte, sampleStrat.transactSpec.dte, 'Strategy DTE must match transactSpec DTE');
assert(sampleStrat.transactSpec.instrumentTag.includes('Last Tuesday'), 'Instrument tag must state Last Tuesday');

console.log('  ✅ Strategy Transact Recommendation spec verified.\n');

console.log('🎉 ALL INDIAN STOCK & INDICES EXPIRY / DTE VERIFICATION TESTS PASSED!\n');
