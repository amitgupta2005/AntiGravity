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

let activeHorizonFilter = 'ALL';   // 'ALL' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM'
let activeAssetFilter = 'ALL';     // 'ALL' | 'STOCK' | 'ETF' | 'INDEX'
let activeMarketFilter = 'ALL';    // 'ALL' | 'IN' | 'US'
let activeConvictionFilter = 'ALL';// 'ALL' | 'STRONG_BUY' | 'BUY'
let activeSortCriteria = 'score';  // 'score' | 'upside' | 'cagr' | 'ticker'
let currentViewMode = 'cards';     // 'cards' | 'table'
let searchQuery = '';

let cachedRecommendations = null;

export function getRecommendations() {
  if (!cachedRecommendations) {
    cachedRecommendations = generateHorizonRecommendations(HORIZON_UNIVERSE);
  }
  return cachedRecommendations;
}

/**
 * Render the Quant Horizon Scanner into its container
 */
export function renderHorizonScanner(containerId, onSelectAssetForModel, onSelectAssetForTechnicals) {
  const container = document.getElementById(containerId);
  if (!container) return;

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

      <!-- Quick KPI Horizon Stats -->
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
              <div class="h-asset-info">
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
                <span class="h-price font-mono font-bold">${curr}${asset.price.toLocaleString()}</span>
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
                <span class="h-m-lbl text-emerald font-bold">🎯 Target Price</span>
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

            <!-- Quantitative Thesis & Rationale -->
            <div class="h-thesis-box">
              <i data-lucide="info" class="inline-icon text-cyan"></i>
              <p class="h-thesis-text">${evaluation.thesis}</p>
            </div>

            <!-- Action Toolbar -->
            <div class="h-card-actions">
              <button class="btn btn-primary btn-sm btn-action-model" data-ticker="${asset.ticker}">
                <i data-lucide="calculator"></i> Simulate in Model
              </button>
              <button class="btn btn-outline btn-sm btn-action-tech" data-ticker="${asset.ticker}">
                <i data-lucide="candlestick-chart"></i> Technicals
              </button>
              <button class="btn btn-ghost btn-sm btn-action-copy" data-ticker="${asset.ticker}" title="Copy Strategy Info">
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
            <th>Horizon</th>
            <th>Strategy</th>
            <th>Price</th>
            <th>Target Price</th>
            <th>Upside %</th>
            <th>Score & Rating</th>
            <th>Key Quantitative Metric</th>
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

            return `
              <tr class="h-table-row">
                <td>
                  <div class="table-asset-cell">
                    <span class="h-flag">${asset.market === 'US' ? '🇺🇸' : '🇮🇳'}</span>
                    <div>
                      <strong class="font-mono">${asset.displayTicker}</strong>
                      <span class="text-dim d-block" style="font-size: 0.72rem;">${asset.name}</span>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge-asset-type font-mono">${asset.assetType}</span></td>
                <td><span class="badge ${hMeta.badgeClass} font-mono">${hMeta.title}</span></td>
                <td><span class="font-medium" style="font-size: 0.8rem;">${evaluation.strategyType}</span></td>
                <td class="font-mono font-bold">${curr}${asset.price.toLocaleString()}</td>
                <td class="font-mono font-bold text-emerald">${curr}${evaluation.targetPrice.toLocaleString()}</td>
                <td class="font-mono font-bold text-emerald">${evaluation.targetGainPct}</td>
                <td>
                  <span class="badge ${evaluation.badgeClass} font-mono" style="font-size: 0.72rem;">
                    ${evaluation.score} • ${evaluation.conviction}
                  </span>
                </td>
                <td class="font-mono" style="font-size: 0.75rem;">
                  ${activeH === 'SHORT_TERM' 
                    ? `R:R ${evaluation.riskReward} • Win: ${evaluation.winProbability}` 
                    : activeH === 'MEDIUM_TERM' 
                      ? `${evaluation.annualizedCAGR} • PEG ${asset.pegRatio || 1.0}` 
                      : `${evaluation.annualizedCAGR} • ${evaluation.compoundMultiplier}`}
                </td>
                <td>
                  <button class="btn btn-outline btn-xs btn-action-model" data-ticker="${asset.ticker}">
                    Simulate
                  </button>
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
        const text = `Quantitative Recommendation for ${rec.asset.displayTicker} (${rec.asset.name}): Target ${rec.asset.currencySymbol || '$'}${rec.evaluations[rec.bestFitHorizon].targetPrice} (${rec.evaluations[rec.bestFitHorizon].targetGainPct} upside over ${rec.evaluations[rec.bestFitHorizon].timeframe})`;
        navigator.clipboard?.writeText(text);
        btn.innerHTML = '<i data-lucide="check" class="text-emerald"></i>';
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
        setTimeout(() => {
          btn.innerHTML = '<i data-lucide="share-2"></i>';
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
          }
        }, 1800);
      }
    });
  });
}
