/**
 * Comprehensive Automated Test Suite:
 * 1. Strategy Scanner Tabular View Horizontal Scrolling (Arrow Keys & Buttons)
 * 2. High-Performance Event Delegation
 * 3. Memory Leak Prevention & Cache Bounding Verification
 */

import assert from 'assert';
import { OPTION_UNIVERSE } from './src/data/stockUniverse.js';
import { getBaseQuote, fetchLiveQuote, clearMarketDataCache, getMarketDataCacheSize } from './src/data/marketDataFeed.js';
import { scanAllUniverseStrategies } from './src/quant/strategyEngine.js';
import { renderScannerTable, renderScannerCards, cleanupTableHorizontalScroll, setupTableHorizontalScroll } from './src/components/scannerView.js';
import { renderOptionChain } from './src/components/optionChainView.js';
import { renderMarketOverview } from './src/components/marketOverview.js';
import { destroyPayoffChart } from './src/components/payoffChart.js';

console.log('🧪 Starting Memory, Performance & Keyboard Horizontal Scroll Test Suite...\n');

// Mock DOM Environment
const mockWindowListeners = new Map();
const mockElements = new Map();

function createMockElement(id, tagName = 'div') {
  return {
    id,
    tagName: tagName.toUpperCase(),
    innerHTML: '',
    scrollLeft: 0,
    scrollWidth: 1600,
    clientWidth: 800,
    dataset: {},
    style: {},
    classList: {
      _classes: new Set(),
      contains(cls) { return this._classes.has(cls); },
      add(cls) { this._classes.add(cls); },
      remove(cls) { this._classes.delete(cls); },
      toggle(cls, val) {
        if (val === undefined) {
          if (this._classes.has(cls)) this._classes.delete(cls);
          else this._classes.add(cls);
        } else if (val) {
          this._classes.add(cls);
        } else {
          this._classes.delete(cls);
        }
      }
    },
    disabled: false,
    scrollBy(options) {
      this.scrollLeft += options.left || 0;
    },
    scrollTo(options) {
      this.scrollLeft = options.left || 0;
    },
    addEventListener(evt, handler) {
      if (!this._listeners) this._listeners = new Map();
      this._listeners.set(evt, handler);
    },
    removeEventListener(evt) {
      if (this._listeners) this._listeners.delete(evt);
    },
    querySelector(selector) {
      if (selector === '#scannerTableContainer') return mockElements.get('scannerTableContainer');
      if (selector === '#btnTableScrollLeft') return mockElements.get('btnTableScrollLeft');
      if (selector === '#btnTableScrollRight') return mockElements.get('btnTableScrollRight');
      if (selector === '#tableScrollThumb') return mockElements.get('tableScrollThumb');
      if (selector === '#tableScrollPos') return mockElements.get('tableScrollPos');
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

// Setup global mock document & window
mockElements.set('testContainer', createMockElement('testContainer'));
mockElements.set('scannerTableContainer', createMockElement('scannerTableContainer'));
mockElements.set('btnTableScrollLeft', createMockElement('btnTableScrollLeft', 'button'));
mockElements.set('btnTableScrollRight', createMockElement('btnTableScrollRight', 'button'));
mockElements.set('tableScrollThumb', createMockElement('tableScrollThumb'));
mockElements.set('tableScrollPos', createMockElement('tableScrollPos'));

global.document = {
  activeElement: null,
  body: {
    contains: (el) => true
  },
  getElementById: (id) => {
    if (!mockElements.has(id)) {
      mockElements.set(id, createMockElement(id));
    }
    return mockElements.get(id);
  }
};

global.window = {
  refreshIcons: () => {},
  addEventListener: (evt, handler) => {
    mockWindowListeners.set(evt, handler);
  },
  removeEventListener: (evt, handler) => {
    if (mockWindowListeners.get(evt) === handler) {
      mockWindowListeners.delete(evt);
    }
  }
};

global.fetch = async () => ({
  ok: true,
  json: async () => ({
    chart: {
      result: [{
        meta: { regularMarketPrice: 150.5, previousClose: 149.0 }
      }]
    }
  })
});

// =========================================================================
// TEST 1: Tabular View Structure & Accessibility Attributes
// =========================================================================
console.log('▶ Test 1: Verifying Tabular View Structure and Accessibility...');
const quotes = OPTION_UNIVERSE.map(a => getBaseQuote(a));
const strategies = scanAllUniverseStrategies(quotes);

renderScannerTable('testContainer', strategies.slice(0, 5));
const container = mockElements.get('testContainer');
assert(container.innerHTML.includes('id="scannerTableWrapper"'), 'Must contain scannerTableWrapper');
assert(container.innerHTML.includes('id="scannerTableContainer"'), 'Must contain scannerTableContainer');
assert(container.innerHTML.includes('tabindex="0"'), 'Table container must have tabindex="0" for keyboard focus');
assert(container.innerHTML.includes('role="region"'), 'Table container must have role="region"');
assert(container.innerHTML.includes('aria-label='), 'Table container must have accessible aria-label');
assert(container.innerHTML.includes('id="btnTableScrollLeft"'), 'Must have floating left scroll button');
assert(container.innerHTML.includes('id="btnTableScrollRight"'), 'Must have floating right scroll button');
assert(container.innerHTML.includes('id="tableScrollThumb"'), 'Must have dynamic scroll progress thumb');
assert(container.innerHTML.includes('id="tableScrollPos"'), 'Must have column indicator position text');

console.log('  ✅ Table structure, floating buttons, progress bar, and accessibility attributes verified.');

// =========================================================================
// TEST 2: Keyboard Horizontal Scroll (ArrowLeft / ArrowRight / Home / End)
// =========================================================================
console.log('\n▶ Test 2: Testing Arrow Keys & Floating Scroll Buttons...');
const tableContainer = mockElements.get('scannerTableContainer');
const btnLeft = mockElements.get('btnTableScrollLeft');
const btnRight = mockElements.get('btnTableScrollRight');

// 2a. Initial state: scrollLeft = 0, so btnLeft must be disabled
setupTableHorizontalScroll(container);
assert.strictEqual(tableContainer.scrollLeft, 0, 'Initial scrollLeft should be 0');
assert.strictEqual(btnLeft.disabled, true, 'btnLeft must be disabled when at left boundary');
assert.strictEqual(btnRight.disabled, false, 'btnRight must be enabled when content is scrollable');

// 2b. ArrowRight on focused tableContainer
let defaultPrevented = false;
tableContainer.onkeydown({
  key: 'ArrowRight',
  preventDefault: () => { defaultPrevented = true; }
});
assert.strictEqual(defaultPrevented, true, 'ArrowRight must call preventDefault() to prevent window jump');
assert(tableContainer.scrollLeft > 0, `scrollLeft must increase after ArrowRight (got ${tableContainer.scrollLeft})`);
console.log(`  ArrowRight on focused container scrolled table to ${tableContainer.scrollLeft}px.`);

// 2c. ArrowLeft on focused tableContainer
defaultPrevented = false;
const prevScroll = tableContainer.scrollLeft;
tableContainer.onkeydown({
  key: 'ArrowLeft',
  preventDefault: () => { defaultPrevented = true; }
});
assert.strictEqual(defaultPrevented, true, 'ArrowLeft must call preventDefault()');
assert(tableContainer.scrollLeft < prevScroll, 'scrollLeft must decrease after ArrowLeft');
console.log(`  ArrowLeft on focused container scrolled table back to ${tableContainer.scrollLeft}px.`);

// 2d. End and Home keys
tableContainer.onkeydown({ key: 'End', preventDefault: () => {} });
assert.strictEqual(tableContainer.scrollLeft, tableContainer.scrollWidth, 'End key must scroll to scrollWidth');

tableContainer.onkeydown({ key: 'Home', preventDefault: () => {} });
assert.strictEqual(tableContainer.scrollLeft, 0, 'Home key must scroll back to 0');
console.log('  Home and End keys accurately scroll to table boundaries.');

// 2e. Global Arrow key routing
const globalKeyHandler = mockWindowListeners.get('keydown');
assert(typeof globalKeyHandler === 'function', 'Global keydown listener must be registered on window');

// When user is not in an input, global ArrowRight scrolls the table
tableContainer.scrollLeft = 0;
document.activeElement = createMockElement('someDiv', 'div');
globalKeyHandler({ key: 'ArrowRight', preventDefault: () => {} });
assert(tableContainer.scrollLeft > 0, 'Global ArrowRight must scroll table when outside text input');

// When user is typing inside an input (e.g. search bar), global ArrowRight must NOT be intercepted
tableContainer.scrollLeft = 0;
document.activeElement = createMockElement('globalSearchInput', 'input');
globalKeyHandler({ key: 'ArrowRight', preventDefault: () => {} });
assert.strictEqual(tableContainer.scrollLeft, 0, 'Global ArrowRight must NOT scroll table when user is typing in input');
console.log('  Global Arrow key routing scrolls table smoothly but does NOT hijack typing in search inputs.');

// 2f. Floating button clicks
tableContainer.scrollLeft = 0;
btnRight.onclick({ preventDefault: () => {} });
assert(tableContainer.scrollLeft > 0, 'Clicking btnTableScrollRight must scroll right');

btnLeft.onclick({ preventDefault: () => {} });
assert.strictEqual(tableContainer.scrollLeft, 0, 'Clicking btnTableScrollLeft must scroll left');
console.log('  Floating Left & Right scroll buttons respond accurately to clicks.');

// =========================================================================
// TEST 3: Cleanup of Table Scroll Listeners on Switch
// =========================================================================
console.log('\n▶ Test 3: Testing Cleanup of Table Scroll Listeners...');
cleanupTableHorizontalScroll();
assert.strictEqual(mockWindowListeners.has('keydown'), false, 'Window keydown listener must be removed after cleanup');
console.log('  ✅ cleanupTableHorizontalScroll() successfully detached global window listeners.');

// =========================================================================
// TEST 4: Single Event Delegation Performance
// =========================================================================
console.log('\n▶ Test 4: Testing Single Event Delegation in Scanner Table...');
let selectedStratId = null;
let chainTicker = null;
let customBuildId = null;

renderScannerTable(
  'testContainer',
  strategies.slice(0, 10),
  (strat) => { selectedStratId = strat.id; },
  (ticker) => { chainTicker = ticker; },
  (strat) => { customBuildId = strat.id; }
);

// Verify container has single onclick handler
assert(typeof container.onclick === 'function', 'container.onclick must be defined for event delegation');

// Simulate click on .btn-analyze
const testStrat = strategies[0];
container.onclick({
  target: {
    closest: (sel) => sel === '.btn-analyze' ? { dataset: { id: testStrat.id } } : null
  },
  stopPropagation: () => {}
});
assert.strictEqual(selectedStratId, testStrat.id, 'Clicking .btn-analyze via delegation must select strategy');

// Simulate click on .btn-chain
container.onclick({
  target: {
    closest: (sel) => sel === '.btn-chain' ? { dataset: { ticker: 'AAPL' } } : null
  },
  stopPropagation: () => {}
});
assert.strictEqual(chainTicker, 'AAPL', 'Clicking .btn-chain via delegation must open option chain');

// Simulate click on .btn-build
container.onclick({
  target: {
    closest: (sel) => sel === '.btn-build' ? { dataset: { id: testStrat.id } } : null
  },
  stopPropagation: () => {}
});
assert.strictEqual(customBuildId, testStrat.id, 'Clicking .btn-build via delegation must open builder');

console.log('  ✅ Event delegation handles Analyze, Chain, and Builder clicks through 1 single listener.');

// =========================================================================
// TEST 5: Option Chain & Market Overview Event Delegation
// =========================================================================
console.log('\n▶ Test 5: Testing Event Delegation in Option Chain & Market Overview...');
const chainContainer = mockElements.get('chainContainer') || createMockElement('chainContainer');
mockElements.set('chainContainer', chainContainer);

let addedLeg = null;
renderOptionChain('chainContainer', quotes[0], 14, (data) => { addedLeg = data.leg; });
assert(typeof chainContainer.onclick === 'function', 'Option chain must use container.onclick delegation');

chainContainer.onclick({
  target: {
    closest: (sel) => sel === '.clickable-price' ? {
      dataset: { type: 'call', action: 'buy', strike: '200', prem: '5.20' }
    } : null
  }
});
assert(addedLeg !== null && addedLeg.strike === 200 && addedLeg.action === 'buy', 'Clickable price cell delegation must add leg');

const overviewContainer = mockElements.get('overviewContainer') || createMockElement('overviewContainer');
mockElements.set('overviewContainer', overviewContainer);
let selectedOverviewAsset = null;
renderMarketOverview('overviewContainer', quotes, (ticker) => { selectedOverviewAsset = ticker; });
assert(typeof overviewContainer.onclick === 'function', 'Market overview must use container.onclick delegation');

overviewContainer.onclick({
  target: {
    closest: (sel) => sel.includes('.clickable-asset') ? { dataset: { ticker: 'MSFT' } } : null
  }
});
assert.strictEqual(selectedOverviewAsset, 'MSFT', 'Clicking asset in Market Overview must trigger onSelectAsset');
console.log('  ✅ Option Chain & Market Overview event delegation verified.');

// =========================================================================
// TEST 6: Memory Leak Prevention & Cache Bounding
// =========================================================================
console.log('\n▶ Test 6: Testing Memory Leak Fixes (Chart.js & Bounded Cache)...');

// 6a. destroyPayoffChart must not throw even if chart instance is null
destroyPayoffChart();
console.log('  destroyPayoffChart() safely executes without null pointer exceptions.');

// 6b. Bounded Live Quotes Cache
clearMarketDataCache();
assert.strictEqual(getMarketDataCacheSize(), 0, 'Cache should be empty after clear');

// Fill cache up to 160 items (exceeding MAX_CACHE_SIZE 150)
for (let i = 0; i < 160; i++) {
  const fakeAsset = { ticker: `FAKE_${i}`, basePrice: 100 + i, historicalIV: 25, ivRank: 50, pcr: 1.0, maxPain: 100 };
  await fetchLiveQuote(fakeAsset);
}

const finalCacheSize = getMarketDataCacheSize();
assert.strictEqual(finalCacheSize, 150, `Cache size must be capped at 150 (got ${finalCacheSize})`);
console.log(`  Live quotes cache strictly capped at max 150 entries (current size: ${finalCacheSize}). Oldest entries evicted automatically.`);

clearMarketDataCache();
assert.strictEqual(getMarketDataCacheSize(), 0, 'clearMarketDataCache() successfully flushed cache.');

console.log('\n🎉 ALL PERFORMANCE, MEMORY LEAK & HORIZONTAL SCROLL TESTS PASSED!\n');
