/**
 * Test Suite: Real-Time Chart Terminal for Screened Recommendations & Live Market Feed
 * Verifies:
 * 1. HTML structure contains #recommendation-chart-container and #toggleRecChartBtn
 * 2. CSS contains styling for recommendation chart terminal, chips, and live pulse animations
 * 3. Strategy Overlay Plugin renders Stop Loss, Target 1, Target 2, Entry Zone, and CMP
 * 4. RecommendationChartTerminal extracts recommendations and selects stocks
 * 5. Real-time market feed subscription and tick propagation
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

assert(htmlContent.includes('id="recommendation-chart-container"'), 'Missing #recommendation-chart-container in index.html');
assert(htmlContent.includes('id="toggleRecChartBtn"'), 'Missing #toggleRecChartBtn in index.html');
assert(htmlContent.includes('class="recommendation-chart-section"'), 'Missing .recommendation-chart-section class');
console.log('  ✅ Test 1 Passed: index.html contains all required containers and toggle buttons.');

// TEST 2: Validate CSS Rules
console.log('\n▶ Test 2: Validating CSS Rules in src/style.css...');
const cssPath = path.join(__dirname, 'src', 'style.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(cssContent.includes('.recommendation-chart-section'), 'Missing .recommendation-chart-section CSS');
assert(cssContent.includes('.rec-chart-card'), 'Missing .rec-chart-card CSS');
assert(cssContent.includes('.rec-chip'), 'Missing .rec-chip CSS');
assert(cssContent.includes('.rec-live-price'), 'Missing .rec-live-price CSS');
assert(cssContent.includes('.live-flash-green'), 'Missing .live-flash-green CSS');
assert(cssContent.includes('.live-flash-red'), 'Missing .live-flash-red CSS');
assert(cssContent.includes('.btn-live-chart'), 'Missing .btn-live-chart CSS');
assert(cssContent.includes('@keyframes radar-live-anim'), 'Missing @keyframes radar-live-anim CSS');
console.log('  ✅ Test 2 Passed: src/style.css contains complete styling for terminal, chips, and animations.');

// TEST 3: Strategy Overlay Plugin Canvas Drawing
console.log('\n▶ Test 3: Verifying Strategy Overlay Plugin Level Rendering...');
const { strategyOverlayPlugin } = await import('./src/services/strategyChartPlugin.js');
assert(strategyOverlayPlugin && strategyOverlayPlugin.id === 'strategyOverlay', 'Plugin must export valid ID');

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
  fillText(text, x, y) { this.calls.push({ op: 'fillText', text, x, y }); }
  setLineDash(dash) { this.calls.push({ op: 'setLineDash', dash }); }
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

// TEST 4: RecommendationChartTerminal Logic & Stock Switching
console.log('\n▶ Test 4: Verifying Recommendation Extraction & Switching...');

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
  addEventListener: () => {},
  hidden: false
};
globalThis.window = {
  addEventListener: () => {},
  scrollY: 0
};

const { RecommendationChartTerminal } = await import('./src/components/recommendationChart.js');

const mockContainer = new MockDOMElement('recommendation-chart-container');
document.getElementById = (id) => (id === 'recommendation-chart-container' ? mockContainer : new MockDOMElement(id));

const terminal = new RecommendationChartTerminal('recommendation-chart-container');

const sampleResults = [
  {
    ticker: 'RELIANCE.NS',
    name: 'Reliance Industries Ltd',
    price: 2850,
    slowK: 14.5, // Oversold (<20)
    d: 16.2,
    spread: -1.7,
    signalLabel: 'Deep Oversold',
    strategy: { direction: 'LONG', stopLoss: 2790, target1: 2930, target2: 2990 }
  },
  {
    ticker: 'TCS.NS',
    name: 'Tata Consultancy Services',
    price: 3450,
    slowK: 18.2, // Golden Cross in Oversold
    d: 17.5,
    spread: 0.7,
    signalType: 'GOLDEN_CROSS',
    signalLabel: 'Bullish Golden Cross',
    strategy: { direction: 'LONG', stopLoss: 3380, target1: 3550, target2: 3620 }
  },
  {
    ticker: 'HDFCBANK.NS',
    name: 'HDFC Bank Ltd',
    price: 1680,
    slowK: 55.0, // Neutral
    d: 54.0,
    spread: 1.0,
    signalLabel: 'Neutral'
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 140,
    slowK: 85.0, // Overbought (>80)
    d: 82.0,
    spread: 3.0,
    signalLabel: 'Overbought Short',
    strategy: { direction: 'SHORT', stopLoss: 146, target1: 132, target2: 125 }
  }
];

terminal.setResults(sampleResults);

assert.strictEqual(terminal.recommendations.length, 3, 'Must extract exactly 3 actionable recommendations (2 oversold + 1 overbought)');
assert.strictEqual(terminal.recommendations[0].ticker, 'RELIANCE.NS', 'First recommendation should be deepest oversold RELIANCE.NS');
assert.strictEqual(terminal.selectedStock.ticker, 'RELIANCE.NS', 'Default selected stock should be RELIANCE.NS');

// Test selecting a different recommendation
terminal.selectStock(sampleResults[1]); // Select TCS.NS
assert.strictEqual(terminal.selectedStock.ticker, 'TCS.NS', 'Selected stock must switch to TCS.NS');

console.log('  ✅ Test 4 Passed: Recommendations accurately filtered and selected (Oversold, Golden Cross, Overbought).');

// TEST 5: Real-time Live Market Feed Subscription
console.log('\n▶ Test 5: Verifying Real-Time Market Feed Subscription & Ticking...');
const { subscribeRealtimeStock, unsubscribeRealtimeStock } = await import('./src/services/marketData.js');

let tickReceived = null;
const unsub = subscribeRealtimeStock(sampleResults[0], (tick) => {
  tickReceived = tick;
}, 100);

assert(tickReceived !== null, 'Initial tick must be emitted synchronously upon subscription');
assert.strictEqual(tickReceived.symbol, 'RELIANCE.NS', 'Tick symbol must match');
assert(typeof tickReceived.price === 'number', 'Tick must contain numeric price');
unsub();
unsubscribeRealtimeStock();

console.log(`  ✅ Test 5 Passed: Real-Time Market Feed subscription successfully delivered tick: Symbol=${tickReceived.symbol}, Price=₹${tickReceived.price}`);

console.log('\n🎉 ALL REAL-TIME RECOMMENDATION CHART TESTS PASSED SUCCESSFULLY! (5/5 Checks)\n');
process.exit(0);
