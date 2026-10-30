/**
 * IPO Analyzer Institutional IPO Radar View Component
 * Provides high-density institutional table (default) and card grid view
 * with real-time filtering, search, live sync, and dedicated Ongoing/Upcoming IPO tracking.
 */

import { IpoEvaluationEngine } from '../quant/ipoEvaluationEngine.js';
import { openIpoDetailModal } from './ipoDetailReport.js';
import { showToast } from './toast.js';

export class IpoRadarView {
  constructor({ containerId, universe, marketFeed }) {
    this.container = document.getElementById(containerId);
    this.universe = universe;
    this.marketFeed = marketFeed;

    // Default state: TABULAR FORMAT DEFAULT
    this.viewMode = 'table';
    this.marketFilter = 'ALL';
    this.verdictFilter = 'ALL';
    this.statusFilter = 'ALL'; // 'ALL', 'ONGOING', 'UPCOMING', 'LISTED'
    this.searchQuery = '';
    this.sortBy = 'score';
    this.lastSynced = new Date().toLocaleTimeString();
    this.autoSyncActive = false;
    this.syncIntervalId = null;

    this.recalculateEvaluations();
  }

  recalculateEvaluations() {
    this.evaluatedList = this.universe.map(ipo => {
      const evaluation = IpoEvaluationEngine.evaluate(ipo);
      const isListed = ipo.status === 'LISTED';
      const isClosed = ipo.status === 'CLOSED';
      
      const biddingDates = ipo.biddingDates || '';
      const dateDetail = ipo.dateDetail || (isListed ? `Trading on ${ipo.exchange || 'NSE / BSE'}` : isClosed ? 'Allotment in progress' : '');

      return {
        ...evaluation,
        status: ipo.status || 'LISTED',
        statusLabel: ipo.statusLabel || (ipo.status === 'ONGOING' ? '🟢 BID OPEN NOW' : ipo.status === 'UPCOMING' ? '🟡 UPCOMING' : ipo.status === 'CLOSED' ? '🔵 BIDDING CLOSED' : '⚪ RECENTLY LISTED'),
        biddingDates: biddingDates,
        dateDetail: dateDetail,
        currentMarketPrice: ipo.currentMarketPrice,
        listingGainPct: ipo.listingGainPct,
        dayChange: ipo.dayChange,
        dayChangePct: ipo.dayChangePct,
        liveDataSource: ipo.liveDataSource
      };
    });
  }

  render() {
    if (!this.container) return;

    const filtered = this.getFilteredData();
    const stats = this.computeStats();

    // Determine current active segment metadata for display
    let currentSegName = 'All FY 2026–27 IPOs';
    let segTotal = stats.total;
    let segOngoing = stats.ongoingCount;
    let segUpcoming = stats.upcomingCount;
    let segClosed = stats.closedCount;
    let segListed = stats.listedCount;

    if (this.marketFilter === 'IN_MAINBOARD') {
      currentSegName = 'Mainboard';
      segTotal = stats.mainboardCount;
      segOngoing = stats.mainboardOngoing;
      segUpcoming = stats.mainboardUpcoming;
      segClosed = stats.mainboardClosed;
      segListed = stats.mainboardListed;
    } else if (this.marketFilter === 'IN_SME') {
      currentSegName = 'SME';
      segTotal = stats.smeCount;
      segOngoing = stats.smeOngoing;
      segUpcoming = stats.smeUpcoming;
      segClosed = stats.smeClosed;
      segListed = stats.smeListed;
    } else if (this.marketFilter === 'US') {
      currentSegName = 'US Tech';
      segTotal = stats.usCount;
      segOngoing = 0;
      segUpcoming = 0;
      segClosed = 0;
      segListed = stats.usCount;
    }

    this.container.innerHTML = `
      <div class="radar-view-wrapper">
        <!-- TOP REAL-TIME FEED STATUS STRIP -->
        <div class="realtime-header-toolbar">
          <div class="rt-status-left">
            <span class="live-pulse-dot"></span>
            <span class="rt-feed-title">REAL-TIME DATA ENGINE ACTIVE</span>
            <span class="rt-feed-divider">•</span>
            <span class="rt-sync-time">Last Synced: <strong id="rt-sync-timestamp">${this.lastSynced}</strong></span>
            <span class="rt-feed-badge" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.4); color: #34d399; font-weight: 700;">📅 Current Financial Year (FY 2026–27 Only)</span>
            <span class="rt-feed-badge">NSE & BSE India Live Quotes • Chittorgarh / BSE / Groww Primary IPO Desk</span>
          </div>
          <div class="rt-status-right">
            <button class="btn btn-outline-terminal btn-sm" id="btn-refresh-realtime">
              🔄 Sync Live Quotes & Primary Book
            </button>
            <button class="btn btn-secondary btn-sm ${this.autoSyncActive ? 'btn-active-sync' : ''}" id="btn-toggle-autosync">
              ⚡ ${this.autoSyncActive ? 'Auto-Sync ON (12s)' : 'Auto-Sync OFF'}
            </button>
          </div>
        </div>

        <!-- TOP EXECUTIVE KPI STRIP -->
        <div class="radar-kpi-strip">
          <div class="kpi-card kpi-ongoing">
            <span class="kpi-title">Ongoing / Live Bidding</span>
            <div class="kpi-main">
              <span class="kpi-value text-accent">${stats.ongoingCount}</span>
              <span class="kpi-detail">Active Issues Now</span>
            </div>
          </div>
          <div class="kpi-card kpi-upcoming">
            <span class="kpi-title">Upcoming Pipeline</span>
            <div class="kpi-main">
              <span class="kpi-value text-warning">${stats.upcomingCount}</span>
              <span class="kpi-detail">Scheduled Primary</span>
            </div>
          </div>
          <div class="kpi-card kpi-closed">
            <span class="kpi-title">Closed / Allotment</span>
            <div class="kpi-main">
              <span class="kpi-value text-info" style="color: #38bdf8;">${stats.closedCount}</span>
              <span class="kpi-detail">Awaiting Listing</span>
            </div>
          </div>
          <div class="kpi-card kpi-apply">
            <span class="kpi-title">High Conviction Apply</span>
            <div class="kpi-main">
              <span class="kpi-value text-apply">${stats.applyCount}</span>
              <span class="kpi-detail">Institutional Buys</span>
            </div>
          </div>
          <div class="kpi-card kpi-avoid">
            <span class="kpi-title">Avoid / Forensics</span>
            <div class="kpi-main">
              <span class="kpi-value text-avoid">${stats.avoidCount}</span>
              <span class="kpi-detail">${stats.totalRedFlags} Critical Red Flags</span>
            </div>
          </div>
          <div class="kpi-card kpi-macro">
            <span class="kpi-title">Macro Volatility (VIX)</span>
            <div class="kpi-vix-row">
              <div class="vix-badge">
                <span>IN VIX:</span> <strong>${this.marketFeed?.cachedVix?.indiaVix?.value ?? 14.35}</strong>
              </div>
              <div class="vix-badge">
                <span>US VIX:</span> <strong>${this.marketFeed?.cachedVix?.usVix?.value ?? 13.92}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- PROMINENT SEGMENT SWITCHER TABS: MAINBOARD VS SME VS ALL -->
        <div class="radar-segment-bar" id="radar-segment-bar" role="tablist" aria-label="IPO Market Segments">
          <button class="segment-tab-btn ${this.marketFilter === 'IN_MAINBOARD' ? 'active' : ''}" data-segment="IN_MAINBOARD" id="seg-btn-mainboard" role="tab" aria-selected="${this.marketFilter === 'IN_MAINBOARD'}">
            <span class="seg-icon">🏢</span>
            <span class="seg-title">Mainboard IPOs</span>
            <span class="seg-badge seg-badge-mainboard">${stats.mainboardCount}</span>
            ${stats.mainboardOngoing > 0 ? `<span class="seg-live-indicator">🟢 ${stats.mainboardOngoing} LIVE TODAY</span>` : ''}
          </button>
          <button class="segment-tab-btn ${this.marketFilter === 'IN_SME' ? 'active' : ''}" data-segment="IN_SME" id="seg-btn-sme" role="tab" aria-selected="${this.marketFilter === 'IN_SME'}">
            <span class="seg-icon">🚀</span>
            <span class="seg-title">SME IPOs (NSE Emerge / BSE SME)</span>
            <span class="seg-badge seg-badge-sme">${stats.smeCount}</span>
            ${stats.smeOngoing > 0 ? `<span class="seg-live-indicator seg-live-sme">🔥 ${stats.smeOngoing} OPEN NOW</span>` : ''}
          </button>
          <button class="segment-tab-btn ${this.marketFilter === 'ALL' ? 'active' : ''}" data-segment="ALL" id="seg-btn-all" role="tab" aria-selected="${this.marketFilter === 'ALL'}">
            <span class="seg-icon">🌐</span>
            <span class="seg-title">All IPOs</span>
            <span class="seg-badge">${stats.total}</span>
          </button>
          <button class="segment-tab-btn ${this.marketFilter === 'US' ? 'active' : ''}" data-segment="US" id="seg-btn-us" role="tab" aria-selected="${this.marketFilter === 'US'}">
            <span class="seg-icon">🇺🇸</span>
            <span class="seg-title">US Tech & Global</span>
            <span class="seg-badge">${stats.usCount}</span>
          </button>
        </div>

        <!-- CONTROLS & FILTER TOOLBAR -->
        <div class="radar-controls-toolbar">
          <div class="toolbar-left">
            <!-- Search Omnibar -->
            <div class="search-omnibar-box">
              <span class="search-icon">🔍</span>
              <input 
                type="text" 
                id="radar-search-input" 
                class="search-omnibar-input" 
                placeholder="Search by Ticker, Company, Sector, or Underwriter..." 
                value="${escapeHtml(this.searchQuery)}"
              />
              ${this.searchQuery ? '<button class="clear-search-btn" id="radar-clear-search">✕</button>' : ''}
            </div>

            <!-- Status Filter Pills (ONGOING vs UPCOMING vs CLOSED vs LISTED vs ALL) -->
            <div class="status-filter-group" id="status-filter-group">
              <button class="status-pill ${this.statusFilter === 'ALL' ? 'active' : ''}" data-status="ALL">
                All ${currentSegName} (${segTotal})
              </button>
              <button class="status-pill pill-ongoing ${this.statusFilter === 'ONGOING' ? 'active' : ''}" data-status="ONGOING">
                🔴 LIVE / ONGOING (${segOngoing})
              </button>
              <button class="status-pill pill-upcoming ${this.statusFilter === 'UPCOMING' ? 'active' : ''}" data-status="UPCOMING">
                🟡 UPCOMING (${segUpcoming})
              </button>
              <button class="status-pill pill-closed ${this.statusFilter === 'CLOSED' ? 'active' : ''}" data-status="CLOSED">
                🔵 CLOSED / ALLOTMENT (${segClosed})
              </button>
              <button class="status-pill ${this.statusFilter === 'LISTED' ? 'active' : ''}" data-status="LISTED">
                🚀 FY27 Listed (${segListed})
              </button>
            </div>
          </div>

          <div class="toolbar-right">
            <!-- Verdict Filter Pills -->
            <div class="verdict-filter-group" id="verdict-filter-group">
              <button class="v-filter-pill ${this.verdictFilter === 'ALL' ? 'active' : ''}" data-verdict="ALL">All Verdicts</button>
              <button class="v-filter-pill pill-apply ${this.verdictFilter === 'APPLY' ? 'active' : ''}" data-verdict="APPLY">Apply</button>
              <button class="v-filter-pill pill-avoid ${this.verdictFilter === 'AVOID' ? 'active' : ''}" data-verdict="AVOID">Avoid</button>
              <button class="v-filter-pill pill-watch ${this.verdictFilter === 'WATCH' ? 'active' : ''}" data-verdict="WATCH">Watch</button>
            </div>

            <!-- Sort By Select -->
            <div class="sort-select-box">
              <label for="radar-sort-select">Sort:</label>
              <select id="radar-sort-select" class="terminal-select">
                <option value="score" ${this.sortBy === 'score' ? 'selected' : ''}>Institutional Score (High ➔ Low)</option>
                <option value="gmp" ${this.sortBy === 'gmp' ? 'selected' : ''}>Grey Market Premium (GMP %)</option>
                <option value="size" ${this.sortBy === 'size' ? 'selected' : ''}>Issue Size</option>
                <option value="cagr" ${this.sortBy === 'cagr' ? 'selected' : ''}>3Y PAT CAGR</option>
              </select>
            </div>

            <!-- View Switcher (Table vs Card Grid) -->
            <div class="view-switcher-box">
              <button 
                class="view-toggle-btn ${this.viewMode === 'table' ? 'active' : ''}" 
                id="btn-view-table" 
                title="Tabular High-Density Format (Default)"
              >
                ▦ Table
              </button>
              <button 
                class="view-toggle-btn ${this.viewMode === 'grid' ? 'active' : ''}" 
                id="btn-view-grid" 
                title="Visual Card Format"
              >
                ⊞ Cards
              </button>
            </div>
          </div>
        </div>

        <!-- MAIN DATA DISPLAY -->
        <div class="radar-content-area">
          ${filtered.length === 0 ? `
            <div class="empty-state-box">
              <div class="empty-icon">📂</div>
              <h3>No IPOs matching your filters</h3>
              <p>Adjust your search criteria, market tier, status, or verdict filters.</p>
              <button class="btn btn-secondary mt-3" id="btn-reset-filters">Reset All Filters</button>
            </div>
          ` : this.viewMode === 'table' ? this.renderTableView(filtered) : this.renderGridView(filtered)}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  // =========================================================================
  // HIGH-DENSITY TABULAR VIEW (DEFAULT)
  // =========================================================================
  renderTableView(items) {
    return `
      <div class="table-container institutional-radar-table-container">
        <table class="institutional-table radar-table">
          <thead>
            <tr>
              <th>Status / Timing</th>
              <th>Company & Ticker</th>
              <th>Market / Tier</th>
              <th>Sector</th>
              <th>Price Band</th>
              <th>Size / OFS %</th>
              <th>P/E vs Comps</th>
              <th>GMP / Sentiment</th>
              <th>Sub Total</th>
              <th>Institutional Score</th>
              <th>Verdict</th>
              <th class="text-right">Institutional Dossier</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => {
              const orig = this.universe.find(u => u.ticker === item.ticker) || {};
              const issue = orig.issueDetails || {};
              const val = orig.valuation || {};
              const sent = orig.sentiment || {};
              const gmpPct = sent.gmpPct ?? 0;
              const isOngoing = orig.status === 'ONGOING';
              const isUpcoming = orig.status === 'UPCOMING';
              const isClosed = orig.status === 'CLOSED';
              const badgeClass = isOngoing ? 'status-badge-ongoing' : isUpcoming ? 'status-badge-upcoming' : isClosed ? 'status-badge-closed' : 'status-badge-listed';

              return `
                <tr class="radar-table-row row-verdict-${item.verdict.toLowerCase()} ${isOngoing ? 'row-ongoing' : isUpcoming ? 'row-upcoming' : isClosed ? 'row-closed' : ''}" data-ticker="${item.ticker}">
                  <td class="cell-status">
                    <div class="status-cell-flex">
                      <span class="status-badge ${badgeClass}">
                        ${escapeHtml(item.statusLabel)}
                      </span>
                      <span class="bidding-dates-text">📅 ${escapeHtml(item.biddingDates || issue.openDate || '')}</span>
                      <span class="date-detail-subtext ${isOngoing ? 'text-accent' : isUpcoming ? 'text-warning' : isClosed ? 'text-info' : 'text-muted'}">
                        ${isOngoing ? '🟢 Bidding Open Today' : isUpcoming ? '🟡 Primary Book Opening' : isClosed ? '🔵 Bidding Closed • Allotment Finalized' : '🏛️ Trading on ' + (orig.exchange || 'NSE / BSE')}
                      </span>
                    </div>
                  </td>
                  <td class="cell-company">
                    <div class="company-cell-flex">
                      <strong class="company-name-text">${escapeHtml(item.name)}</strong>
                      <span class="ticker-badge">${escapeHtml(item.ticker)}</span>
                    </div>
                  </td>
                  <td>
                    <div class="tier-cell-flex">
                      <span class="market-pill market-${item.market.toLowerCase()}">${escapeHtml(item.market)}</span>
                      <span class="tier-pill tier-${item.tier.toLowerCase()}">${escapeHtml(item.tier)}</span>
                    </div>
                  </td>
                  <td class="cell-sector"><span class="sector-text">${escapeHtml(orig.sector || 'N/A')}</span></td>
                  <td class="cell-price">
                    <div>
                      <span class="price-sub-label">${isOngoing || isUpcoming ? 'Band:' : isClosed ? 'Price Band / Issue:' : 'Issue:'}</span>
                      <strong>${escapeHtml(issue.priceBand || (issue.currencySymbol + issue.issuePrice))}</strong>
                    </div>
                    ${issue.minimumLot ? `
                      <div class="lot-size-tag" title="Minimum Retail Application Lot Size">
                        📦 Lot: ${issue.minimumLot} shares (${issue.retailMinInvestment || '₹1.14L'})
                      </div>
                    ` : ''}
                    ${item.currentMarketPrice ? `
                      <div class="live-cmp-container">
                        <span class="cmp-tag">Live CMP:</span> <strong>${issue.currencySymbol}${item.currentMarketPrice}</strong>
                        <span class="cmp-gain ${item.listingGainPct >= 0 ? 'text-success' : 'text-danger'}">
                          (${item.listingGainPct >= 0 ? '+' : ''}${item.listingGainPct}%)
                        </span>
                        <div class="cmp-source-tag">⚡ ${escapeHtml(item.liveDataSource || 'Yahoo Finance (Real-Time)')}</div>
                      </div>
                    ` : ''}
                  </td>
                  <td class="cell-size">
                    <div><strong>${escapeHtml(issue.issueSize || 'N/A')}</strong></div>
                    <div class="ofs-subtext ${issue.ofsPct > 60 ? 'text-danger' : 'text-muted'}">
                      OFS: ${issue.ofsPct != null ? issue.ofsPct + '%' : 'N/A'}
                    </div>
                  </td>
                  <td class="cell-pe">
                    <div><strong>${val.peRatio ? val.peRatio + 'x' : 'N/A'}</strong></div>
                    <div class="discount-subtext ${orig.valuationDiscountPct > 15 ? 'text-success' : orig.valuationDiscountPct < -20 ? 'text-danger' : 'text-muted'}">
                      ${orig.valuationDiscountPct > 0 ? `-${orig.valuationDiscountPct}% disc` : orig.valuationDiscountPct < 0 ? `+${Math.abs(orig.valuationDiscountPct)}% prem` : 'in-line'}
                    </div>
                  </td>
                  <td class="cell-gmp">
                    <div class="gmp-flex">
                      <strong class="${gmpPct >= 30 ? 'text-success' : gmpPct <= 2 ? 'text-danger' : 'text-neutral'}">
                        ${gmpPct >= 0 ? '+' : ''}${gmpPct.toFixed(1)}%
                      </strong>
                      <span class="gmp-price-small">${(sent.gmpPrice ?? sent.gmp) ? issue.currencySymbol + (sent.gmpPrice ?? sent.gmp) : ''}</span>
                    </div>
                  </td>
                  <td class="cell-sub">
                    <span class="sub-number ${(sent.subscription?.total ?? sent.totalSubscription) >= 10 ? 'text-success' : ''}">
                      ${(sent.subscription?.total ?? sent.totalSubscription) != null ? (sent.subscription?.total ?? sent.totalSubscription) + 'x' : 'N/A'}
                    </span>
                  </td>
                  <td class="cell-score">
                    <div class="score-cell-flex">
                      <span class="score-value-bold score-${getScoreGrade(item.score)}">${item.score}</span>
                      <div class="score-bar-mini">
                        <div class="score-bar-fill score-fill-${getScoreGrade(item.score)}" style="width: ${item.score}%"></div>
                      </div>
                    </div>
                  </td>
                  <td class="cell-verdict">
                    <span class="verdict-badge verdict-badge-${item.verdict.toLowerCase()}">
                      ${escapeHtml(item.verdictLabel)}
                    </span>
                  </td>
                  <td class="cell-action text-right">
                    <button class="btn btn-sm btn-outline-terminal btn-open-dossier" data-ticker="${item.ticker}">
                      View Dossier ➔
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

  // =========================================================================
  // CARD GRID VIEW
  // =========================================================================
  renderGridView(items) {
    return `
      <div class="radar-card-grid">
        ${items.map(item => {
          const orig = this.universe.find(u => u.ticker === item.ticker) || {};
          const issue = orig.issueDetails || {};
          const sent = orig.sentiment || {};
          const fin = orig.financials || {};
          const gmpPct = sent.gmpPct ?? 0;
          const isOngoing = orig.status === 'ONGOING';
          const isUpcoming = orig.status === 'UPCOMING';
          const isClosed = orig.status === 'CLOSED';
          const badgeClass = isOngoing ? 'status-badge-ongoing' : isUpcoming ? 'status-badge-upcoming' : isClosed ? 'status-badge-closed' : 'status-badge-listed';

          return `
            <div class="ipo-card card-verdict-${item.verdict.toLowerCase()} ${isOngoing ? 'card-ongoing' : isUpcoming ? 'card-upcoming' : isClosed ? 'card-closed' : ''}" data-ticker="${item.ticker}">
              <div class="card-status-bar">
                <span class="status-badge ${badgeClass}">
                  ${escapeHtml(item.statusLabel)}
                </span>
                <div class="card-date-meta">
                  <span class="card-dates-text">📅 ${escapeHtml(item.biddingDates || '')}</span>
                  <span class="date-detail-subtext ${isOngoing ? 'text-accent' : isUpcoming ? 'text-warning' : isClosed ? 'text-info' : 'text-muted'}">
                    ${isOngoing ? '🟢 Active Book' : isUpcoming ? '🟡 Opening Soon' : isClosed ? '🔵 Bidding Closed • Allotment Done' : '🏛️ Trading on ' + (orig.exchange || 'NSE / BSE')}
                  </span>
                </div>
              </div>

              <div class="card-header">
                <div>
                  <div class="card-title-row">
                    <h3 class="card-company-name">${escapeHtml(item.name)}</h3>
                    <span class="ticker-badge">${escapeHtml(item.ticker)}</span>
                  </div>
                  <div class="card-badges-row">
                    <span class="market-pill market-${item.market.toLowerCase()}">${escapeHtml(item.market)}</span>
                    <span class="tier-pill tier-${item.tier.toLowerCase()}">${escapeHtml(item.tier)}</span>
                    <span class="sector-pill">${escapeHtml(orig.sector || 'Equities')}</span>
                  </div>
                </div>
                <div class="card-score-box score-${getScoreGrade(item.score)}">
                  <span class="cs-num">${item.score}</span>
                  <span class="cs-lbl">Score</span>
                </div>
              </div>

              <div class="card-verdict-banner verdict-banner-${item.verdict.toLowerCase()}">
                <span class="verdict-badge verdict-badge-${item.verdict.toLowerCase()}">${escapeHtml(item.verdictLabel)}</span>
                <span class="verdict-banner-subtext">${escapeHtml(orig.executiveVerdict ? orig.executiveVerdict.split('.')[0] + '.' : '')}</span>
              </div>

              <div class="card-metrics-grid">
                <div class="card-metric">
                  <span class="cm-lbl">${isOngoing || isUpcoming ? 'Price Band' : isClosed ? 'Price Band / Issue' : 'Issue / Live CMP'}</span>
                  <span class="cm-val">
                    ${isOngoing || isUpcoming || isClosed 
                      ? escapeHtml(issue.priceBand || 'N/A') 
                      : `${issue.currencySymbol}${issue.issuePrice || 'N/A'} ${item.currentMarketPrice ? `➔ <strong>${issue.currencySymbol}${item.currentMarketPrice}</strong>` : ''}`}
                  </span>
                  ${!isOngoing && !isUpcoming && !isClosed && item.listingGainPct != null ? `
                    <span class="cmp-gain ${item.listingGainPct >= 0 ? 'text-success' : 'text-danger'}" style="font-size:0.75rem; font-weight:700;">
                      (${item.listingGainPct >= 0 ? '+' : ''}${item.listingGainPct}%)
                    </span>
                    <div class="cmp-source-tag" style="font-size:0.65rem; color:#38bdf8; margin-top:2px;">⚡ ${escapeHtml(item.liveDataSource || 'Yahoo Finance (Real-Time)')}</div>
                  ` : ''}
                </div>
                <div class="card-metric">
                  <span class="cm-lbl">Issue Size</span>
                  <span class="cm-val">${escapeHtml(issue.issueSize || 'N/A')}</span>
                </div>
                <div class="card-metric">
                  <span class="cm-lbl">OFS %</span>
                  <span class="cm-val ${issue.ofsPct > 60 ? 'text-danger' : ''}">${issue.ofsPct != null ? issue.ofsPct + '%' : 'N/A'}</span>
                </div>
                <div class="card-metric">
                  <span class="cm-lbl">P/E Multiple</span>
                  <span class="cm-val">${orig.valuation?.peRatio ? orig.valuation.peRatio + 'x' : 'N/A'}</span>
                </div>
                <div class="card-metric">
                  <span class="cm-lbl">3Y PAT CAGR</span>
                  <span class="cm-val ${fin.patCAGR > 30 ? 'text-success' : fin.patCAGR < 0 ? 'text-danger' : ''}">${fin.patCAGR != null ? fin.patCAGR + '%' : 'N/A'}</span>
                </div>
                <div class="card-metric">
                  <span class="cm-lbl">GMP %</span>
                  <span class="cm-val ${gmpPct >= 30 ? 'text-success' : gmpPct <= 2 ? 'text-danger' : ''}">${gmpPct >= 0 ? '+' : ''}${gmpPct.toFixed(1)}%</span>
                </div>
              </div>

              <div class="card-tactical-preview">
                <strong>Tactical Guidance:</strong>
                <p>${escapeHtml(orig.tacticalNote || item.dossier.part5_tacticalNote)}</p>
              </div>

              <div class="card-footer">
                <button class="btn btn-block btn-terminal btn-open-dossier" data-ticker="${item.ticker}">
                  Open Institutional Dossier ➔
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  getFilteredData() {
    let list = [...this.evaluatedList];

    // Status filter (ONGOING vs UPCOMING vs CLOSED vs LISTED vs ALL)
    if (this.statusFilter === 'ONGOING') {
      list = list.filter(item => item.status === 'ONGOING');
    } else if (this.statusFilter === 'UPCOMING') {
      list = list.filter(item => item.status === 'UPCOMING');
    } else if (this.statusFilter === 'CLOSED') {
      list = list.filter(item => item.status === 'CLOSED');
    } else if (this.statusFilter === 'LISTED') {
      list = list.filter(item => item.status === 'LISTED');
    }

    // Market filter
    if (this.marketFilter === 'IN_MAINBOARD') {
      list = list.filter(item => item.market === 'IN' && item.tier === 'MAINBOARD');
    } else if (this.marketFilter === 'IN_SME') {
      list = list.filter(item => item.market === 'IN' && item.tier === 'SME');
    } else if (this.marketFilter === 'US') {
      list = list.filter(item => item.market === 'US');
    }

    // Verdict filter
    if (this.verdictFilter !== 'ALL') {
      list = list.filter(item => item.verdict === this.verdictFilter);
    }

    // Search query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(item => {
        const orig = this.universe.find(u => u.ticker === item.ticker) || {};
        return (
          item.name.toLowerCase().includes(q) ||
          item.ticker.toLowerCase().includes(q) ||
          (orig.sector || '').toLowerCase().includes(q) ||
          (orig.issueDetails?.leadManagers || []).some(m => m.toLowerCase().includes(q))
        );
      });
    }

    // Sorting
    list.sort((a, b) => {
      const origA = this.universe.find(u => u.ticker === a.ticker) || {};
      const origB = this.universe.find(u => u.ticker === b.ticker) || {};

      if (this.sortBy === 'score') {
        return b.score - a.score;
      } else if (this.sortBy === 'gmp') {
        const gmpA = origA.sentiment?.gmpPct ?? -999;
        const gmpB = origB.sentiment?.gmpPct ?? -999;
        return gmpB - gmpA;
      } else if (this.sortBy === 'size') {
        const sizeA = origA.issueDetails?.issueSizeNum ?? 0;
        const sizeB = origB.issueDetails?.issueSizeNum ?? 0;
        return sizeB - sizeA;
      } else if (this.sortBy === 'cagr') {
        const cagrA = origA.financials?.cagrPat ?? origA.financials?.patCAGR ?? -999;
        const cagrB = origB.financials?.cagrPat ?? origB.financials?.patCAGR ?? -999;
        return cagrB - cagrA;
      }
      return 0;
    });

    return list;
  }

  computeStats() {
    const total = this.evaluatedList.length;
    const ongoingCount = this.evaluatedList.filter(i => i.status === 'ONGOING').length;
    const upcomingCount = this.evaluatedList.filter(i => i.status === 'UPCOMING').length;
    const closedCount = this.evaluatedList.filter(i => i.status === 'CLOSED').length;
    const listedCount = this.evaluatedList.filter(i => i.status === 'LISTED').length;
    const applyCount = this.evaluatedList.filter(i => i.verdict === 'APPLY').length;
    const avoidCount = this.evaluatedList.filter(i => i.verdict === 'AVOID').length;
    const watchCount = this.evaluatedList.filter(i => i.verdict === 'WATCH').length;
    const totalRedFlags = this.evaluatedList.reduce((acc, i) => acc + (i.redFlags ? i.redFlags.length : 0), 0);

    // Segment-level statistics
    const mainboardItems = this.evaluatedList.filter(i => i.market === 'IN' && i.tier === 'MAINBOARD');
    const smeItems = this.evaluatedList.filter(i => i.market === 'IN' && i.tier === 'SME');
    const usItems = this.evaluatedList.filter(i => i.market === 'US');

    const mainboardCount = mainboardItems.length;
    const mainboardOngoing = mainboardItems.filter(i => i.status === 'ONGOING').length;
    const mainboardUpcoming = mainboardItems.filter(i => i.status === 'UPCOMING').length;
    const mainboardClosed = mainboardItems.filter(i => i.status === 'CLOSED').length;
    const mainboardListed = mainboardItems.filter(i => i.status === 'LISTED').length;

    const smeCount = smeItems.length;
    const smeOngoing = smeItems.filter(i => i.status === 'ONGOING').length;
    const smeUpcoming = smeItems.filter(i => i.status === 'UPCOMING').length;
    const smeClosed = smeItems.filter(i => i.status === 'CLOSED').length;
    const smeListed = smeItems.filter(i => i.status === 'LISTED').length;

    const usCount = usItems.length;

    return {
      total, ongoingCount, upcomingCount, closedCount, listedCount,
      applyCount, avoidCount, watchCount, totalRedFlags,
      mainboardCount, mainboardOngoing, mainboardUpcoming, mainboardClosed, mainboardListed,
      smeCount, smeOngoing, smeUpcoming, smeClosed, smeListed,
      usCount
    };
  }

  attachEventListeners() {
    // Live refresh button
    const btnRefresh = this.container.querySelector('#btn-refresh-realtime');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        btnRefresh.classList.add('loading');
        btnRefresh.innerText = 'Syncing...';
        const res = await this.marketFeed.refreshUniverseRealtimeData(this.universe);
        this.lastSynced = res.timestamp;
        this.recalculateEvaluations();
        this.render();
        showToast('Real-time market quotes and GMP synced', 'success');
      });
    }

    // Toggle Auto-sync button
    const btnAutoSync = this.container.querySelector('#btn-toggle-autosync');
    if (btnAutoSync) {
      btnAutoSync.addEventListener('click', () => {
        this.autoSyncActive = !this.autoSyncActive;
        if (this.autoSyncActive) {
          showToast('Live Auto-Sync activated (15s polling)', 'info');
          this.syncIntervalId = setInterval(async () => {
            const res = await this.marketFeed.refreshUniverseRealtimeData(this.universe);
            this.lastSynced = res.timestamp;
            this.recalculateEvaluations();
            this.render();
          }, 15000);
        } else {
          showToast('Live Auto-Sync paused', 'info');
          if (this.syncIntervalId) clearInterval(this.syncIntervalId);
        }
        this.render();
      });
    }

    // Search input
    const searchInput = this.container.querySelector('#radar-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
      });
    }

    const clearSearch = this.container.querySelector('#radar-clear-search');
    if (clearSearch) {
      clearSearch.addEventListener('click', () => {
        this.searchQuery = '';
        this.render();
      });
    }

    // Segment switcher tabs (Mainboard vs SME vs All vs US)
    const segButtons = this.container.querySelectorAll('#radar-segment-bar .segment-tab-btn');
    segButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const seg = btn.getAttribute('data-segment');
        this.marketFilter = seg;
        this.render();
      });
    });

    // Status filter buttons
    const statusPills = this.container.querySelectorAll('#status-filter-group .status-pill');
    statusPills.forEach(pill => {
      pill.addEventListener('click', () => {
        this.statusFilter = pill.getAttribute('data-status');
        this.render();
      });
    });

    // Market filters
    const marketPills = this.container.querySelectorAll('#market-filter-group .filter-pill');
    marketPills.forEach(pill => {
      pill.addEventListener('click', () => {
        this.marketFilter = pill.getAttribute('data-market');
        this.render();
      });
    });

    // Verdict filters
    const verdictPills = this.container.querySelectorAll('#verdict-filter-group .v-filter-pill');
    verdictPills.forEach(pill => {
      pill.addEventListener('click', () => {
        this.verdictFilter = pill.getAttribute('data-verdict');
        this.render();
      });
    });

    // Sort select
    const sortSelect = this.container.querySelector('#radar-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.render();
      });
    }

    // View toggle buttons
    const btnTable = this.container.querySelector('#btn-view-table');
    const btnGrid = this.container.querySelector('#btn-view-grid');
    if (btnTable && btnGrid) {
      btnTable.addEventListener('click', () => {
        this.viewMode = 'table';
        this.render();
      });
      btnGrid.addEventListener('click', () => {
        this.viewMode = 'grid';
        this.render();
      });
    }

    // Reset filters
    const btnReset = this.container.querySelector('#btn-reset-filters');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.marketFilter = 'ALL';
        this.verdictFilter = 'ALL';
        this.statusFilter = 'ALL';
        this.searchQuery = '';
        this.render();
      });
    }

    // Delegated click handler on container for View Dossier buttons and row clicks
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-open-dossier');
      if (btn) {
        e.stopPropagation();
        e.preventDefault();
        const ticker = btn.getAttribute('data-ticker');
        const ipo = this.universe.find(u => u.ticker === ticker || u.id === ticker);
        if (ipo) openIpoDetailModal(ipo);
        return;
      }

      const row = e.target.closest('.radar-table-row');
      if (row && !e.target.closest('button') && !e.target.closest('a')) {
        const ticker = row.getAttribute('data-ticker');
        const ipo = this.universe.find(u => u.ticker === ticker || u.id === ticker);
        if (ipo) openIpoDetailModal(ipo);
        return;
      }
    });
  }
}

function getScoreGrade(score) {
  if (score >= 80) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
