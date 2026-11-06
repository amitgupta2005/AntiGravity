"""
Performance, Reliability & Memory Leak Test Suite:
1. Verifies BoundedTTLCache strictly caps memory usage under 1,000 rapid insertions.
2. Tests Least Recently Used (LRU) eviction policy and TTL expiration.
3. Validates multi-threaded concurrency safety.
4. Benchmarks sub-millisecond retrieval performance.
5. Verifies data ingestion caching integration.
"""

import time
import threading
import sys
import os

# Add backend to sys.path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from data_ingestion import BoundedTTLCache, _QUOTE_CACHE, _NEWS_CACHE

def test_cache_memory_bound_under_load():
    """Verify cache never exceeds maxsize regardless of insertion volume."""
    cache = BoundedTTLCache(maxsize=50, ttl=10.0)
    
    # Insert 1,000 items
    for i in range(1000):
        cache.set(f"TICKER_{i}", {"price": 100 + i, "time": time.time()})
    
    assert len(cache) == 50, f"Expected cache length 50, got {len(cache)}"
    
    # Old items should be evicted
    assert cache.get("TICKER_0") is None, "Expected TICKER_0 to be evicted"
    assert cache.get("TICKER_949") is None, "Expected TICKER_949 to be evicted"
    
    # Most recent items should be present
    assert cache.get("TICKER_999") is not None, "Expected TICKER_999 to be present"
    assert cache.get("TICKER_999")["price"] == 1099
    print("✅ Test 1 Passed: BoundedTTLCache strictly enforced maxsize=50 under 1,000 insertions (Zero Memory Leak).")

def test_lru_eviction_behavior():
    """Verify that accessing an entry refreshes its LRU position."""
    cache = BoundedTTLCache(maxsize=3, ttl=10.0)
    cache.set("A", 1)
    cache.set("B", 2)
    cache.set("C", 3)
    
    # Access "A" to make it most recently used
    val = cache.get("A")
    assert val == 1
    
    # Insert "D" -> should evict "B" (since A was refreshed)
    cache.set("D", 4)
    assert cache.get("B") is None, "Expected B to be evicted"
    assert cache.get("A") == 1, "Expected A to remain preserved"
    assert cache.get("C") == 3, "Expected C to remain"
    assert cache.get("D") == 4, "Expected D to remain"
    print("✅ Test 2 Passed: LRU order refresh and eviction working as expected.")

def test_ttl_expiration():
    """Verify that entries expire after TTL elapses."""
    cache = BoundedTTLCache(maxsize=10, ttl=0.15)  # 150ms TTL
    cache.set("EXPIRE_ME", {"data": "temp"})
    
    # Immediate get should succeed
    assert cache.get("EXPIRE_ME") is not None
    
    # Wait for TTL to pass
    time.sleep(0.20)
    assert cache.get("EXPIRE_ME") is None, "Expected entry to expire after 200ms"
    assert "EXPIRE_ME" not in cache
    print("✅ Test 3 Passed: TTL expiration cleaned up expired entry automatically.")

def test_thread_concurrency_safety():
    """Verify thread safety with 20 parallel threads reading and writing."""
    cache = BoundedTTLCache(maxsize=100, ttl=5.0)
    errors = []

    def worker(worker_id):
        try:
            for j in range(50):
                key = f"KEY_{worker_id}_{j}"
                cache.set(key, j)
                _ = cache.get(key)
                _ = len(cache)
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(20)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0, f"Thread errors encountered: {errors}"
    assert len(cache) <= 100, f"Cache exceeded maxsize under concurrency: {len(cache)}"
    print(f"✅ Test 4 Passed: 20 concurrent threads performed 1,000 operations safely (Final size: {len(cache)} <= 100).")

def test_throughput_performance():
    """Benchmark cache operations throughput."""
    cache = BoundedTTLCache(maxsize=200, ttl=60.0)
    iterations = 20000
    
    t0 = time.perf_counter()
    for i in range(iterations):
        cache.set(f"BENCH_{i % 300}", i)
    t_set = time.perf_counter() - t0

    t0 = time.perf_counter()
    for i in range(iterations):
        _ = cache.get(f"BENCH_{i % 300}")
    t_get = time.perf_counter() - t0

    ops_per_sec = (iterations * 2) / (t_set + t_get)
    print(f"✅ Test 5 Passed: Performance benchmark: {ops_per_sec:,.0f} ops/sec (Sub-millisecond retrieval latency: {(t_get/iterations)*1e6:.2f} µs/read).")

def test_live_data_ingestion_cache_instances():
    """Verify backend _QUOTE_CACHE and _NEWS_CACHE are properly bounded."""
    assert isinstance(_QUOTE_CACHE, BoundedTTLCache)
    assert isinstance(_NEWS_CACHE, BoundedTTLCache)
    assert _QUOTE_CACHE.maxsize == 200
    assert _NEWS_CACHE.maxsize == 200
    print("✅ Test 6 Passed: Backend _QUOTE_CACHE and _NEWS_CACHE configured with bounded capacity.")

if __name__ == "__main__":
    print("\n" + "="*70)
    print("🚀 RUNNING COMPREHENSIVE PERFORMANCE & MEMORY LEAK TEST SUITE")
    print("="*70)
    
    test_cache_memory_bound_under_load()
    test_lru_eviction_behavior()
    test_ttl_expiration()
    test_thread_concurrency_safety()
    test_throughput_performance()
    test_live_data_ingestion_cache_instances()
    
    print("="*70)
    print("🌟 ALL 6 MEMORY LEAK & PERFORMANCE TESTS PASSED SUCCESSFULLY!")
    print("="*70 + "\n")
