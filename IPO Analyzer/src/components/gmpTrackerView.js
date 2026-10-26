/**
 * IPO Analyzer GMP & Subscription Tracker Component
 * Tracks real-time Grey Market Premium progression, expected listing pop, and live institutional book building.
 */

import { openIpoDetailModal } from './ipoDetailReport.js';

export class GmpTrackerView {
  constructor({ containerId, universe, marketFeed }) {
    this.container = document.getElementById(containerId);
    this.universe = universe;
    this.marketFeed = marketFeed;
    this.lastSync = new Date().toLocaleTimeString();
    this.filterStatus = 'ALL'; // 'ALL', 'ONGOING', 'MAINBOARD', 'SME', 'US'
  }

  updateUniverse(newUniverse, timestamp) {
    this.universe = newUniverse;
    if (timestamp) this.lastSync = timestamp;
    if (this.container && this.container.offsetParent !== null) {
      this.render();
    }
  }

  render() {
    if (!this.container) return;

    let items = [...this.universe];
    if (this.filterStatus === 'ONGOING') {
      items = items.filter(i => i.status === 'ONGOING');
    } else if (this.filterStatus === 'UPCOMING') {
      items = items.filter(i => i.status === 'UPCOMING');
    } else if (this.filterStatus === 'CLOSED') {
      items = items.filter(i => i.status === 'CLOSED');
    } else if (this.filterStatus === 'LISTED') {
      items = items.filter(i => i.status === 'LISTED');
    } else if (this.filterStatus === 'MAINBOARD') {
      items = items.filter(i => i.tier === 'MAINBOARD');
    } else if (this.filterStatus === 'SME') {
      items = items.filter(i => i.tier === 'SME');
    } else if (this.filterStatus === 'US') {
      items = items.filter(i => i.market === 'US');
    }

    items.sort((a, b) => {
      const gmpA = a.sentiment?.gmpPct ?? -999;
      const gmpB = b.sentiment?.gmpPct ?? -999;
      return gmpB - gmpA;
    });

    this.container.innerHTML = `
      <div class="gmp-tracker-wrapper">
        <!-- REAL-TIME LIVESTREAM BANNER -->
        <div class="realtime-header-toolbar">
          <div class="rt-status-left">
            <span class="live-pulse-dot"></span>
            <span class="rt-feed-title">REAL-TIME GMP & BOOK BUILDING ENGINE</span>
            <span class="rt-feed-divider">•</span>
            <span class="rt-sync-time">Last Synced: <strong>${this.lastSync}</strong></span>
            <span class="rt-feed-badge" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.4); color: #34d399; font-weight: 700;">📅 Current Financial Year (FY 2026–27 Only)</span>
            <span class="rt-feed-badge">BSE India • NSE Emerge • Chittorgarh • Groww Grey Market Desk</span>
          </div>
          <div class="rt-status-right">
            <button class="btn btn-outline-terminal btn-sm" id="btn-gmp-refresh-now">
              🔄 Sync Live Quotes
            </button>
          </div>
        </div>

        <div class="gmp-header-strip mt-2">
          <div>
            <h2>📈 Grey Market Premium (GMP) & Book Building Tracker</h2>
            <p>Real-time grey market quotes, 3-day progression momentum, and live subscription breakdown across Mainboard and SME issues.</p>
          </div>
          <div class="gmp-legend-strip">
            <span class="legend-item"><span class="legend-dot dot-bullish"></span> >50% Blockbuster Pop</span>
            <span class="legend-item"><span class="legend-dot dot-moderate"></span> 15-50% Healthy Demand</span>
            <span class="legend-item"><span class="legend-dot dot-muted"></span> <5% Discount / Flat Risk</span>
          </div>
        </div>

        <!-- Filter Pills Bar -->
        <div class="gmp-filter-bar mt-3">
          <button class="filter-pill ${this.filterStatus === 'ALL' ? 'active' : ''}" data-filter="ALL">All Issues (${this.universe.length})</button>
          <button class="filter-pill pill-ongoing ${this.filterStatus === 'ONGOING' ? 'active' : ''}" data-filter="ONGOING">
            🔴 Live Ongoing (${this.universe.filter(i => i.status === 'ONGOING').length})
          </button>
          <button class="filter-pill pill-upcoming ${this.filterStatus === 'UPCOMING' ? 'active' : ''}" data-filter="UPCOMING">
            🟡 Upcoming Pipeline (${this.universe.filter(i => i.status === 'UPCOMING').length})
          </button>
          <button class="filter-pill pill-closed ${this.filterStatus === 'CLOSED' ? 'active' : ''}" data-filter="CLOSED">
            🔵 Closed / Allotment (${this.universe.filter(i => i.status === 'CLOSED').length})
          </button>
          <button class="filter-pill ${this.filterStatus === 'LISTED' ? 'active' : ''}" data-filter="LISTED">
            ⚪ Recently Listed (${this.universe.filter(i => i.status === 'LISTED').length})
          </button>
          <button class="filter-pill ${this.filterStatus === 'MAINBOARD' ? 'active' : ''}" data-filter="MAINBOARD">India Mainboard</button>
          <button class="filter-pill ${this.filterStatus === 'SME' ? 'active' : ''}" data-filter="SME">India SME</button>
          <button class="filter-pill ${this.filterStatus === 'US' ? 'active' : ''}" data-filter="US">US Market</button>
        </div>

        <div class="table-container institutional-radar-table-container mt-3">
          <table class="institutional-table gmp-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>IPO Asset</th>
                <th>Market</th>
                <th>Issue Price</th>
                <th>Live GMP Quote</th>
                <th>Estimated Listing</th>
                <th>Expected Gain %</th>
                <th>3-Day Progression</th>
                <th>QIB Coverage</th>
                <th>Retail Book</th>
                <th>Total Book</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(ipo => {
                const issue = ipo.issueDetails || {};
                const sent = ipo.sentiment || {};
                const gmpPct = sent.gmpPct ?? 0;
                const gmpPrice = sent.gmpPrice ?? 0;
                const sym = issue.currencySymbol || '₹';
                const basePrice = issue.issuePrice || 0;
                const estListingPrice = basePrice ? (basePrice + gmpPrice).toFixed(1) : 'N/A';
                const trend = sent.gmpTrend || [gmpPct, gmpPct, gmpPct];
                const isOngoing = ipo.status === 'ONGOING';
                const isUpcoming = ipo.status === 'UPCOMING';
                const isClosed = ipo.status === 'CLOSED';

                const isRising = trend[trend.length - 1] > trend[trend.length - 2];
                const isFalling = trend[trend.length - 1] < trend[trend.length - 2];

                return `
                  <tr class="gmp-table-row ${isOngoing ? 'row-ongoing' : isUpcoming ? 'row-upcoming' : isClosed ? 'row-closed' : ''}">
                    <td>
                      <span class="status-badge ${isOngoing ? 'status-badge-ongoing' : isUpcoming ? 'status-badge-upcoming' : isClosed ? 'status-badge-closed' : 'status-badge-listed'}">
                        ${isOngoing ? '🟢 BID OPEN' : isUpcoming ? '🟡 UPCOMING' : isClosed ? '🔵 CLOSED' : '⚪ LISTED'}
                      </span>
                    </td>
                    <td>
                      <div class="company-cell-flex">
                        <strong>${escapeHtml(ipo.name)}</strong>
                        <span class="ticker-badge">${escapeHtml(ipo.ticker)}</span>
                      </div>
                    </td>
                    <td>
                      <span class="market-pill market-${ipo.market.toLowerCase()}">${escapeHtml(ipo.market)}</span>
                      <span class="tier-pill tier-${ipo.tier.toLowerCase()}">${escapeHtml(ipo.tier)}</span>
                    </td>
                    <td><strong>${sym}${basePrice || 'N/A'}</strong></td>
                    <td class="cell-gmp-quote">
                      <strong class="live-quote-num">${sym}${gmpPrice}</strong>
                    </td>
                    <td class="cell-est-listing">
                      <strong>${sym}${estListingPrice}</strong>
                    </td>
                    <td>
                      <span class="gmp-pill ${gmpPct >= 50 ? 'pill-gmp-high' : gmpPct >= 15 ? 'pill-gmp-mid' : 'pill-gmp-low'}">
                        ${gmpPct >= 0 ? '+' : ''}${gmpPct.toFixed(1)}%
                      </span>
                    </td>
                    <td class="cell-trend">
                      <div class="trend-badge-flex">
                        <span class="trend-direction-icon">${isRising ? '📈 ↗' : isFalling ? '📉 ↘' : '➔'}</span>
                        <span class="trend-history-text">${trend.map(v => v + '%').join(' ➔ ')}</span>
                      </div>
                    </td>
                    <td><strong>${sent.subscription?.qib ? sent.subscription.qib + 'x' : 'N/A'}</strong></td>
                    <td>${sent.subscription?.retail ? sent.subscription.retail + 'x' : 'N/A'}</td>
                    <td>
                      <span class="sub-total-badge ${sent.subscription?.total > 30 ? 'sub-oversubscribed' : ''}">
                        ${sent.subscription?.total ? sent.subscription.total + 'x' : 'N/A'}
                      </span>
                    </td>
                    <td class="text-right">
                      <button class="btn btn-sm btn-outline-terminal btn-open-gmp-dossier" data-ticker="${ipo.ticker}">
                        Dossier ➔
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const buttons = this.container.querySelectorAll('.btn-open-gmp-dossier');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const ticker = btn.getAttribute('data-ticker');
        const ipo = this.universe.find(u => u.ticker === ticker);
        if (ipo) openIpoDetailModal(ipo);
      });
    });

    const refreshBtn = this.container.querySelector('#btn-gmp-refresh-now');
    if (refreshBtn && this.marketFeed) {
      refreshBtn.addEventListener('click', () => {
        this.marketFeed.syncAll(true);
      });
    }

    const filterPills = this.container.querySelectorAll('.gmp-filter-bar .filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        this.filterStatus = pill.getAttribute('data-filter');
        this.render();
      });
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
