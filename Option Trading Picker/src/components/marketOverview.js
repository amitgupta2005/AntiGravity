/**
 * Market Overview Component
 * Macro indices pulse, PCR sentiment gauges, and IV Rank leaderboards
 */

import { OPTION_UNIVERSE } from '../data/stockUniverse.js';

/**
 * Check market trading session status
 */
export function getMarketSessionStatus() {
  const now = new Date();

  // US Market Hours (9:30 AM - 4:00 PM Eastern, Mon-Fri)
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const day = now.getUTCDay();
  const isWeekend = day === 0 || day === 6;

  // Eastern Time is UTC-4 (EDT) or UTC-5 (EST)
  const estHours = (utcHours - 4 + 24) % 24;
  const isUSOpen = !isWeekend && estHours >= 9.5 && estHours < 16.0;

  // Indian Market Hours (9:15 AM - 3:30 PM IST, Mon-Fri)
  // IST is UTC+5:30
  const istHours = (utcHours + 5.5) % 24;
  const isINOpen = !isWeekend && istHours >= 9.25 && istHours < 15.5;

  return { isUSOpen, isINOpen };
}

/**
 * Render Market Overview Cards
 */
export function renderMarketOverview(containerId, quotes, onSelectAsset) {
  const container = document.getElementById(containerId);
  if (!container || !Array.isArray(quotes)) return;

  const { isUSOpen, isINOpen } = getMarketSessionStatus();

  // Filter major indices
  const indices = quotes.filter(q => q.type === 'INDEX');

  // Sorted by IV Rank (Highest & Lowest)
  const highestIV = [...quotes].sort((a, b) => (b.ivRank || 0) - (a.ivRank || 0)).slice(0, 5);
  const lowestIV  = [...quotes].sort((a, b) => (a.ivRank || 0) - (b.ivRank || 0)).slice(0, 5);

  container.innerHTML = `
    <!-- Top Bar: Market Sessions Status -->
    <div class="market-status-bar">
      <div class="market-session-pill ${isUSOpen ? 'status-open' : 'status-closed'}">
        <span class="status-indicator"></span>
        <span class="session-name">🇺🇸 Wall Street (NYSE/NASDAQ):</span>
        <span class="session-state font-bold">${isUSOpen ? 'MARKET LIVE' : 'AFTER-HOURS / CLOSED'}</span>
      </div>

      <div class="market-session-pill ${isINOpen ? 'status-open' : 'status-closed'}">
        <span class="status-indicator"></span>
        <span class="session-name">🇮🇳 Dalal Street (NSE/BSE):</span>
        <span class="session-state font-bold">${isINOpen ? 'MARKET LIVE' : 'AFTER-HOURS / CLOSED'}</span>
      </div>
    </div>

    <!-- Benchmark Indices Cards Grid -->
    <div class="indices-grid">
      ${indices.map(idx => {
        const curr = idx.currencySymbol;
        const changeClass = idx.change >= 0 ? 'text-emerald' : 'text-rose';
        const changeSign = idx.change >= 0 ? '+' : '';

        return `
          <div class="index-card" data-ticker="${idx.ticker}">
            <div class="idx-header">
              <span class="idx-flag">${idx.market === 'US' ? '🇺🇸' : '🇮🇳'}</span>
              <div class="idx-title-wrap">
                <span class="idx-ticker font-mono font-bold">${idx.displayTicker}</span>
                <span class="idx-name text-dim">${idx.name}</span>
              </div>
            </div>

            <div class="idx-price-row">
              <span class="idx-price font-mono font-bold">${curr}${idx.price.toLocaleString()}</span>
              <span class="idx-change font-mono ${changeClass}">${changeSign}${idx.change} (${changeSign}${idx.changePercent}%)</span>
            </div>

            <div class="idx-stats-row">
              <div class="idx-stat">
                <span class="stat-lbl text-dim">IV Rank</span>
                <span class="stat-val font-mono font-bold text-amber">${idx.ivRank}%</span>
              </div>
              <div class="idx-stat">
                <span class="stat-lbl text-dim">Put/Call</span>
                <span class="stat-val font-mono font-bold ${idx.pcr > 1 ? 'text-emerald' : 'text-rose'}">${idx.pcr}</span>
              </div>
              <div class="idx-stat">
                <span class="stat-lbl text-dim">Max Pain</span>
                <span class="stat-val font-mono font-bold text-purple">${curr}${idx.maxPain}</span>
              </div>
            </div>

            <button class="btn btn-secondary btn-xs idx-action-btn" data-ticker="${idx.ticker}">
              <i data-lucide="list"></i> Chain
            </button>
          </div>
        `;
      }).join('')}
    </div>

    <!-- IV Rank Insights (Top Sellers vs Buyers) -->
    <div class="iv-leaderboards-row">
      <!-- Highest IV Rank (Option Sellers Paradise) -->
      <div class="iv-board-card">
        <div class="board-header">
          <i data-lucide="flame" class="board-icon text-amber"></i>
          <div>
            <h4 class="board-title">Elevated IV Rank (Premium Sellers)</h4>
            <span class="board-sub text-dim">Ideal for Credit Spreads, Iron Condors & Theta Decay</span>
          </div>
        </div>
        <div class="board-list">
          ${highestIV.map(item => `
            <div class="board-item clickable-asset" data-ticker="${item.ticker}">
              <div class="board-item-info">
                <span class="font-mono font-bold">${item.displayTicker}</span>
                <span class="text-dim">${item.name}</span>
              </div>
              <div class="board-item-stat">
                <span class="font-mono font-bold text-amber">${item.ivRank}% IVR</span>
                <span class="text-dim font-mono">${item.currencySymbol}${item.price}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Lowest IV Rank (Option Buyers Paradise) -->
      <div class="iv-board-card">
        <div class="board-header">
          <i data-lucide="sparkles" class="board-icon text-cyan"></i>
          <div>
            <h4 class="board-title">Low IV Rank (Option Buyers)</h4>
            <span class="board-sub text-dim">Cheap Premiums for Long Calls, Long Puts & Straddles</span>
          </div>
        </div>
        <div class="board-list">
          ${lowestIV.map(item => `
            <div class="board-item clickable-asset" data-ticker="${item.ticker}">
              <div class="board-item-info">
                <span class="font-mono font-bold">${item.displayTicker}</span>
                <span class="text-dim">${item.name}</span>
              </div>
              <div class="board-item-stat">
                <span class="font-mono font-bold text-cyan">${item.ivRank}% IVR</span>
                <span class="text-dim font-mono">${item.currencySymbol}${item.price}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  if (typeof window.refreshIcons === 'function') {
    window.refreshIcons();
  }

  // Clickable assets to trigger chain view
  container.querySelectorAll('.clickable-asset, .idx-card').forEach(el => {
    el.addEventListener('click', (e) => {
      const ticker = e.currentTarget.dataset.ticker;
      if (typeof onSelectAsset === 'function') {
        onSelectAsset(ticker);
      }
    });
  });
}
