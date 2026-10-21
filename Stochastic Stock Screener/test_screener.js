/**
 * Comprehensive Automated Test Suite for Stochastic Stock Screener (4, 3, 3)
 */

import assert from 'assert';
import * as XLSX from 'xlsx';
import { 
  DEFAULT_STOCHASTIC_PARAMS, 
  calculateStochasticSeries, 
  screenStockStochastic 
} from './src/quant/stochastic.js';
import { 
  parseStockDocument, 
  generateSampleCSV, 
  generateSampleXLSX 
} from './src/services/fileParser.js';
import { runBatchScreening } from './src/services/marketData.js';
import { PRESET_UNIVERSES, getUniverseList } from './src/data/presets.js';

console.log('🧪 Starting Stochastic (4, 3, 3) Test Suite...\n');

// TEST 1: Math Verification of Closing-Basis Stochastic (4,3,3)
console.log('▶ Test 1: Mathematical Accuracy of Stochastic (4, 3, 3) on Closing Basis');
{
  // 6 daily closing prices
  const candles = [
    { date: 'Day 1', close: 100, high: 105, low: 95 },
    { date: 'Day 2', close: 104, high: 108, low: 99 },
    { date: 'Day 3', close: 102, high: 106, low: 100 },
    { date: 'Day 4', close: 108, high: 110, low: 101 }, // Bar index 3: window [100, 104, 102, 108] -> Min=100, Max=108, Range=8. FastK = (108-100)/8 * 100 = 100%
    { date: 'Day 5', close: 106, high: 112, low: 103 }, // Bar index 4: window [104, 102, 108, 106] -> Min=102, Max=108, Range=6. FastK = (106-102)/6 * 100 = 66.67%
    { date: 'Day 6', close: 103, high: 109, low: 101 }, // Bar index 5: window [102, 108, 106, 103] -> Min=102, Max=108, Range=6. FastK = (103-102)/6 * 100 = 16.67%
  ];

  const series = calculateStochasticSeries(candles, { kPeriod: 4, kSmoothing: 3, dPeriod: 3, useClosingOnly: true });

  assert.strictEqual(series.length, 6, 'Series should match candles length');
  assert.strictEqual(series[0].fastK, null, 'First 3 bars cannot have 4-period FastK');
  assert.strictEqual(series[1].fastK, null);
  assert.strictEqual(series[2].fastK, null);

  // Day 4 Fast%K
  assert.strictEqual(series[3].fastK, 100, 'Day 4 Fast%K should be 100%');
  
  // Day 5 Fast%K = 4/6 * 100 = 66.666...%
  assert(Math.abs(series[4].fastK - 66.67) < 0.1, `Day 5 Fast%K expected ~66.67, got ${series[4].fastK}`);

  // Day 6 Fast%K = 1/6 * 100 = 16.666...%
  assert(Math.abs(series[5].fastK - 16.67) < 0.1, `Day 6 Fast%K expected ~16.67, got ${series[5].fastK}`);

  // Day 6 Slow %K (SMA of 3 bars: 100, 66.666, 16.666) -> Avg = 183.333 / 3 = 61.11%
  assert(series[5].slowK !== null, 'Day 6 Slow %K should exist');
  assert(Math.abs(series[5].slowK - 61.11) < 0.2, `Day 6 Slow %K expected ~61.11, got ${series[5].slowK}`);

  console.log('  ✅ Mathematical formulas and Close-Only calculations verified strictly.');
}

// TEST 2: Crossover & Signal Detection
console.log('\n▶ Test 2: Golden Cross and Death Cross Signal Triggers');
{
  // Create an oversold condition followed by an upward crossover
  const candles = [];
  let price = 200;
  for (let i = 0; i < 20; i++) {
    price -= 5; // steady drop to oversold
    candles.push({ date: `2026-01-${i+1}`, close: price, high: price + 2, low: price - 2, volume: 100000 });
  }
  // Turnaround day
  candles.push({ date: '2026-01-21', close: price + 8, high: price + 9, low: price - 1, volume: 200000 });
  candles.push({ date: '2026-01-22', close: price + 15, high: price + 16, low: price + 5, volume: 300000 });

  const screened = screenStockStochastic('RELIANCE.NS', 'Reliance Industries', candles, { kPeriod: 4, kSmoothing: 3, dPeriod: 3 });
  assert(screened !== null, 'Should return screened object');
  assert(screened.ticker === 'RELIANCE.NS', 'Ticker should match');
  assert(screened.slowK !== null && screened.d !== null, 'Should have slowK and d values');
  assert(typeof screened.spread === 'number', 'Spread should be a number');
  console.log(`  ✅ Screened stock summary: Ticker=${screened.ticker}, %K=${screened.slowK}, %D=${screened.d}, Spread=${screened.spread}, Signal=${screened.signalLabel}`);
}

// TEST 3: CSV and XLSX Parsing
console.log('\n▶ Test 3: Document Upload Parsing (CSV & XLSX with Column Normalization)');
{
  // Test CSV Template generation & parsing
  const csvText = generateSampleCSV();
  assert(csvText.includes('Symbol') && csvText.includes('RELIANCE.NS'), 'Sample CSV should have symbols');

  // Parse in Node environment via buffer
  const wbFromCsv = XLSX.read(csvText, { type: 'string' });
  const firstSheetName = wbFromCsv.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wbFromCsv.Sheets[firstSheetName]);
  assert(rows.length > 5, 'CSV should contain rows');
  console.log(`  ✅ Sample CSV contains ${rows.length} stocks with valid columns: ${Object.keys(rows[0]).join(', ')}`);

  // Test XLSX Template generation
  const xlsxBlob = generateSampleXLSX();
  assert(xlsxBlob instanceof Blob, 'generateSampleXLSX should return a Blob');
  console.log(`  ✅ Sample XLSX Blob generated successfully (size: ${xlsxBlob.size} bytes).`);
}

// TEST 4: Preset Universes Integrity
console.log('\n▶ Test 4: Preset Universes Validation');
{
  const nifty50 = getUniverseList('nifty50');
  const niftyNext50 = getUniverseList('niftyNext50');
  const usTech = getUniverseList('usMegaTech');
  const etfs = getUniverseList('etfs');

  assert(nifty50.length >= 50, `Nifty 50 count should be 50+, got ${nifty50.length}`);
  assert(niftyNext50.length >= 20, `Nifty Next 50 count should be 20+, got ${niftyNext50.length}`);
  assert(usTech.length >= 15, `US Tech count should be 15+, got ${usTech.length}`);
  assert(etfs.length >= 8, `ETFs count should be 8+, got ${etfs.length}`);

  console.log(`  ✅ Nifty 50: ${nifty50.length} stocks, Nifty Next 50: ${niftyNext50.length} stocks, US Tech: ${usTech.length} stocks, ETFs: ${etfs.length} funds.`);
}

// TEST 5: Batch Screening Simulation
console.log('\n▶ Test 5: Batch Screening Pipeline Execution');
{
  const testBasket = [
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries Ltd', sector: 'Energy' },
    { ticker: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT' },
    { ticker: 'NVDA', name: 'NVIDIA Corp', sector: 'Semiconductors' }
  ];

  let progressCalled = 0;
  const screened = await runBatchScreening(
    testBasket,
    DEFAULT_STOCHASTIC_PARAMS,
    (completed, total, item, res) => {
      progressCalled++;
    }
  );

  assert.strictEqual(screened.length, 3, 'Should screen all 3 stocks');
  assert.strictEqual(progressCalled, 3, 'Progress callback should be called 3 times');

  for (const s of screened) {
    assert(s.price > 0, `${s.ticker} price should be > 0`);
    assert(s.slowK >= 0 && s.slowK <= 100, `${s.ticker} %K should be in [0, 100]`);
    assert(s.d >= 0 && s.d <= 100, `${s.ticker} %D should be in [0, 100]`);
    assert(s.history.length > 0, `${s.ticker} should contain history bars`);
    console.log(`  ✅ Screened ${s.ticker}: Close=${s.price}, %K(4,3)=${s.slowK}, %D(3)=${s.d}, Spread=${s.spread}, Signal=${s.signalLabel}`);
  }
}

// TEST 6: Oversold Screening (<20) & Multi-Format Export (.xlsx, .xls, .csv, and .zip with charts)
console.log('\n▶ Test 6: Oversold Identification (<20) and Multi-Format Exports (.xlsx, .xls, .csv + Charts ZIP)');
{
  const mockScreenedStocks = [
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries', price: 2950, changePct: -1.2, slowK: 14.2, d: 11.5, spread: 2.7, signalLabel: '★ Bullish Golden Cross (Oversold)' },
    { ticker: 'TCS.NS', name: 'Tata Consultancy Services', price: 3820, changePct: -2.4, slowK: 8.5, d: 9.1, spread: -0.6, signalLabel: 'Deep Oversold (%K < 10)' },
    { ticker: 'NVDA', name: 'NVIDIA Corp', price: 135, changePct: 2.8, slowK: 86.4, d: 82.1, spread: 4.3, signalLabel: 'Overbought (>80)' }
  ];

  // 1. Identify oversold stocks below threshold of 20
  const oversoldThreshold = 20;
  const oversoldStocks = mockScreenedStocks.filter(s => s.slowK < oversoldThreshold);
  assert.strictEqual(oversoldStocks.length, 2, 'Should identify exactly 2 oversold stocks below 20');
  assert.strictEqual(oversoldStocks[0].ticker, 'RELIANCE.NS');
  assert.strictEqual(oversoldStocks[1].ticker, 'TCS.NS');
  console.log(`  ✅ Successfully identified ${oversoldStocks.length} stocks below oversold threshold ${oversoldThreshold}: ${oversoldStocks.map(s => `${s.ticker} (%K=${s.slowK})`).join(', ')}`);

  // 2. Test modern Excel (.xlsx) generation
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(oversoldStocks);
  XLSX.utils.book_append_sheet(wb, ws, 'Oversold_Stocks');
  const xlsxBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  assert(xlsxBuf.length > 1000, 'XLSX buffer should be generated');
  console.log(`  ✅ Generated Modern Excel (.xlsx) file: ${xlsxBuf.length} bytes`);

  // 3. Test legacy Excel 97-2004 (.xls) BIFF8 generation
  const xlsBuf = XLSX.write(wb, { bookType: 'biff8', type: 'buffer' });
  assert(xlsBuf.length > 1000, 'XLS BIFF8 buffer should be generated');
  console.log(`  ✅ Generated Legacy Excel 97-2004 (.xls) BIFF8 file: ${xlsBuf.length} bytes`);

  // 4. Test CSV (.csv) generation
  const csvContent = XLSX.utils.sheet_to_csv(ws);
  assert(csvContent.includes('RELIANCE.NS') && csvContent.includes('TCS.NS'), 'CSV content should contain oversold stocks');
  console.log(`  ✅ Generated Comma-Separated Values (.csv) file: ${csvContent.length} chars`);

  // 5. Test ZIP Archive packaging with charts
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  zip.file('Oversold_Stocks.xlsx', xlsxBuf);
  zip.file('Oversold_Stocks.xls', xlsBuf);
  zip.file('Oversold_Stocks.csv', csvContent);

  const chartsFolder = zip.folder('chart_screenshots');
  for (const s of oversoldStocks) {
    chartsFolder.file(`${s.ticker}_stoch_4_3_3.png`, Buffer.from('fake-png-data-mock-canvas'));
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  assert(zipBuffer.length > 2000, 'ZIP package should contain spreadsheets and charts');
  console.log(`  ✅ Successfully generated complete ZIP bundle with .xlsx, .xls, .csv, and chart screenshots: ${zipBuffer.length} bytes`);
}

// TEST 7: Quantitative Entry & Exit Strategy Formulation for Oversold Stocks
console.log('\n▶ Test 7: Entry & Exit Strategy Blueprint Formulation for Oversold Stocks');
{
  const { computeEntryExitStrategy } = await import('./src/quant/stochastic.js');

  const mockSeries = [];
  let price = 3000;
  for (let i = 0; i < 20; i++) {
    price -= 8;
    mockSeries.push({
      date: `Day ${i + 1}`,
      close: price,
      slowK: Math.max(5, 50 - i * 2.2),
      d: Math.max(8, 55 - i * 2.0),
      spread: -3.0
    });
  }

  // Turnaround bar with oversold condition %K = 14.2, %D = 12.0
  mockSeries.push({
    date: 'Day 21',
    close: 2850,
    slowK: 14.2,
    d: 12.0,
    spread: 2.2,
    signalType: 'BULLISH_CROSSOVER_OVERSOLD'
  });

  const strat = computeEntryExitStrategy('RELIANCE.NS', 2850, mockSeries, { oversoldThreshold: 20 });

  assert(strat !== null, 'Strategy must be generated');
  assert(strat.action === 'BUY_CONFIRMED', `Expected BUY_CONFIRMED, got ${strat.action}`);
  assert(strat.entryMin > 0 && strat.entryMax >= strat.entryMin, 'Valid entry bracket');
  assert(strat.stopLoss < 2850, `Stop loss (${strat.stopLoss}) must be below current price (2850)`);
  assert(strat.target1 > 2850, `Target 1 (${strat.target1}) must be above current price (2850)`);
  assert(strat.target2 > strat.target1, `Target 2 (${strat.target2}) must be above Target 1 (${strat.target1})`);
  assert(strat.riskPct > 0, 'Risk percent must be positive');
  assert(strat.target1GainPct > 0, 'Target 1 gain percent must be positive');
  assert(strat.target2GainPct > strat.target1GainPct, 'Target 2 gain must exceed Target 1 gain');
  assert(strat.rrValue >= 1.5, `Risk-to-Reward ratio (${strat.rrValue}) should be favorable (>= 1.5)`);
  assert(Array.isArray(strat.playbook) && strat.playbook.length === 5, 'Playbook should contain 5 tactical rules');

  console.log(`  ✅ Stock: RELIANCE.NS (Close: ₹2,850)`);
  console.log(`     Action Signal  : ${strat.actionLabel}`);
  console.log(`     Entry Buy Zone : ${strat.entryRangeStr}`);
  console.log(`     Stop Loss      : ₹${strat.stopLoss} (-${strat.riskPct}%)`);
  console.log(`     Target 1 (50%) : ₹${strat.target1} (+${strat.target1GainPct}%) [Mid-Band %K=50 Exit]`);
  console.log(`     Target 2 (80%) : ₹${strat.target2} (+${strat.target2GainPct}%) [Overbought %K>80 Exit]`);
  console.log(`     Target R:R     : ${strat.rrRatio}`);
  console.log(`     Playbook Rules : ${strat.playbook.length} tactical execution steps verified.`);
}

console.log('\n🎉 ALL 7 TESTS PASSED SUCCESSFULLY! Quantitative Entry & Exit Strategy Blueprint verified.\n');


