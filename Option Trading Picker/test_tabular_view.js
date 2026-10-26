/**
 * Verification test for Option Strategy Tabular & Card View Formats
 */

import assert from 'assert';
import { OPTION_UNIVERSE } from './src/data/stockUniverse.js';
import { getBaseQuote } from './src/data/marketDataFeed.js';
import { scanAllUniverseStrategies } from './src/quant/strategyEngine.js';
import { filterStrategies, renderScannerTable, renderScannerCards, renderScannerView } from './src/components/scannerView.js';

console.log('🧪 Starting Tabular & Card View Verification Suite...\n');

// Mock DOM elements
const mockElements = new Map();
global.document = {
  getElementById: (id) => {
    if (!mockElements.has(id)) {
      mockElements.set(id, {
        innerHTML: '',
        dataset: {},
        classList: {
          contains: () => false,
          add: () => {},
          remove: () => {},
          toggle: () => {}
        },
        querySelectorAll: () => []
      });
    }
    return mockElements.get(id);
  }
};
global.window = {
  refreshIcons: () => {}
};

// 1. Generate universe strategies
const quotes = OPTION_UNIVERSE.map(a => getBaseQuote(a));
const strategies = scanAllUniverseStrategies(quotes);

console.log(`▶ Step 1: Scanned ${strategies.length} total strategies across universe.`);
assert(strategies.length > 0, 'Must generate strategies');

// 2. Filter strategies
const filtered = filterStrategies(strategies, { market: 'ALL', assetType: 'ALL', category: 'ALL' });
console.log(`▶ Step 2: Filtered strategies count: ${filtered.length}.`);
assert.strictEqual(filtered.length, strategies.length, 'No filter should retain all strategies');

// 3. Test Tabular Format Rendering
console.log('▶ Step 3: Verifying Tabular Format Rendering (Default)...');
renderScannerTable('testContainer', filtered.slice(0, 5));
const tableHtml = mockElements.get('testContainer').innerHTML;
assert(tableHtml.includes('scanner-table'), 'Table HTML must contain scanner-table');
assert(tableHtml.includes('th-asset'), 'Table HTML must contain asset column');
assert(tableHtml.includes('th-exit'), 'Table HTML must contain exit rule column');
assert(tableHtml.includes('btn-analyze'), 'Table HTML must contain analyze button');
assert(tableHtml.includes('strat-table-detail-row'), 'Table HTML must contain detail drawer row');
console.log('  ✅ Table format successfully generated with all columns and expandable drawer.');

// 4. Test Card Format Rendering
console.log('▶ Step 4: Verifying Card Format Rendering...');
renderScannerCards('testContainer', filtered.slice(0, 5));
const cardsHtml = mockElements.get('testContainer').innerHTML;
assert(cardsHtml.includes('strategy-cards-grid'), 'Cards HTML must contain strategy-cards-grid');
assert(cardsHtml.includes('strategy-card'), 'Cards HTML must contain strategy-card elements');
console.log('  ✅ Card format successfully generated with responsive grid layout.');

// 5. Test renderScannerView Dispatcher Defaults
console.log('▶ Step 5: Verifying renderScannerView Default Behavior...');
renderScannerView('testContainer', filtered.slice(0, 5)); // default argument viewMode is 'table'
const defaultHtml = mockElements.get('testContainer').innerHTML;
assert(defaultHtml.includes('scanner-table'), 'renderScannerView default must be table');

renderScannerView('testContainer', filtered.slice(0, 5), 'cards');
const explicitCardsHtml = mockElements.get('testContainer').innerHTML;
assert(explicitCardsHtml.includes('strategy-cards-grid'), 'renderScannerView with "cards" must render grid');

console.log('  ✅ renderScannerView correctly defaults to table format while supporting card format switch.');

// 6. Test Midcap & Smallcap Coverage and Filtering
console.log('▶ Step 6: Verifying Midcap and Smallcap universe coverage & cap filtering...');
const usMidIndices = OPTION_UNIVERSE.filter(a => a.market === 'US' && a.type === 'INDEX' && a.cap === 'MID');
const usSmallIndices = OPTION_UNIVERSE.filter(a => a.market === 'US' && a.type === 'INDEX' && a.cap === 'SMALL');
const usMidStocks = OPTION_UNIVERSE.filter(a => a.market === 'US' && a.type === 'STOCK' && a.cap === 'MID');
const usSmallStocks = OPTION_UNIVERSE.filter(a => a.market === 'US' && a.type === 'STOCK' && a.cap === 'SMALL');

const inMidIndices = OPTION_UNIVERSE.filter(a => a.market === 'IN' && a.type === 'INDEX' && a.cap === 'MID');
const inSmallIndices = OPTION_UNIVERSE.filter(a => a.market === 'IN' && a.type === 'INDEX' && a.cap === 'SMALL');
const inMidStocks = OPTION_UNIVERSE.filter(a => a.market === 'IN' && a.type === 'STOCK' && a.cap === 'MID');
const inSmallStocks = OPTION_UNIVERSE.filter(a => a.market === 'IN' && a.type === 'STOCK' && a.cap === 'SMALL');

assert(usMidIndices.some(a => a.displayTicker === 'MDY'), 'US Midcap Index MDY must be present');
assert(usSmallIndices.some(a => a.displayTicker === 'IWM' || a.displayTicker === 'IJR'), 'US Smallcap Index must be present');
assert(usMidStocks.length >= 5, 'US Midcap stocks must be present');
assert(usSmallStocks.length >= 5, 'US Smallcap stocks must be present');

assert(inMidIndices.some(a => a.displayTicker === 'MIDCPNIFTY'), 'India Midcap Index MIDCPNIFTY must be present');
assert(inSmallIndices.some(a => a.displayTicker === 'NIFTY_SMALLCAP'), 'India Smallcap Index must be present');
assert(inMidStocks.length >= 5, 'India Midcap stocks must be present');
assert(inSmallStocks.length >= 5, 'India Smallcap stocks must be present');

console.log(`  Found ${usMidStocks.length} US Midcaps, ${usSmallStocks.length} US Smallcaps.`);
console.log(`  Found ${inMidStocks.length} India Midcaps, ${inSmallStocks.length} India Smallcaps.`);

// Test cap-based strategy filtering
const midStrats = filterStrategies(strategies, { cap: 'MID' });
const smallStrats = filterStrategies(strategies, { cap: 'SMALL' });
const midSmallStrats = filterStrategies(strategies, { cap: 'MID_SMALL' });

assert(midStrats.length > 0, 'Must generate Midcap strategies');
assert(smallStrats.length > 0, 'Must generate Smallcap strategies');
assert.strictEqual(midSmallStrats.length, midStrats.length + smallStrats.length, 'MID_SMALL must combine MID and SMALL');

// Verify cap badges in HTML render
renderScannerTable('testContainer', midStrats.slice(0, 3));
const midHtml = mockElements.get('testContainer').innerHTML;
assert(midHtml.includes('badge-cap-mid'), 'Table HTML must display badge-cap-mid for midcaps');

renderScannerCards('testContainer', smallStrats.slice(0, 3));
const smallCardsHtml = mockElements.get('testContainer').innerHTML;
assert(smallCardsHtml.includes('badge-cap-small'), 'Cards HTML must display badge-cap-small for smallcaps');

console.log('  ✅ Midcap & Smallcap stocks/indices verified, filterable, and badge-rendered.');

console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
