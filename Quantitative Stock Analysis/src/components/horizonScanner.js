/**
 * Quant Horizon Scanner Component
 * Multi-horizon recommendations for Stocks, ETFs, and Indices based on quantitative analysis.
 * Horizons:
 * - Short Term (1 Day to 6 Months)
 * - Medium Term (6 Months to 2 Years)
 * - Long Term (> 2 Years)
 */

import { HORIZON_UNIVERSE, HORIZONS, ASSET_TYPES, HORIZON_LABELS } from '../data/horizonUniverse.js';
import { generateHorizonRecommendations } from '../quant/horizonEngine.js';
import { fetchRealtimeHorizonUniverse } from '../services/yahooFinance.js';

let activeHorizonFilter = 'ALL';   // 'ALL' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM'
let activeAssetFilter = 'ALL';     // 'ALL' | 'STOCK' | 'ETF' | 'INDEX'
let activeMarketFilter = 'ALL';    // 'ALL' | 'IN' | 'US'
let activeConvictionFilter = 'ALL';// 'ALL' | 'STRONG_BUY' | 'BUY'
let activeSortCriteria = 'score';  // 'score' | 'upside' | 'cagr' | 'ticker'
let currentViewMode = 'cards';     // 'cards' | 'table'
let searchQuery = '';

let currentUniverse = [...HORIZON_UNIVERSE];
let cachedRecommendations = null;
let isRealtimeSyncing = false;
let lastSyncTimestamp = null;
let hasAutoSyncedRealtime = false;

export function getRecommendations() {
  if (!cachedRecommendations) {
    cachedRecommendations = generateHorizonRecommendations(currentUniverse);
  }
  return cachedRecommendations;
}

/**
 * Fetch live market data (quotes, daily candles, dynamic 50-SMA, 14-RSI, dynamic valuation)
 * and update all recommendations in real-time.
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
    renderHorizonScanner(containerId, onSelectAssetForModel, onSelectAssetForTechnicals);
  }
}

/**
 * Render the Quant Horizon Scanner into its container
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

  const allRecs = getRecommendations();

  // Filter recommendations based on active states
  let filtered = allRecs.filter(item => {
    const asset = item.asset;
    
    // Asset filter
    if (activeAssetFilter !== 'ALL' && asset.assetType !== activeAssetFilter) {
      return false;
    }

    // Market filter
    if (activeMarketFilter !== 'ALL' && asset.market !== activeMarketFilter) {
      return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match = asset.ticker.toLowerCase().includes(q) ||
                    asset.displayTicker.toLowerCase().includes(q) ||
                    asset.name.toLowerCase().includes(q) ||
                    asset.sector.toLowerCase().includes(q);
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

  // Summary counts
  const countShort = allRecs.filter(r => r.bestFitHorizon === HORIZONS.SHORT_TERM).length;
  const countMedium = allRecs.filter(r => r.bestFitHorizon === HORIZONS.MEDIUM_TERM).length;
  const countLong = allRecs.filter(r => r.bestFitHorizon === HORIZONS.LONG_TERM).length;

  container.innerHTML = `
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
              Algorithmic quantitative recommendations across <strong>Stocks, ETFs & Benchmark Indices</strong> for 
              <strong>Short Term</strong> (1D–6M), <strong>Medium Term</strong> (6M–2Y), and <strong>Long Term</strong> (>2Y) investing.
            </p>
          </div>
        </div>
      </div>

      <!-- Quick KPI Horizon Stats & Live Status & Exit Action -->
      <div class="horizon-header-actions-wrap" style="display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;">
        <div class="horizon-stats-row">
          <div class="horizon-stat-pill" data-horizon="SHORT_TERM">
            <span class="stat-horizon-icon text-amber">⚡</span>
            <div>
              <span class="stat-horizon-val">${countShort} Setups</span>
              <span class="stat-horizon-lbl text-dim">Short-Term (1D–6M)</span>
            </div>
          </div>
          <div class="horizon-stat-pill" data-horizon="MEDIUM_TERM">
            <span class="stat-horizon-icon text-cyan">📈</span>
            <div>
              <span class="stat-horizon-val">${countMedium} Setups</span>
              <span class="stat-horizon-lbl text-dim">Medium-Term (6M–2Y)</span>
            </div>
          </div>
          <div class="horizon-stat-pill" data-horizon="LONG_TERM">
            <span class="stat-horizon-icon text-emerald">🏛️</span>
            <div>
              <span class="stat-horizon-val">${countLong} Setups</span>
              <span class="stat-horizon-lbl text-dim">Long-Term (&gt;2Y)</span>
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
          <button class="h-chip ${activeHorizonFilter === 'ALL' ? 'active' : ''}" data-val="ALL">
            All Horizons
          </button>
          <button class="h-chip ${activeHorizonFilter === 'SHORT_TERM' ? 'active' : ''}" data-val="SHORT_TERM">
            <span>⚡ Short-Term</span> <span class="chip-sub">1D – 6M</span>
          </button>
          <button class="h-chip ${activeHorizonFilter === 'MEDIUM_TERM' ? 'active' : ''}" data-val="MEDIUM_TERM">
            <span>📈 Medium-Term</span> <span class="chip-sub">6M – 2Y (GARP)</span>
          </button>
          <button class="h-chip ${activeHorizonFilter === 'LONG_TERM' ? 'active' : ''}" data-val="LONG_TERM">
            <span>🏛️ Long-Term</span> <span class="chip-sub">&gt;2Y (Compounding)</span>
          </button>
        </div>
      </div>

      <!-- Row 2: Asset Class, Market, Search, and Sort Controls -->
      <div class="filter-row-secondary">
        <!-- Asset Class Filter -->
        <div class="filter-subgroup">
          <span class="filter-sublabel text-dim font-mono">Asset:</span>
          <div class="btn-group-toggle" id="assetFilterGroup">
            <button class="btn-toggle-sm ${activeAssetFilter === 'ALL' ? 'active' : ''}" data-val="ALL">All Assets</button>
            <button class="btn-toggle-sm ${activeAssetFilter === 'STOCK' ? 'active' : ''}" data-val="STOCK">🏢 Stocks</button>
            <button class="btn-toggle-sm ${activeAssetFilter === 'ETF' ? 'active' : ''}" data-val="ETF">📦 ETFs</button>
            <button class="btn-toggle-sm ${activeAssetFilter === 'INDEX' ? 'active' : ''}" data-val="INDEX">📊 Indices</button>
          </div>
        </div>

        <!-- Market Filter -->
        <div class="filter-subgroup">
          <span class="filter-sublabel text-dim font-mono">Market:</span>
          <div class="btn-group-toggle" id="marketFilterGroup">
            <button class="btn-toggle-sm ${activeMarketFilter === 'ALL' ? 'active' : ''}" data-val="ALL">🌐 All</button>
            <button class="btn-toggle-sm ${activeMarketFilter === 'IN' ? 'active' : ''}" data-val="IN">🇮🇳 NSE India</button>
            <button class="btn-toggle-sm ${activeMarketFilter === 'US' ? 'active' : ''}" data-val="US">🇺🇸 US Market</button>
          </div>
        </div>

        <!-- Search Input -->
        <div class="scanner-search-box">
          <i data-lucide="search" class="scanner-search-icon"></i>
          <input 
            type="text" 
            id="horizonSearchInput" 
            class="scanner-search-input" 
            placeholder="Search stock, ETF, index (e.g. NIFTY, NVDA, SPY, TATAMOTORS)..."
            value="${searchQuery}"
          />
          ${searchQuery ? '<button id="clearHorizonSearchBtn" class="clear-search-mini">&times;</button>' : ''}
        </div>

        <!-- Sort Criteria -->
        <div class="filter-subgroup sort-subgroup">
          <span class="filter-sublabel text-dim font-mono">Sort:</span>
          <select id="horizonSortSelect" class="scanner-sort-select" aria-label="Sort horizon recommendations">
            <option value="score" ${activeSortCriteria === 'score' ? 'selected' : ''}>Quant Score (Highest)</option>
            <option value="upside" ${activeSortCriteria === 'upside' ? 'selected' : ''}>Target Upside %</option>
            <option value="cagr" ${activeSortCriteria === 'cagr' ? 'selected' : ''}>Expected CAGR</option>
            <option value="ticker" ${activeSortCriteria === 'ticker' ? 'selected' : ''}>Ticker (A-Z)</option>
          </select>
        </div>

        <!-- View Mode (Cards / Table) -->
        <div class="view-mode-toggle" id="viewModeToggle">
          <button class="btn-toggle-sm ${currentViewMode === 'cards' ? 'active' : ''}" data-val="cards" title="Cards View">
            <i data-lucide="layout-grid" class="inline-icon"></i> Cards
          </button>
          <button class="btn-toggle-sm ${currentViewMode === 'table' ? 'active' : ''}" data-val="table" title="Table View">
            <i data-lucide="table" class="inline-icon"></i> Table
          </button>
        </div>
      </div>
    </div>

    <!-- Results Header -->
    <div class="horizon-results-header">
      <span class="results-count font-mono">
        Showing <strong>${filtered.length}</strong> quantitative recommendations
        ${activeHorizonFilter !== 'ALL' ? `for <span class="highlight-horizon">${HORIZON_LABELS[activeHorizonFilter].title}</span>` : ''}
      </span>
      <span class="results-badge font-mono text-cyan">
        <i data-lucide="shield-check" class="inline-icon"></i> Institutional Multi-Factor Quant
      </span>
    </div>

    <!-- Recommendations Container -->
    <div class="horizon-items-container" id="horizonItemsContainer">
      ${currentViewMode === 'cards' ? renderCardsView(filtered) : renderTableView(filtered)}
    </div>
  `;

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // Bind Event Listeners
  attachHorizonEventListeners(containerId, onSelectAssetForModel, onSelectAssetForTechnicals);
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
        <p class="text-dim">Try adjusting your filters, searching for a different asset, or switching the investment horizon.</p>
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

            <!-- Dedicated Tactical Exit Strategy & Stop Loss -->
            <div class="h-exit-card-section">
              <div class="h-exit-header">
                <span class="h-exit-title">
                  <i data-lucide="shield-alert" class="inline-icon"></i> Exit Strategy & Stop Loss
                </span>
                <span class="h-exit-rr-badge font-mono font-bold">
                  ${evaluation.exitStrategy.riskRewardRatio} Risk:Reward
                </span>
              </div>

              <div class="h-exit-grid">
                <!-- Target 1 -->
                <div class="h-exit-col col-target1">
                  <span class="h-exit-lbl text-emerald">🎯 Target 1 (Partial)</span>
                  <span class="h-exit-price font-mono font-bold text-emerald">
                    ${curr}${evaluation.exitStrategy.target1Price.toLocaleString()}
                  </span>
                  <span class="h-exit-sub text-emerald font-mono">
                    ${evaluation.exitStrategy.target1GainPct}
                  </span>
                </div>

                <!-- Target 2 -->
                <div class="h-exit-col col-target2">
                  <span class="h-exit-lbl text-cyan">🚀 Target 2 (Runner)</span>
                  <span class="h-exit-price font-mono font-bold text-cyan">
                    ${curr}${evaluation.exitStrategy.target2Price.toLocaleString()}
                  </span>
                  <span class="h-exit-sub text-cyan font-mono">
                    ${evaluation.exitStrategy.target2GainPct}
                  </span>
                </div>

                <!-- Stop Loss -->
                <div class="h-exit-col col-stoploss">
                  <span class="h-exit-lbl text-rose">🛑 Stop Loss</span>
                  <span class="h-exit-price font-mono font-bold text-rose">
                    ${curr}${evaluation.exitStrategy.stopLossPrice.toLocaleString()}
                  </span>
                  <span class="h-exit-sub text-rose font-mono">
                    ${evaluation.exitStrategy.stopLossPct}
                  </span>
                </div>
              </div>

              <!-- Rules & Execution -->
              <div class="h-exit-rules">
                <div class="h-exit-rule-item">
                  <span class="rule-icon-tag tag-sl">Exit Trigger</span>
                  <span>${evaluation.exitStrategy.stopLossRule}</span>
                </div>
                <div class="h-exit-rule-item">
                  <span class="rule-icon-tag tag-trail">Trailing Rule</span>
                  <span>${evaluation.exitStrategy.trailingStopRule}</span>
                </div>
                <div class="h-exit-rule-item">
                  <span class="rule-icon-tag tag-time">Time Exit</span>
                  <span>${evaluation.exitStrategy.timeExitRule}</span>
                </div>
              </div>
            </div>

            <!-- Dedicated Quantitative Reasoning & Rationale -->
            <div class="h-reasoning-section">
              <div class="h-reasoning-header">
                <span><i data-lucide="brain" class="inline-icon"></i> Quantitative Reasoning & Catalyst</span>
                <span class="badge badge-asset-type font-mono" style="font-size: 0.65rem;">Multi-Factor Model</span>
              </div>
              <p class="h-reasoning-summary">${evaluation.reasoning.summary}</p>

              <div class="h-pillars-grid">
                ${evaluation.reasoning.pillars.map(p => `
                  <div class="h-pillar-card">
                    <div class="h-pillar-top">
                      <i data-lucide="${p.icon}" class="h-pillar-icon"></i>
                      <span>${p.title}</span>
                    </div>
                    <p class="h-pillar-text">${p.detail}</p>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Action Toolbar -->
            <div class="h-card-actions">
              <button class="btn btn-primary btn-sm btn-action-model" data-ticker="${asset.ticker}">
                <i data-lucide="calculator"></i> Simulate in Model
              </button>
              <button class="btn btn-outline btn-sm btn-action-tech" data-ticker="${asset.ticker}">
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
            <th>Type</th>
            <th>Horizon & Strategy</th>
            <th>Current Price</th>
            <th>Targets (T1 / T2)</th>
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
            const exit = evaluation.exitStrategy;
            const isChgPositive = asset.changePercent >= 0;

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
                <td><span class="badge badge-asset-type font-mono">${asset.assetType}</span></td>
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
                  <div class="table-targets-cell font-mono">
                    <span class="text-emerald font-bold">T1: ${curr}${exit.target1Price.toLocaleString()} (${exit.target1GainPct})</span>
                    <span class="text-cyan">T2: ${curr}${exit.target2Price.toLocaleString()} (${exit.target2GainPct})</span>
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
 * Attach Event Listeners to Horizon Scanner Controls
 */
function attachHorizonEventListeners(containerId, onSelectAssetForModel, onSelectAssetForTechnicals) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Exit Horizon Scanner View Button
  const exitBtn = container.querySelector('#exitHorizonScannerBtn');
  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      if (typeof window.exitHorizonScanner === 'function') {
        window.exitHorizonScanner();
      }
    });
  }

  // Real-Time Live Sync Button
  const liveSyncBtn = container.querySelector('#horizonLiveSyncBtn');
  if (liveSyncBtn) {
    liveSyncBtn.addEventListener('click', () => {
      syncHorizonScannerRealtime(containerId, onSelectAssetForModel, onSelectAssetForTechnicals);
      showHorizonToast('Syncing real-time market data across all 28 assets...');
    });
  }

  // Horizon Filter Chips
  container.querySelectorAll('#horizonFilterGroup .h-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeHorizonFilter = e.currentTarget.dataset.val;
      renderHorizonScanner(containerId, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  });

  // Top stat pills quick jump
  container.querySelectorAll('.horizon-stat-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      activeHorizonFilter = e.currentTarget.dataset.horizon;
      renderHorizonScanner(containerId, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  });

  // Asset Class Toggle
  container.querySelectorAll('#assetFilterGroup .btn-toggle-sm').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeAssetFilter = e.currentTarget.dataset.val;
      renderHorizonScanner(containerId, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  });

  // Market Filter Toggle
  container.querySelectorAll('#marketFilterGroup .btn-toggle-sm').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeMarketFilter = e.currentTarget.dataset.val;
      renderHorizonScanner(containerId, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  });

  // View Mode Toggle
  container.querySelectorAll('#viewModeToggle .btn-toggle-sm').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentViewMode = e.currentTarget.dataset.val;
      renderHorizonScanner(containerId, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  });

  // Sort Select Dropdown
  const sortSelect = container.querySelector('#horizonSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      activeSortCriteria = e.target.value;
      renderHorizonScanner(containerId, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  }

  // Search Input
  const searchInput = container.querySelector('#horizonSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderHorizonScanner(containerId, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  }

  const clearSearchBtn = container.querySelector('#clearHorizonSearchBtn');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchQuery = '';
      renderHorizonScanner(containerId, onSelectAssetForModel, onSelectAssetForTechnicals);
    });
  }

  // Action: Clickable Asset Header & Cell
  container.querySelectorAll('.h-clickable-asset').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const ticker = el.dataset.ticker;
      if (ticker && typeof onSelectAssetForModel === 'function') {
        onSelectAssetForModel(ticker);
      }
    });
  });

  // Action: Simulate in Model Button
  container.querySelectorAll('.btn-action-model').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ticker = e.currentTarget.dataset.ticker;
      if (typeof onSelectAssetForModel === 'function') {
        onSelectAssetForModel(ticker);
      }
    });
  });

  // Action: Technicals Button
  container.querySelectorAll('.btn-action-tech').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ticker = e.currentTarget.dataset.ticker;
      if (typeof onSelectAssetForTechnicals === 'function') {
        onSelectAssetForTechnicals(ticker);
      }
    });
  });

  // Action: Share / Copy Button
  container.querySelectorAll('.btn-action-copy').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ticker = e.currentTarget.dataset.ticker;
      const rec = getRecommendations().find(r => r.asset.ticker === ticker);
      if (rec) {
        const activeH = activeHorizonFilter === 'ALL' ? rec.bestFitHorizon : activeHorizonFilter;
        const evaluation = rec.evaluations[activeH];
        const asset = rec.asset;
        const curr = asset.currencySymbol || (asset.market === 'IN' ? '₹' : '$');
        const exit = evaluation.exitStrategy;
        const reasoning = evaluation.reasoning;

        const copyText = [
          `🎯 QUANT HORIZON RECOMMENDATION: [${asset.displayTicker}] ${asset.name}`,
          `Market: ${asset.market === 'US' ? 'US Market (USD)' : 'NSE India (INR)'} | Type: ${asset.assetType}`,
          `Horizon: ${evaluation.horizonMeta.title} (${evaluation.timeframe})`,
          `Strategy: ${evaluation.strategyType} | Conviction: ${evaluation.conviction} (${evaluation.score}/100)`,
          `Current Price: ${curr}${asset.price.toLocaleString()}`,
          ``,
          `📊 EXIT STRATEGY & STOP LOSS:`,
          `• Target 1 (Partial 50% Profit): ${curr}${exit.target1Price.toLocaleString()} (${exit.target1GainPct})`,
          `  Action: ${exit.target1Action}`,
          `• Target 2 (Runner / Objective): ${curr}${exit.target2Price.toLocaleString()} (${exit.target2GainPct})`,
          `  Action: ${exit.target2Action}`,
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
        showHorizonToast(`Exit strategy & reasoning for ${asset.displayTicker} copied!`);

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
 * Toast Notification for Horizon Scanner
 */
function showHorizonToast(msg) {
  const existing = document.querySelector('.horizon-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'horizon-toast';
  toast.innerHTML = `<i data-lucide="check-circle" class="text-emerald" style="width: 18px; height: 18px;"></i> <span>${msg}</span>`;
  document.body.appendChild(toast);
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px)';
    setTimeout(() => toast.remove(), 320);
  }, 2600);
}

