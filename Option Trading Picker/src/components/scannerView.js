/**
 * Option Strategy Scanner View Component
 * Multi-filter strategy scanner with real-time analytics, Stop Loss & Target Booking exit rules
 * Supports high-density Tabular view (Default) and visual Card Grid view.
 */

import { STRATEGY_CATEGORIES, RISK_PROFILES } from '../quant/strategyEngine.js';

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

    // 2b. Market Cap Filter (All, LARGE, MID, SMALL, MID_SMALL)
    if (filters.cap && filters.cap !== 'ALL') {
      if (filters.cap === 'MID_SMALL') {
        if (strat.cap !== 'MID' && strat.cap !== 'SMALL') return false;
      } else if (strat.cap !== filters.cap) {
        return false;
      }
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

    // 7. Risk Profile Filter (Conservative, Balanced)
    if (filters.riskProfile && filters.riskProfile !== 'ALL') {
      if (strat.exitPlan?.riskProfile !== filters.riskProfile) {
        return false;
      }
    }

    // 8. Search Text Filter (Ticker or Name)
    if (filters.searchQuery) {
      const q = filters.searchQuery.trim().toLowerCase();
      const matchTicker = strat.ticker.toLowerCase().includes(q);
      const matchDisplay = strat.displayTicker.toLowerCase().includes(q);
      const matchName = strat.name.toLowerCase().includes(q);
      const matchStrat = strat.strategyName.toLowerCase().includes(q);
      const matchCap = (strat.cap || '').toLowerCase().includes(q);
      const matchSector = (strat.sector || '').toLowerCase().includes(q);
      if (!matchTicker && !matchDisplay && !matchName && !matchStrat && !matchCap && !matchSector) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Reusable Empty State Renderer
 */
function renderEmptyState(container) {
  container.innerHTML = `
    <div class="empty-state-card">
      <i data-lucide="filter-x" class="empty-icon"></i>
      <h3>No Option Strategies Matched</h3>
      <p>Try broadening your filters (Market, Strategy Category, Risk Profile, or Sentiment) or clear the search query.</p>
      <button class="btn btn-secondary" id="btnResetFilters">
        <i data-lucide="rotate-ccw"></i> Reset Filters
      </button>
    </div>
  `;
  if (typeof window.refreshIcons === 'function') {
    window.refreshIcons();
  }
  const resetBtn = document.getElementById('btnResetFilters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const evt = new CustomEvent('reset-scanner-filters');
      window.dispatchEvent(evt);
    });
  }
}

/**
 * Unified Scanner View Dispatcher (Tabular default vs Cards)
 */
export function renderScannerView(containerId, strategies, viewMode = 'table', onSelectStrategy, onViewChain, onCustomBuild) {
  if (viewMode === 'cards') {
    renderScannerCards(containerId, strategies, onSelectStrategy, onViewChain, onCustomBuild);
  } else {
    renderScannerTable(containerId, strategies, onSelectStrategy, onViewChain, onCustomBuild);
  }
}

/**
 * Render strategy results in high-density Tabular format (Default)
 */
export function renderScannerTable(containerId, strategies, onSelectStrategy, onViewChain, onCustomBuild) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (strategies.length === 0) {
    renderEmptyState(container);
    return;
  }

  const rowsHtml = strategies.map(strat => {
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
      <tr class="scanner-table-row" data-id="${strat.id}">
        <!-- 1. Asset & Price -->
        <td>
          <div class="td-asset-wrap">
            <div class="td-asset-header">
              <span class="strat-market-flag">${strat.market === 'US' ? '🇺🇸' : '🇮🇳'}</span>
              <span class="td-ticker font-bold">${strat.displayTicker}</span>
              <span class="badge badge-subtle font-mono">${strat.type}</span>
              <span class="badge badge-cap font-mono badge-cap-${(strat.cap || 'LARGE').toLowerCase()}">${strat.cap || 'LARGE'}</span>
            </div>
            <div class="td-asset-name text-dim" title="${strat.name}">${strat.name}</div>
            <div class="td-spot-price font-mono text-cyan font-bold">${curr}${Number(strat.spotPrice).toLocaleString()}</div>
          </div>
        </td>

        <!-- 2. Strategy & Bias -->
        <td>
          <div class="td-strat-wrap">
            <div class="td-strat-title font-bold">${strat.strategyName}</div>
            <div class="td-strat-badges">
              <span class="badge ${strat.badgeClass}">${strat.directionBadge}</span>
            </div>
            <div class="td-conviction text-dim font-mono">● ${strat.conviction}</div>
          </div>
        </td>

        <!-- 3. Expiry / DTE -->
        <td>
          <div class="td-expiry-wrap font-mono">
            <div class="td-exp-date font-bold">${strat.transactSpec?.expiryDate || strat.expiryLabel || `${strat.dte} DTE`}</div>
            <div class="td-exp-meta">
              <span class="badge badge-dte">${strat.dte} DTE</span>
              ${strat.transactSpec?.dayOfWeek ? `<span class="text-dim">(${strat.transactSpec.dayOfWeek})</span>` : ''}
            </div>
            ${strat.transactSpec?.contractSeries ? `<div class="td-series text-dim font-mono" title="${strat.transactSpec.contractSeries}">${strat.transactSpec.contractSeries}</div>` : ''}
          </div>
        </td>

        <!-- 4. Legs Structure -->
        <td>
          <div class="td-legs-wrap">${legsHtml}</div>
        </td>

        <!-- 5. Win Rate (POP) -->
        <td class="text-right">
          <div class="td-pop font-mono font-bold ${popClass}">
            ${strat.pop}% POP
          </div>
        </td>

        <!-- 6. Max Profit -->
        <td class="text-right">
          <div class="td-profit font-mono font-bold text-emerald">
            ${typeof strat.maxProfit === 'number' ? `${curr}${strat.maxProfit.toLocaleString()}` : strat.maxProfit}
          </div>
          ${isCredit ? '<span class="td-credit-pill font-mono">Net Credit</span>' : ''}
        </td>

        <!-- 7. Max Loss -->
        <td class="text-right">
          <div class="td-loss font-mono font-bold text-rose">
            -${curr}${strat.maxLoss.toLocaleString()}
          </div>
        </td>

        <!-- 8. R:R -->
        <td class="text-center font-mono">
          <span class="badge badge-subtle font-bold">${strat.riskReward}</span>
        </td>

        <!-- 9. Breakevens -->
        <td class="font-mono text-dim">
          <div class="td-be-wrap">${beStr}</div>
        </td>

        <!-- 10. IV Rank & Theta -->
        <td class="text-center font-mono">
          <div class="td-ivr-badge font-bold">${strat.ivRank}% IVR</div>
          <div class="${strat.netTheta >= 0 ? 'text-emerald' : 'text-rose'} font-bold">
            ${strat.netTheta >= 0 ? '+' : ''}${curr}${strat.netTheta}/d
          </div>
        </td>

        <!-- 11. Simple Exit Plan (Target / Stop) -->
        <td>
          <div class="td-exit-plan font-mono">
            ${strat.exitPlan ? `
              <div class="exit-rule-pill target-pill" title="${strat.exitPlan.targetBooking.laymanAction || strat.exitPlan.targetBooking.rule}">
                <span class="text-emerald font-bold">🎯 Target:</span>
                <span>${curr}${strat.exitPlan.targetBooking.spotPrice}</span>
                <span class="text-emerald font-bold">(+${curr}${strat.exitPlan.targetBooking.profitPerLot}/lot)</span>
              </div>
              <div class="exit-rule-pill stop-pill" title="${strat.exitPlan.stopLoss.laymanAction || strat.exitPlan.stopLoss.rule}">
                <span class="text-rose font-bold">🛑 Stop:</span>
                <span>${curr}${strat.exitPlan.stopLoss.spotPrice}</span>
                <span class="text-rose font-bold">(-${curr}${strat.exitPlan.stopLoss.lossPerLot}/lot)</span>
              </div>
            ` : '<span class="text-dim">Standard Expiry</span>'}
          </div>
        </td>

        <!-- 12. Actions -->
        <td class="text-center">
          <div class="table-actions-group">
            <button class="btn btn-primary btn-xs btn-analyze" data-id="${strat.id}" title="Analyze Payoff Curve">
              <i data-lucide="trending-up"></i> Analyze
            </button>
            <button class="btn btn-secondary btn-xs btn-chain" data-ticker="${strat.ticker}" title="View Option Chain">
              <i data-lucide="list"></i> Chain
            </button>
            <button class="btn btn-ghost btn-xs btn-build" data-id="${strat.id}" title="Customize in Builder">
              <i data-lucide="sliders"></i>
            </button>
            <button class="btn btn-ghost btn-xs btn-table-expand" data-id="${strat.id}" title="Inspect Details & Catalyst">
              <i data-lucide="chevron-down" id="expand-icon-${strat.id}" class="expand-icon"></i>
            </button>
          </div>
        </td>
      </tr>

      <!-- Expandable Detail Drawer Row -->
      <tr class="strat-table-detail-row hidden" id="detail-${strat.id}">
        <td colspan="12" class="strat-table-detail-cell">
          <div class="strat-table-detail-box">
            <!-- Left: Catalyst & Series Specs -->
            <div class="detail-col-catalyst">
              <div class="detail-section-header">
                <i data-lucide="zap" class="text-amber"></i>
                <span class="font-bold">Institutional Catalyst & Series Guidance</span>
              </div>
              <p class="catalyst-text">${strat.catalyst}</p>
              ${strat.transactSpec ? `
                <div class="transact-guidance-pill font-mono">
                  <span class="font-bold text-cyan">📅 Recommended Cycle:</span>
                  <span>${strat.transactSpec.cycleType} • ${strat.transactSpec.contractSeries} (${strat.transactSpec.dte} DTE)</span>
                  <div class="text-dim" style="margin-top: 0.35rem;">${strat.transactSpec.recommendationNote}</div>
                </div>
              ` : ''}
            </div>

            <!-- Right: Layman Exit Plan Guide -->
            ${strat.exitPlan ? `
              <div class="detail-col-exit">
                <div class="detail-section-header">
                  <i data-lucide="shield-check" class="text-cyan"></i>
                  <span class="font-bold">Simple Exit Plan & Layman Rules</span>
                  <span class="badge ${strat.exitPlan.riskProfile === 'CONSERVATIVE' ? 'badge-credit' : 'badge-subtle'} font-mono">
                    ${strat.exitPlan.riskProfile === 'CONSERVATIVE' ? 'Low Risk' : 'Balanced'}
                  </span>
                </div>
                <div class="detail-exit-rules">
                  <div class="detail-rule-card bg-emerald-soft">
                    <span class="text-emerald font-bold">👉 Profit Target (${strat.exitPlan.targetBooking.profitPct}):</span>
                    <span class="text-emerald-light">${strat.exitPlan.targetBooking.laymanAction || strat.exitPlan.targetBooking.rule}</span>
                  </div>
                  <div class="detail-rule-card bg-rose-soft">
                    <span class="text-rose font-bold">👉 Stop Loss (${strat.exitPlan.stopLoss.lossPct}):</span>
                    <span class="text-rose-light">${strat.exitPlan.stopLoss.laymanAction || strat.exitPlan.stopLoss.rule}</span>
                  </div>
                </div>
                <div class="detail-exit-summary text-dim font-mono">
                  <div>💡 <strong>Plain Rule:</strong> ${strat.exitPlan.laymanSummary?.plainRule || ''}</div>
                  <div class="detail-exit-pills-row">
                    <span class="detail-pill">⚖️ Risk:Reward <strong>${strat.exitPlan.managedRiskReward}</strong></span>
                    <span class="detail-pill">🛡️ Preserves <strong>${strat.exitPlan.capitalPreservedPct}% Capital</strong></span>
                    <span class="detail-pill text-amber">⏱️ ${strat.exitPlan.laymanSummary?.timeExitRule || 'Close before expiry week'}</span>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="scanner-table-container">
      <table class="scanner-table font-mono">
        <thead>
          <tr>
            <th class="th-asset">Asset & Price</th>
            <th class="th-strategy">Strategy / Bias</th>
            <th class="th-expiry">Expiry / DTE</th>
            <th class="th-structure">Legs Structure</th>
            <th class="th-pop text-right">POP</th>
            <th class="th-profit text-right">Max Profit</th>
            <th class="th-loss text-right">Max Loss</th>
            <th class="th-rr text-center">R:R</th>
            <th class="th-be">Breakeven(s)</th>
            <th class="th-ivr text-center">IVR / Theta</th>
            <th class="th-exit">Simple Exit Rule</th>
            <th class="th-actions text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;

  attachScannerEvents(container, strategies, onSelectStrategy, onViewChain, onCustomBuild);
}

/**
 * Render strategy results in visual Card Grid format
 */
export function renderScannerCards(containerId, strategies, onSelectStrategy, onViewChain, onCustomBuild) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (strategies.length === 0) {
    renderEmptyState(container);
    return;
  }

  const cardsHtml = strategies.map(strat => {
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
                <span class="badge badge-cap font-mono badge-cap-${(strat.cap || 'LARGE').toLowerCase()}">${strat.cap || 'LARGE'}</span>
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
              <i data-lucide="clock" class="inline-icon"></i> ${strat.dte} DTE
            </span>
          </div>
        </div>

        <!-- Institutional Expiry & Transaction Recommendation -->
        ${strat.transactSpec ? `
          <div class="strat-transact-spec">
            <div class="transact-spec-header">
              <div class="transact-spec-title">
                <i data-lucide="calendar-check" class="inline-icon text-cyan"></i>
                <span class="font-bold">Recommended Expiry to Transact</span>
              </div>
              <div class="transact-spec-badge-group">
                <span class="badge badge-transact-cycle font-mono">${strat.transactSpec.cycleType}</span>
                <span class="badge badge-subtle font-mono">${strat.transactSpec.instrumentTag}</span>
              </div>
            </div>
            
            <div class="transact-spec-body">
              <div class="transact-expiry-row">
                <div class="transact-date-pill">
                  <span class="transact-cal-icon">📅</span>
                  <span class="transact-date font-mono font-bold">${strat.transactSpec.expiryDate}</span>
                  <span class="transact-day-badge font-mono">(${strat.transactSpec.dayOfWeek} • ${strat.transactSpec.dte} DTE)</span>
                </div>
                <div class="transact-series-code font-mono">
                  <span class="text-dim">Series:</span> <span class="series-highlight font-bold">${strat.transactSpec.contractSeries}</span>
                </div>
              </div>
              <div class="transact-rationale text-dim">
                <i data-lucide="info" class="inline-icon text-cyan"></i>
                <span>${strat.transactSpec.recommendationNote}</span>
              </div>
            </div>
          </div>
        ` : ''}

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
            <span class="m-label text-dim">Expiration R:R</span>
            <span class="m-val font-mono font-bold text-cyan">${strat.riskReward}</span>
          </div>
          <div class="metric-cell">
            <span class="m-label text-dim">${isCredit ? 'Max Profit (Net Credit)' : 'Max Profit'}</span>
            <span class="m-val font-mono font-bold text-emerald">
              ${typeof strat.maxProfit === 'number' ? `${curr}${strat.maxProfit.toLocaleString()}` : strat.maxProfit}
            </span>
          </div>
          <div class="metric-cell">
            <span class="m-label text-dim">Max Loss (At Expiry)</span>
            <span class="m-val font-mono font-bold text-rose">
              -${curr}${strat.maxLoss.toLocaleString()}
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

        <!-- SIMPLIFIED LAYMAN-FRIENDLY RISK MANAGEMENT & EXIT PLAN -->
        ${strat.exitPlan ? `
          <div class="strat-exit-box">
            <div class="exit-box-header">
              <div class="exit-header-left">
                <i data-lucide="shield-check" class="inline-icon text-cyan"></i>
                <span class="exit-header-title">Simple Exit Plan (When to Close)</span>
              </div>
              <div class="exit-header-badges">
                <span class="badge badge-layman font-mono">Layman Guide</span>
                <span class="badge ${strat.exitPlan.riskProfile === 'CONSERVATIVE' ? 'badge-credit' : 'badge-subtle'} font-mono" style="font-size: 0.68rem;">
                  ${strat.exitPlan.riskProfile === 'CONSERVATIVE' ? 'Low Risk' : 'Balanced'}
                </span>
              </div>
            </div>

            <div class="exit-grid-simplified">
              <!-- Target Price Booking (When to Take Profit) -->
              <div class="exit-card-simple target-simple">
                <div class="exit-simple-header">
                  <span class="simple-tag text-emerald font-bold">
                    <i data-lucide="target" class="inline-icon"></i> 1. WHEN TO TAKE PROFIT
                  </span>
                  <span class="simple-spot-pill font-mono font-bold text-emerald">
                    Stock Hits: ${curr}${strat.exitPlan.targetBooking.spotPrice} <span class="spot-pct">(${strat.exitPlan.targetBooking.spotPct})</span>
                  </span>
                </div>

                <div class="simple-cash-callout">
                  <span class="cash-label text-dim">Cash Profit to Bank:</span>
                  <span class="cash-val font-mono font-bold text-emerald">
                    +${curr}${strat.exitPlan.targetBooking.profitPerLot.toLocaleString()} <span class="cash-unit">/ lot</span>
                  </span>
                  <span class="badge badge-profit-tag font-mono">${strat.exitPlan.targetBooking.profitPct}</span>
                </div>

                <div class="simple-action-box bg-emerald-soft">
                  <span class="action-lead font-bold text-emerald">👉 What to do:</span>
                  <span class="action-body text-emerald-light">${strat.exitPlan.targetBooking.laymanAction || strat.exitPlan.targetBooking.rule}</span>
                </div>
              </div>

              <!-- Stop Loss Protection (When to Cut Loss) -->
              <div class="exit-card-simple stop-simple">
                <div class="exit-simple-header">
                  <span class="simple-tag text-rose font-bold">
                    <i data-lucide="shield-alert" class="inline-icon"></i> 2. WHEN TO CUT LOSS
                  </span>
                  <span class="simple-spot-pill font-mono font-bold text-rose">
                    Stock Hits: ${curr}${strat.exitPlan.stopLoss.spotPrice} <span class="spot-pct">(${strat.exitPlan.stopLoss.spotPct})</span>
                  </span>
                </div>

                <div class="simple-cash-callout">
                  <span class="cash-label text-dim">Max Loss to Allow:</span>
                  <span class="cash-val font-mono font-bold text-rose">
                    -${curr}${strat.exitPlan.stopLoss.lossPerLot.toLocaleString()} <span class="cash-unit">/ lot</span>
                  </span>
                  <span class="badge badge-loss-tag font-mono">${strat.exitPlan.stopLoss.lossPct}</span>
                </div>

                <div class="simple-action-box bg-rose-soft">
                  <span class="action-lead font-bold text-rose">👉 What to do:</span>
                  <span class="action-body text-rose-light">${strat.exitPlan.stopLoss.laymanAction || strat.exitPlan.stopLoss.rule}</span>
                </div>
              </div>
            </div>

            <!-- Layman Pocket Summary Strip -->
            <div class="exit-layman-footer">
              <div class="footer-rule-headline">
                <span class="rule-icon">💡</span>
                <span class="rule-title font-bold text-primary">Layman Rule:</span>
                <span class="rule-summary text-dim">${strat.exitPlan.laymanSummary?.plainRule || `Risk ${curr}${strat.exitPlan.stopLoss.lossPerLot.toLocaleString()} to make ${curr}${strat.exitPlan.targetBooking.profitPerLot.toLocaleString()}`}</span>
              </div>
              <div class="footer-chips-row font-mono">
                <span class="footer-pill">⚖️ Risk : Reward <strong class="text-cyan">${strat.exitPlan.managedRiskReward}</strong></span>
                <span class="footer-pill">🛡️ Preserves <strong class="text-emerald">${strat.exitPlan.capitalPreservedPct}% Capital</strong></span>
                <span class="footer-pill pill-timer text-amber">⏱️ ${strat.exitPlan.laymanSummary?.timeExitRule || 'Close before expiry week'}</span>
              </div>
            </div>
          </div>
        ` : ''}

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

  container.innerHTML = `<div class="strategy-cards-grid">${cardsHtml}</div>`;
  attachScannerEvents(container, strategies, onSelectStrategy, onViewChain, onCustomBuild);
}

/**
 * Attach Event Listeners to rendered strategy view components
 */
function attachScannerEvents(container, strategies, onSelectStrategy, onViewChain, onCustomBuild) {
  if (typeof window.refreshIcons === 'function') {
    window.refreshIcons();
  }

  // Analyze Buttons
  container.querySelectorAll('.btn-analyze').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      const strat = strategies.find(s => s.id === id);
      if (strat && typeof onSelectStrategy === 'function') {
        onSelectStrategy(strat);
      }
    });
  });

  // Option Chain Buttons
  container.querySelectorAll('.btn-chain').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ticker = e.currentTarget.dataset.ticker;
      if (typeof onViewChain === 'function') {
        onViewChain(ticker);
      }
    });
  });

  // Customize in Builder Buttons
  container.querySelectorAll('.btn-build').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      const strat = strategies.find(s => s.id === id);
      if (strat && typeof onCustomBuild === 'function') {
        onCustomBuild(strat);
      }
    });
  });

  // Table Detail Row Expand / Collapse Toggle Buttons
  container.querySelectorAll('.btn-table-expand').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      toggleTableRowDetail(id);
    });
  });

  // Click on Table Row (outside buttons) to expand details
  container.querySelectorAll('.scanner-table-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.badge')) {
        return;
      }
      const id = row.dataset.id;
      toggleTableRowDetail(id);
    });
  });
}

/**
 * Toggle detail drawer for a specific strategy row in tabular view
 */
function toggleTableRowDetail(id) {
  const detailRow = document.getElementById(`detail-${id}`);
  const parentRow = document.querySelector(`.scanner-table-row[data-id="${id}"]`);
  const icon = document.getElementById(`expand-icon-${id}`);
  if (!detailRow) return;

  const isHidden = detailRow.classList.contains('hidden');
  if (isHidden) {
    detailRow.classList.remove('hidden');
    parentRow?.classList.add('row-expanded');
    if (icon) icon.style.transform = 'rotate(180deg)';
  } else {
    detailRow.classList.add('hidden');
    parentRow?.classList.remove('row-expanded');
    if (icon) icon.style.transform = 'rotate(0deg)';
  }
}
