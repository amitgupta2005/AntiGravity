/**
 * Screener Table Component
 * High-performance, responsive table with real-time filtering, sorting,
 * stochastic visual meters, and deep-dive modal trigger.
 */

import { openStockChartModal } from './chartModal.js';

export class ScreenerTable {
  constructor(containerId = 'table-container') {
    this.container = document.getElementById(containerId);
    this.allResults = [];
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.sortCol = 'spread';
    this.sortDir = 'desc'; // 'asc' or 'desc'
  }

  setResults(results) {
    this.allResults = results || [];
    this.render();
  }

  render() {
    if (!this.container) return;

    const filtered = this.getFilteredAndSortedResults();
    const counts = this.calculateCounts();

    this.container.innerHTML = `
      <div class="screener-table-card">
        <!-- Controls & Filters Toolbar -->
        <div class="table-toolbar">
          <div class="filter-tabs">
            <button class="filter-tab ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">
              All Stocks <span class="tab-badge">${counts.all}</span>
            </button>
            <button class="filter-tab ${this.currentFilter === 'bullishCross' ? 'active' : ''}" data-filter="bullishCross">
              <span class="dot-indicator bg-emerald"></span> Bullish Cross <span class="tab-badge tab-emerald">${counts.bullishCross}</span>
            </button>
            <button class="filter-tab ${this.currentFilter === 'oversold' ? 'active' : ''}" data-filter="oversold">
              <span class="dot-indicator bg-cyan"></span> Oversold (<20) <span class="tab-badge tab-cyan">${counts.oversold}</span>
            </button>
            <button class="filter-tab ${this.currentFilter === 'bearishCross' ? 'active' : ''}" data-filter="bearishCross">
              <span class="dot-indicator bg-rose"></span> Bearish Cross <span class="tab-badge tab-rose">${counts.bearishCross}</span>
            </button>
            <button class="filter-tab ${this.currentFilter === 'overbought' ? 'active' : ''}" data-filter="overbought">
              <span class="dot-indicator bg-amber"></span> Overbought (>80) <span class="tab-badge tab-amber">${counts.overbought}</span>
            </button>
            <button class="filter-tab ${this.currentFilter === 'divergence' ? 'active' : ''}" data-filter="divergence">
              <span class="dot-indicator bg-purple"></span> Divergences <span class="tab-badge tab-purple">${counts.divergence}</span>
            </button>
          </div>

          <div class="toolbar-actions">
            <div class="search-box">
              <i data-lucide="search" class="search-icon"></i>
              <input 
                type="text" 
                id="stock-search-input" 
                placeholder="Search symbol, company, or sector..." 
                value="${this.escapeHtml(this.searchQuery)}"
              />
              ${this.searchQuery ? `<button class="clear-search-btn" id="clear-search-btn">&times;</button>` : ''}
            </div>
          </div>
        </div>

        <!-- Table Display -->
        <div class="table-responsive">
          <table class="screener-table">
            <thead>
              <tr>
                <th class="sortable ${this.getSortClass('ticker')}" data-col="ticker">Stock / Ticker</th>
                <th class="sortable ${this.getSortClass('price')}" data-col="price">Close Price</th>
                <th class="sortable ${this.getSortClass('changePct')}" data-col="changePct">Day %</th>
                <th class="sortable ${this.getSortClass('slowK')}" data-col="slowK">Stoch %K (4,3)</th>
                <th class="sortable ${this.getSortClass('d')}" data-col="d">Signal %D (3)</th>
                <th class="sortable ${this.getSortClass('spread')}" data-col="spread">Spread (%K-%D)</th>
                <th>Oscillator Gauge (0-100)</th>
                <th class="sortable ${this.getSortClass('signal')}" data-col="signal">Stochastic Signal</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? this.renderEmptyState() : filtered.map(r => this.renderRow(r)).join('')}
            </tbody>
          </table>
        </div>

        <!-- Table Footer Info -->
        <div class="table-footer">
          <span>Showing <strong>${filtered.length}</strong> of <strong>${this.allResults.length}</strong> evaluated stocks</span>
          <span class="formula-note">Stochastic Basis: <code>LowestClose(4)</code> &amp; <code>HighestClose(4)</code> smoothed by 3-period SMA</span>
        </div>
      </div>
    `;

    this.attachEvents();
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  renderRow(r) {
    const sym = r.ticker || r.symbol || '';
    const name = r.name || sym;
    const sector = r.sector || r.exchange || 'Equity';
    const isINR = sym.endsWith('.NS') || sym.endsWith('.BO') || r.exchange === 'NSE';
    const priceVal = r.price ?? r.close ?? 0;
    const priceStr = isINR 
      ? `₹${priceVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
      : `$${priceVal.toFixed(2)}`;

    const chg = r.changePct || 0;
    const chgClass = chg > 0 ? 'text-emerald' : chg < 0 ? 'text-rose' : 'text-neutral';
    const chgSign = chg > 0 ? '+' : '';

    const k = r.slowK ?? r.stoch?.k ?? 50;
    const d = r.d ?? r.stoch?.d ?? 50;
    const spread = r.spread ?? (k - d);

    // %K color
    let kColorClass = 'text-neutral';
    if (k < 20) kColorClass = 'text-cyan font-bold';
    else if (k > 80) kColorClass = 'text-amber font-bold';

    // Signal badge
    const signalBadge = this.getSignalBadge(r);

    // Spread color
    const spreadClass = spread > 0 ? 'text-emerald' : spread < 0 ? 'text-rose' : 'text-neutral';
    const spreadSign = spread > 0 ? '+' : '';

    return `
      <tr class="stock-row" data-ticker="${sym}">
        <td>
          <div class="stock-primary">
            <span class="stock-sym">${sym}</span>
            <span class="stock-sector">${sector}</span>
          </div>
          <div class="stock-name" title="${this.escapeHtml(name)}">${this.escapeHtml(name)}</div>
        </td>
        <td class="font-mono font-semibold">${priceStr}</td>
        <td class="font-mono ${chgClass}">
          <span class="day-chg-pill ${chg > 0 ? 'pill-up' : chg < 0 ? 'pill-down' : 'pill-flat'}">
            ${chgSign}${chg.toFixed(2)}%
          </span>
        </td>
        <td class="font-mono ${kColorClass}">
          <div class="metric-val-with-sub">
            <span>${k.toFixed(1)}</span>
            ${k < 20 ? '<span class="sub-tag tag-cyan">Oversold</span>' : k > 80 ? '<span class="sub-tag tag-amber">Overbought</span>' : ''}
          </div>
        </td>
        <td class="font-mono font-medium">${d.toFixed(1)}</td>
        <td class="font-mono ${spreadClass}">
          ${spreadSign}${spread.toFixed(1)}
        </td>
        <td>
          <div class="meter-container" title="%K: ${k.toFixed(1)} | %D: ${d.toFixed(1)}">
            <div class="meter-track">
              <!-- Threshold markers at 20 and 80 -->
              <div class="zone-marker oversold-marker" style="left: 20%;"></div>
              <div class="zone-marker overbought-marker" style="left: 80%;"></div>
              
              <!-- %K bar/pointer -->
              <div class="meter-bar-k" style="width: ${Math.min(100, Math.max(0, k))}%; background: ${k < 20 ? '#00f2fe' : k > 80 ? '#f59e0b' : '#38bdf8'};"></div>
              <!-- %D marker -->
              <div class="meter-pin-d" style="left: ${Math.min(100, Math.max(0, d))}%;" title="Signal %D: ${d.toFixed(1)}"></div>
            </div>
            <div class="meter-labels">
              <span>0</span>
              <span class="label-20">20</span>
              <span class="label-80">80</span>
              <span>100</span>
            </div>
          </div>
        </td>
        <td>
          ${signalBadge}
        </td>
        <td class="text-center">
          <button class="btn-inspect" data-action="inspect" data-ticker="${sym}" title="Open Full Stochastic 4,3,3 Dual Chart & Breakdown">
            <i data-lucide="line-chart"></i> Chart
          </button>
        </td>
      </tr>
    `;
  }

  getSignalBadge(r) {
    const k = r.slowK ?? 50;
    const signalType = r.signalType || '';

    if (signalType === 'BULLISH_CROSSOVER_OVERSOLD') {
      return `<span class="signal-badge badge-golden-cross" title="Golden cross triggered in deep oversold territory (<20)!">
        <i data-lucide="zap"></i> Golden Cross (<20)
      </span>`;
    }

    if (r.isBullishCross || signalType.includes('BULLISH_CROSSOVER')) {
      return `<span class="signal-badge badge-bullish-cross">
        <i data-lucide="trending-up"></i> Bullish Cross
      </span>`;
    }

    if (signalType === 'BEARISH_CROSSOVER_OVERBOUGHT') {
      return `<span class="signal-badge badge-death-cross" title="Death cross triggered in overbought territory (>80)!">
        <i data-lucide="alert-triangle"></i> Death Cross (>80)
      </span>`;
    }

    if (r.isBearishCross || signalType.includes('BEARISH_CROSSOVER')) {
      return `<span class="signal-badge badge-bearish-cross">
        <i data-lucide="trending-down"></i> Bearish Cross
      </span>`;
    }

    if (r.divergence) {
      return `<span class="signal-badge badge-divergence" title="${this.escapeHtml(r.divergence.label)}">
        <i data-lucide="sparkles"></i> Divergence
      </span>`;
    }

    if (signalType === 'EXTREME_OVERSOLD' || k <= 10) {
      return `<span class="signal-badge badge-deep-oversold">
        <i data-lucide="arrow-down-circle"></i> Extreme Oversold (<10)
      </span>`;
    }

    if (r.isOversold || k <= 20) {
      return `<span class="signal-badge badge-oversold">
        <i data-lucide="arrow-down"></i> Oversold (<20)
      </span>`;
    }

    if (signalType === 'EXTREME_OVERBOUGHT' || k >= 90) {
      return `<span class="signal-badge badge-deep-overbought">
        <i data-lucide="arrow-up-circle"></i> Extreme Overbought (>90)
      </span>`;
    }

    if (r.isOverbought || k >= 80) {
      return `<span class="signal-badge badge-overbought">
        <i data-lucide="arrow-up"></i> Overbought (>80)
      </span>`;
    }

    return `<span class="signal-badge badge-neutral">Neutral (${k.toFixed(0)})</span>`;
  }

  renderEmptyState() {
    return `
      <tr>
        <td colspan="9" class="empty-table-cell">
          <div class="empty-state-content">
            <div class="empty-icon"><i data-lucide="filter-x"></i></div>
            <div class="empty-title">No matching stocks found</div>
            <div class="empty-desc">
              Try selecting a different filter tab or clearing your search term "${this.escapeHtml(this.searchQuery)}".
            </div>
            ${this.searchQuery || this.currentFilter !== 'all' ? `
              <button class="btn-reset-filters" id="reset-filters-btn">
                Reset All Filters
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  getFilteredAndSortedResults() {
    let list = [...this.allResults];

    // Search filter
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(r => {
        const sym = (r.ticker || r.symbol || '').toLowerCase();
        const nm = (r.name || '').toLowerCase();
        const sc = (r.sector || r.exchange || '').toLowerCase();
        return sym.includes(q) || nm.includes(q) || sc.includes(q);
      });
    }

    // Category filter
    if (this.currentFilter === 'bullishCross') {
      list = list.filter(r => r.isBullishCross || (r.signalType && r.signalType.includes('BULLISH_CROSSOVER')));
    } else if (this.currentFilter === 'bearishCross') {
      list = list.filter(r => r.isBearishCross || (r.signalType && r.signalType.includes('BEARISH_CROSSOVER')));
    } else if (this.currentFilter === 'oversold') {
      list = list.filter(r => (r.slowK ?? 50) < 20);
    } else if (this.currentFilter === 'overbought') {
      list = list.filter(r => (r.slowK ?? 50) > 80);
    } else if (this.currentFilter === 'divergence') {
      list = list.filter(r => r.divergence != null);
    }

    // Sorting
    list.sort((a, b) => {
      let vA = this.getSortValue(a, this.sortCol);
      let vB = this.getSortValue(b, this.sortCol);

      if (typeof vA === 'string') {
        return this.sortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return this.sortDir === 'asc' ? (vA - vB) : (vB - vA);
    });

    return list;
  }

  getSortValue(item, col) {
    switch (col) {
      case 'ticker': return item.ticker || item.symbol || '';
      case 'price': return item.price ?? item.close ?? 0;
      case 'changePct': return item.changePct || 0;
      case 'slowK': return item.slowK ?? 0;
      case 'd': return item.d ?? 0;
      case 'spread': return item.spread ?? 0;
      case 'signal': return item.signalType || '';
      default: return 0;
    }
  }

  getSortClass(col) {
    if (this.sortCol !== col) return '';
    return this.sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc';
  }

  calculateCounts() {
    const list = this.allResults;
    return {
      all: list.length,
      bullishCross: list.filter(r => r.isBullishCross || (r.signalType && r.signalType.includes('BULLISH_CROSSOVER'))).length,
      bearishCross: list.filter(r => r.isBearishCross || (r.signalType && r.signalType.includes('BEARISH_CROSSOVER'))).length,
      oversold: list.filter(r => (r.slowK ?? 50) < 20).length,
      overbought: list.filter(r => (r.slowK ?? 50) > 80).length,
      divergence: list.filter(r => r.divergence != null).length
    };
  }

  attachEvents() {
    // Filter tabs
    const tabs = this.container.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentFilter = tab.getAttribute('data-filter');
        this.render();
      });
    });

    // Search input
    const searchInput = this.container.querySelector('#stock-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
        // Keep focus
        const newInp = this.container.querySelector('#stock-search-input');
        if (newInp) {
          newInp.focus();
          newInp.setSelectionRange(newInp.value.length, newInp.value.length);
        }
      });
    }

    // Clear search
    const clearBtn = this.container.querySelector('#clear-search-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.render();
      });
    }

    // Reset filters button
    const resetBtn = this.container.querySelector('#reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.currentFilter = 'all';
        this.render();
      });
    }

    // Column sorting headers
    const headers = this.container.querySelectorAll('th.sortable');
    headers.forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-col');
        if (this.sortCol === col) {
          this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortCol = col;
          this.sortDir = (col === 'ticker') ? 'asc' : 'desc';
        }
        this.render();
      });
    });

    // Inspect buttons & row clicks
    const inspectBtns = this.container.querySelectorAll('button[data-action="inspect"]');
    inspectBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sym = btn.getAttribute('data-ticker');
        const item = this.allResults.find(x => (x.ticker || x.symbol) === sym);
        if (item) {
          const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
          openStockChartModal(item, isDark);
        }
      });
    });

    const rows = this.container.querySelectorAll('.stock-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const sym = row.getAttribute('data-ticker');
        const item = this.allResults.find(x => (x.ticker || x.symbol) === sym);
        if (item) {
          const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
          openStockChartModal(item, isDark);
        }
      });
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
