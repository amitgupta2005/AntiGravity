import assert from 'assert';

console.log("\n======================================================================");
console.log("🚀 RUNNING HORIZONTAL SCROLL KEYBOARD NAVIGATION TEST SUITE");
console.log("======================================================================");

// Mock table container element
class MockTableContainer {
  constructor() {
    this.scrollLeft = 0;
    this.scrollWidth = 1600;
    this.clientWidth = 800;
  }

  scrollBy({ left, behavior }) {
    this.scrollLeft = Math.max(0, Math.min(this.scrollWidth - this.clientWidth, this.scrollLeft + left));
  }

  scrollTo({ left, behavior }) {
    this.scrollLeft = Math.max(0, Math.min(this.scrollWidth - this.clientWidth, left));
  }
}

const SCROLL_STEP = 200;

function createKeyboardNavigator(container) {
  return {
    handleKeyDown: (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        container.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        container.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
      } else if (e.key === 'Home') {
        e.preventDefault();
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else if (e.key === 'End') {
        e.preventDefault();
        container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
      }
    },
    handleGlobalKey: (e, activeElement, hasModal) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      if (activeElement) {
        const activeTag = (activeElement.tagName || '').toLowerCase();
        if (
          activeElement.isContentEditable ||
          activeTag === 'input' ||
          activeTag === 'textarea' ||
          activeTag === 'select'
        ) {
          return; // Do not intercept when typing in search input
        }
      }

      if (hasModal) return;

      e.preventDefault();
      const delta = e.key === 'ArrowLeft' ? -SCROLL_STEP : SCROLL_STEP;
      container.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };
}

const mockContainer = new MockTableContainer();
const nav = createKeyboardNavigator(mockContainer);

// Test 1: ArrowRight scrolls right by 200px
let prevented = false;
nav.handleKeyDown({ key: 'ArrowRight', preventDefault: () => { prevented = true; } });
assert.strictEqual(prevented, true, "ArrowRight must call preventDefault");
assert.strictEqual(mockContainer.scrollLeft, 200, `Expected scrollLeft 200, got ${mockContainer.scrollLeft}`);
console.log("✅ Test 1 Passed: ArrowRight scrolled table right to 200px.");

// Test 2: ArrowRight again -> 400px
prevented = false;
nav.handleKeyDown({ key: 'ArrowRight', preventDefault: () => { prevented = true; } });
assert.strictEqual(prevented, true);
assert.strictEqual(mockContainer.scrollLeft, 400, `Expected scrollLeft 400, got ${mockContainer.scrollLeft}`);
console.log("✅ Test 2 Passed: Subsequent ArrowRight scrolled table right to 400px.");

// Test 3: ArrowLeft scrolls back to 200px
prevented = false;
nav.handleKeyDown({ key: 'ArrowLeft', preventDefault: () => { prevented = true; } });
assert.strictEqual(prevented, true);
assert.strictEqual(mockContainer.scrollLeft, 200, `Expected scrollLeft 200, got ${mockContainer.scrollLeft}`);
console.log("✅ Test 3 Passed: ArrowLeft scrolled table left back to 200px.");

// Test 4: End key scrolls to end of table
prevented = false;
nav.handleKeyDown({ key: 'End', preventDefault: () => { prevented = true; } });
assert.strictEqual(prevented, true);
assert.strictEqual(mockContainer.scrollLeft, 800, `Expected scrollLeft 800 (max), got ${mockContainer.scrollLeft}`);
console.log("✅ Test 4 Passed: End key scrolled table to the end (800px).");

// Test 5: Home key scrolls to 0
prevented = false;
nav.handleKeyDown({ key: 'Home', preventDefault: () => { prevented = true; } });
assert.strictEqual(prevented, true);
assert.strictEqual(mockContainer.scrollLeft, 0, `Expected scrollLeft 0, got ${mockContainer.scrollLeft}`);
console.log("✅ Test 5 Passed: Home key scrolled table back to start (0px).");

// Test 6: Global handler does not intercept when typing in search input
prevented = false;
nav.handleGlobalKey(
  { key: 'ArrowRight', preventDefault: () => { prevented = true; } },
  { tagName: 'INPUT' },
  false
);
assert.strictEqual(prevented, false, "Must NOT preventDefault when focused in input");
assert.strictEqual(mockContainer.scrollLeft, 0, "scrollLeft must not change when typing");
console.log("✅ Test 6 Passed: Search bar inputs are protected from arrow hijacking.");

// Test 7: Global handler scrolls table when outside input
prevented = false;
nav.handleGlobalKey(
  { key: 'ArrowRight', preventDefault: () => { prevented = true; } },
  { tagName: 'BODY' },
  false
);
assert.strictEqual(prevented, true);
assert.strictEqual(mockContainer.scrollLeft, 200);
console.log("✅ Test 7 Passed: Global arrow key scrolled table when outside inputs.");

console.log("======================================================================");
console.log("🌟 ALL 7 HORIZONTAL SCROLL TESTS PASSED SUCCESSFULLY!");
console.log("======================================================================\n");
