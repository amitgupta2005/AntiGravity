/**
 * Apex Forensic Red Flag Scanner Component
 * Real-time forensic screening for pre-IPO margin window-dressing, predatory OFS exits,
 * low float illiquidity, and macro volatility shifts.
 */

import { IpoEvaluationEngine } from '../quant/ipoEvaluationEngine.js';
import { openIpoDetailModal } from './ipoDetailReport.js';

export class RedFlagScanner {
  constructor({ containerId, universe, marketFeed }) {
    this.container = document.getElementById(containerId);
    this.universe = universe;
    this.marketFeed = marketFeed;
    this.lastSync = new Date().toLocaleTimeString();
    this.recalculateEvaluations();
  }

  recalculateEvaluations() {
    this.evaluatedList = this.universe.map(ipo => ({
      ipo,
      evaluation: IpoEvaluationEngine.evaluate(ipo)
    }));
  }

  updateUniverse(newUniverse, timestamp) {
    this.universe = newUniverse;
    if (timestamp) this.lastSync = timestamp;
    this.recalculateEvaluations();
    if (this.container && this.container.offsetParent !== null) {
      this.render();
    }
  }

  render() {
    if (!this.container) return;

    // Filter to IPOs that have at least 1 red flag or verdict AVOID/WATCH
    const flaggedItems = this.evaluatedList
      .filter(item => item.evaluation.redFlags.length > 0)
      .sort((a, b) => b.evaluation.redFlags.length - a.evaluation.redFlags.length);

    this.container.innerHTML = `
      <div class="red-flag-scanner-wrapper">
        <!-- REAL-TIME LIVESTREAM BANNER -->
        <div class="realtime-header-toolbar">
          <div class="rt-status-left">
            <span class="live-pulse-dot"></span>
            <span class="rt-feed-title">REAL-TIME FORENSIC SURVEILLANCE ACTIVE</span>
            <span class="rt-feed-divider">•</span>
            <span class="rt-sync-time">Last Ticked: <strong>${this.lastSync}</strong></span>
            <span class="rt-feed-badge" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.4); color: #34d399; font-weight: 700;">📅 Current Financial Year (FY 2026–27 Only)</span>
            <span class="rt-feed-badge">Continuous Accounting & Volatility Anomaly Detection</span>
          </div>
          <div class="rt-status-right">
            <span class="vix-badge">
              <span>IN VIX:</span> <strong>${this.marketFeed?.cachedVix?.indiaVix?.value || 14.35}</strong>
            </span>
          </div>
        </div>

        <div class="scanner-header-strip mt-2">
          <div>
            <h2>🚨 Forensic Red Flag & Underwriting Risk Radar</h2>
            <p>Systematic real-time screening for pre-IPO margin spikes, predatory PE exits (OFS > 60%), low float illiquidity traps, and hyper-inflated valuations.</p>
          </div>
          <div class="scanner-stat-badges">
            <span class="scanner-badge badge-critical">CRITICAL: Margin Window Dressing & Suspensions</span>
            <span class="scanner-badge badge-high">HIGH: 100% OFS Cashouts & Illiquidity Traps</span>
          </div>
        </div>

        <div class="flagged-cards-grid mt-3">
          ${flaggedItems.map(({ ipo, evaluation }) => {
            const issue = ipo.issueDetails || {};
            const val = ipo.valuation || {};
            const criticalFlags = evaluation.redFlags.filter(f => f.severity === 'CRITICAL');
            const isOngoing = ipo.status === 'ONGOING';

            return `
              <div class="forensic-card ${criticalFlags.length > 0 ? 'card-critical-risk' : 'card-high-risk'} ${isOngoing ? 'card-ongoing' : ''}">
                <div class="fc-header">
                  <div class="fc-title-group">
                    <h3 class="fc-name">${escapeHtml(ipo.name)}</h3>
                    <div class="fc-badges">
                      <span class="ticker-badge">${escapeHtml(ipo.ticker)}</span>
                      <span class="market-pill market-${ipo.market.toLowerCase()}">${escapeHtml(ipo.market)}</span>
                      <span class="tier-pill tier-${ipo.tier.toLowerCase()}">${escapeHtml(ipo.tier)}</span>
                      ${isOngoing ? '<span class="status-badge status-badge-ongoing">🟢 LIVE BID OPEN</span>' : ''}
                    </div>
                  </div>
                  <div class="fc-verdict-box">
                    <span class="verdict-badge verdict-badge-${evaluation.verdict.toLowerCase()}">${escapeHtml(evaluation.verdictLabel)}</span>
                    <span class="fc-score-text">Score: ${evaluation.score}/100</span>
                  </div>
                </div>

                <div class="fc-metrics-summary">
                  <div class="fcm-item">
                    <span class="fcm-label">Issue Size</span>
                    <span class="fcm-val">${escapeHtml(issue.issueSize || 'N/A')}</span>
                  </div>
                  <div class="fcm-item">
                    <span class="fcm-label">OFS Ratio</span>
                    <span class="fcm-val ${issue.ofsPct > 60 ? 'text-danger' : ''}">${issue.ofsPct != null ? issue.ofsPct + '%' : 'N/A'}</span>
                  </div>
                  <div class="fcm-item">
                    <span class="fcm-label">P/E Multiple</span>
                    <span class="fcm-val">${val.peRatio ? val.peRatio + 'x' : 'N/A'}</span>
                  </div>
                  <div class="fcm-item">
                    <span class="fcm-label">Public Float</span>
                    <span class="fcm-val ${val.publicFloatPct < 20 ? 'text-danger' : ''}">${val.publicFloatPct ? val.publicFloatPct + '%' : 'N/A'}</span>
                  </div>
                </div>

                <div class="fc-flags-section">
                  <h4 class="flags-heading">Flagged Risks (${evaluation.redFlags.length})</h4>
                  <ul class="fc-flags-list">
                    ${evaluation.redFlags.map(rf => `
                      <li class="fc-flag-item severity-${(rf.severity || 'high').toLowerCase()}">
                        <span class="flag-icon">${rf.severity === 'CRITICAL' ? '🚨' : '⚠️'}</span>
                        <div class="flag-content">
                          <strong class="flag-title">${escapeHtml(rf.title)}</strong>
                          <p class="flag-detail">${escapeHtml(rf.detail)}</p>
                        </div>
                      </li>
                    `).join('')}
                  </ul>
                </div>

                <div class="fc-footer">
                  <button class="btn btn-outline-terminal btn-block btn-open-rf-dossier" data-ticker="${ipo.ticker}">
                    Review Full Institutional Memo ➔
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const buttons = this.container.querySelectorAll('.btn-open-rf-dossier');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const ticker = btn.getAttribute('data-ticker');
        const ipo = this.universe.find(u => u.ticker === ticker);
        if (ipo) openIpoDetailModal(ipo);
      });
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
