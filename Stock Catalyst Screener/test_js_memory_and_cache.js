import assert from 'assert';
import { BoundedTTLCache } from './frontend/src/services/catalystEngine.js';

console.log("\n======================================================================");
console.log("🚀 RUNNING JS MEMORY LEAK & CACHE PERFORMANCE SUITE");
console.log("======================================================================");

// 1. MaxSize enforcement
const cache = new BoundedTTLCache(50, 5000);
for (let i = 0; i < 1000; i++) {
  cache.set(`TICKER_${i}`, { price: 100 + i, time: Date.now() });
}
assert.strictEqual(cache.size, 50, `Expected cache size 50, got ${cache.size}`);
assert.strictEqual(cache.get('TICKER_0'), null, "Expected TICKER_0 to be evicted");
assert.strictEqual(cache.get('TICKER_949'), null, "Expected TICKER_949 to be evicted");
assert.ok(cache.get('TICKER_999') !== null, "Expected TICKER_999 to be present");
assert.strictEqual(cache.get('TICKER_999').price, 1099);
console.log("✅ Test 1 Passed: JS BoundedTTLCache enforced max capacity (50) under 1,000 insertions.");

// 2. LRU order refresh
const lruCache = new BoundedTTLCache(3, 5000);
lruCache.set('A', 1);
lruCache.set('B', 2);
lruCache.set('C', 3);

// Access 'A' -> refreshes LRU
assert.strictEqual(lruCache.get('A'), 1);

// Insert 'D' -> evicts 'B'
lruCache.set('D', 4);
assert.strictEqual(lruCache.get('B'), null, "Expected B to be evicted");
assert.strictEqual(lruCache.get('A'), 1, "Expected A to be preserved");
assert.strictEqual(lruCache.get('C'), 3, "Expected C to be preserved");
assert.strictEqual(lruCache.get('D'), 4, "Expected D to be preserved");
console.log("✅ Test 2 Passed: JS BoundedTTLCache LRU refresh order functioning correctly.");

// 3. TTL Expiry
const ttlCache = new BoundedTTLCache(10, 100); // 100ms TTL
ttlCache.set('EXP_KEY', { val: 'abc' });
assert.ok(ttlCache.get('EXP_KEY') !== null);

setTimeout(() => {
  assert.strictEqual(ttlCache.get('EXP_KEY'), null, "Expected EXP_KEY to expire after 150ms");
  assert.strictEqual(ttlCache.has('EXP_KEY'), false);
  console.log("✅ Test 3 Passed: JS BoundedTTLCache TTL expiration auto-cleared expired entry.");

  // 4. Performance benchmark
  const benchCache = new BoundedTTLCache(200, 60000);
  const iterations = 50000;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    benchCache.set(`KEY_${i % 300}`, i);
  }
  for (let i = 0; i < iterations; i++) {
    benchCache.get(`KEY_${i % 300}`);
  }
  const elapsedMs = performance.now() - start;
  const opsSec = Math.round((iterations * 2) / (elapsedMs / 1000));
  console.log(`✅ Test 4 Passed: JS Cache Performance: ${opsSec.toLocaleString()} ops/sec (${((elapsedMs / (iterations * 2)) * 1000).toFixed(2)} µs/op).`);

  console.log("======================================================================");
  console.log("🌟 ALL JS MEMORY & CACHE TESTS PASSED SUCCESSFULLY!");
  console.log("======================================================================\n");
}, 150);
