/**
 * Option Trading Picker — Main Application Controller
 * Handles global state, tabs routing, strategy scanning, option chains, and payoff charting.
 */

import { createIcons, icons } from 'lucide';
import { OPTION_UNIVERSE, findStockInUniverse } from './data/stockUniverse.js';
import { fetchAllUniverseQuotes, fetchLiveQuote, getBaseQuote } from './data/marketDataFeed.js';
import { scanAllUniverseStrategies } from './quant/strategyEngine.js';
import { filterStrategies, renderScannerCards } from './components/scannerView.js';
import { renderPayoffChart, resizePayoffChart } from './components/payoffChart.js';
import { renderOptionChain } from './components/optionChainView.js';
import { initBuilderState, renderStrategyBuilder, addLegToBuilder } from './components/strategyBuilder.js';
import { renderMarketOverview } from './components/marketOverview.js';
import { calculatePayoffProfile } from './quant/payoffCalculator.js';
import { calculateGreeks } from './quant/blackScholes.js';
import { showToast } from './components/toast.js';

// Safe Lucide icon refresh helper
export function refreshIcons() {
  try {
    createIcons({ icons });
  } catch (err) {
    console.warn('Lucide icon refresh warning:', err);
  }
}
window.refreshIcons = refreshIcons;
window.lucide = { createIcons: refreshIcons, icons };

// Global App State
const state = {
  quotes: [],
  strategies: [],
  activeStrategy: null,
  activeChainAsset: OPTION_UNIVERSE[0],
  activeTab: 'tab-scanner',
  isDarkMode: true,
  filters: {
    market: 'ALL',
    assetType: 'ALL',
    category: 'ALL',
    sentiment: 'ALL',
    ivRank: 'ALL',
    minPop: null,
    riskProfile: 'ALL',
    searchQuery: '',
    sortBy: 'POP_DESC'
  }
};

/**
 * Initialize Application
 */
async function initApp() {
  // 1. Setup event listeners immediately so tabs and buttons are responsive
  setupEventListeners();

  // 2. Synchronous baseline initial render (0ms latency, no blocking)
  state.quotes = OPTION_UNIVERSE.map(a => getBaseQuote(a));
  state.strategies = scanAllUniverseStrategies(state.quotes);

  if (state.strategies.length > 0) {
    state.activeStrategy = state.strategies[0];
  }

  // 3. Populate Option Chain Asset Selector dropdown
  populateChainAssetDropdown();

  // 4. Initialize Strategy Builder
  initBuilderState(OPTION_UNIVERSE[0]);

  // 5. Initial Render of Scanner & Active Tab
  renderActiveView();
  refreshIcons();

  // 6. Asynchronously fetch live real-time quotes without blocking
  refreshMarketData().catch(console.error);

  // 7. Start continuous live market pulse (every 5 seconds)
  setInterval(tickMarketSimulation, 5000);
}

/**
 * Fetch and refresh all market data quotes and recalculate strategies
 */
async function refreshMarketData() {
  const clockEl = document.getElementById('marketClock');
  if (clockEl) clockEl.textContent = 'FETCHING LIVE...';

  try {
    const quotes = await fetchAllUniverseQuotes();
    state.quotes = quotes;
    state.strategies = scanAllUniverseStrategies(quotes);
    if (clockEl) clockEl.textContent = `LIVE FEED • ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    console.error('Error refreshing market data:', err);
    if (clockEl) clockEl.textContent = 'FEED ACTIVE (OFFLINE)';
  }

  renderActiveView();
}

/**
 * Populate the Option Chain Asset Selector dropdown
 */
function populateChainAssetDropdown() {
  const select = document.getElementById('chainAssetSelector');
  if (!select) return;

  const usIndices = OPTION_UNIVERSE.filter(a => a.market === 'US' && a.type === 'INDEX');
  const usStocks  = OPTION_UNIVERSE.filter(a => a.market === 'US' && a.type === 'STOCK');
  const inIndices = OPTION_UNIVERSE.filter(a => a.market === 'IN' && a.type === 'INDEX');
  const inStocks  = OPTION_UNIVERSE.filter(a => a.market === 'IN' && a.type === 'STOCK');

  const makeOptGroup = (label, list) => `
    <optgroup label="${label}">
      ${list.map(a => `<option value="${a.ticker}" ${a.ticker === state.activeChainAsset.ticker ? 'selected' : ''}>
        ${a.market === 'US' ? '🇺🇸' : '🇮🇳'} ${a.displayTicker} (${a.name})
      </option>`).join('')}
    </optgroup>
  `;

  select.innerHTML = `
    ${makeOptGroup('🇺🇸 USA Benchmark Indices', usIndices)}
    ${makeOptGroup('🇺🇸 USA High-Liquidity Stocks', usStocks)}
    ${makeOptGroup('🇮🇳 India Benchmark Indices', inIndices)}
    ${makeOptGroup('🇮🇳 India Nifty 50 Stocks', inStocks)}
  `;

  select.addEventListener('change', (e) => {
    const ticker = e.target.value;
    const found = state.quotes.find(q => q.ticker === ticker) || OPTION_UNIVERSE.find(a => a.ticker === ticker);
    if (found) {
      state.activeChainAsset = found;
      renderOptionChainTab();
    }
  });
}

/**
 * Render the currently active tab view
 */
function renderActiveView() {
  if (state.activeTab === 'tab-scanner') {
    renderScannerTab();
  } else if (state.activeTab === 'tab-analyzer') {
    renderAnalyzerTab();
  } else if (state.activeTab === 'tab-chain') {
    renderOptionChainTab();
  } else if (state.activeTab === 'tab-builder') {
    renderStrategyBuilderTab();
  } else if (state.activeTab === 'tab-overview') {
    renderMarketOverviewTab();
  }
}

/**
 * 1. Render Strategy Scanner Tab
 */
function renderScannerTab() {
  let filtered = filterStrategies(state.strategies, state.filters);

  // Sorting
  if (state.filters.sortBy === 'POP_DESC') {
    filtered.sort((a, b) => (b.pop || 0) - (a.pop || 0));
  } else if (state.filters.sortBy === 'IVR_DESC') {
    filtered.sort((a, b) => (b.ivRank || 0) - (a.ivRank || 0));
  } else if (state.filters.sortBy === 'IVR_ASC') {
    filtered.sort((a, b) => (a.ivRank || 0) - (b.ivRank || 0));
  } else if (state.filters.sortBy === 'DTE_ASC') {
    filtered.sort((a, b) => (a.dte || 0) - (b.dte || 0));
  }

  renderScannerCards(
    'scannerCardsContainer',
    filtered,
    // On Select Strategy (Payoff Analysis)
    (strat) => {
      state.activeStrategy = strat;
      switchTab('tab-analyzer');
    },
    // On View Option Chain
    (ticker) => {
      const found = state.quotes.find(q => q.ticker === ticker) || OPTION_UNIVERSE.find(a => a.ticker === ticker);
      if (found) {
        state.activeChainAsset = found;
        const select = document.getElementById('chainAssetSelector');
        if (select) select.value = found.ticker;
        switchTab('tab-chain');
      }
    },
    // On Custom Build
    (strat) => {
      const asset = state.quotes.find(q => q.ticker === strat.ticker) || OPTION_UNIVERSE.find(a => a.ticker === strat.ticker);
      initBuilderState(asset, strat.legs, strat.dte);
      switchTab('tab-builder');
      showToast(`Loaded ${strat.strategyName} into Strategy Builder`, 'success');
    }
  );
}

/**
 * 2. Render Strategy Analyzer & Payoff Tab
 */
function renderAnalyzerTab() {
  const strat = state.activeStrategy;
  if (!strat) return;

  const curr = strat.currencySymbol || '$';
  const S = strat.spotPrice;
  const lotSize = strat.lotSize || 100;
  const dte = strat.dte || 14;
  const ivDecimal = (strat.ivRank ? strat.ivRank / 100 * 0.4 + 0.15 : 0.25);
  const r = strat.currency === 'INR' ? 0.065 : 0.045;

  // Calculate Payoff Profile
  const payoff = calculatePayoffProfile(strat.legs, S, lotSize, dte, ivDecimal, r);

  // Render Header
  const headerEl = document.getElementById('analyzerStrategyHeader');
  if (headerEl) {
    headerEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <span style="font-size: 1.5rem;">${strat.market === 'US' ? '🇺🇸' : '🇮🇳'}</span>
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <h2 class="font-mono font-bold" style="font-size: 1.3rem;">${strat.displayTicker}</h2>
            <span class="badge ${strat.badgeClass || 'badge-bullish'}">${strat.strategyName}</span>
            <span class="badge badge-dte font-mono">${strat.dte} DTE • ${strat.expiryLabel || 'Near Expiry'}</span>
          </div>
          <span class="text-dim" style="font-size: 0.8rem;">${strat.name} • Spot Price: <strong>${curr}${Number(S).toLocaleString()}</strong></span>
        </div>
      </div>
    `;
  }

  // Render Payoff Chart with Disciplined Stop Loss & Target Profit Thresholds
  renderPayoffChart('payoffChartCanvas', payoff, S, curr, state.isDarkMode, strat.exitPlan);

  // Render Analyzer KPI Grid
  const kpiGrid = document.getElementById('analyzerKpiGrid');
  if (kpiGrid && payoff) {
    kpiGrid.innerHTML = `
      <div class="kpi-card">
        <span class="m-label text-dim">Probability of Profit (POP)</span>
        <span class="m-val font-mono font-bold ${strat.pop >= 65 ? 'text-emerald' : 'text-cyan'}" style="font-size: 1.15rem;">
          ${strat.pop}% POP
        </span>
      </div>
      <div class="kpi-card">
        <span class="m-label text-dim">Expiration R:R</span>
        <span class="m-val font-mono font-bold text-cyan" style="font-size: 1.15rem;">
          ${strat.riskReward}
        </span>
      </div>
      <div class="kpi-card">
        <span class="m-label text-dim">${strat.isCredit ? 'Max Profit (Net Credit)' : 'Max Profit'}</span>
        <span class="m-val font-mono font-bold text-emerald" style="font-size: 1.15rem;">
          ${typeof strat.maxProfit === 'number' ? `${curr}${strat.maxProfit.toLocaleString()}` : strat.maxProfit}
        </span>
      </div>
      <div class="kpi-card">
        <span class="m-label text-dim">Max Loss (At Expiry)</span>
        <span class="m-val font-mono font-bold text-rose" style="font-size: 1.15rem;">
          ${typeof strat.maxLoss === 'number' ? `${curr}${strat.maxLoss.toLocaleString()}` : strat.maxLoss}
        </span>
      </div>
      <div class="kpi-card">
        <span class="m-label text-dim">Breakeven Point(s)</span>
        <span class="m-val font-mono font-bold text-primary" style="font-size: 1.05rem;">
          ${strat.breakevens.map(b => `${curr}${b}`).join(' & ')}
        </span>
      </div>
      <div class="kpi-card">
        <span class="m-label text-dim">Net Greeks ($\Delta, \Theta$)</span>
        <span class="m-val font-mono" style="font-size: 0.95rem;">
          Δ: ${payoff.netDelta} • Θ: <span class="${payoff.netTheta >= 0 ? 'text-emerald' : 'text-rose'}">${payoff.netTheta >= 0 ? '+' : ''}${curr}${payoff.netTheta}/d</span>
        </span>
      </div>
      ${strat.exitPlan ? `
        <div class="kpi-card highlight-target" style="border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.06);">
          <span class="m-label text-emerald font-bold">🎯 Win Exit: Target Booking</span>
          <span class="m-val font-mono font-bold text-emerald" style="font-size: 1.15rem;">
            ${curr}${strat.exitPlan.targetBooking.spotPrice} (${strat.exitPlan.targetBooking.spotPct})
          </span>
          <span class="text-emerald font-mono font-bold" style="font-size: 0.78rem;">+${curr}${strat.exitPlan.targetBooking.profitPerLot.toLocaleString()} / lot (${strat.exitPlan.targetBooking.profitPct})</span>
          <span class="text-dim" style="font-size: 0.68rem; margin-top: 3px; line-height: 1.3;">👉 ${strat.exitPlan.targetBooking.laymanAction || strat.exitPlan.targetBooking.rule}</span>
        </div>
        <div class="kpi-card highlight-stop" style="border-color: rgba(244, 63, 94, 0.4); background: rgba(244, 63, 94, 0.06);">
          <span class="m-label text-rose font-bold">🛑 Defense Exit: Stop Loss</span>
          <span class="m-val font-mono font-bold text-rose" style="font-size: 1.15rem;">
            ${curr}${strat.exitPlan.stopLoss.spotPrice} (${strat.exitPlan.stopLoss.spotPct})
          </span>
          <span class="text-rose font-mono font-bold" style="font-size: 0.78rem;">-${curr}${strat.exitPlan.stopLoss.lossPerLot.toLocaleString()} / lot (${strat.exitPlan.stopLoss.lossPct})</span>
          <span class="text-dim" style="font-size: 0.68rem; margin-top: 3px; line-height: 1.3;">👉 ${strat.exitPlan.stopLoss.laymanAction || strat.exitPlan.stopLoss.rule}</span>
        </div>
        <div class="kpi-card" style="border-color: rgba(0, 242, 254, 0.3); background: rgba(0, 242, 254, 0.05);">
          <span class="m-label text-cyan font-bold">⚖️ Layman Rule</span>
          <span class="m-val font-mono font-bold text-cyan" style="font-size: 1.15rem;">
            ${strat.exitPlan.managedRiskReward} R:R
          </span>
          <span class="text-dim font-mono" style="font-size: 0.72rem;">🛡️ Preserves ${strat.exitPlan.capitalPreservedPct}% Capital</span>
          <span class="text-dim" style="font-size: 0.68rem; margin-top: 3px; line-height: 1.3;">${strat.exitPlan.laymanSummary?.plainRule || ''}</span>
        </div>
      ` : ''}
    `;
  }

  // Render Legs Table Body
  const legsTableBody = document.getElementById('analyzerLegsTableBody');
  if (legsTableBody) {
    legsTableBody.innerHTML = strat.legs.map(leg => {
      const isBuy = leg.action === 'buy';
      const actionBadge = isBuy
        ? '<span class="badge badge-buy">BUY (LONG)</span>'
        : '<span class="badge badge-sell">SELL (SHORT)</span>';
      
      const typeBadge = leg.type === 'call'
        ? '<span class="text-emerald font-bold">CALL</span>'
        : '<span class="text-rose font-bold">PUT</span>';

      const cost = Number((leg.premium * (leg.contracts || 1) * lotSize).toFixed(2));
      const greeks = calculateGreeks(leg.type, S, leg.strike, dte / 365, r, ivDecimal);
      const sign = isBuy ? 1 : -1;
      const legDelta = Number((sign * greeks.delta).toFixed(3));
      const legTheta = Number((sign * greeks.theta * lotSize).toFixed(2));

      return `
        <tr>
          <td>${actionBadge}</td>
          <td>${typeBadge}</td>
          <td class="font-bold text-cyan">${curr}${leg.strike}</td>
          <td class="font-mono">${curr}${leg.premium.toFixed(2)}</td>
          <td>${leg.contracts || 1}</td>
          <td class="font-mono font-bold ${isBuy ? 'text-rose' : 'text-emerald'}">
            ${isBuy ? '-' : '+'}${curr}${cost.toLocaleString()}
          </td>
          <td class="${legDelta >= 0 ? 'text-emerald' : 'text-rose'}">${legDelta}</td>
          <td class="${legTheta >= 0 ? 'text-emerald' : 'text-rose'}">${legTheta >= 0 ? '+' : ''}${curr}${legTheta}/d</td>
        </tr>
      `;
    }).join('');
  }

  // Bind Buttons in Analyzer Header
  const btnChain = document.getElementById('btnOpenChainFromAnalyzer');
  if (btnChain) {
    btnChain.onclick = () => {
      const found = state.quotes.find(q => q.ticker === strat.ticker) || OPTION_UNIVERSE.find(a => a.ticker === strat.ticker);
      if (found) {
        state.activeChainAsset = found;
        const select = document.getElementById('chainAssetSelector');
        if (select) select.value = found.ticker;
        switchTab('tab-chain');
      }
    };
  }

  const btnEdit = document.getElementById('btnEditInBuilder');
  if (btnEdit) {
    btnEdit.onclick = () => {
      const asset = state.quotes.find(q => q.ticker === strat.ticker) || OPTION_UNIVERSE.find(a => a.ticker === strat.ticker);
      initBuilderState(asset, strat.legs, strat.dte);
      switchTab('tab-builder');
      showToast(`Loaded ${strat.strategyName} into Strategy Builder`, 'success');
    };
  }
}

/**
 * 3. Render Live Option Chain Tab
 */
function renderOptionChainTab() {
  const asset = state.activeChainAsset;
  const quote = state.quotes.find(q => q.ticker === asset.ticker) || asset;

  renderOptionChain(
    'optionChainContainer',
    quote,
    null,
    // Callback when clicking Bid/Ask to add leg to builder
    ({ quote: legQuote, leg, dte }) => {
      addLegToBuilder(leg);
      showToast(`Added ${leg.label} to Strategy Builder!`, 'success');
    }
  );
}

/**
 * 4. Render Strategy Builder Tab
 */
function renderStrategyBuilderTab() {
  renderStrategyBuilder('strategyBuilderContainer', ({ asset, legs, dte, payoff }) => {
    // Sync custom build into activeStrategy and switch to Payoff Analyzer
    const curr = asset.currencySymbol || '$';
    const isCredit = payoff.isCredit;
    const customStrat = {
      id: `CUSTOM-${Date.now()}`,
      ticker: asset.ticker,
      displayTicker: asset.displayTicker,
      name: asset.name,
      market: asset.market,
      type: asset.type,
      currency: asset.currency,
      currencySymbol: curr,
      strategyName: 'Custom Multi-Leg Combo',
      category: 'CUSTOM',
      sentiment: payoff.netDelta > 5 ? 'Bullish' : payoff.netDelta < -5 ? 'Bearish' : 'Neutral',
      directionBadge: payoff.netDelta > 5 ? 'Custom Bullish' : payoff.netDelta < -5 ? 'Custom Bearish' : 'Custom Neutral',
      badgeClass: payoff.netDelta > 5 ? 'badge-bullish' : payoff.netDelta < -5 ? 'badge-bearish' : 'badge-neutral',
      conviction: 'User Designed',
      dte,
      expiryLabel: `${dte} DTE`,
      spotPrice: asset.price || asset.basePrice,
      targetPrice: asset.price || asset.basePrice,
      legs,
      netCost: Math.abs(payoff.netPremiumPaid),
      isCredit,
      maxProfit: payoff.maxProfit,
      maxLoss: payoff.maxLoss,
      breakevens: payoff.breakevens,
      riskReward: payoff.riskReward,
      pop: 68.0,
      ivRank: asset.ivRank || 45,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst: 'Custom synthesized strategy plotted directly from Strategy Builder.'
    };

    state.activeStrategy = customStrat;
    switchTab('tab-analyzer');
    showToast('Plotted custom strategy on Payoff Curve!', 'success');
  });
}

/**
 * 5. Render Market Overview Tab
 */
function renderMarketOverviewTab() {
  renderMarketOverview('marketOverviewContainer', state.quotes, (ticker) => {
    const found = state.quotes.find(q => q.ticker === ticker) || OPTION_UNIVERSE.find(a => a.ticker === ticker);
    if (found) {
      state.activeChainAsset = found;
      const select = document.getElementById('chainAssetSelector');
      if (select) select.value = found.ticker;
      switchTab('tab-chain');
    }
  });
}

/**
 * Switch Active Tab
 */
function switchTab(tabId) {
  state.activeTab = tabId;

  // Update tab buttons
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Update tab panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  // Re-render
  renderActiveView();

  if (tabId === 'tab-analyzer') {
    setTimeout(resizePayoffChart, 50);
  }
}

/**
 * Setup All Event Listeners
 */
function setupEventListeners() {
  // 1. Navigation Tab Buttons
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabId = e.currentTarget.dataset.tab;
      switchTab(tabId);
    });
  });

  // 2. Quick Market Chips
  document.querySelectorAll('.market-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.market-chip').forEach(c => c.classList.remove('active'));
      e.currentTarget.classList.add('active');

      const filterType = e.currentTarget.dataset.marketFilter;
      if (filterType === 'ALL') {
        state.filters.market = 'ALL';
        state.filters.assetType = 'ALL';
      } else if (filterType === 'US_STOCKS') {
        state.filters.market = 'US';
        state.filters.assetType = 'STOCK';
      } else if (filterType === 'US_INDICES') {
        state.filters.market = 'US';
        state.filters.assetType = 'INDEX';
      } else if (filterType === 'IN_STOCKS') {
        state.filters.market = 'IN';
        state.filters.assetType = 'STOCK';
      } else if (filterType === 'IN_INDICES') {
        state.filters.market = 'IN';
        state.filters.assetType = 'INDEX';
      }

      // Sync filter toolbar pills
      syncFilterToolbar();
      switchTab('tab-scanner');
      renderScannerTab();
    });
  });

  // 3. Filter Toolbar Controls
  // Market Pills
  document.querySelectorAll('#filterMarketGroup .filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('#filterMarketGroup .filter-pill').forEach(p => p.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.filters.market = e.currentTarget.dataset.val;
      renderScannerTab();
    });
  });

  // Asset Type Pills
  document.querySelectorAll('#filterAssetTypeGroup .filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('#filterAssetTypeGroup .filter-pill').forEach(p => p.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.filters.assetType = e.currentTarget.dataset.val;
      renderScannerTab();
    });
  });

  // Sentiment Pills
  document.querySelectorAll('#filterSentimentGroup .filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('#filterSentimentGroup .filter-pill').forEach(p => p.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.filters.sentiment = e.currentTarget.dataset.val;
      renderScannerTab();
    });
  });

  // Category Dropdown
  const catSelect = document.getElementById('filterCategory');
  if (catSelect) {
    catSelect.addEventListener('change', (e) => {
      state.filters.category = e.target.value;
      renderScannerTab();
    });
  }

  // IV Rank Dropdown
  const ivSelect = document.getElementById('filterIVRank');
  if (ivSelect) {
    ivSelect.addEventListener('change', (e) => {
      state.filters.ivRank = e.target.value;
      renderScannerTab();
    });
  }

  // Min POP Dropdown
  const popSelect = document.getElementById('filterMinPOP');
  if (popSelect) {
    popSelect.addEventListener('change', (e) => {
      state.filters.minPop = e.target.value || null;
      renderScannerTab();
    });
  }

  // Risk Profile Dropdown
  const riskSelect = document.getElementById('filterRiskProfile');
  if (riskSelect) {
    riskSelect.addEventListener('change', (e) => {
      state.filters.riskProfile = e.target.value;
      renderScannerTab();
    });
  }

  // Sort By Dropdown
  const sortSelect = document.getElementById('filterSortBy');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.filters.sortBy = e.target.value;
      renderScannerTab();
    });
  }

  // 4. Omnibar Search
  const searchInput = document.getElementById('globalSearchInput');
  const clearBtn = document.getElementById('btnClearSearch');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      state.filters.searchQuery = q;
      if (clearBtn) clearBtn.style.display = q ? 'inline-flex' : 'none';
      if (state.activeTab !== 'tab-scanner') {
        switchTab('tab-scanner');
      } else {
        renderScannerTab();
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        const found = findStockInUniverse(q);
        if (found) {
          state.activeChainAsset = found;
          const select = document.getElementById('chainAssetSelector');
          if (select) select.value = found.ticker;
          switchTab('tab-chain');
          showToast(`Opened Option Chain for ${found.name}`, 'info');
        }
      }
    });
  }

  if (clearBtn && searchInput) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.filters.searchQuery = '';
      clearBtn.style.display = 'none';
      renderScannerTab();
    });
  }

  // 5. Reset Filter Event
  window.addEventListener('reset-scanner-filters', () => {
    state.filters = {
      market: 'ALL',
      assetType: 'ALL',
      category: 'ALL',
      sentiment: 'ALL',
      ivRank: 'ALL',
      minPop: null,
      riskProfile: 'ALL',
      searchQuery: '',
      sortBy: 'POP_DESC'
    };
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    syncFilterToolbar();
    renderScannerTab();
    showToast('Filters reset to default', 'info');
  });

  // 6. Refresh Button
  const refreshBtn = document.getElementById('btnRefreshData');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      showToast('Refreshing live market quotes...', 'info');
      await refreshMarketData();
      showToast('Market quotes updated!', 'success');
    });
  }

  // 7. Theme Toggle Button
  const themeBtn = document.getElementById('btnThemeToggle');
  const themeIcon = document.getElementById('themeIcon');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      state.isDarkMode = !state.isDarkMode;
      document.body.classList.toggle('light-theme', !state.isDarkMode);
      document.body.classList.toggle('dark-theme', state.isDarkMode);
      if (themeIcon) {
        themeIcon.setAttribute('data-lucide', state.isDarkMode ? 'sun' : 'moon');
        refreshIcons();
      }
      if (state.activeTab === 'tab-analyzer') {
        renderAnalyzerTab();
      }
    });
  }

  // Window resize handler for charts
  window.addEventListener('resize', () => {
    if (state.activeTab === 'tab-analyzer') {
      resizePayoffChart();
    }
  });
}

/**
 * Sync Filter Toolbar pills & selects with state
 */
function syncFilterToolbar() {
  document.querySelectorAll('#filterMarketGroup .filter-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.val === state.filters.market);
  });
  document.querySelectorAll('#filterAssetTypeGroup .filter-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.val === state.filters.assetType);
  });
  document.querySelectorAll('#filterSentimentGroup .filter-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.val === state.filters.sentiment);
  });
  const cat = document.getElementById('filterCategory');
  if (cat) cat.value = state.filters.category;
  const iv = document.getElementById('filterIVRank');
  if (iv) iv.value = state.filters.ivRank;
  const pop = document.getElementById('filterMinPOP');
  if (pop) pop.value = state.filters.minPop || '';
  const risk = document.getElementById('filterRiskProfile');
  if (risk) risk.value = state.filters.riskProfile || 'ALL';
  const sort = document.getElementById('filterSortBy');
  if (sort) sort.value = state.filters.sortBy;
}

/**
 * Real-time continuous market simulation tick
 */
function tickMarketSimulation() {
  if (state.quotes.length === 0) return;

  // Pick 3 random quotes to simulate live tick fluctuations
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * state.quotes.length);
    const q = state.quotes[idx];
    const delta = (Math.random() - 0.49) * 0.0015 * q.price;
    q.price = Number((q.price + delta).toFixed(2));
    q.change = Number((q.change + delta).toFixed(2));
    q.changePercent = Number(((q.change / q.basePrice) * 100).toFixed(2));
  }

  // If viewing Option Chain or Market Overview, live refresh DOM
  if (state.activeTab === 'tab-chain') {
    renderOptionChainTab();
  } else if (state.activeTab === 'tab-overview') {
    renderMarketOverviewTab();
  }
}

// Bootstrap App
document.addEventListener('DOMContentLoaded', initApp);
