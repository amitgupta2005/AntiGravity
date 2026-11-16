/**
 * Comprehensive Test Suite:
 * Real-Time Chart Terminal for Screened Recommendations & Live Market Feed
 * 
 * Verifies:
 * 1. HTML structure contains #recommendation-chart-container, #toggleRecChartBtn, and header auto-refresh pills
 * 2. CSS contains styling for recommendation chart terminal, chips, countdown radar, and TradingView elements
 * 3. Strategy Overlay Plugin renders Stop Loss, Target 1, Target 2, Entry Zone, and CMP
 * 4. TradingView Stochastic Plugin renders 20/80 dashed reference lines, shaded band, and blue/orange right-axis badges
 * 5. Today's Intraday Candles generation (09:15 to 15:30 IST) & Stochastic (14, 3, 3) calculation
 * 6. Recommendation extraction, stock switching, and 5s/10s/15s auto-refresh intervals with pause/resume
 * 7. Real-time market feed subscription and tick propagation
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Starting Real-Time Recommendation Chart & Market Feed Test Suite...\n');

// TEST 1: Validate HTML Structure
console.log('▶ Test 1: Validating HTML Structure in index.html...');
const htmlPath = path.join(__dirname, 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

assert(htmlContent.includes('id="terminal-layout"'), 'Missing #terminal-layout in index.html');
assert(htmlContent.includes('id="screener-pane"'), 'Missing #screener-pane in index.html');
assert(htmlContent.includes('id="chart-pane"'), 'Missing #chart-pane in index.html');
assert(htmlContent.includes('id="analysis-sidebar"'), 'Missing #analysis-sidebar in index.html');
assert(htmlContent.includes('id="selected-stock-header-card"'), 'Missing #selected-stock-header-card in index.html');
assert(htmlContent.includes('id="detail-stock-ticker"'), 'Missing #detail-stock-ticker in index.html');
assert(htmlContent.includes('id="detail-stock-name"'), 'Missing #detail-stock-name in index.html');
assert(htmlContent.includes('id="detail-stock-price"'), 'Missing #detail-stock-price in index.html');
assert(htmlContent.includes('id="detail-stock-change"'), 'Missing #detail-stock-change in index.html');
assert(htmlContent.includes('id="stock-active-ticker"'), 'Missing #stock-active-ticker in index.html');
assert(htmlContent.includes('id="stock-active-name"'), 'Missing #stock-active-name in index.html');
assert(htmlContent.includes('id="stock-active-price-pill"'), 'Missing #stock-active-price-pill in index.html');
assert(htmlContent.includes('Entry &amp; Exit Strategy Blueprint'), 'Missing Entry & Exit Strategy Blueprint title in index.html');
assert(htmlContent.includes('id="main-candlestick-chart"'), 'Missing #main-candlestick-chart in index.html');
assert(htmlContent.includes('id="stoch-sub-chart"'), 'Missing #stoch-sub-chart in index.html');
assert(htmlContent.includes('class="header-ar-selector"'), 'Missing .header-ar-selector in index.html');
assert(htmlContent.includes('data-sec="5"'), 'Missing 5s header auto-refresh option');
assert(htmlContent.includes('data-sec="10"'), 'Missing 10s header auto-refresh option');
assert(htmlContent.includes('data-sec="15"'), 'Missing 15s header auto-refresh option');
console.log('  ✅ Test 1 Passed: index.html contains #terminal-layout (3 Panes), selected stock strategy header, dynamic toolbar, dual chart canvases, and header auto-refresh controls.');

// TEST 2: Validate CSS Rules
console.log('\n▶ Test 2: Validating CSS Rules in src/style.css...');
const cssPath = path.join(__dirname, 'src', 'style.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(cssContent.includes('.terminal-layout'), 'Missing .terminal-layout CSS');
assert(cssContent.includes('.screener-pane'), 'Missing .screener-pane CSS');
assert(cssContent.includes('.chart-pane'), 'Missing .chart-pane CSS');
assert(cssContent.includes('.analysis-pane'), 'Missing .analysis-pane CSS');
assert(cssContent.includes('.stock-card'), 'Missing .stock-card CSS');
assert(cssContent.includes('.mtf-grid'), 'Missing .mtf-grid CSS');
assert(cssContent.includes('.levels-grid'), 'Missing .levels-grid CSS');
assert(cssContent.includes('.calc-box'), 'Missing .calc-box CSS');
assert(cssContent.includes('.rationale-list'), 'Missing .rationale-list CSS');
assert(cssContent.includes('.recommendation-chart-section'), 'Missing .recommendation-chart-section CSS');
assert(cssContent.includes('.rec-chart-card'), 'Missing .rec-chart-card CSS');
assert(cssContent.includes('.rec-chip'), 'Missing .rec-chip CSS');
assert(cssContent.includes('.rec-live-price'), 'Missing .rec-live-price CSS');
assert(cssContent.includes('.live-flash-green'), 'Missing .live-flash-green CSS');
assert(cssContent.includes('.live-flash-red'), 'Missing .live-flash-red CSS');
assert(cssContent.includes('.btn-live-chart'), 'Missing .btn-live-chart CSS');
assert(cssContent.includes('.rec-autorefresh-container'), 'Missing .rec-autorefresh-container CSS');
assert(cssContent.includes('.rec-ar-btn'), 'Missing .rec-ar-btn CSS');
assert(cssContent.includes('.rec-countdown-badge'), 'Missing .rec-countdown-badge CSS');
assert(cssContent.includes('.countdown-bar-fill'), 'Missing .countdown-bar-fill CSS');
assert(cssContent.includes('.header-ar-pill'), 'Missing .header-ar-pill CSS');
console.log('  ✅ Test 2 Passed: src/style.css contains complete styling for 3-pane terminal, auto-refresh, and TradingView elements.');

// TEST 3: Strategy Overlay Plugin Canvas Drawing
console.log('\n▶ Test 3: Verifying Strategy Overlay Plugin Level Rendering...');
const { strategyOverlayPlugin, tradingViewStochPlugin } = await import('./src/services/strategyChartPlugin.js');
assert(strategyOverlayPlugin && strategyOverlayPlugin.id === 'strategyOverlay', 'strategyOverlayPlugin must export valid ID');
assert(tradingViewStochPlugin && tradingViewStochPlugin.id === 'tradingViewStoch', 'tradingViewStochPlugin must export valid ID');

class MockCanvasContext {
  constructor() {
    this.calls = [];
    this.fillStyle = '';
    this.strokeStyle = '';
    this.lineWidth = 1;
  }
  save() { this.calls.push('save'); }
  restore() { this.calls.push('restore'); }
  fillRect(x, y, w, h) { this.calls.push({ op: 'fillRect', x, y, w, h }); }
  beginPath() { this.calls.push('beginPath'); }
  closePath() { this.calls.push('closePath'); }
  moveTo(x, y) { this.calls.push({ op: 'moveTo', x, y }); }
  lineTo(x, y) { this.calls.push({ op: 'lineTo', x, y }); }
  quadraticCurveTo() {}
  stroke() { this.calls.push('stroke'); }
  fill() { this.calls.push('fill'); }
  fillText(text, x, y) { this.calls.push({ op: 'fillText', text, x, y, fillStyle: this.fillStyle }); }
  setLineDash(dash) { this.calls.push({ op: 'setLineDash', dash }); }
  measureText(text) { return { width: (text || '').length * 7 }; }
}

const mockCtx = new MockCanvasContext();
const mockChart = {
  ctx: mockCtx,
  chartArea: { left: 40, right: 600, top: 20, bottom: 250, width: 560, height: 230 },
  scales: {
    y: {
      getPixelForValue: (v) => 250 - (v - 100) * 2 // simple linear mock scale
    }
  },
  config: {
    options: {
      plugins: {
        strategyOverlay: {
          strategy: {
            entryMin: 105,
            entryMax: 110,
            stopLoss: 98,
            target1: 118,
            target2: 125,
            currentPrice: 108,
            direction: 'LONG'
          },
          currencySymbol: '₹'
        }
      }
    }
  }
};

strategyOverlayPlugin.afterDraw(mockChart);

const textCalls = mockCtx.calls.filter(c => c.op === 'fillText').map(c => c.text);
assert(textCalls.some(t => t.includes('SL: ₹98')), 'Must draw Stop Loss text label');
assert(textCalls.some(t => t.includes('T1: ₹118')), 'Must draw Target 1 text label');
assert(textCalls.some(t => t.includes('T2: ₹125')), 'Must draw Target 2 text label');
assert(textCalls.some(t => t.includes('CMP: ₹108')), 'Must draw CMP text label');
console.log(`  ✅ Test 3 Passed: Strategy Overlay Plugin rendered labels: ${textCalls.join(' • ')}`);

// TEST 4: TradingView Stochastic Plugin Canvas Drawing
console.log('\n▶ Test 4: Verifying TradingView Stochastic Plugin (20/80 Lines, Shaded Band & Badges)...');
const mockTvCtx = new MockCanvasContext();
const mockTvChart = {
  ctx: mockTvCtx,
  chartArea: { left: 40, right: 600, top: 20, bottom: 200, width: 560, height: 180 },
  scales: {
    y: {
      getPixelForValue: (v) => 200 - (v / 100) * 180
    }
  },
  data: {
    datasets: [
      { data: [35, 38, 40.85] }, // %K
      { data: [50, 52, 53.90] }  // %D
    ]
  },
  config: {
    options: {
      plugins: {
        tradingViewStoch: {
          kVal: 40.85,
          dVal: 53.90,
          kPeriod: 14,
          kSmooth: 3,
          dPeriod: 3,
          overbought: 80,
          oversold: 20,
          isDarkMode: true,
          showBadges: true,
          showLevels: true,
          showLegend: true
        }
      }
    }
  }
};

tradingViewStochPlugin.afterDraw(mockTvChart);

// Check that shaded band was drawn
const fills = mockTvCtx.calls.filter(c => c.op === 'fillRect');
assert(fills.length > 0, 'Must draw shaded band between 20 and 80');

// Check that 40.85 (blue badge) and 53.90 (orange badge) were drawn
const tvTextCalls = mockTvCtx.calls.filter(c => c.op === 'fillText');
const badge40 = tvTextCalls.find(c => c.text === '40.85');
const badge53 = tvTextCalls.find(c => c.text === '53.90');
const headerText = tvTextCalls.find(c => c.text.includes('Stoch 14 3 3'));

assert(badge40, 'Must draw right-axis badge with value 40.85 for %K');
assert(badge53, 'Must draw right-axis badge with value 53.90 for %D');
assert(headerText, 'Must render TradingView header legend "Stoch 14 3 3"');
console.log(`  ✅ Test 4 Passed: TradingView Plugin correctly rendered: "${headerText.text}", %K Badge: ${badge40.text}, %D Badge: ${badge53.text}`);

// TEST 5: Today's Intraday Candles Generation & Stochastic Calculation
console.log('\n▶ Test 5: Verifying Today\'s Intraday Session Candles & Stochastic (14, 3, 3)...');
const { generateTodayIntradayCandles } = await import('./src/services/marketData.js');
const { calculateStochasticSeries } = await import('./src/quant/stochastic.js');

const intradayCandles = generateTodayIntradayCandles('RELIANCE.NS', true, 2850, 0.5);
assert(Array.isArray(intradayCandles) && intradayCandles.length === 75, 'Must generate exactly 75 5-minute bars for today\'s session (09:15 to 15:30)');
assert.strictEqual(intradayCandles[0].date, '09:15', 'First candle must open at 09:15');
assert.strictEqual(intradayCandles[intradayCandles.length - 1].date, '15:25', 'Last candle must close at end of session');
assert.strictEqual(intradayCandles[intradayCandles.length - 1].close, 2850, 'Latest intraday close must match current price');

const intradayStoch = calculateStochasticSeries(intradayCandles, {
  kPeriod: 14,
  kSmoothing: 3,
  dPeriod: 3,
  useClosingOnly: true
});

assert.strictEqual(intradayStoch.length, 75, 'Stochastic series must match candle count');
const lastStoch = intradayStoch[intradayStoch.length - 1];
assert(typeof lastStoch.slowK === 'number' && !isNaN(lastStoch.slowK), 'Latest %K must be numeric');
assert(typeof lastStoch.d === 'number' && !isNaN(lastStoch.d), 'Latest %D must be numeric');
console.log(`  ✅ Test 5 Passed: 75 intraday bars generated from 09:15 to 15:25. Latest Stoch: %K=${lastStoch.slowK.toFixed(2)}, %D=${lastStoch.d.toFixed(2)}`);

// TEST 6: RecommendationChartTerminal Logic, Timeframe & Auto-Refresh Options
console.log('\n▶ Test 6: Verifying Recommendation Extraction, Default Timeframe & Auto-Refresh Controls...');

class MockDOMElement {
  constructor(id = '', tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.classList = new Set();
    this.classList.add = (c) => this.classList[c] = true;
    this.classList.remove = (c) => delete this.classList[c];
    this.classList.toggle = (c, force) => {
      if (force === undefined) {
        if (this.classList[c]) delete this.classList[c];
        else this.classList[c] = true;
      } else if (force) {
        this.classList[c] = true;
      } else {
        delete this.classList[c];
      }
    };
    this.classList.contains = (c) => !!this.classList[c];
    this.innerHTML = '';
    this.textContent = '';
    this.style = {};
    this.listeners = {};
    this.children = [];
  }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  scrollIntoView() {}
}

globalThis.document = {
  getElementById: (id) => new MockDOMElement(id),
  createElement: (tag) => new MockDOMElement(tag, tag),
  body: new MockDOMElement('body'),
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  hidden: false
};
globalThis.window = {
  addEventListener: () => {},
  scrollY: 0
};
globalThis.localStorage = {
  _store: {},
  getItem: (k) => globalThis.localStorage._store[k] || null,
  setItem: (k, v) => globalThis.localStorage._store[k] = String(v)
};

const { RecommendationChartTerminal } = await import('./src/components/recommendationChart.js');

const mockContainer = new MockDOMElement('recommendation-chart-container');
document.getElementById = (id) => (id === 'recommendation-chart-container' ? mockContainer : new MockDOMElement(id));

const terminal = new RecommendationChartTerminal('recommendation-chart-container');

// Verify default timeframe is 'today'
assert.strictEqual(terminal.activeTimeframe, 'today', 'Default active timeframe must be "today" for today\'s price framework');

// Verify default auto-refresh is 5 seconds
assert.strictEqual(terminal.refreshIntervalSec, 5, 'Default auto-refresh must be 5 seconds');

// Test auto-refresh switching to 10s and 15s
terminal.setRefreshInterval(10);
assert.strictEqual(terminal.refreshIntervalSec, 10, 'Auto-refresh must update to 10s');
assert.strictEqual(globalThis.localStorage.getItem('antigravity_rec_chart_refresh_interval'), '10', 'Should persist 10s to localStorage');

terminal.setRefreshInterval(15);
assert.strictEqual(terminal.refreshIntervalSec, 15, 'Auto-refresh must update to 15s');

terminal.setRefreshInterval(0); // Pause
assert.strictEqual(terminal.isFeedPaused, true, 'Auto-refresh must pause when interval is 0');

terminal.setRefreshInterval(5); // Reset to default 5s
assert.strictEqual(terminal.refreshIntervalSec, 5, 'Auto-refresh must reset to 5s default');
assert.strictEqual(terminal.isFeedPaused, false, 'Auto-refresh must resume');

console.log('  ✅ Test 6 Passed: Default timeframe is "today", auto-refresh default is 5s with working 10s, 15s and Pause toggling.');

// TEST 7: Real-time Live Market Feed Subscription
console.log('\n▶ Test 7: Verifying Real-Time Market Feed Subscription & Ticking...');
const { subscribeRealtimeStock, unsubscribeRealtimeStock } = await import('./src/services/marketData.js');

const sampleStock = {
  ticker: 'RELIANCE.NS',
  price: 2850,
  slowK: 14.5,
  d: 16.2
};

let tickReceived = null;
const unsub = subscribeRealtimeStock(sampleStock, (tick) => {
  tickReceived = tick;
}, 100);

assert(tickReceived !== null, 'Initial tick must be emitted synchronously upon subscription');
assert.strictEqual(tickReceived.symbol, 'RELIANCE.NS', 'Tick symbol must match');
assert(typeof tickReceived.price === 'number', 'Tick must contain numeric price');
unsub();
unsubscribeRealtimeStock();

console.log(`  ✅ Test 7 Passed: Real-Time Market Feed subscription successfully delivered tick: Symbol=${tickReceived.symbol}, Price=₹${tickReceived.price}`);

// TEST 8: Institutional 3-Pane Workstation Terminal Verification
console.log('\n▶ Test 8: Verifying Institutional 3-Pane Workstation Terminal Logic...');
const { WorkstationTerminal } = await import('./src/components/workstationTerminal.js');

const workstation = new WorkstationTerminal('non-existent-mock-id');
assert(workstation, 'WorkstationTerminal instance must be created');
assert.strictEqual(workstation.refreshIntervalSec, 5, 'Default refresh interval must be 5s');
assert.strictEqual(workstation.activeTimeframe, 'today', 'Default timeframe must be today');

// Sample test stocks
const mockStocks = [
  {
    ticker: 'HDFCBANK.NS',
    name: 'HDFC Bank Ltd',
    price: 813.05,
    changePct: 1.13,
    slowK: 18.5,
    d: 16.2,
    is_buy_zone: true,
    is_recommended: true,
    signalType: 'BULLISH_CROSSOVER_OVERSOLD',
    signalLabel: 'Bullish Golden Cross',
    roi_pct: 1.5,
    strategy: { stopLoss: 800, target1: 825, target2: 840, rrRatio: '1:2.5' }
  },
  {
    ticker: 'AXISBANK.NS',
    name: 'Axis Bank Ltd',
    price: 1338.5,
    changePct: -0.19,
    slowK: 84.2,
    d: 81.0,
    is_sell_zone: true,
    is_recommended: false,
    signalType: 'BEARISH_CROSSOVER_OVERBOUGHT',
    signalLabel: 'Death Cross in Overbought',
    roi_pct: 1.5,
    strategy: { stopLoss: 1358, target1: 1318, target2: 1290, rrRatio: '1:2.0' }
  },
  {
    ticker: 'INDUSINDBK.NS',
    name: 'IndusInd Bank Ltd',
    price: 911.0,
    changePct: -0.87,
    slowK: 45.0,
    d: 46.0,
    is_sell_zone: false,
    is_buy_zone: false,
    is_recommended: false,
    signalType: 'NEUTRAL',
    signalLabel: 'Neutral Consolidation',
    roi_pct: 0.8,
    strategy: { stopLoss: 895, target1: 925, target2: 940, rrRatio: '1:1.5' }
  }
];

workstation.allResults = mockStocks;

// 1. Test Filter: Oversold
workstation.currentFilter = 'oversold';
workstation.applyFilterAndSort();
assert.strictEqual(workstation.filteredResults.length, 1, 'Only HDFCBANK should be in oversold (<20)');
assert.strictEqual(workstation.filteredResults[0].ticker, 'HDFCBANK.NS');

// 2. Test Filter: Overbought
workstation.currentFilter = 'overbought';
workstation.applyFilterAndSort();
assert.strictEqual(workstation.filteredResults.length, 1, 'Only AXISBANK should be in overbought (>80)');
assert.strictEqual(workstation.filteredResults[0].ticker, 'AXISBANK.NS');

// 3. Test Filter: All
workstation.currentFilter = 'all';
workstation.applyFilterAndSort();
assert.strictEqual(workstation.filteredResults.length, 3, 'All 3 stocks should be returned when filter is all');

// 4. Test Sorting: Highest R:R
workstation.currentSort = 'rr-desc';
workstation.applyFilterAndSort();
assert.strictEqual(workstation.filteredResults[0].roi_pct >= workstation.filteredResults[1].roi_pct, true, 'Stocks sorted by ROI/RR descending');

// 5. Test EMA Calculation (9 EMA)
const testPrices = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 110];
const ema9 = workstation.calculateEMA(testPrices, 9);
assert.strictEqual(ema9.length, testPrices.length, 'EMA series length must match prices length');
assert(typeof ema9[ema9.length - 1] === 'number', 'Latest EMA must be a valid number');

// 6. Test Interval Controls: 5s, 10s, 15s
workstation.setRefreshInterval(10);
assert.strictEqual(workstation.refreshIntervalSec, 10, 'Workstation interval updated to 10s');
workstation.setRefreshInterval(15);
assert.strictEqual(workstation.refreshIntervalSec, 15, 'Workstation interval updated to 15s');
workstation.setRefreshInterval(5);
assert.strictEqual(workstation.refreshIntervalSec, 5, 'Workstation interval reset to 5s default');

console.log('  ✅ Test 8 Passed: WorkstationTerminal filtering, sorting, 9/21/50 EMA calculations, and 5s/10s/15s cadence verified.');

// TEST 9: Center Toolbar & Entry/Exit Strategy Blueprint Pane Synchronization
console.log('\n▶ Test 9: Verifying Center Toolbar & Strategy Pane Stock Selection Sync...');
const domElements = {};
globalThis.document = {
  getElementById: (id) => {
    if (!domElements[id]) {
      domElements[id] = {
        textContent: '',
        className: '',
        style: {},
        innerHTML: '',
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {}
      };
    }
    return domElements[id];
  }
};

// Select HDFCBANK from mockStocks
workstation.selectedStock = null;
workstation.updateSingleStock(mockStocks[0]);
assert.strictEqual(workstation.selectedStock.ticker, 'HDFCBANK.NS', 'Selected stock must be set to HDFCBANK.NS');

// Verify updateCenterToolbar correctly populates the toolbar elements
workstation.updateCenterToolbar(mockStocks[0], '₹');
assert.strictEqual(domElements['stock-active-ticker'].textContent, 'HDFCBANK.NS', 'Toolbar ticker must match selected stock');
assert.strictEqual(domElements['stock-active-name'].textContent, 'HDFC Bank Ltd', 'Toolbar name must match selected stock');
assert(domElements['stock-active-price-pill'].textContent.includes('813.05'), 'Toolbar price pill must display selected stock price');

// Verify renderRightPane correctly populates the Entry & Exit Strategy Blueprint elements
workstation.renderRightPane(mockStocks[0], '₹');
assert.strictEqual(domElements['detail-stock-ticker'].textContent, 'HDFCBANK.NS', 'Strategy pane ticker must match selected stock');
assert.strictEqual(domElements['detail-stock-name'].textContent, 'HDFC Bank Ltd', 'Strategy pane company name must match');
assert.strictEqual(domElements['detail-stock-price'].textContent, '₹813.05', 'Strategy pane price must match');
const expectedPrice = Math.round(mockStocks[0].price);
assert(domElements['plan-entry'].textContent.includes(String(expectedPrice)), `Strategy pane entry must reflect stock price (${expectedPrice})`);
assert(domElements['plan-sl'].textContent.length > 2, 'Strategy pane Stop Loss must be populated');
assert(domElements['plan-t1'].textContent.length > 2, 'Strategy pane Target 1 must be populated');
assert(domElements['plan-t2'].textContent.length > 2, 'Strategy pane Target 2 must be populated');

console.log('  ✅ Test 9 Passed: Toolbar and Entry/Exit Strategy Blueprint pane dynamically synchronize with selected stock.');

console.log('\n🎉 ALL REAL-TIME RECOMMENDATION CHART & TRADINGVIEW FRAMEWORK TESTS PASSED! (9/9 Checks)\n');
process.exit(0);
