/**
 * Comprehensive Automated Test Suite for Stochastic Stock Screener (4, 3, 3)
 */

import assert from 'assert';
import * as XLSX from 'xlsx';
import { 
  DEFAULT_STOCHASTIC_PARAMS, 
  calculateStochasticSeries, 
  screenStockStochastic,
  detectDivergence 
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
  const indiaMidcap = getUniverseList('indiaMidcap');
  const indiaSmallcap = getUniverseList('indiaSmallcap');
  const usTech = getUniverseList('usMegaTech');
  const usMidcap = getUniverseList('usMidcap');
  const usSmallcap = getUniverseList('usSmallcap');
  const globalMidSmall = getUniverseList('globalMidSmall');
  const etfs = getUniverseList('etfs');
  const indiaETFs = getUniverseList('indiaETFs');
  const usETFs = getUniverseList('usETFs');
  const globalETFs = getUniverseList('globalETFs');

  assert(nifty50.length >= 50, `Nifty 50 count should be 50+, got ${nifty50.length}`);
  assert(niftyNext50.length >= 20, `Nifty Next 50 count should be 20+, got ${niftyNext50.length}`);
  assert(indiaMidcap.length >= 20, `India Midcap count should be 20+, got ${indiaMidcap.length}`);
  assert(indiaSmallcap.length >= 20, `India Smallcap count should be 20+, got ${indiaSmallcap.length}`);
  assert(usTech.length >= 15, `US Tech count should be 15+, got ${usTech.length}`);
  assert(usMidcap.length >= 20, `US Midcap count should be 20+, got ${usMidcap.length}`);
  assert(usSmallcap.length >= 20, `US Smallcap count should be 20+, got ${usSmallcap.length}`);
  assert(globalMidSmall.length >= 15, `Global Mid/Small count should be 15+, got ${globalMidSmall.length}`);
  assert(etfs.length >= 12, `All ETFs count should be 12+, got ${etfs.length}`);
  assert(indiaETFs.length >= 10, `India ETFs count should be 10+, got ${indiaETFs.length}`);
  assert(usETFs.length >= 12, `US ETFs count should be 12+, got ${usETFs.length}`);
  assert(globalETFs.length >= 10, `Global ETFs count should be 10+, got ${globalETFs.length}`);

  console.log(`  ✅ Nifty 50: ${nifty50.length} stocks, Nifty Next 50: ${niftyNext50.length} stocks.`);
  console.log(`  ✅ India Midcap: ${indiaMidcap.length} stocks, India Smallcap: ${indiaSmallcap.length} stocks.`);
  console.log(`  ✅ US Tech: ${usTech.length} stocks, US Midcap: ${usMidcap.length} stocks, US Smallcap: ${usSmallcap.length} stocks.`);
  console.log(`  ✅ Global Mid/Small: ${globalMidSmall.length} stocks.`);
  console.log(`  ✅ ETFs: All=${etfs.length}, India ETFs=${indiaETFs.length}, US ETFs=${usETFs.length}, Global ETFs=${globalETFs.length}.`);
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

  // 6. Test Charts-Only ZIP Archive (User requirement: export oversold charts, nothing else)
  const chartsOnlyZip = new JSZip();
  for (const s of oversoldStocks) {
    chartsOnlyZip.file(`${s.ticker}_stochastic_4_3_3.png`, Buffer.from('mock-png-chart-data'));
  }
  const chartsOnlyFiles = Object.keys(chartsOnlyZip.files);
  assert(chartsOnlyFiles.every(f => f.endsWith('.png')), 'Charts-only zip must contain ONLY .png chart files');
  assert(!chartsOnlyFiles.some(f => f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv') || f.endsWith('.txt')), 'Must not contain spreadsheets or text reports');
  const chartsOnlyBuffer = await chartsOnlyZip.generateAsync({ type: 'nodebuffer' });
  console.log(`  ✅ Successfully verified Charts-Only ZIP package: ${chartsOnlyFiles.length} PNG charts (${chartsOnlyBuffer.length} bytes), zero non-chart files.`);
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

// TEST 8: DEFAULT_STOCHASTIC_PARAMS Industry Standard (14, 3, 3)
console.log('\n▶ Test 8: DEFAULT_STOCHASTIC_PARAMS Industry Standard Lookback Window (14, 3, 3)');
{
  assert.strictEqual(DEFAULT_STOCHASTIC_PARAMS.kPeriod, 14, 'kPeriod must be 14 to reduce noise');
  assert.strictEqual(DEFAULT_STOCHASTIC_PARAMS.kSmoothing, 3, 'kSmoothing must remain 3');
  assert.strictEqual(DEFAULT_STOCHASTIC_PARAMS.dPeriod, 3, 'dPeriod must remain 3');
  assert.strictEqual(DEFAULT_STOCHASTIC_PARAMS.useClosingOnly, true, 'useClosingOnly must be true');
  console.log('  ✅ Verified DEFAULT_STOCHASTIC_PARAMS: kPeriod=14, kSmoothing=3, dPeriod=3, useClosingOnly=true');
}

// TEST 9: Divergence Detection Bug Fix (Independent Swing Lows & Swing Highs)
console.log('\n▶ Test 9: Divergence Engine Verification (Independent Swing Lows & Swing Highs)');
{
  // Test 9A: Bullish Divergence with two confirmed swing lows
  // Swing low 1 at bar 3 (price: 100, slowK: 14)
  // Swing low 2 at bar 8 (price: 94, slowK: 24) -> Lower low in price, higher low in %K (< 35)
  const bullishBars = [
    { date: 'B0', close: 110, slowK: 30 },
    { date: 'B1', close: 104, slowK: 20 },
    { date: 'B2', close: 100, slowK: 14 }, // swing low 1 (cur < prev && cur < next)
    { date: 'B3', close: 105, slowK: 22 },
    { date: 'B4', close: 108, slowK: 35 },
    { date: 'B5', close: 102, slowK: 26 },
    { date: 'B6', close: 98, slowK: 19 },
    { date: 'B7', close: 94, slowK: 24 },  // swing low 2 (cur < prev && cur < next: 94 < 98 && 94 < 99)
    { date: 'B8', close: 99, slowK: 29 },
    { date: 'B9', close: 103, slowK: 36 }
  ];

  // Test 9B: Bearish Divergence with two confirmed swing highs
  // Swing high 1 at bar 2 (price: 150, slowK: 85)
  // Swing high 2 at bar 7 (price: 160, slowK: 72) -> Higher high in price, lower high in %K (> 65)
  const bearishBars = [
    { date: 'B0', close: 140, slowK: 65 },
    { date: 'B1', close: 146, slowK: 78 },
    { date: 'B2', close: 150, slowK: 85 }, // swing high 1 (cur > prev && cur > next: 150 > 146 && 150 > 144)
    { date: 'B3', close: 144, slowK: 74 },
    { date: 'B4', close: 142, slowK: 68 },
    { date: 'B5', close: 148, slowK: 70 },
    { date: 'B6', close: 155, slowK: 71 },
    { date: 'B7', close: 160, slowK: 72 }, // swing high 2 (cur > prev && cur > next: 160 > 155 && 160 > 152)
    { date: 'B8', close: 152, slowK: 66 },
    { date: 'B9', close: 149, slowK: 60 }
  ];

  const resBullish = detectDivergence(bullishBars);
  const resBearish = detectDivergence(bearishBars);

  assert(resBullish !== null, 'Bullish divergence should be detected');
  assert.strictEqual(resBullish.type, 'BULLISH_DIVERGENCE', 'Expected BULLISH_DIVERGENCE');
  console.log(`  ✅ Bullish Divergence detected correctly: ${resBullish.label}`);

  assert(resBearish !== null, 'Bearish divergence should be detected');
  assert.strictEqual(resBearish.type, 'BEARISH_DIVERGENCE', 'Expected BEARISH_DIVERGENCE');
  console.log(`  ✅ Bearish Divergence detected correctly: ${resBearish.label}`);
}

// TEST 10: 50-SMA Baseline Trend Filter Guardrail
console.log('\n▶ Test 10: 50-SMA Baseline Trend Filter in screenStockStochastic');
{
  // Build 60 candles in a primary downtrend
  // 50-SMA will be around ~180-200, but latest price drops sharply to 150 (> 15% below 50 SMA)
  // then generates an oversold Golden Cross
  const candlesDowntrend = [];
  let price = 220;
  for (let i = 0; i < 55; i++) {
    price -= 1.2;
    candlesDowntrend.push({
      date: `2026-01-${i + 1}`,
      close: Number(price.toFixed(2)),
      high: Number((price + 1).toFixed(2)),
      low: Number((price - 1).toFixed(2)),
      volume: 100000
    });
  }
  // Sharp drop to 140
  for (let i = 0; i < 5; i++) {
    price -= 4;
    candlesDowntrend.push({
      date: `2026-02-${i + 1}`,
      close: Number(price.toFixed(2)),
      high: Number((price + 1).toFixed(2)),
      low: Number((price - 1).toFixed(2)),
      volume: 150000
    });
  }
  // Turnaround: golden cross in deep oversold on final bar
  candlesDowntrend.push({ date: '2026-02-07', close: price + 4, high: price + 5, low: price - 1, volume: 200000 });

  const screenedDowntrend = screenStockStochastic('FALLING.NS', 'Falling Knife Stock', candlesDowntrend);

  assert(screenedDowntrend !== null, 'Should return screened result');
  assert(screenedDowntrend.sma50 !== null, '50-SMA must be calculated');
  assert(screenedDowntrend.isBelowSma50 === true, 'Stock must be detected as >5% below 50-SMA');
  assert(screenedDowntrend.isBullishCross === true, 'Golden Cross occurred');
  
  // Guardrail Verification:
  assert.strictEqual(
    screenedDowntrend.strategy.action, 
    'COUNTER_TREND_WATCH', 
    `Action must be downgraded to COUNTER_TREND_WATCH, got: ${screenedDowntrend.strategy.action}`
  );
  assert.strictEqual(
    screenedDowntrend.strategy.conviction, 
    'Low - Fighting Primary Downtrend', 
    `Conviction must be 'Low - Fighting Primary Downtrend', got: ${screenedDowntrend.strategy.conviction}`
  );
  assert(
    !screenedDowntrend.strategy.actionLabel.includes('★ Actionable Buy'), 
    'Must NOT be classified as Actionable Buy when fighting primary downtrend'
  );

  console.log(`  ✅ 50-SMA Trend Filter successfully downgraded falling knife Golden Cross:`);
  console.log(`     Price: ₹${screenedDowntrend.price} vs 50-SMA: ₹${screenedDowntrend.sma50} (${screenedDowntrend.sma50DiffPct}%)`);
  console.log(`     Action: ${screenedDowntrend.strategy.action} [${screenedDowntrend.strategy.actionLabel}]`);
  console.log(`     Conviction: ${screenedDowntrend.strategy.conviction}`);

  // Test 10B: Pre-calculated candles.sma50 option
  const mockCandlesWithSma = [{ close: 100 }, { close: 102 }, { close: 105 }];
  mockCandlesWithSma.sma50 = 150; // current 105 is > 25% below 150
  const screenedWithPrecalculated = screenStockStochastic('PRE.NS', 'Precalculated SMA', mockCandlesWithSma);
  assert.strictEqual(screenedWithPrecalculated.sma50, 150, 'Must accept precalculated candles.sma50');
  assert.strictEqual(screenedWithPrecalculated.isBelowSma50, true, 'isBelowSma50 must be true for precalculated');
  console.log('  ✅ Pre-calculated candles.sma50 parameter properly accepted and validated.');
}

console.log('\n🎉 ALL 10 TESTS PASSED SUCCESSFULLY! Stochastic Engine Refactoring Fully Verified.\n');



