/**
 * Test Suite: Auto-Refresh Feature for Option Trading Picker
 * Verifies:
 * 1. Default interval of 5s
 * 2. Supported intervals: 5s, 10s, 15s, and 0s (Off)
 * 3. LocalStorage persistence and fallback
 * 4. Toggle auto-refresh behavior
 * 5. Strict filter preservation during auto-refresh
 * 6. HTML elements and CSS presence
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Starting Auto-Refresh Verification Test Suite...\n');

// 1. Verify HTML Structure
console.log('Test 1: Validating HTML Structure in index.html...');
const htmlPath = path.join(__dirname, 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

assert(htmlContent.includes('id="autoRefreshWidget"'), 'Missing #autoRefreshWidget in index.html');
assert(htmlContent.includes('id="btnToggleAutoRefresh"'), 'Missing #btnToggleAutoRefresh in index.html');
assert(htmlContent.includes('id="autoRefreshBadgeText"'), 'Missing #autoRefreshBadgeText in index.html');
assert(htmlContent.includes('id="autoRefreshSelect"'), 'Missing #autoRefreshSelect in index.html');
assert(htmlContent.includes('<option value="5" selected>5s (Default)</option>'), 'Missing 5s (Default) option in #autoRefreshSelect');
assert(htmlContent.includes('<option value="10">10s</option>'), 'Missing 10s option in #autoRefreshSelect');
assert(htmlContent.includes('<option value="15">15s</option>'), 'Missing 15s option in #autoRefreshSelect');
assert(htmlContent.includes('<option value="0">Off</option>'), 'Missing Off option in #autoRefreshSelect');
assert(htmlContent.includes('id="scannerAutoStatus"'), 'Missing #scannerAutoStatus ribbon element');
assert(htmlContent.includes('id="scannerAutoRefreshLabel"'), 'Missing #scannerAutoRefreshLabel');
console.log('✅ Test 1 Passed: index.html contains all auto-refresh elements with 5s default, 10s, 15s, Off.');

// 2. Verify CSS Rules
console.log('\nTest 2: Validating CSS Rules in src/style.css...');
const cssPath = path.join(__dirname, 'src', 'style.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(cssContent.includes('.auto-refresh-widget'), 'Missing .auto-refresh-widget CSS');
assert(cssContent.includes('.auto-refresh-badge'), 'Missing .auto-refresh-badge CSS');
assert(cssContent.includes('.auto-pulse-dot'), 'Missing .auto-pulse-dot CSS');
assert(cssContent.includes('@keyframes auto-pulse-anim'), 'Missing @keyframes auto-pulse-anim CSS');
assert(cssContent.includes('.auto-refresh-select'), 'Missing .auto-refresh-select CSS');
assert(cssContent.includes('.auto-refresh-badge.paused'), 'Missing .auto-refresh-badge.paused CSS');
assert(cssContent.includes('.auto-status-pill'), 'Missing .auto-status-pill CSS');
console.log('✅ Test 2 Passed: src/style.css contains complete styling for widget, pulse animation, and status pill.');

// 3. Mock DOM & LocalStorage Environment to Test Controller Logic
console.log('\nTest 3: Testing Controller Logic & Filter Preservation in src/main.js...');

class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

class MockElement {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
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
    this.textContent = '';
    this.innerHTML = '';
    this.title = '';
    this.value = '';
    this.listeners = {};
    this.children = [];
  }
  appendChild(child) {
    this.children.push(child);
  }
  remove() {}
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  dispatchEvent(event) {
    if (this.listeners[event.type]) {
      this.listeners[event.type].forEach(fn => fn(event));
    }
  }
  querySelector(sel) {
    if (sel === '.auto-status-pill') return new MockElement('mockPill');
    return null;
  }
  querySelectorAll() {
    return [];
  }
}

// Setup Global Browser Mocks
globalThis.localStorage = new MockLocalStorage();
const mockBody = new MockElement('body');
mockBody.appendChild = () => {};
globalThis.document = {
  getElementById: (id) => new MockElement(id),
  createElement: (tag) => new MockElement(tag, tag),
  body: mockBody,
  querySelectorAll: () => [],
  addEventListener: () => {},
  hidden: false
};
globalThis.window = {
  addEventListener: () => {},
  scrollY: 0
};

// Import main module functions
const mainModule = await import('./src/main.js');
const { state, setAutoRefreshInterval, toggleAutoRefresh, getSavedAutoRefreshInterval, refreshMarketData } = mainModule;

// Test default interval
localStorage.clear();
assert.strictEqual(getSavedAutoRefreshInterval(), 5, 'Default interval must be 5 seconds when no storage exists');
console.log('✅ Subtest 3.1: Default interval defaults to 5s.');

// Test storage reading for 10, 15, and 0
localStorage.setItem('opt_auto_refresh', '10');
assert.strictEqual(getSavedAutoRefreshInterval(), 10, 'Must read 10s from storage');

localStorage.setItem('opt_auto_refresh', '15');
assert.strictEqual(getSavedAutoRefreshInterval(), 15, 'Must read 15s from storage');

localStorage.setItem('opt_auto_refresh', '0');
assert.strictEqual(getSavedAutoRefreshInterval(), 0, 'Must read 0s (Off) from storage');

// Test fallback for invalid storage values
localStorage.setItem('opt_auto_refresh', '999');
assert.strictEqual(getSavedAutoRefreshInterval(), 5, 'Must fallback to 5s for unknown interval values');
console.log('✅ Subtest 3.2: LocalStorage retrieval and 5s fallback validated.');

// Test setAutoRefreshInterval
setAutoRefreshInterval(10, false);
assert.strictEqual(localStorage.getItem('opt_auto_refresh'), '10', 'LocalStorage should be updated to 10');

setAutoRefreshInterval(15, false);
assert.strictEqual(localStorage.getItem('opt_auto_refresh'), '15', 'LocalStorage should be updated to 15');

setAutoRefreshInterval(0, false);
assert.strictEqual(localStorage.getItem('opt_auto_refresh'), '0', 'LocalStorage should be updated to 0');
console.log('✅ Subtest 3.3: setAutoRefreshInterval updates interval and storage.');

// Test toggleAutoRefresh
toggleAutoRefresh(); // was 0, should become 5 (or last active)
assert(Number(localStorage.getItem('opt_auto_refresh')) > 0, 'Toggling from 0 should turn Auto-Refresh ON');

toggleAutoRefresh(); // now > 0, should become 0 (Off)
assert.strictEqual(localStorage.getItem('opt_auto_refresh'), '0', 'Toggling from ON should switch Auto-Refresh OFF');
console.log('✅ Subtest 3.4: toggleAutoRefresh switches between ON and OFF smoothly.');

// 4. Strict Filter Preservation Test during Market Data Refresh
console.log('\nTest 4: Strict Filter Preservation during Market Refresh...');

// Set specific user filters
state.filters.market = 'IN';
state.filters.cap = 'LARGE';
state.filters.category = 'THETA_DECAY';
state.filters.sentiment = 'Bullish';
state.filters.minPop = 70;
state.filters.ivRank = 'HIGH';
state.filters.riskProfile = 'CONSERVATIVE';
state.filters.searchQuery = 'RELIANCE';
state.filters.sortBy = 'POP_DESC';
state.sortColumn = 'pop';
state.sortDirection = 'desc';

// Snapshot filters before refresh
const filtersBefore = JSON.stringify(state.filters);
const sortColBefore = state.sortColumn;
const sortDirBefore = state.sortDirection;

// Execute refreshMarketData(true) (simulating auto-refresh trigger)
await refreshMarketData(true);

// Verify filters after refresh
const filtersAfter = JSON.stringify(state.filters);
assert.strictEqual(filtersBefore, filtersAfter, 'User filters MUST NOT be modified or reset by refreshMarketData');
assert.strictEqual(state.sortColumn, sortColBefore, 'Sort column must be preserved');
assert.strictEqual(state.sortDirection, sortDirBefore, 'Sort direction must be preserved');
assert.strictEqual(state.filters.market, 'IN', 'Market filter preserved');
assert.strictEqual(state.filters.cap, 'LARGE', 'Cap filter preserved');
assert.strictEqual(state.filters.category, 'THETA_DECAY', 'Category filter preserved');
assert.strictEqual(state.filters.sentiment, 'Bullish', 'Sentiment filter preserved');
assert.strictEqual(state.filters.searchQuery, 'RELIANCE', 'Search query preserved');

console.log('✅ Test 4 Passed: All user filters and sort settings strictly preserved during auto-refresh.');

console.log('\n🎉 ALL AUTO-REFRESH TESTS PASSED SUCCESSFULLY! (6/6 Checks)\n');
process.exit(0);
