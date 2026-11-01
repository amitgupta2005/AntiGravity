import { IPO_UNIVERSE } from './src/data/ipoUniverse.js';
import { IpoRadarView } from './src/components/ipoRadarView.js';
import { GmpTrackerView } from './src/components/gmpTrackerView.js';
import { RedFlagScanner } from './src/components/redFlagScanner.js';
import { IpoCustomAnalyzer } from './src/components/ipoCustomAnalyzer.js';
import { openIpoDetailModal } from './src/components/ipoDetailReport.js';
import { MarketDataFeed } from './src/data/marketDataFeed.js';
import { getIstDateString, getIstTimeString } from './src/utils/dateUtils.js';

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
  if (radar.evaluatedList.length !== IPO_UNIVERSE.length) throw new Error('Evaluated count mismatch: ' + radar.evaluatedList.length);
});

assert('Jio Platforms listed status verification (Listed today Oct 28, 2026)', () => {
  const radar = new IpoRadarView({ containerId: 'tab-radar', universe: IPO_UNIVERSE });
  
  // Verify in LISTED tab
  radar.statusFilter = 'LISTED';
  const listedItems = radar.getFilteredData();
  const jioListed = listedItems.find(i => i.id === 'JIO-PLATFORMS' || i.ticker === 'JIO');
  if (!jioListed) throw new Error('Jio Platforms not found in LISTED filter!');
  if (jioListed.status !== 'LISTED') throw new Error('Jio status is not LISTED: ' + jioListed.status);

  // Verify NOT in CLOSED tab
  radar.statusFilter = 'CLOSED';
  const closedItems = radar.getFilteredData();
  const jioClosed = closedItems.find(i => i.id === 'JIO-PLATFORMS' || i.ticker === 'JIO');
  if (jioClosed) throw new Error('Jio Platforms is still showing in CLOSED filter!');
});

assert('Radar View separate tabs: Mainboard vs SME segmentation', () => {
  const radar = new IpoRadarView({ containerId: 'tab-radar', universe: IPO_UNIVERSE });
  
  // 1. Mainboard Segment
  radar.marketFilter = 'IN_MAINBOARD';
  radar.statusFilter = 'ALL';
  const mainboardItems = radar.getFilteredData();
  if (mainboardItems.length === 0) throw new Error('No Mainboard IPOs found');
  if (mainboardItems.some(i => i.tier !== 'MAINBOARD')) throw new Error('Found non-mainboard item in Mainboard filter');

  // 2. SME Segment
  radar.marketFilter = 'IN_SME';
  radar.statusFilter = 'ALL';
  const smeItems = radar.getFilteredData();
  if (smeItems.length === 0) throw new Error('No SME IPOs found');
  if (smeItems.some(i => i.tier !== 'SME')) throw new Error('Found non-SME item in SME filter');

  // 3. SME Open IPOs
  radar.statusFilter = 'ONGOING';
  const openSme = radar.getFilteredData();
  if (openSme.length < 3) throw new Error('Expected at least 3 open SME IPOs, got ' + openSme.length);
  const maxwell = openSme.find(i => i.id === 'MAXWELL-ENGG' || i.ticker === 'MAXWELL');
  if (!maxwell) throw new Error('Maxwell Engineering not found in open SME IPOs');
});

assert('BLS Polymers status verification: strictly CLOSED / ALLOTMENT, NOT UPCOMING', () => {
  const radar = new IpoRadarView({ containerId: 'tab-radar', universe: IPO_UNIVERSE });
  
  // Verify in CLOSED / ALLOTMENT filter
  radar.statusFilter = 'CLOSED';
  const closedItems = radar.getFilteredData();
  const blsClosed = closedItems.find(i => i.id === 'BLS-POLYMERS' || i.ticker === 'BLSPOLY');
  if (!blsClosed) throw new Error('BLS Polymers not found in CLOSED filter!');
  if (blsClosed.status !== 'CLOSED') throw new Error('BLS Polymers status is not CLOSED: ' + blsClosed.status);

  // Verify NOT in UPCOMING filter
  radar.statusFilter = 'UPCOMING';
  const upcomingItems = radar.getFilteredData();
  const blsUpcoming = upcomingItems.find(i => i.id === 'BLS-POLYMERS' || i.ticker === 'BLSPOLY');
  if (blsUpcoming) throw new Error('BLS Polymers is incorrectly showing in UPCOMING filter!');

  // Verify NOT in ONGOING filter
  radar.statusFilter = 'ONGOING';
  const ongoingItems = radar.getFilteredData();
  const blsOngoing = ongoingItems.find(i => i.id === 'BLS-POLYMERS' || i.ticker === 'BLSPOLY');
  if (blsOngoing) throw new Error('BLS Polymers is incorrectly showing in ONGOING filter!');
});

assert('Danish Power, Godavari Biorefineries & United Heat Transfer listed status verification', () => {
  const radar = new IpoRadarView({ containerId: 'tab-radar', universe: IPO_UNIVERSE });
  radar.statusFilter = 'LISTED';
  const listedItems = radar.getFilteredData();
  const danish = listedItems.find(i => i.id === 'DANISH-POWER' || i.ticker === 'DANISH');
  if (!danish) throw new Error('Danish Power not found in LISTED filter');
  const godavari = listedItems.find(i => i.id === 'GODAVARI-BIO' || i.ticker === 'GODAVARI');
  if (!godavari) throw new Error('Godavari Biorefineries not found in LISTED filter');
  const unitedHeat = listedItems.find(i => i.id === 'UNITED-HEAT' || i.ticker === 'UNITEDHEAT');
  if (!unitedHeat) throw new Error('United Heat Transfer not found in LISTED filter');
  if (unitedHeat.status !== 'LISTED') throw new Error('United Heat Transfer status is not LISTED');

  // Verify that November 2024 IPOs are correctly categorized as LISTED
  const verifiedListedStocks = ['SWIGGY', 'SAGILITY', 'ACMESOLAR', 'NIVABUPA', 'BLACKBUCK', 'NTPCGREEN'];
  for (const ticker of verifiedListedStocks) {
    const stock = listedItems.find(i => i.ticker === ticker);
    if (!stock) throw new Error(`Verified listed stock ${ticker} not found in LISTED filter`);
    if (stock.status !== 'LISTED') throw new Error(`Stock ${ticker} status should be LISTED, got ${stock.status}`);
  }
});

assert('Upcoming Pipeline verification: all stocks are strictly upcoming, non-listed', () => {
  const radar = new IpoRadarView({ containerId: 'tab-radar', universe: IPO_UNIVERSE });
  radar.statusFilter = 'UPCOMING';
  const upcomingItems = radar.getFilteredData();
  
  // Verify already listed stocks are strictly NOT in Upcoming
  const listedTickers = ['SWIGGY', 'SAGILITY', 'ACMESOLAR', 'NIVABUPA', 'BLACKBUCK', 'NTPCGREEN', 'UNITEDHEAT', 'SFCENV', 'MKSONS', 'BLSPOLY'];
  for (const t of listedTickers) {
    if (upcomingItems.find(i => i.ticker === t)) {
      throw new Error(`Listed stock ${t} is incorrectly appearing in UPCOMING filter!`);
    }
  }

  // Verify authentic Chittorgarh approved upcoming unlisted IPO pipeline is present
  const requiredUpcoming = ['ATOMBERG', 'AVANSE', 'PUNJABCARB', 'HEROFIN', 'HDBFS', 'GNIINFRA', 'VEDANTPOLY', 'KAMSONS', 'COOKWELL'];
  for (const t of requiredUpcoming) {
    const item = upcomingItems.find(i => i.ticker === t);
    if (!item) {
      throw new Error(`Expected Chittorgarh approved upcoming IPO ${t} not found in UPCOMING filter`);
    }
  }

  // Test Mainboard Upcoming specifically: zero listed stocks, only Chittorgarh SEBI Approved pipeline
  radar.marketFilter = 'IN_MAINBOARD';
  const mainboardUpcoming = radar.getFilteredData();
  for (const item of mainboardUpcoming) {
    if (listedTickers.includes(item.ticker)) {
      throw new Error(`Mainboard Upcoming list incorrectly contains listed stock: ${item.ticker}`);
    }
  }
  const expectedMainboardUpcoming = ['ATOMBERG', 'AVANSE', 'PUNJABCARB', 'HEROFIN', 'HDBFS', 'GNIINFRA'];
  for (const t of expectedMainboardUpcoming) {
    const found = mainboardUpcoming.find(i => i.ticker === t);
    if (!found) {
      throw new Error(`Expected upcoming Mainboard IPO ${t} not found in Mainboard Upcoming filter`);
    }
    if (!found.statusLabel.includes('SEBI Approved')) {
      throw new Error(`Expected Mainboard IPO ${t} to have 'SEBI Approved' status label, got ${found.statusLabel}`);
    }
  }

  // Test SME Upcoming specifically: zero listed stocks, only Chittorgarh Exchange Approved pipeline
  radar.marketFilter = 'IN_SME';
  const smeUpcoming = radar.getFilteredData();
  const expectedSmeUpcoming = ['VEDANTPOLY', 'KAMSONS', 'COOKWELL'];
  for (const t of expectedSmeUpcoming) {
    const found = smeUpcoming.find(i => i.ticker === t);
    if (!found) {
      throw new Error(`Expected upcoming SME IPO ${t} not found in SME Upcoming filter`);
    }
    if (!found.statusLabel.includes('Exchange Approved')) {
      throw new Error(`Expected SME IPO ${t} to have 'Exchange Approved' status label, got ${found.statusLabel}`);
    }
  }
});

assert('Indian Standard Time (IST - Asia/Kolkata) date utility validation', () => {
  import('./src/utils/dateUtils.js').then(({ getIstDateString, getIstTimeString }) => {
    const istDate = getIstDateString();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(istDate)) throw new Error('Invalid IST date format: ' + istDate);
    const istTime = getIstTimeString();
    if (!istTime.includes('IST')) throw new Error('IST marker missing from time string: ' + istTime);
  });
});

assert('Strict UPCOMING IPO rule: ONLY IPOs where openDate > Today (IST)', () => {
  const todayStr = getIstDateString();
  const radar = new IpoRadarView({ containerId: 'tab-radar', universe: IPO_UNIVERSE });
  radar.statusFilter = 'UPCOMING';
  const upcomingItems = radar.getFilteredData();
  
  if (upcomingItems.length === 0) throw new Error('Expected upcoming IPOs');
  for (const item of upcomingItems) {
    const orig = IPO_UNIVERSE.find(u => u.ticker === item.ticker) || {};
    const openDate = orig.issueDetails?.openDate || orig.openDate;
    if (!openDate || openDate <= todayStr) {
      throw new Error(`IPO ${item.ticker} in UPCOMING has openDate "${openDate}" which is not > Today "${todayStr}"`);
    }
  }
});

assert('Strict CLOSED IPO rule: ONLY non-listed IPOs where closeDate < Today (IST)', () => {
  const todayStr = getIstDateString();
  const radar = new IpoRadarView({ containerId: 'tab-radar', universe: IPO_UNIVERSE });
  radar.statusFilter = 'CLOSED';
  const closedItems = radar.getFilteredData();
  
  if (closedItems.length === 0) throw new Error('Expected closed IPOs');
  for (const item of closedItems) {
    const orig = IPO_UNIVERSE.find(u => u.ticker === item.ticker) || {};
    const closeDate = orig.issueDetails?.closeDate || orig.closeDate;
    const listDate = orig.issueDetails?.listingDate || orig.listingDate;
    if (!closeDate || closeDate >= todayStr) {
      throw new Error(`IPO ${item.ticker} in CLOSED has closeDate "${closeDate}" which is not < Today "${todayStr}"`);
    }
    if (listDate && listDate <= todayStr) {
      throw new Error(`IPO ${item.ticker} in CLOSED is already listed on "${listDate}" (Today: "${todayStr}")`);
    }
  }
});

assert('Allotment Probability Logic: Open Apply IPOs determine highest probability category (Retail, sHNI, or bHNI)', () => {
  const radar = new IpoRadarView({ containerId: 'tab-radar', universe: IPO_UNIVERSE });
  radar.statusFilter = 'ONGOING';
  const ongoingItems = radar.getFilteredData();
  const applyOngoing = ongoingItems.filter(i => i.verdict === 'APPLY');
  
  if (applyOngoing.length === 0) throw new Error('Expected at least 1 open Apply IPO');
  for (const item of applyOngoing) {
    const strat = item.allotmentStrategy;
    if (!strat) throw new Error(`IPO ${item.ticker} is open & APPLY but missing allotmentStrategy`);
    if (!['Retail', 'sHNI', 'bHNI'].includes(strat.bestCategory)) {
      throw new Error(`Invalid bestCategory "${strat.bestCategory}" for ${item.ticker}`);
    }
    if (typeof strat.bestProbabilityPct !== 'number' || strat.bestProbabilityPct <= 0) {
      throw new Error(`Invalid bestProbabilityPct "${strat.bestProbabilityPct}" for ${item.ticker}`);
    }
    if (!strat.breakdown?.retail || !strat.breakdown?.sHNI || !strat.breakdown?.bHNI) {
      throw new Error(`Missing 3-tier category breakdown for ${item.ticker}`);
    }
  }

  // Verify Table View HTML renders Best Odds badge
  const tableHtml = radar.renderTableView(applyOngoing);
  if (!tableHtml.includes('allotment-best-pill')) {
    throw new Error('Table view did not render allotment-best-pill for open Apply IPOs');
  }

  // Verify Card Grid View HTML renders Allotment Optimizer card
  const gridHtml = radar.renderGridView(applyOngoing);
  if (!gridHtml.includes('card-allotment-optimizer')) {
    throw new Error('Grid view did not render card-allotment-optimizer for open Apply IPOs');
  }
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
    if (items.length !== IPO_UNIVERSE.length) throw new Error('Sorting lost items: ' + sort);
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
  ['ALL', 'ONGOING', 'UPCOMING', 'LISTED', 'MAINBOARD', 'SME'].forEach(f => {
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

// 5. Open Dossier Modal for all IPOs in Universe
assert(`Open Dossier Modal for all ${IPO_UNIVERSE.length} IPOs in Universe`, () => {
  for (const ipo of IPO_UNIVERSE) {
    openIpoDetailModal(ipo);
  }
});

console.log(`\nResults: ${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
