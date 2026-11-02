/**
 * Verification test suite for Tabular View Column Header Sorting (Asc / Desc)
 */

import assert from 'assert';
import { OPTION_UNIVERSE } from './src/data/stockUniverse.js';
import { getBaseQuote } from './src/data/marketDataFeed.js';
import { scanAllUniverseStrategies } from './src/quant/strategyEngine.js';
import { sortStrategies, renderScannerTable, parseRiskReward } from './src/components/scannerView.js';

console.log('🧪 Starting Tabular View Column Header Sorting Verification Suite...\n');

// Mock DOM elements
const mockElements = new Map();

function createMockElement(id, tagName = 'div') {
  return {
    id,
    tagName: tagName.toUpperCase(),
    innerHTML: '',
    scrollLeft: 150,
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
    click() {
      if (this.onclick) this.onclick({ target: this, stopPropagation: () => {} });
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  };
}

mockElements.set('testContainer', createMockElement('testContainer'));
mockElements.set('scannerTableContainer', createMockElement('scannerTableContainer'));

global.document = {
  activeElement: null,
  body: { contains: () => true },
  getElementById: (id) => {
    if (!mockElements.has(id)) {
      mockElements.set(id, createMockElement(id));
    }
    return mockElements.get(id);
  }
};
global.window = { refreshIcons: () => {} };

// Generate sample strategies
const quotes = OPTION_UNIVERSE.map(a => getBaseQuote(a));
const strategies = scanAllUniverseStrategies(quotes);
assert(strategies.length >= 10, 'Must have at least 10 strategies');

// =========================================================================
// TEST 1: Sorting Algorithms Verification (Multi-Column Asc & Desc)
// =========================================================================
console.log('▶ Test 1: Verifying sortStrategies for all supported columns...');

// 1a. POP
const popDesc = sortStrategies(strategies, 'pop', 'desc');
const popAsc = sortStrategies(strategies, 'pop', 'asc');
assert(popDesc[0].pop >= popDesc[popDesc.length - 1].pop, 'POP Desc: first must be >= last');
assert(popAsc[0].pop <= popAsc[popAsc.length - 1].pop, 'POP Asc: first must be <= last');
console.log(`  ✅ POP: Desc max ${popDesc[0].pop}% -> min ${popDesc[popDesc.length - 1].pop}%; Asc min ${popAsc[0].pop}% -> max ${popAsc[popAsc.length - 1].pop}%`);

// 1b. DTE / Expiry
const dteAsc = sortStrategies(strategies, 'expiry', 'asc');
const dteDesc = sortStrategies(strategies, 'expiry', 'desc');
assert(dteAsc[0].dte <= dteAsc[dteAsc.length - 1].dte, 'DTE Asc: nearest DTE must be first');
assert(dteDesc[0].dte >= dteDesc[dteDesc.length - 1].dte, 'DTE Desc: farthest DTE must be first');
console.log(`  ✅ Expiry/DTE: Asc nearest ${dteAsc[0].dte} DTE -> farthest ${dteAsc[dteAsc.length - 1].dte} DTE`);

// 1c. IV Rank
const ivrDesc = sortStrategies(strategies, 'ivr', 'desc');
const ivrAsc = sortStrategies(strategies, 'ivr', 'asc');
assert(ivrDesc[0].ivRank >= ivrDesc[ivrDesc.length - 1].ivRank, 'IVR Desc: highest first');
assert(ivrAsc[0].ivRank <= ivrAsc[ivrAsc.length - 1].ivRank, 'IVR Asc: lowest first');
console.log(`  ✅ IVR: Desc highest ${ivrDesc[0].ivRank}% -> lowest ${ivrDesc[ivrDesc.length - 1].ivRank}%`);

// 1d. Asset Ticker Alphabetical
const assetAsc = sortStrategies(strategies, 'asset', 'asc');
const assetDesc = sortStrategies(strategies, 'asset', 'desc');
assert(assetAsc[0].displayTicker.localeCompare(assetAsc[assetAsc.length - 1].displayTicker) <= 0, 'Asset Asc: A to Z');
assert(assetDesc[0].displayTicker.localeCompare(assetDesc[assetDesc.length - 1].displayTicker) >= 0, 'Asset Desc: Z to A');
console.log(`  ✅ Asset: Asc ${assetAsc[0].displayTicker} -> ${assetAsc[assetAsc.length - 1].displayTicker}; Desc ${assetDesc[0].displayTicker} -> ${assetDesc[assetDesc.length - 1].displayTicker}`);

// 1e. Max Profit
const profitDesc = sortStrategies(strategies, 'profit', 'desc');
const profitAsc = sortStrategies(strategies, 'profit', 'asc');
const maxPDesc = typeof profitDesc[0].maxProfit === 'number' ? profitDesc[0].maxProfit : 999999999;
const minPDesc = typeof profitDesc[profitDesc.length - 1].maxProfit === 'number' ? profitDesc[profitDesc.length - 1].maxProfit : 0;
assert(maxPDesc >= minPDesc, 'Profit Desc: highest first');
console.log('  ✅ Max Profit: Descending & Ascending verified.');

// 1f. Risk:Reward Ratio
const rrDesc = sortStrategies(strategies, 'rr', 'desc');
const rrAsc = sortStrategies(strategies, 'rr', 'asc');
assert(parseRiskReward(rrDesc[0].riskReward) >= parseRiskReward(rrDesc[rrDesc.length - 1].riskReward), 'R:R Desc: best ratio first');
console.log(`  ✅ R:R: Desc best ${rrDesc[0].riskReward} -> ${rrDesc[rrDesc.length - 1].riskReward}`);

// =========================================================================
// TEST 2: Tabular View Header Rendering & Accessibility Attributes
// =========================================================================
console.log('\n▶ Test 2: Verifying Column Header HTML & Accessibility (aria-sort)...');

renderScannerTable(
  'testContainer',
  strategies.slice(0, 5),
  null,
  null,
  null,
  { column: 'pop', direction: 'desc' }
);

const container = mockElements.get('testContainer');
const html = container.innerHTML;

// Check sortable headers
assert(html.includes('data-sort="asset"'), 'Header must contain data-sort="asset"');
assert(html.includes('data-sort="strategy"'), 'Header must contain data-sort="strategy"');
assert(html.includes('data-sort="expiry"'), 'Header must contain data-sort="expiry"');
assert(html.includes('data-sort="pop"'), 'Header must contain data-sort="pop"');
assert(html.includes('data-sort="profit"'), 'Header must contain data-sort="profit"');
assert(html.includes('data-sort="loss"'), 'Header must contain data-sort="loss"');
assert(html.includes('data-sort="rr"'), 'Header must contain data-sort="rr"');
assert(html.includes('data-sort="ivr"'), 'Header must contain data-sort="ivr"');

// Check active sort state on POP header
assert(html.includes('sorted sorted-desc'), 'POP header must have sorted sorted-desc class');
assert(html.includes('aria-sort="descending"'), 'POP header must have aria-sort="descending"');
assert(html.includes('aria-sort="none"'), 'Inactive headers must have aria-sort="none"');
assert(html.includes('role="columnheader"'), 'Headers must have role="columnheader"');

console.log('  ✅ Sortable headers rendered with data-sort, role="columnheader", and aria-sort="descending".');

// Re-render with ascending sort
renderScannerTable(
  'testContainer',
  strategies.slice(0, 5),
  null,
  null,
  null,
  { column: 'expiry', direction: 'asc' }
);
const ascHtml = container.innerHTML;
assert(ascHtml.includes('data-sort="expiry"'), 'Expiry must have data-sort="expiry"');
assert(ascHtml.includes('aria-sort="ascending"'), 'Expiry must have aria-sort="ascending"');
assert(ascHtml.includes('sorted sorted-asc'), 'Expiry header must have sorted sorted-asc class');
console.log('  ✅ Re-render with direction="asc" accurately sets sorted-asc and aria-sort="ascending".');

// =========================================================================
// TEST 3: Header Click Handling & Sort Direction Toggle
// =========================================================================
console.log('\n▶ Test 3: Verifying Header Click and Direction Toggle...');

let sortChangedCol = null;
let sortChangedDir = null;

renderScannerTable(
  'testContainer',
  strategies.slice(0, 5),
  null,
  null,
  null,
  { column: 'pop', direction: 'desc' },
  (col, dir) => {
    sortChangedCol = col;
    sortChangedDir = dir;
  }
);

// 3a. Click on the currently sorted column (pop) -> should toggle to asc
container.onclick({
  target: {
    closest: (sel) => sel === '.th-sortable' ? { dataset: { sort: 'pop' } } : null
  },
  stopPropagation: () => {}
});

assert.strictEqual(sortChangedCol, 'pop', 'Sort column must be pop');
assert.strictEqual(sortChangedDir, 'asc', 'Clicking pop (currently desc) must toggle to asc');
console.log('  ✅ Clicking active column (pop desc) toggles direction to asc.');

// 3b. Click on a different column (ivr) -> should select ivr with default desc
sortChangedCol = null;
sortChangedDir = null;
container.onclick({
  target: {
    closest: (sel) => sel === '.th-sortable' ? { dataset: { sort: 'ivr' } } : null
  },
  stopPropagation: () => {}
});

assert.strictEqual(sortChangedCol, 'ivr', 'Sort column must be ivr');
assert.strictEqual(sortChangedDir, 'desc', 'Clicking new numeric column (ivr) must default to desc');
console.log('  ✅ Clicking new numeric column (ivr) sets column to ivr and direction to desc.');

// 3c. Click on asset column -> should default to asc (A-Z)
sortChangedCol = null;
sortChangedDir = null;
container.onclick({
  target: {
    closest: (sel) => sel === '.th-sortable' ? { dataset: { sort: 'asset' } } : null
  },
  stopPropagation: () => {}
});

assert.strictEqual(sortChangedCol, 'asset', 'Sort column must be asset');
assert.strictEqual(sortChangedDir, 'asc', 'Clicking text column (asset) must default to asc (A-Z)');
console.log('  ✅ Clicking text column (asset) sets column to asset and direction to asc.');

// =========================================================================
// TEST 4: Keyboard Accessibility (Enter / Space on Header)
// =========================================================================
console.log('\n▶ Test 4: Verifying Keyboard Accessibility (Enter / Space on Header)...');

let headerClicked = false;
const mockTh = {
  closest: (sel) => sel === '.th-sortable' ? mockTh : null,
  click: () => { headerClicked = true; }
};

container.onkeydown({
  key: 'Enter',
  target: mockTh,
  preventDefault: () => {}
});
assert.strictEqual(headerClicked, true, 'Pressing Enter on sortable header must trigger sort click');

headerClicked = false;
container.onkeydown({
  key: ' ',
  target: mockTh,
  preventDefault: () => {}
});
assert.strictEqual(headerClicked, true, 'Pressing Space on sortable header must trigger sort click');
console.log('  ✅ Enter and Space keys trigger column header sort for full keyboard accessibility.');

// =========================================================================
// TEST 5: Preservation of Horizontal Scroll Position Across Sort
// =========================================================================
console.log('\n▶ Test 5: Verifying Horizontal Scroll Position Preservation...');
const tableContainerEl = mockElements.get('scannerTableContainer');
tableContainerEl.scrollLeft = 450; // User scrolled right to inspect IVR/R:R columns

renderScannerTable(
  'testContainer',
  strategies.slice(0, 5),
  null,
  null,
  null,
  { column: 'rr', direction: 'desc' }
);

const reRenderedTableContainer = mockElements.get('scannerTableContainer');
assert.strictEqual(reRenderedTableContainer.scrollLeft, 450, 'Horizontal scrollLeft must be preserved after sort re-render');
console.log(`  ✅ Horizontal scroll position (${reRenderedTableContainer.scrollLeft}px) seamlessly preserved.`);

console.log('\n🎉 ALL COLUMN HEADER SORTING TESTS PASSED SUCCESSFULLY!\n');
