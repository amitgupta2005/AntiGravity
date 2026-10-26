import { IPO_UNIVERSE } from './src/data/ipoUniverse.js';
import { IpoRadarView } from './src/components/ipoRadarView.js';
import { GmpTrackerView } from './src/components/gmpTrackerView.js';
import { RedFlagScanner } from './src/components/redFlagScanner.js';
import { IpoCustomAnalyzer } from './src/components/ipoCustomAnalyzer.js';
import { openIpoDetailModal } from './src/components/ipoDetailReport.js';
import { MarketDataFeed } from './src/data/marketDataFeed.js';

// Setup Mock DOM
const createdElements = [];
globalThis.document = {
  getElementById: (id) => ({
    id,
    innerHTML: '',
    style: {},
    classList: { add: () => {}, remove: () => {} },
    querySelector: () => ({ addEventListener: () => {} }),
    querySelectorAll: () => [],
    addEventListener: () => {},
    appendChild: () => {},
    remove: () => {}
  }),
  createElement: (tag) => {
    const el = {
      tagName: tag,
      id: '',
      className: '',
      innerHTML: '',
      style: {},
      querySelector: (sel) => ({
        addEventListener: () => {},
        classList: { add: () => {}, remove: () => {} }
      }),
      querySelectorAll: (sel) => [],
      addEventListener: () => {},
      remove: () => {}
    };
    createdElements.push(el);
    return el;
  },
  body: {
    appendChild: (el) => {}
  }
};
globalThis.window = globalThis;
Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText: () => Promise.resolve() } },
  configurable: true
});

console.log('========================================================');
console.log('🧪 TESTING FULL APPLICATION NAVIGATION & BROWSING SUITE');
console.log('========================================================\n');

let pass = 0;
let fail = 0;

function assert(desc, fn) {
  try {
    fn();
    console.log(`[PASS] ${desc}`);
    pass++;
  } catch (err) {
    console.error(`[FAIL] ${desc}:`, err.message);
    fail++;
  }
}

// 1. Radar View Test
assert('Radar View initializes and renders default table', () => {
  const radar = new IpoRadarView({
    containerId: 'tab-radar',
    universe: IPO_UNIVERSE,
    marketFeed: MarketDataFeed
  });
  radar.render();
  if (radar.evaluatedList.length !== 26) throw new Error('Evaluated count mismatch: ' + radar.evaluatedList.length);
});

assert('Radar View filters: Status (ONGOING, UPCOMING, CLOSED, LISTED)', () => {
  const radar = new IpoRadarView({ containerId: 'tab-radar', universe: IPO_UNIVERSE });
  ['ALL', 'ONGOING', 'UPCOMING', 'CLOSED', 'LISTED'].forEach(st => {
    radar.statusFilter = st;
    const items = radar.getFilteredData();
    if (!Array.isArray(items)) throw new Error('Failed for status: ' + st);
  });
});

assert('Radar View filters: Market (ALL, IN_MAINBOARD, IN_SME, US)', () => {
  const radar = new IpoRadarView({ containerId: 'tab-radar', universe: IPO_UNIVERSE });
  ['ALL', 'IN_MAINBOARD', 'IN_SME', 'US'].forEach(m => {
    radar.marketFilter = m;
    const items = radar.getFilteredData();
    if (!Array.isArray(items)) throw new Error('Failed for market: ' + m);
  });
});

assert('Radar View filters: Verdict (ALL, APPLY, AVOID, WATCH)', () => {
  const radar = new IpoRadarView({ containerId: 'tab-radar', universe: IPO_UNIVERSE });
  ['ALL', 'APPLY', 'AVOID', 'WATCH'].forEach(v => {
    radar.verdictFilter = v;
    const items = radar.getFilteredData();
    if (!Array.isArray(items)) throw new Error('Failed for verdict: ' + v);
  });
});

assert('Radar View sorting: score, gmp, size, cagr', () => {
  const radar = new IpoRadarView({ containerId: 'tab-radar', universe: IPO_UNIVERSE });
  ['score', 'gmp', 'size', 'cagr'].forEach(sort => {
    radar.sortBy = sort;
    const items = radar.getFilteredData();
    if (items.length !== 26) throw new Error('Sorting lost items: ' + sort);
  });
});

assert('Radar View search omnibar filter', () => {
  const radar = new IpoRadarView({ containerId: 'tab-radar', universe: IPO_UNIVERSE });
  radar.searchQuery = 'solar';
  const items = radar.getFilteredData();
  if (items.length === 0) throw new Error('Search failed for "solar"');
});

assert('Radar View card grid view rendering', () => {
  const radar = new IpoRadarView({ containerId: 'tab-radar', universe: IPO_UNIVERSE });
  radar.viewMode = 'grid';
  radar.render();
});

// 2. GMP View Test
assert('GMP View initializes, renders and filters', () => {
  const gmp = new GmpTrackerView({
    containerId: 'tab-gmp',
    universe: IPO_UNIVERSE,
    marketFeed: MarketDataFeed
  });
  gmp.render();
  ['ALL', 'ONGOING', 'UPCOMING', 'LISTED'].forEach(f => {
    gmp.filterStatus = f;
    gmp.render();
  });
});

// 3. Scanner View Test
assert('Red Flag Scanner initializes, renders and filters', () => {
  const scanner = new RedFlagScanner({
    containerId: 'tab-scanner',
    universe: IPO_UNIVERSE,
    marketFeed: MarketDataFeed
  });
  scanner.render();
  ['ALL', 'CRITICAL', 'MARGIN_SPIKE', 'HIGH_OFS', 'LOW_FLOAT'].forEach(f => {
    scanner.activeFilter = f;
    scanner.render();
  });
});

// 4. Custom Analyzer View Test
assert('Custom Analyzer initializes, renders and evaluates presets', () => {
  let customEvaluated = null;
  const analyzer = new IpoCustomAnalyzer({
    containerId: 'tab-analyzer',
    marketFeed: MarketDataFeed,
    onEvaluated: (ipo, res) => { customEvaluated = ipo; }
  });
  analyzer.render();
  // Test preset loading
  analyzer.applyPreset('premier-energies');
  analyzer.applyPreset('sme-flagged');
  analyzer.applyPreset('us-ai');
});

// 5. Open Dossier Modal for all 26 IPOs
assert('Open Dossier Modal for all 26 IPOs in Universe', () => {
  for (const ipo of IPO_UNIVERSE) {
    openIpoDetailModal(ipo);
  }
});

console.log(`\nResults: ${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
