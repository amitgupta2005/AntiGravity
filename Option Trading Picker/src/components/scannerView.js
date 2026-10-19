/**
 * Option Strategy Scanner View Component
 * Multi-filter strategy scanner with real-time analytics and one-click deep dives
 */

import { STRATEGY_CATEGORIES } from '../quant/strategyEngine.js';

/**
 * Filter strategies based on active filter state
 */
export function filterStrategies(strategies, filters) {
  if (!Array.isArray(strategies)) return [];

  return strategies.filter(strat => {
    // 1. Market Filter (All, US, IN)
    if (filters.market && filters.market !== 'ALL' && strat.market !== filters.market) {
      return false;
    }

    // 2. Instrument Type Filter (All, STOCK, INDEX)
    if (filters.assetType && filters.assetType !== 'ALL' && strat.type !== filters.assetType) {
      return false;
    }

    // 3. Strategy Category Filter
    if (filters.category && filters.category !== 'ALL' && strat.category !== filters.category) {
      return false;
    }

    // 4. Sentiment Filter (All, Bullish, Bearish, Neutral)
    if (filters.sentiment && filters.sentiment !== 'ALL' && strat.sentiment !== filters.sentiment) {
      return false;
    }

    // 5. IV Rank Filter
    if (filters.ivRank) {
      if (filters.ivRank === 'HIGH' && strat.ivRank < 50) return false;
      if (filters.ivRank === 'LOW' && strat.ivRank >= 35) return false;
    }

    // 6. POP Filter
    if (filters.minPop && strat.pop < Number(filters.minPop)) {
      return false;
    }

    // 7. Search Text Filter (Ticker or Name)
    if (filters.searchQuery) {
      const q = filters.searchQuery.trim().toLowerCase();
      const matchTicker = strat.ticker.toLowerCase().includes(q);
      const matchDisplay = strat.displayTicker.toLowerCase().includes(q);
      const matchName = strat.name.toLowerCase().includes(q);
      const matchStrat = strat.strategyName.toLowerCase().includes(q);
      if (!matchTicker && !matchDisplay && !matchName && !matchStrat) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Render strategy cards into the scanner container
 */
export function renderScannerCards(containerId, strategies, onSelectStrategy, onViewChain, onCustomBuild) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (strategies.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        <i data-lucide="filter-x" class="empty-icon"></i>
        <h3>No Option Strategies Matched</h3>
        <p>Try broadening your filters (Market, Strategy Category, or Sentiment) or clear the search query.</p>
        <button class="btn btn-secondary" id="btnResetFilters">
          <i data-lucide="rotate-ccw"></i> Reset Filters
        </button>
      </div>
    `;
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
    const resetBtn = document.getElementById('btnResetFilters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const evt = new CustomEvent('reset-scanner-filters');
        window.dispatchEvent(evt);
      });
    }
    return;
  }

  container.innerHTML = strategies.map(strat => {
    const curr = strat.currencySymbol;
    const isCredit = strat.isCredit;
    const popClass = strat.pop >= 70 ? 'text-emerald' : strat.pop >= 55 ? 'text-cyan' : 'text-amber';

    const legsHtml = strat.legs.map(leg => {
      const isBuy = leg.action === 'buy';
      const badgeStyle = isBuy ? 'badge-buy' : 'badge-sell';
      const actionText = isBuy ? 'BUY' : 'SELL';
      const typeText = leg.type.toUpperCase();
      return `
        <span class="leg-pill ${badgeStyle}">
          <strong>${actionText}</strong> ${curr}${leg.strike} ${typeText} <span class="leg-prem font-mono">@ ${curr}${leg.premium}</span>
        </span>
      `;
    }).join('');

    const beStr = strat.breakevens.map(b => `${curr}${b}`).join(' & ');

    return `
      <div class="strategy-card" data-id="${strat.id}">
        <!-- Header -->
        <div class="strat-card-header">
          <div class="strat-asset-info">
            <span class="strat-market-flag">${strat.market === 'US' ? '🇺🇸' : '🇮🇳'}</span>
            <div>
              <div class="strat-ticker-row">
                <span class="strat-ticker font-mono font-bold">${strat.displayTicker}</span>
                <span class="badge badge-subtle font-mono">${strat.type}</span>
                <span class="badge ${strat.badgeClass}">${strat.directionBadge}</span>
              </div>
              <span class="strat-asset-name text-dim">${strat.name}</span>
            </div>
          </div>
          <div class="strat-price-block">
            <span class="strat-spot-label text-dim">Spot Price</span>
            <span class="strat-spot-val font-mono font-bold">${curr}${Number(strat.spotPrice).toLocaleString()}</span>
          </div>
        </div>

        <!-- Strategy Identity & DTE -->
        <div class="strat-meta-bar">
          <div class="strat-title-wrap">
            <h4 class="strat-name">${strat.strategyName}</h4>
            <span class="strat-conviction text-dim font-mono">● ${strat.conviction}</span>
          </div>
          <div class="strat-dte-wrap">
            <span class="badge badge-dte font-mono">
              <i data-lucide="clock" class="inline-icon"></i> ${strat.dte} DTE (${strat.expiryLabel})
            </span>
          </div>
        </div>

        <!-- Legs Structure -->
        <div class="strat-legs-box">
          <span class="legs-label text-dim">Structure:</span>
          <div class="legs-list">${legsHtml}</div>
        </div>

        <!-- Core Financial Metrics Grid -->
        <div class="strat-metrics-grid">
          <div class="metric-cell">
            <span class="m-label text-dim">Probability of Profit</span>
            <span class="m-val font-mono font-bold ${popClass}">${strat.pop}% POP</span>
          </div>
          <div class="metric-cell">
            <span class="m-label text-dim">Risk / Reward</span>
            <span class="m-val font-mono font-bold text-cyan">${strat.riskReward}</span>
          </div>
          <div class="metric-cell">
            <span class="m-label text-dim">${isCredit ? 'Max Profit (Net Credit)' : 'Max Profit'}</span>
            <span class="m-val font-mono font-bold text-emerald">
              ${typeof strat.maxProfit === 'number' ? `${curr}${strat.maxProfit.toLocaleString()}` : strat.maxProfit}
            </span>
          </div>
          <div class="metric-cell">
            <span class="m-label text-dim">Max Loss (Risk)</span>
            <span class="m-val font-mono font-bold text-rose">
              ${curr}${strat.maxLoss.toLocaleString()}
            </span>
          </div>
          <div class="metric-cell">
            <span class="m-label text-dim">Breakeven(s)</span>
            <span class="m-val font-mono">${beStr}</span>
          </div>
          <div class="metric-cell">
            <span class="m-label text-dim">IV Rank / Theta</span>
            <span class="m-val font-mono">${strat.ivRank}% IVR • <span class="${strat.netTheta >= 0 ? 'text-emerald' : 'text-rose'}">${strat.netTheta >= 0 ? '+' : ''}${curr}${strat.netTheta}/d</span></span>
          </div>
        </div>

        <!-- Institutional Catalyst Rationale -->
        <div class="strat-catalyst">
          <i data-lucide="zap" class="catalyst-icon text-amber"></i>
          <p class="catalyst-text">${strat.catalyst}</p>
        </div>

        <!-- Action Toolbar -->
        <div class="strat-card-actions">
          <button class="btn btn-primary btn-sm btn-analyze" data-id="${strat.id}">
            <i data-lucide="trending-up"></i> Analyze Payoff Curve
          </button>
          <button class="btn btn-secondary btn-sm btn-chain" data-ticker="${strat.ticker}">
            <i data-lucide="list"></i> Option Chain
          </button>
          <button class="btn btn-ghost btn-sm btn-build" data-id="${strat.id}">
            <i data-lucide="sliders"></i> Customize
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // Bind Event Listeners to Card Buttons
  container.querySelectorAll('.btn-analyze').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const strat = strategies.find(s => s.id === id);
      if (strat && typeof onSelectStrategy === 'function') {
        onSelectStrategy(strat);
      }
    });
  });

  container.querySelectorAll('.btn-chain').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ticker = e.currentTarget.dataset.ticker;
      if (typeof onViewChain === 'function') {
        onViewChain(ticker);
      }
    });
  });

  container.querySelectorAll('.btn-build').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const strat = strategies.find(s => s.id === id);
      if (strat && typeof onCustomBuild === 'function') {
        onCustomBuild(strat);
      }
    });
  });
}
