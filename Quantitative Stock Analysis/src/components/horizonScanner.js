/**
 * Quant Horizon Scanner Component
 * Multi-horizon recommendations for Stocks, ETFs, and Indices based on quantitative analysis.
 * Horizons:
 * - Short Term (1 Day to 6 Months)
 * - Medium Term (6 Months to 2 Years)
 * - Long Term (> 2 Years)
 * 
 * Supports Large Cap, Midcap, and Smallcap stocks across NSE India and US Markets.
 * Fully optimized to prevent memory leaks and DOM thrashing.
 */

import { 
  HORIZON_UNIVERSE, 
  HORIZONS, 
  ASSET_TYPES, 
  HORIZON_LABELS, 
  CAP_CATEGORIES, 
  CAP_CATEGORY_LABELS 
} from '../data/horizonUniverse.js';
import { generateHorizonRecommendations } from '../quant/horizonEngine.js';
import { fetchRealtimeHorizonUniverse } from '../services/yahooFinance.js';

let activeHorizonFilter = 'ALL';   // 'ALL' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM'
let activeAssetFilter = 'ALL';     // 'ALL' | 'STOCK' | 'ETF' | 'INDEX'
let activeMarketFilter = 'ALL';    // 'ALL' | 'IN' | 'US'
let activeCapFilter = 'ALL';       // 'ALL' | 'LARGE_CAP' | 'MID_CAP' | 'SMALL_CAP'
let activeConvictionFilter = 'ALL';// 'ALL' | 'STRONG_BUY' | 'BUY'
let activeSortCriteria = 'score';  // 'score' | 'upside' | 'cagr' | 'ticker'
let currentViewMode = 'cards';     // 'cards' | 'table'
let searchQuery = '';

let currentUniverse = [...HORIZON_UNIVERSE];
let cachedRecommendations = null;
let isRealtimeSyncing = false;
let lastSyncTimestamp = null;
let hasAutoSyncedRealtime = false;

// Memory leak protection: manage active timers
let searchDebounceTimer = null;
let activeToastTimeout = null;
let activeToastRemoveTimeout = null;

export function getRecommendations() {
  if (!cachedRecommendations) {
    cachedRecommendations = generateHorizonRecommendations(currentUniverse);
  }
  return cachedRecommendations;
}

/**
 * Fetch live market data (quotes, daily candles, dynamic 50-SMA, 14-RSI, dynamic valuation)
 * in controlled chunked batches and update recommendations in real-time.
 */
export async function syncHorizonScannerRealtime(containerId = 'horizonScannerContainer', onSelectAssetForModel, onSelectAssetForTechnicals) {
  if (isRealtimeSyncing) return;
  isRealtimeSyncing = true;

  // Visual status indicators immediately
  const syncBtn = document.getElementById('horizonLiveSyncBtn');
  if (syncBtn) {
    syncBtn.classList.add('is-loading');
    syncBtn.innerHTML = `<i data-lucide="refresh-cw" class="inline-icon spinning"></i> <span>Syncing...</span>`;
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }
  const statusTime = document.getElementById('horizonLiveTimestamp');
  if (statusTime) {
    statusTime.textContent = 'Syncing Live Feeds...';
  }

  try {
    const updated = await fetchRealtimeHorizonUniverse(currentUniverse);
    if (updated && Array.isArray(updated) && updated.length > 0) {
      currentUniverse = updated;
      cachedRecommendations = generateHorizonRecommendations(currentUniverse);
      const now = new Date();
      lastSyncTimestamp = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      hasAutoSyncedRealtime = true;
    }
  } catch (err) {
    console.warn('Horizon scanner live sync error:', err);
  } finally {
    isRealtimeSyncing = false;
    const container = document.getElementById(containerId);
    if (container) {
      // If user is currently typing in search, do not reset cursor/focus
      const searchInput = document.getElementById('horizonSearchInput');
      const isInputFocused = document.activeElement === searchInput;
      
      updateLiveSyncStatusHeader();
      updateHorizonResults(container, onSelectAssetForModel, onSelectAssetForTechnicals);
      
      if (isInputFocused && searchInput) {
        searchInput.focus();
      }
    }
  }
}

function updateLiveSyncStatusHeader() {
  const syncBtn = document.getElementById('horizonLiveSyncBtn');
  if (syncBtn) {
    syncBtn.classList.remove('is-loading');
    syncBtn.innerHTML = `<i data-lucide="refresh-cw" class="inline-icon"></i> <span>Live Sync</span>`;
  }
  const statusTime = document.getElementById('horizonLiveTimestamp');
  if (statusTime) {
    statusTime.textContent = lastSyncTimestamp ? `Live (${lastSyncTimestamp})` : 'Streaming Quotes';
  }
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Filter and sort recommendations based on active state
 */
function getFilteredAndSortedRecommendations() {
  const allRecs = getRecommendations();

  // Filter recommendations
  const filtered = allRecs.filter(item => {
    const asset = item.asset;
    
    // Asset class filter
    if (activeAssetFilter !== 'ALL' && asset.assetType !== activeAssetFilter) {
      return false;
    }

    // Market filter
    if (activeMarketFilter !== 'ALL' && asset.market !== activeMarketFilter) {
      return false;
    }

    // Market cap filter (Large Cap, Mid Cap, Small Cap)
    if (activeCapFilter !== 'ALL') {
      if (asset.capCategory !== activeCapFilter) {
        return false;
      }
    }

    // Search query filter (matches ticker, name, sector, market cap)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const capStr = (asset.capCategory || '').toLowerCase().replace(/_/g, ' ');
      const match = asset.ticker.toLowerCase().includes(q) ||
                    asset.displayTicker.toLowerCase().includes(q) ||
                    asset.name.toLowerCase().includes(q) ||
                    asset.sector.toLowerCase().includes(q) ||
                    capStr.includes(q);
      if (!match) return false;
    }

    // Horizon & Conviction check
    const currentEval = activeHorizonFilter === 'ALL'
      ? item.evaluations[item.bestFitHorizon]
      : item.evaluations[activeHorizonFilter];

    if (activeConvictionFilter === 'STRONG_BUY' && currentEval.conviction !== 'STRONG_BUY') {
      return false;
    }
    if (activeConvictionFilter === 'BUY' && (currentEval.conviction !== 'STRONG_BUY' && currentEval.conviction !== 'BUY')) {
      return false;
    }

    return true;
  });

  // Sort filtered results
  filtered.sort((a, b) => {
    const evalA = activeHorizonFilter === 'ALL' ? a.evaluations[a.bestFitHorizon] : a.evaluations[activeHorizonFilter];
    const evalB = activeHorizonFilter === 'ALL' ? b.evaluations[b.bestFitHorizon] : b.evaluations[activeHorizonFilter];

    if (activeSortCriteria === 'score') {
      return evalB.score - evalA.score;
    } else if (activeSortCriteria === 'upside') {
      const gainA = parseFloat(evalA.targetGainPct.replace(/[^0-9.-]/g, '')) || 0;
      const gainB = parseFloat(evalB.targetGainPct.replace(/[^0-9.-]/g, '')) || 0;
      return gainB - gainA;
    } else if (activeSortCriteria === 'cagr') {
      const cagrA = parseFloat((evalA.annualizedCAGR || evalA.targetGainPct).replace(/[^0-9.-]/g, '')) || 0;
      const cagrB = parseFloat((evalB.annualizedCAGR || evalB.targetGainPct).replace(/[^0-9.-]/g, '')) || 0;
      return cagrB - cagrA;
    } else if (activeSortCriteria === 'ticker') {
      return a.asset.displayTicker.localeCompare(b.asset.displayTicker);
    }
    return 0;
  });

  return filtered;
}

/**
 * Render the Quant Horizon Scanner into its container.
 * Employs structural frame caching to prevent search input focus loss and DOM thrashing.
 */
export function renderHorizonScanner(containerId, onSelectAssetForModel, onSelectAssetForTechnicals) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Auto-sync real-time market data on first mount if not yet synced
  if (!hasAutoSyncedRealtime && !isRealtimeSyncing) {
    setTimeout(() => {
      syncHorizonScannerRealtime(containerId, onSelectAssetForModel, onSelectAssetForTechnicals);
    }, 60);
  }

  // Check if permanent frame already exists
  const existingFrame = container.querySelector('#horizonHeroAndToolbar');
  if (!existingFrame) {
    buildHorizonPermanentFrame(container, containerId, onSelectAssetForModel, onSelectAssetForTechnicals);
  }

  // Sync toolbar active button states
  syncToolbarButtonStates(container);

  // Update results grid/table
  updateHorizonResults(container, onSelectAssetForModel, onSelectAssetForTechnicals);
}

/**
 * Build permanent frame (Hero banner + interactive filter controls + results container)
 */
function buildHorizonPermanentFrame(container, containerId, onSelectAssetForModel, onSelectAssetForTechnicals) {
  const allRecs = getRecommendations();
  const countShort = allRecs.filter(r => r.bestFitHorizon === HORIZONS.SHORT_TERM).length;
  const countMedium = allRecs.filter(r => r.bestFitHorizon === HORIZONS.MEDIUM_TERM).length;
  const countLong = allRecs.filter(r => r.bestFitHorizon === HORIZONS.LONG_TERM).length;

  container.innerHTML = `
    <div id="horizonHeroAndToolbar">
      <!-- Top Hero Banner -->
      <div class="horizon-hero-banner">
        <div class="horizon-hero-content">
          <div class="horizon-title-row">
            <div class="horizon-icon-wrap">
              <i data-lucide="compass" class="horizon-main-icon"></i>
            </div>
            <div>
              <h2 class="horizon-heading">Quant Horizon Recommendation Scanner</h2>
              <p class="horizon-subheading">
                Algorithmic quantitative recommendations across <strong>Large Cap, Midcap & Smallcap Stocks</strong>, 
                <strong>ETFs & Indices</strong> for <strong>Short Term</strong> (1D–6M), <strong>Medium Term</strong> (6M–2Y), and <strong>Long Term</strong> (>2Y).
              </p>
            </div>
          </div>
        </div>

        <!-- Quick KPI Horizon Stats & Live Status & Exit Action -->
        <div class="horizon-header-actions-wrap" style="display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;">
          <div class="horizon-stats-row">
            <div class="horizon-stat-pill" data-horizon="ALL" title="View all setups">
              <span class="stat-horizon-icon text-cyan">🌐</span>
              <div>
                <span class="stat-horizon-val" id="statAllCount">${allRecs.length} Assets</span>
                <span class="stat-horizon-lbl text-dim">Total Universe</span>
              </div>
            </div>
            <div class="horizon-stat-pill" data-horizon="SHORT_TERM" title="View Short-Term setups">
              <span class="stat-horizon-icon text-amber">⚡</span>
              <div>
                <span class="stat-horizon-val" id="statShortCount">${countShort} Setups</span>
                <span class="stat-horizon-lbl text-dim">Short-Term (1D–6M)</span>
              </div>
            </div>
            <div class="horizon-stat-pill" data-horizon="MEDIUM_TERM" title="View Medium-Term setups">
              <span class="stat-horizon-icon text-cyan">📈</span>
              <div>
                <span class="stat-horizon-val" id="statMediumCount">${countMedium} Setups</span>
                <span class="stat-horizon-lbl text-dim">Medium-Term (6M–2Y)</span>
              </div>
            </div>
            <div class="horizon-stat-pill" data-horizon="LONG_TERM" title="View Long-Term setups">
              <span class="stat-horizon-icon text-emerald">🏛️</span>
              <div>
                <span class="stat-horizon-val" id="statLongCount">${countLong} Setups</span>
                <span class="stat-horizon-lbl text-dim">Long-Term (>2Y)</span>
              </div>
            </div>
          </div>

          <!-- Real-Time Market Feed Indicator -->
          <div class="horizon-live-status-pill font-mono" id="horizonLiveFeedStatus" title="Real-time live prices & quantitative indicators streamed from Yahoo Finance">
            <span class="pulse-dot"></span>
            <span class="live-pill-tag">LIVE YAHOO FEED</span>
            <span class="live-pill-time text-dim" id="horizonLiveTimestamp">${lastSyncTimestamp ? `Live (${lastSyncTimestamp})` : 'Streaming Quotes'}</span>
          </div>

          <button id="horizonLiveSyncBtn" class="btn btn-outline btn-sm btn-sync-horizon ${isRealtimeSyncing ? 'is-loading' : ''}" title="Fetch latest real-time prices, 50-SMA, 14-RSI & quantitative targets">
            <i data-lucide="refresh-cw" class="inline-icon ${isRealtimeSyncing ? 'spinning' : ''}"></i>
            <span>${isRealtimeSyncing ? 'Syncing...' : 'Live Sync'}</span>
          </button>

          <button id="exitHorizonScannerBtn" class="btn btn-outline btn-sm btn-exit-sector-view" title="Return to Stock Analysis Terminal">
            <i data-lucide="arrow-left" class="inline-icon"></i>
            <span id="exitHorizonScannerLabel">Back to Stock Terminal</span>
          </button>
        </div>
      </div>

      <!-- Interactive Filter Toolbar -->
      <div class="horizon-controls-panel">
        <!-- Row 1: Horizon Selector Chips -->
        <div class="filter-group-row">
          <span class="filter-label text-dim font-mono">
            <i data-lucide="calendar" class="inline-icon text-cyan"></i> Horizon:
          </span>
          <div class="horizon-chips-group" id="horizonFilterGroup">
            <button class="h-chip active" data-val="ALL">
              All Horizons
            </button>
            <button class="h-chip" data-val="SHORT_TERM">
              <span>⚡ Short-Term</span> <span class="chip-sub">1D – 6M</span>
            </button>
            <button class="h-chip" data-val="MEDIUM_TERM">
              <span>📈 Medium-Term</span> <span class="chip-sub">6M – 2Y (GARP)</span>
            </button>
            <button class="h-chip" data-val="LONG_TERM">
              <span>🏛️ Long-Term</span> <span class="chip-sub">>2Y (Compounding)</span>
            </button>
          </div>
        </div>

        <!-- Row 2: Asset Class, Market, Cap Category, Search, and Sort Controls -->
        <div class="filter-row-secondary">
          <!-- Asset Class Filter -->
          <div class="filter-subgroup">
            <span class="filter-sublabel text-dim font-mono">Asset:</span>
            <div class="btn-group-toggle" id="assetFilterGroup">
              <button class="btn-toggle-sm active" data-val="ALL">All</button>
              <button class="btn-toggle-sm" data-val="STOCK">🏢 Stocks</button>
              <button class="btn-toggle-sm" data-val="ETF">📦 ETFs</button>
              <button class="btn-toggle-sm" data-val="INDEX">📊 Indices</button>
            </div>
          </div>

          <!-- Market Filter -->
          <div class="filter-subgroup">
            <span class="filter-sublabel text-dim font-mono">Market:</span>
            <div class="btn-group-toggle" id="marketFilterGroup">
              <button class="btn-toggle-sm active" data-val="ALL">🌐 All</button>
              <button class="btn-toggle-sm" data-val="IN">🇮🇳 NSE India</button>
              <button class="btn-toggle-sm" data-val="US">🇺🇸 US Market</button>
            </div>
          </div>

          <!-- Market Cap Filter (Large, Mid, Small) -->
          <div class="filter-subgroup">
            <span class="filter-sublabel text-dim font-mono">Cap Size:</span>
            <div class="btn-group-toggle" id="capFilterGroup">
              <button class="btn-toggle-sm active" data-val="ALL">All Caps</button>
              <button class="btn-toggle-sm" data-val="LARGE_CAP">👑 Large</button>
              <button class="btn-toggle-sm" data-val="MID_CAP">📈 Midcap</button>
              <button class="btn-toggle-sm" data-val="SMALL_CAP">⚡ Smallcap</button>
            </div>
          </div>

          <!-- Search Input (Protected against focus loss) -->
          <div class="scanner-search-box">
            <i data-lucide="search" class="scanner-search-icon"></i>
            <input 
              type="text" 
              id="horizonSearchInput" 
              class="scanner-search-input" 
              placeholder="Search stock, midcap, smallcap, ETF (e.g. POLYCAB, COIN, RVNL, ASTS)..."
              value=""
              autocomplete="off"
            />
            <button id="clearHorizonSearchBtn" class="clear-search-mini" style="display: none;">&times;</button>
          </div>

          <!-- Sort Criteria -->
          <div class="filter-subgroup sort-subgroup">
            <span class="filter-sublabel text-dim font-mono">Sort:</span>
            <select id="horizonSortSelect" class="scanner-sort-select" aria-label="Sort horizon recommendations">
              <option value="score" selected>Quant Score (Highest)</option>
              <option value="upside">Target Upside %</option>
              <option value="cagr">Expected CAGR</option>
              <option value="ticker">Ticker (A-Z)</option>
            </select>
          </div>

          <!-- View Mode (Cards / Table) -->
          <div class="view-mode-toggle" id="viewModeToggle">
            <button class="btn-toggle-sm active" data-val="cards" title="Cards View">
              <i data-lucide="layout-grid" class="inline-icon"></i> Cards
            </button>
            <button class="btn-toggle-sm" data-val="table" title="Table View">
              <i data-lucide="table" class="inline-icon"></i> Table
            </button>
          </div>
        </div>
      </div>

      <!-- Results Header -->
      <div class="horizon-results-header">
        <span class="results-count font-mono" id="horizonResultsCountSpan">
          Loading quantitative recommendations...
        </span>
        <span class="results-badge font-mono text-cyan">
          <i data-lucide="shield-check" class="inline-icon"></i> Institutional Multi-Factor Quant
        </span>
      </div>
    </div>

    <!-- Recommendations Container (Dynamically updated without rebuilding toolbar) -->
    <div class="horizon-items-container" id="horizonItemsContainer"></div>
  `;

  attachToolbarEventListeners(container, containerId, onSelectAssetForModel, onSelectAssetForTechnicals);
}

/**
 * Attach toolbar event listeners once
 */
function attachToolbarEventListeners(container, containerId, onSelectAssetForModel, onSelectAssetForTechnicals) {
  // Horizon Filter Chips
  container.querySelectorAll('#horizonFilterGroup .h-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeHorizonFilter = e.currentTarget.dataset.val;
      syncToolbarButtonStates(container);
      updateHorizonResults(container, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  });

  // Top stat pills quick jump
  container.querySelectorAll('.horizon-stat-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      activeHorizonFilter = e.currentTarget.dataset.horizon;
      syncToolbarButtonStates(container);
      updateHorizonResults(container, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  });

  // Asset Class Toggle
  container.querySelectorAll('#assetFilterGroup .btn-toggle-sm').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeAssetFilter = e.currentTarget.dataset.val;
      syncToolbarButtonStates(container);
      updateHorizonResults(container, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  });

  // Market Filter Toggle
  container.querySelectorAll('#marketFilterGroup .btn-toggle-sm').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeMarketFilter = e.currentTarget.dataset.val;
      syncToolbarButtonStates(container);
      updateHorizonResults(container, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  });

  // Market Cap Toggle (Large, Mid, Small)
  container.querySelectorAll('#capFilterGroup .btn-toggle-sm').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeCapFilter = e.currentTarget.dataset.val;
      syncToolbarButtonStates(container);
      updateHorizonResults(container, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  });

  // View Mode Toggle
  container.querySelectorAll('#viewModeToggle .btn-toggle-sm').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentViewMode = e.currentTarget.dataset.val;
      syncToolbarButtonStates(container);
      updateHorizonResults(container, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  });

  // Sort Select Dropdown
  const sortSelect = container.querySelector('#horizonSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      activeSortCriteria = e.target.value;
      updateHorizonResults(container, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  }

  // Debounced Search Input (prevents input lag and memory thrashing)
  const searchInput = container.querySelector('#horizonSearchInput');
  const clearBtn = container.querySelector('#clearHorizonSearchBtn');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (clearBtn) clearBtn.style.display = searchQuery ? 'block' : 'none';

      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        updateHorizonResults(container, onSelectAssetForModel, onSelectAssetForTechnicals);
      }, 140);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchQuery = '';
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      clearBtn.style.display = 'none';
      updateHorizonResults(container, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  }

  // Live Sync Button
  const syncBtn = container.querySelector('#horizonLiveSyncBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', () => {
      syncHorizonScannerRealtime(containerId, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  }

  // Exit Horizon Scanner Button
  const exitBtn = container.querySelector('#exitHorizonScannerBtn');
  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      if (window.exitHorizonScanner) {
        window.exitHorizonScanner();
      }
    });
  }
}

/**
 * Sync active classes on toolbar buttons
 */
function syncToolbarButtonStates(container) {
  // Horizon chips
  container.querySelectorAll('#horizonFilterGroup .h-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === activeHorizonFilter);
  });

  // Asset toggle
  container.querySelectorAll('#assetFilterGroup .btn-toggle-sm').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === activeAssetFilter);
  });

  // Market toggle
  container.querySelectorAll('#marketFilterGroup .btn-toggle-sm').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === activeMarketFilter);
  });

  // Cap Category toggle
  container.querySelectorAll('#capFilterGroup .btn-toggle-sm').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === activeCapFilter);
  });

  // View Mode toggle
  container.querySelectorAll('#viewModeToggle .btn-toggle-sm').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === currentViewMode);
  });
}

/**
 * Update only the Results Grid or Table and Header Count (zero input focus disruption)
 */
function updateHorizonResults(container, onSelectAssetForModel, onSelectAssetForTechnicals) {
  const itemsContainer = container.querySelector('#horizonItemsContainer');
  if (!itemsContainer) return;

  const filtered = getFilteredAndSortedRecommendations();
  const allRecs = getRecommendations();

  // Update KPI counts in banner
  const countShort = allRecs.filter(r => r.bestFitHorizon === HORIZONS.SHORT_TERM).length;
  const countMedium = allRecs.filter(r => r.bestFitHorizon === HORIZONS.MEDIUM_TERM).length;
  const countLong = allRecs.filter(r => r.bestFitHorizon === HORIZONS.LONG_TERM).length;

  const statAll = container.querySelector('#statAllCount');
  if (statAll) statAll.textContent = `${allRecs.length} Assets`;
  const statShort = container.querySelector('#statShortCount');
  if (statShort) statShort.textContent = `${countShort} Setups`;
  const statMedium = container.querySelector('#statMediumCount');
  if (statMedium) statMedium.textContent = `${countMedium} Setups`;
  const statLong = container.querySelector('#statLongCount');
  if (statLong) statLong.textContent = `${countLong} Setups`;

  // Update Results count text
  const countSpan = container.querySelector('#horizonResultsCountSpan');
  if (countSpan) {
    const horizonPart = activeHorizonFilter !== 'ALL' ? `for <span class="highlight-horizon">${HORIZON_LABELS[activeHorizonFilter].title}</span>` : '';
    const capPart = activeCapFilter !== 'ALL' ? ` • <span class="text-cyan">${CAP_CATEGORY_LABELS[activeCapFilter]?.label || activeCapFilter}</span>` : '';
    countSpan.innerHTML = `Showing <strong>${filtered.length}</strong> quantitative recommendations ${horizonPart}${capPart}`;
  }

  // Render view
  itemsContainer.innerHTML = currentViewMode === 'cards' 
    ? renderCardsView(filtered) 
    : renderTableView(filtered);

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // Bind dynamic card and table action listeners
  attachCardAndRowListeners(itemsContainer, onSelectAssetForModel, onSelectAssetForTechnicals);
}

/**
 * Render Cards View
 */
function renderCardsView(items) {
  if (items.length === 0) {
    return `
      <div class="horizon-empty-state">
        <i data-lucide="radar" class="empty-icon text-cyan"></i>
        <h3>No quantitative matches found</h3>
        <p class="text-dim">Try adjusting your filters, searching for another stock (e.g. POLYCAB, COIN, RVNL), or switching market cap size.</p>
      </div>
    `;
  }

  return `
    <div class="horizon-cards-grid">
      ${items.map(item => {
        const asset = item.asset;
        const curr = asset.currencySymbol || (asset.market === 'IN' ? '₹' : '$');
        const activeH = activeHorizonFilter === 'ALL' ? item.bestFitHorizon : activeHorizonFilter;
        const evaluation = item.evaluations[activeH];
        const hMeta = evaluation.horizonMeta;

        const isChgPositive = asset.changePercent >= 0;
        const chgClass = isChgPositive ? 'text-emerald' : 'text-rose';
        const chgSign = isChgPositive ? '+' : '';

        // Cap Category badge helper
        const capBadge = asset.capCategory ? `
          <span class="cap-pill ${asset.capCategory === 'MID_CAP' ? 'cap-pill-mid' : asset.capCategory === 'SMALL_CAP' ? 'cap-pill-small' : 'cap-pill-large'}">
            ${asset.capCategory === 'MID_CAP' ? 'MID CAP' : asset.capCategory === 'SMALL_CAP' ? 'SMALL CAP' : 'LARGE CAP'}
          </span>
        ` : '';

        return `
          <div class="h-card" data-ticker="${asset.ticker}">
            <!-- Card Header -->
            <div class="h-card-top">
              <div class="h-asset-info h-clickable-asset" data-ticker="${asset.ticker}" style="cursor: pointer;" title="Click to analyze ${asset.displayTicker} in Stock Terminal">
                <span class="h-flag">${asset.market === 'US' ? '🇺🇸' : '🇮🇳'}</span>
                <div>
                  <div class="h-ticker-row">
                    <span class="h-ticker font-mono font-bold">${asset.displayTicker}</span>
                    <span class="badge badge-asset-type font-mono">${asset.assetType}</span>
                    ${capBadge}
                    <span class="badge ${hMeta.badgeClass} font-mono">${hMeta.title}</span>
                  </div>
                  <span class="h-name text-dim">${asset.name}</span>
                </div>
              </div>

              <!-- Price & Daily Move -->
              <div class="h-price-box">
                <div class="h-price-row">
                  <span class="h-price font-mono font-bold">${curr}${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  ${asset.isRealtime ? '<span class="live-tag-badge" title="Live Yahoo Finance Quote"><span class="pulse-dot-mini"></span> LIVE</span>' : ''}
                </div>
                <span class="h-chg font-mono ${chgClass}">${chgSign}${asset.changePercent}%</span>
              </div>
            </div>

            <!-- Horizon & Strategy Banner -->
            <div class="h-strategy-bar">
              <div class="h-strat-title">
                <span class="h-strat-icon">${hMeta.id === 'SHORT_TERM' ? '⚡' : hMeta.id === 'MEDIUM_TERM' ? '📈' : '🏛️'}</span>
                <strong>${evaluation.strategyType}</strong>
                <span class="h-timeframe text-dim">(${evaluation.timeframe})</span>
              </div>
              <div class="h-score-badge ${evaluation.badgeClass} font-mono font-bold">
                ${evaluation.score}/100 • ${evaluation.conviction}
              </div>
            </div>

            <!-- Quantitative Targets & Metrics Grid -->
            <div class="h-metrics-grid">
              <div class="h-metric-cell highlight-target">
                <span class="h-m-lbl text-emerald font-bold">🎯 Ultimate Target</span>
                <span class="h-m-val font-mono font-bold text-emerald">${curr}${evaluation.targetPrice.toLocaleString()}</span>
                <span class="h-m-sub text-emerald font-mono">${evaluation.targetGainPct} Upside</span>
              </div>

              <div class="h-metric-cell">
                <span class="h-m-lbl text-dim">
                  ${activeH === 'SHORT_TERM' ? '🛑 Stop Loss' : activeH === 'MEDIUM_TERM' ? '📊 Expected CAGR' : '🛡️ Balance Health'}
                </span>
                <span class="h-m-val font-mono font-bold ${activeH === 'SHORT_TERM' ? 'text-rose' : 'text-cyan'}">
                  ${activeH === 'SHORT_TERM' 
                    ? `${curr}${evaluation.stopLossPrice.toLocaleString()}` 
                    : activeH === 'MEDIUM_TERM' 
                      ? evaluation.annualizedCAGR 
                      : evaluation.fScoreText}
                </span>
                <span class="h-m-sub text-dim font-mono">
                  ${activeH === 'SHORT_TERM' 
                    ? `${evaluation.stopLossPct} (${evaluation.riskReward} R:R)` 
                    : activeH === 'MEDIUM_TERM' 
                      ? evaluation.marginOfSafety 
                      : evaluation.compoundMultiplier}
                </span>
              </div>

              <div class="h-metric-cell">
                <span class="h-m-lbl text-dim">${evaluation.keyIndicators[0].label}</span>
                <span class="h-m-val font-mono ${evaluation.keyIndicators[0].status === 'positive' ? 'text-emerald' : ''}">
                  ${evaluation.keyIndicators[0].value}
                </span>
                <span class="h-m-sub text-dim font-mono">Quant Indicator</span>
              </div>

              <div class="h-metric-cell">
                <span class="h-m-lbl text-dim">${evaluation.keyIndicators[1].label}</span>
                <span class="h-m-val font-mono ${evaluation.keyIndicators[1].status === 'positive' ? 'text-emerald' : ''}">
                  ${evaluation.keyIndicators[1].value}
                </span>
                <span class="h-m-sub text-dim font-mono">Technical / Quality</span>
              </div>
            </div>

            <!-- Dedicated Tactical Entry Strategy & Sizing -->
            <div class="h-entry-card-section">
              <div class="h-entry-header">
                <span class="h-entry-title">
                  <i data-lucide="log-in" class="inline-icon"></i> Entry Strategy & Sizing
                </span>
                <span class="h-entry-type-badge font-mono font-bold">
                  ${evaluation.entryStrategy.orderType}
                </span>
              </div>

              <div class="h-entry-grid">
                <!-- Optimal Entry Zone -->
                <div class="h-entry-col col-zone">
                  <span class="h-entry-lbl text-cyan">Optimal Entry Zone</span>
                  <span class="h-entry-price font-mono font-bold text-cyan">${evaluation.entryStrategy.entryZone}</span>
                  <span class="h-entry-hint text-dim font-mono">Staged Limit Orders</span>
                </div>

                <!-- Position Tranche Sizing -->
                <div class="h-entry-col col-sizing">
                  <span class="h-entry-lbl text-amber">Tranche Execution</span>
                  <span class="h-entry-sizing font-mono font-bold text-amber">${evaluation.entryStrategy.trancheSummary}</span>
                  <span class="h-entry-hint text-dim font-mono">${evaluation.entryStrategy.stagingStyle}</span>
                </div>
              </div>

              <!-- Entry Trigger Guidance -->
              <div class="h-entry-trigger-box">
                <span class="h-trigger-icon text-cyan">🎯</span>
                <p class="h-trigger-text text-dim">
                  <strong>Trigger:</strong> ${evaluation.entryStrategy.entryTrigger}
                </p>
              </div>

              <!-- Invalidation Guardrail -->
              <div class="h-entry-invalidation-box">
                <span class="h-invalidation-icon text-rose">⚠️</span>
                <p class="h-invalidation-text text-dim">
                  <strong>Invalidation:</strong> ${evaluation.entryStrategy.invalidationRule}
                </p>
              </div>
            </div>

            <!-- Dedicated Exit Strategy, Profit Booking & Stop Loss -->
            <div class="h-exit-card-section">
              <div class="h-exit-header">
                <span class="h-exit-title">
                  <i data-lucide="log-out" class="inline-icon"></i> Exit Strategy & Profit Booking
                </span>
                <span class="h-rr-badge font-mono font-bold ${parseFloat(evaluation.exitStrategy.riskRewardRatio.split(':')[1] || 0) >= 2.5 ? 'badge-emerald' : 'badge-cyan'}">
                  ${evaluation.exitStrategy.riskRewardRatio} R:R
                </span>
              </div>

              <!-- Multi-Target Booking Stepper -->
              <div class="h-targets-stepper">
                <!-- Target 1 (Partial Booking) -->
                <div class="h-target-step step-t1">
                  <div class="h-step-badge">
                    <span class="step-num font-mono">T1</span>
                    <span class="step-book-badge badge-emerald font-mono font-bold">${evaluation.exitStrategy.target1BookLabel.toUpperCase()}</span>
                  </div>
                  <div class="h-step-content">
                    <div class="h-step-price-row font-mono">
                      <span class="h-step-price font-bold text-emerald">${curr}${evaluation.exitStrategy.target1Price.toLocaleString()}</span>
                      <span class="h-step-gain text-emerald">(${evaluation.exitStrategy.target1GainPct})</span>
                    </div>
                    <span class="h-step-action text-dim">${evaluation.exitStrategy.target1Action}</span>
                  </div>
                </div>

                <!-- Target 2 (Runner Final Exit) -->
                <div class="h-target-step step-t2">
                  <div class="h-step-badge">
                    <span class="step-num font-mono">T2</span>
                    <span class="step-book-badge badge-cyan font-mono font-bold">${evaluation.exitStrategy.target2BookLabel.toUpperCase()}</span>
                  </div>
                  <div class="h-step-content">
                    <div class="h-step-price-row font-mono">
                      <span class="h-step-price font-bold text-cyan">${curr}${evaluation.exitStrategy.target2Price.toLocaleString()}</span>
                      <span class="h-step-gain text-cyan">(${evaluation.exitStrategy.target2GainPct})</span>
                    </div>
                    <span class="h-step-action text-dim">${evaluation.exitStrategy.target2Action}</span>
                  </div>
                </div>
              </div>

              <!-- Stop Loss & Trailing Rules -->
              <div class="h-stoploss-card-row">
                <div class="h-sl-box">
                  <span class="h-sl-lbl text-rose font-bold">Hard Stop Loss</span>
                  <div class="h-sl-price-row font-mono">
                    <span class="h-sl-price font-bold text-rose">${curr}${evaluation.exitStrategy.stopLossPrice.toLocaleString()}</span>
                    <span class="h-sl-pct text-rose">(${evaluation.exitStrategy.stopLossPct})</span>
                  </div>
                  <span class="h-sl-rule-sub text-dim font-mono">${evaluation.exitStrategy.stopLossType}</span>
                </div>

                <div class="h-trailing-box">
                  <span class="h-trailing-lbl text-amber font-bold">Dynamic Trailing Rule</span>
                  <p class="h-trailing-text text-dim">${evaluation.exitStrategy.trailingStopRule}</p>
                </div>
              </div>

              <!-- Time Exit Guidance -->
              <div class="h-time-exit-row">
                <span class="h-time-icon text-dim">⏳</span>
                <span class="h-time-text text-dim">
                  <strong>Time Horizon Rule:</strong> ${evaluation.exitStrategy.timeExitRule}
                </span>
              </div>
            </div>

            <!-- Quantitative Pillars Breakdown -->
            <div class="h-pillars-box">
              <span class="h-pillars-title font-mono text-dim">Quantitative Reasoning & Catalyst:</span>
              <p class="h-thesis-text">${evaluation.reasoning.summary}</p>
              <div class="h-pillars-list">
                ${evaluation.reasoning.pillars.map(p => `
                  <div class="h-pillar-item">
                    <span class="h-pillar-dot"></span>
                    <span class="h-pillar-item-title font-bold">${p.title}:</span>
                    <span class="h-pillar-item-detail text-dim">${p.detail}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Card Actions -->
            <div class="h-card-actions">
              <button class="btn btn-outline btn-sm btn-action-model" data-ticker="${asset.ticker}" title="Simulate this asset in Peter Lynch & Multi-Factor Fair Value Model">
                <i data-lucide="calculator"></i> Simulate in Model
              </button>
              <button class="btn btn-outline btn-sm btn-action-tech" data-ticker="${asset.ticker}" title="View RSI, Moving Averages & Chart Setup">
                <i data-lucide="candlestick-chart"></i> Technicals
              </button>
              <button class="btn btn-ghost btn-sm btn-action-copy" data-ticker="${asset.ticker}" title="Copy Strategy & Exit Plan">
                <i data-lucide="share-2"></i>
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Render Table View
 */
function renderTableView(items) {
  if (items.length === 0) {
    return `<div class="horizon-empty-state"><p class="text-dim">No matching assets found.</p></div>`;
  }

  return `
    <div class="table-responsive">
      <table class="horizon-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Type & Cap</th>
            <th>Horizon & Strategy</th>
            <th>Current Price</th>
            <th>Entry Strategy & Zone</th>
            <th>Targets & Book T1 %</th>
            <th>Stop Loss & Rules</th>
            <th>Quant Score</th>
            <th>Quantitative Reasoning</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => {
            const asset = item.asset;
            const curr = asset.currencySymbol || (asset.market === 'IN' ? '₹' : '$');
            const activeH = activeHorizonFilter === 'ALL' ? item.bestFitHorizon : activeHorizonFilter;
            const evaluation = item.evaluations[activeH];
            const hMeta = evaluation.horizonMeta;
            const entry = evaluation.entryStrategy;
            const exit = evaluation.exitStrategy;
            const isChgPositive = asset.changePercent >= 0;

            const capBadge = asset.capCategory ? `
              <span class="cap-pill ${asset.capCategory === 'MID_CAP' ? 'cap-pill-mid' : asset.capCategory === 'SMALL_CAP' ? 'cap-pill-small' : 'cap-pill-large'}" style="margin-top: 3px;">
                ${asset.capCategory === 'MID_CAP' ? 'MID' : asset.capCategory === 'SMALL_CAP' ? 'SMALL' : 'LARGE'}
              </span>
            ` : '';

            return `
              <tr class="h-table-row">
                <td>
                  <div class="table-asset-cell h-clickable-asset" data-ticker="${asset.ticker}" style="cursor: pointer;" title="Click to analyze ${asset.displayTicker} in Stock Terminal">
                    <span class="h-flag">${asset.market === 'US' ? '🇺🇸' : '🇮🇳'}</span>
                    <div>
                      <strong class="font-mono text-cyan-hover">${asset.displayTicker}</strong>
                      <span class="text-dim d-block" style="font-size: 0.72rem;">${asset.name}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
                    <span class="badge badge-asset-type font-mono">${asset.assetType}</span>
                    ${capBadge}
                  </div>
                </td>
                <td>
                  <div>
                    <span class="badge ${hMeta.badgeClass} font-mono" style="font-size: 0.68rem;">${hMeta.title}</span>
                    <div class="font-medium mt-1" style="font-size: 0.75rem;">${evaluation.strategyType}</div>
                  </div>
                </td>
                <td>
                  <div class="table-price-flex">
                    <span class="font-mono font-bold">${curr}${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    ${asset.isRealtime ? '<span class="live-tag-badge mini" title="Live Yahoo Finance Quote"><span class="pulse-dot-mini"></span> LIVE</span>' : ''}
                  </div>
                  <div class="font-mono ${isChgPositive ? 'text-emerald' : 'text-rose'}" style="font-size: 0.7rem;">
                    ${isChgPositive ? '+' : ''}${asset.changePercent}%
                  </div>
                </td>
                <td>
                  <div class="table-entry-cell font-mono">
                    <div class="text-cyan font-bold" style="font-size: 0.75rem;">${entry.entryZone}</div>
                    <div class="text-emerald" style="font-size: 0.69rem;">${entry.entryType}</div>
                    <div class="text-dim" style="font-size: 0.67rem;">${entry.trancheSummary}</div>
                  </div>
                </td>
                <td>
                  <div class="table-targets-cell font-mono">
                    <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                      <span class="text-emerald font-bold">T1: ${curr}${exit.target1Price.toLocaleString()} (${exit.target1GainPct})</span>
                      <span class="h-book-badge-sm badge-emerald font-bold">Book ${exit.target1BookPct}%</span>
                    </div>
                    <span class="text-cyan" style="font-size: 0.72rem;">T2: ${curr}${exit.target2Price.toLocaleString()} (${exit.target2GainPct})</span>
                  </div>
                </td>
                <td>
                  <div class="table-stoploss-cell font-mono">
                    <span class="text-rose font-bold">SL: ${curr}${exit.stopLossPrice.toLocaleString()} (${exit.stopLossPct})</span>
                    <span class="text-dim" style="font-size: 0.68rem;">${exit.riskRewardRatio} R:R</span>
                  </div>
                </td>
                <td>
                  <span class="badge ${evaluation.badgeClass} font-mono" style="font-size: 0.72rem;">
                    ${evaluation.score} • ${evaluation.conviction}
                  </span>
                </td>
                <td>
                  <div class="table-reasoning-cell">
                    <strong>${evaluation.reasoning.pillars[0].title}:</strong> ${evaluation.reasoning.summary}
                  </div>
                </td>
                <td>
                  <div style="display: flex; gap: 0.3rem;">
                    <button class="btn btn-outline btn-xs btn-action-model" data-ticker="${asset.ticker}" title="Simulate in Model">
                      Simulate
                    </button>
                    <button class="btn btn-ghost btn-xs btn-action-copy" data-ticker="${asset.ticker}" title="Copy Strategy & Exit Plan">
                      <i data-lucide="share-2" style="width: 13px; height: 13px;"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Attach dynamic card and table action listeners
 */
function attachCardAndRowListeners(itemsContainer, onSelectAssetForModel, onSelectAssetForTechnicals) {
  // Action: Clickable Asset Header & Cell
  itemsContainer.querySelectorAll('.h-clickable-asset').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const ticker = el.dataset.ticker;
      if (ticker && typeof onSelectAssetForModel === 'function') {
        onSelectAssetForModel(ticker);
      }
    });
  });

  // Action: Simulate in Model Button
  itemsContainer.querySelectorAll('.btn-action-model').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ticker = e.currentTarget.dataset.ticker;
      if (typeof onSelectAssetForModel === 'function') {
        onSelectAssetForModel(ticker);
      }
    });
  });

  // Action: Technicals Button
  itemsContainer.querySelectorAll('.btn-action-tech').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ticker = e.currentTarget.dataset.ticker;
      if (typeof onSelectAssetForTechnicals === 'function') {
        onSelectAssetForTechnicals(ticker);
      }
    });
  });

  // Action: Share / Copy Button
  itemsContainer.querySelectorAll('.btn-action-copy').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ticker = e.currentTarget.dataset.ticker;
      const rec = getRecommendations().find(r => r.asset.ticker === ticker);
      if (rec) {
        const activeH = activeHorizonFilter === 'ALL' ? rec.bestFitHorizon : activeHorizonFilter;
        const evaluation = rec.evaluations[activeH];
        const asset = rec.asset;
        const entry = evaluation.entryStrategy;
        const exit = evaluation.exitStrategy;
        const reasoning = evaluation.reasoning;
        const curr = asset.currencySymbol || (asset.market === 'IN' ? '₹' : '$');

        const copyText = [
          `🎯 QUANT HORIZON RECOMMENDATION: [${asset.displayTicker}] ${asset.name}`,
          `Market: ${asset.market === 'US' ? 'US Market (USD)' : 'NSE India (INR)'} | Type: ${asset.assetType}${asset.capCategory ? ' (' + asset.capCategory + ')' : ''}`,
          `Horizon: ${evaluation.horizonMeta.title} (${evaluation.timeframe})`,
          `Strategy: ${evaluation.strategyType} | Conviction: ${evaluation.conviction} (${evaluation.score}/100)`,
          `Current Price: ${curr}${asset.price.toLocaleString()}`,
          ``,
          `📥 ENTRY STRATEGY & SIZING:`,
          `• Setup: ${entry.entryType} [${entry.orderType}]`,
          `• Optimal Entry Zone: ${entry.entryZone} (Current: ${curr}${asset.price.toLocaleString()})`,
          `• Tranche Sizing: ${entry.trancheSummary} (${entry.stagingStyle})`,
          `• Entry Trigger: ${entry.entryTrigger}`,
          `• Tranche Plan: ${entry.tranchePlan}`,
          `• Invalidation Rule: ${entry.invalidationRule}`,
          ``,
          `📊 EXIT STRATEGY & STOP LOSS:`,
          `• Target 1 (${exit.target1BookLabel.toUpperCase()} OF POSITION): ${curr}${exit.target1Price.toLocaleString()} (${exit.target1GainPct})`,
          `  Action: ${exit.target1Action}`,
          `• Target 2 (${exit.target2BookLabel.toUpperCase()}): ${curr}${exit.target2Price.toLocaleString()} (${exit.target2GainPct})`,
          `  Action: ${exit.target2Action}`,
          `• Partial Booking Rule: ${exit.partialBookingRule}`,
          `• Stop Loss: ${curr}${exit.stopLossPrice.toLocaleString()} (${exit.stopLossPct}) [${exit.stopLossType}]`,
          `• Stop Loss Trigger: ${exit.stopLossRule}`,
          `• Trailing Stop Rule: ${exit.trailingStopRule}`,
          `• Time-Based Exit: ${exit.timeExitRule}`,
          `• Risk:Reward Ratio: ${exit.riskRewardRatio}`,
          ``,
          `🧠 QUANTITATIVE REASONING & CATALYST:`,
          `• Summary: ${reasoning.summary}`,
          ...reasoning.pillars.map(p => `• ${p.title}: ${p.detail}`)
        ].join('\n');

        navigator.clipboard?.writeText(copyText);
        showHorizonToast(`Entry, Exit strategy & plan for ${asset.displayTicker} copied!`);

        btn.innerHTML = '<i data-lucide="check" class="text-emerald" style="width: 14px; height: 14px;"></i>';
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
        setTimeout(() => {
          btn.innerHTML = '<i data-lucide="share-2" style="width: 14px; height: 14px;"></i>';
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
          }
        }, 1800);
      }
    });
  });
}

/**
 * Toast Notification for Horizon Scanner with strict timer cleanup
 */
function showHorizonToast(msg) {
  if (activeToastTimeout) clearTimeout(activeToastTimeout);
  if (activeToastRemoveTimeout) clearTimeout(activeToastRemoveTimeout);

  const existing = document.querySelector('.horizon-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'horizon-toast';
  toast.innerHTML = `<i data-lucide="check-circle" class="text-emerald" style="width: 18px; height: 18px;"></i> <span>${msg}</span>`;
  document.body.appendChild(toast);
  
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
  
  activeToastTimeout = setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px)';
    activeToastRemoveTimeout = setTimeout(() => {
      toast.remove();
      activeToastTimeout = null;
      activeToastRemoveTimeout = null;
    }, 320);
  }, 2600);
}
