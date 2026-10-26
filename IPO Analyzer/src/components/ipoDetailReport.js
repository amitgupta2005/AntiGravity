/**
 * Antigravity Institutional IPO Dossier Modal & Component
 * Renders the exact 5-part institutional analysis format.
 */

import { IpoEvaluationEngine } from '../quant/ipoEvaluationEngine.js';
import { showToast } from './toast.js';

export function openIpoDetailModal(ipo) {
  const evaluation = IpoEvaluationEngine.evaluate(ipo);
  const { dossier, pillarScores, score, verdictLabel, verdictColor } = evaluation;

  // Remove existing modal if any
  const existing = document.getElementById('ipo-dossier-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'ipo-dossier-modal';
  modal.className = 'modal-backdrop';

  const issue = ipo.issueDetails || {};
  const isIndia = ipo.market === 'IN';

  modal.innerHTML = `
    <div class="modal-dialog institutional-dossier-dialog" role="dialog" aria-modal="true">
      <div class="modal-header">
        <div class="header-asset-info">
          <div class="asset-title-row">
            <h2 class="asset-name">${escapeHtml(ipo.name)}</h2>
            <span class="ticker-badge">${escapeHtml(ipo.ticker)}</span>
            <span class="market-badge market-${ipo.market.toLowerCase()}">${escapeHtml(ipo.market)}</span>
            <span class="tier-badge tier-${ipo.tier.toLowerCase()}">${escapeHtml(ipo.tier)}</span>
          </div>
          <p class="asset-subtitle">${escapeHtml(ipo.sector || 'Equities')} • ${escapeHtml(ipo.exchange || '')}</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary btn-sm copy-memo-btn" id="btn-copy-memo">
            <span class="icon">📋</span> Copy Markdown Memo
          </button>
          <button class="modal-close-btn" id="btn-close-dossier" aria-label="Close modal">✕</button>
        </div>
      </div>

      <div class="modal-body dossier-body">
        <!-- TOP EXECUTIVE SCORECARD BANNER -->
        <div class="dossier-scorecard-banner verdict-banner-${evaluation.verdict.toLowerCase()}">
          <div class="verdict-main">
            <span class="verdict-label-pill" style="background-color: ${verdictColor}">${escapeHtml(verdictLabel)}</span>
            <div class="verdict-subtext">${escapeHtml(ipo.verdictReason || dossier.part1_executiveVerdict.split('.')[0] + '.')}</div>
          </div>
          <div class="score-breakdown-card">
            <div class="overall-score-dial">
              <span class="dial-number">${score}</span>
              <span class="dial-total">/100</span>
              <span class="dial-label">Antigravity Score</span>
            </div>
            <div class="pillar-mini-gauges">
              <div class="gauge-item">
                <div class="gauge-header"><span>Fundamental</span><strong>${pillarScores.fundamental}</strong></div>
                <div class="gauge-track"><div class="gauge-fill" style="width: ${pillarScores.fundamental}%"></div></div>
              </div>
              <div class="gauge-item">
                <div class="gauge-header"><span>Valuation</span><strong>${pillarScores.quantitative}</strong></div>
                <div class="gauge-track"><div class="gauge-fill" style="width: ${pillarScores.quantitative}%"></div></div>
              </div>
              <div class="gauge-item">
                <div class="gauge-header"><span>Sentiment</span><strong>${pillarScores.sentiment}</strong></div>
                <div class="gauge-track"><div class="gauge-fill" style="width: ${pillarScores.sentiment}%"></div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- QUICK ISSUE KEY METRICS BAR -->
        <div class="issue-metrics-strip">
          <div class="metric-box">
            <span class="m-label">Issue Price / Band</span>
            <span class="m-value">${escapeHtml(issue.priceBand || (issue.currencySymbol + issue.issuePrice))}</span>
          </div>
          <div class="metric-box">
            <span class="m-label">Issue Size</span>
            <span class="m-value">${escapeHtml(issue.issueSize || 'N/A')}</span>
          </div>
          <div class="metric-box">
            <span class="m-label">Fresh Issue</span>
            <span class="m-value text-accent">${issue.freshIssuePct != null ? issue.freshIssuePct + '%' : 'N/A'}</span>
          </div>
          <div class="metric-box">
            <span class="m-label">OFS Ratio</span>
            <span class="m-value ${issue.ofsPct > 60 ? 'text-danger' : ''}">${issue.ofsPct != null ? issue.ofsPct + '%' : 'N/A'}</span>
          </div>
          <div class="metric-box">
            <span class="m-label">Post Issue Float</span>
            <span class="m-value">${ipo.valuation?.publicFloatPct ? ipo.valuation.publicFloatPct + '%' : 'N/A'}</span>
          </div>
        </div>

        <!-- PART 1: EXECUTIVE VERDICT -->
        <section class="dossier-section part-1-verdict">
          <div class="section-badge">Part 1</div>
          <h3 class="section-title">Executive Verdict</h3>
          <div class="verdict-callout-box">
            <p class="verdict-prose">${formatBoldText(dossier.part1_executiveVerdict)}</p>
          </div>
        </section>

        <!-- PART 2: THE BUSINESS & RED FLAGS -->
        <section class="dossier-section part-2-business">
          <div class="section-badge">Part 2</div>
          <h3 class="section-title">The Business & Red Flags</h3>
          <div class="business-content-grid">
            <div class="business-column">
              <h4>What They Do</h4>
              <p class="business-desc">${escapeHtml(dossier.part2_businessAndRedFlags.whatTheyDo)}</p>
              
              <h4 class="mt-3">Competitive Moat & Predictability</h4>
              <p class="moat-desc">${escapeHtml(dossier.part2_businessAndRedFlags.moat)}</p>
            </div>
            <div class="red-flags-column">
              <h4>Critical Red Flags & Underwriting Risks (${dossier.part2_businessAndRedFlags.redFlags.length})</h4>
              ${dossier.part2_businessAndRedFlags.redFlags.length === 0 
                ? '<div class="no-red-flags-pill">✓ No major institutional forensic red flags detected. Clean audit trail.</div>'
                : `<ul class="red-flags-list">
                    ${dossier.part2_businessAndRedFlags.redFlags.map(rf => `
                      <li class="red-flag-item">
                        <span class="rf-icon">⚠️</span>
                        <span class="rf-text">${escapeHtml(rf)}</span>
                      </li>
                    `).join('')}
                   </ul>`
              }
            </div>
          </div>
        </section>

        <!-- PART 3: VALUATION VS PEERS -->
        <section class="dossier-section part-3-valuation">
          <div class="section-badge">Part 3</div>
          <div class="section-title-row">
            <h3 class="section-title">Valuation vs. Peers</h3>
            <span class="benchmark-pill">${escapeHtml(dossier.part3_valuationVsPeers.benchmarkDiscountSummary)}</span>
          </div>

          <div class="table-responsive">
            <table class="institutional-table comps-table">
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Ticker</th>
                  <th>P/E</th>
                  <th>P/B</th>
                  <th>EV/EBITDA</th>
                  <th>Net Margin</th>
                  <th>Market Cap</th>
                </tr>
              </thead>
              <tbody>
                <tr class="target-row">
                  <td><strong>${escapeHtml(dossier.part3_valuationVsPeers.target.name)}</strong></td>
                  <td><span class="ticker-badge">${escapeHtml(dossier.part3_valuationVsPeers.target.ticker)}</span></td>
                  <td><strong>${escapeHtml(dossier.part3_valuationVsPeers.target.pe)}</strong></td>
                  <td>${escapeHtml(dossier.part3_valuationVsPeers.target.pb)}</td>
                  <td>${escapeHtml(dossier.part3_valuationVsPeers.target.evEbitda)}</td>
                  <td>${escapeHtml(dossier.part3_valuationVsPeers.target.patMargin)}</td>
                  <td><strong>${escapeHtml(dossier.part3_valuationVsPeers.target.mcap)}</strong></td>
                </tr>
                ${dossier.part3_valuationVsPeers.peers.map(peer => `
                  <tr>
                    <td>${escapeHtml(peer.name)}</td>
                    <td><span class="ticker-badge peer-badge">${escapeHtml(peer.ticker)}</span></td>
                    <td>${escapeHtml(peer.pe)}</td>
                    <td>${escapeHtml(peer.pb)}</td>
                    <td>${escapeHtml(peer.evEbitda)}</td>
                    <td>${escapeHtml(peer.patMargin)}</td>
                    <td>${escapeHtml(peer.mcap)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <!-- PART 4: MARKET SENTIMENT -->
        <section class="dossier-section part-4-sentiment">
          <div class="section-badge">Part 4</div>
          <h3 class="section-title">Market Sentiment & Demand Metrics</h3>
          
          <div class="sentiment-cards-grid">
            ${isIndia ? `
              <div class="sentiment-card">
                <span class="card-caption">Grey Market Premium (GMP)</span>
                <div class="gmp-headline">
                  <span class="gmp-price">${escapeHtml(dossier.part4_marketSentiment.gmpPrice)}</span>
                  <span class="gmp-percent-badge ${parseFloat(dossier.part4_marketSentiment.gmpPct) > 30 ? 'gmp-bullish' : 'gmp-muted'}">
                    ${escapeHtml(dossier.part4_marketSentiment.gmpPct)}
                  </span>
                </div>
                <div class="gmp-progression-trend">
                  <span class="trend-label">3-Day Trend:</span>
                  <span class="trend-values">${dossier.part4_marketSentiment.gmpTrend.map(v => v + '%').join(' ➔ ')}</span>
                </div>
              </div>

              <div class="sentiment-card">
                <span class="card-caption">Subscription Multipliers</span>
                <div class="sub-multipliers-grid">
                  <div class="sub-cell"><span>QIB</span><strong>${dossier.part4_marketSentiment.subscription.qib}x</strong></div>
                  <div class="sub-cell"><span>NII</span><strong>${dossier.part4_marketSentiment.subscription.nii}x</strong></div>
                  <div class="sub-cell"><span>Retail</span><strong>${dossier.part4_marketSentiment.subscription.retail}x</strong></div>
                  <div class="sub-cell highlight"><span>Total</span><strong>${dossier.part4_marketSentiment.subscription.total}x</strong></div>
                </div>
              </div>
            ` : `
              <div class="sentiment-card">
                <span class="card-caption">Book Building Momentum</span>
                <div class="gmp-headline">
                  <span class="gmp-price">${dossier.part4_marketSentiment.subscription.total}x</span>
                  <span class="gmp-percent-badge gmp-bullish">Institutional Oversubscribed</span>
                </div>
                <div class="gmp-progression-trend">
                  <span class="trend-label">QIB Coverage:</span>
                  <span class="trend-values">${dossier.part4_marketSentiment.subscription.qib}x</span>
                </div>
              </div>

              <div class="sentiment-card">
                <span class="card-caption">Underwriter Syndicate</span>
                <div class="underwriter-info">
                  <span class="tier-pill tier-${dossier.part4_marketSentiment.underwriterTier.toLowerCase()}">
                    ${escapeHtml(dossier.part4_marketSentiment.underwriterTier)}
                  </span>
                  <p class="lead-managers-list">${(issue.leadManagers || []).join(', ')}</p>
                </div>
              </div>
            `}

            <div class="sentiment-card">
              <span class="card-caption">Anchor & Institutional Quality</span>
              <p class="anchor-narrative">${escapeHtml(dossier.part4_marketSentiment.anchorQuality)}</p>
              <div class="vix-context">
                <span>Macro Volatility Index:</span> <strong>${dossier.part4_marketSentiment.macroVix}</strong>
              </div>
            </div>
          </div>
        </section>

        <!-- PART 5: ANTIGRAVITY TACTICAL NOTE -->
        <section class="dossier-section part-5-tactical">
          <div class="section-badge">Part 5</div>
          <h3 class="section-title">Antigravity Tactical Note</h3>
          <div class="tactical-guidance-box">
            <div class="tactical-icon">🎯</div>
            <div class="tactical-body">
              <h4>Listing Day & Portfolio Action Protocol</h4>
              <p class="tactical-text">${escapeHtml(dossier.part5_tacticalNote)}</p>
            </div>
          </div>
        </section>
      </div>

      <div class="modal-footer">
        <span class="compliance-note">Institutional Research • Quantitative Underwriting via Antigravity Engine</span>
        <button class="btn btn-secondary" id="btn-close-dossier-footer">Close Dossier</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close handlers
  const closeModal = () => modal.remove();
  modal.querySelector('#btn-close-dossier').addEventListener('click', closeModal);
  modal.querySelector('#btn-close-dossier-footer').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Copy Markdown Memo handler
  modal.querySelector('#btn-copy-memo').addEventListener('click', () => {
    const memo = IpoEvaluationEngine.formatAsMarkdownMemo(evaluation);
    navigator.clipboard.writeText(memo).then(() => {
      showToast(`Copied Antigravity Institutional Memo for ${ipo.ticker} to clipboard!`, 'success');
    }).catch(() => {
      showToast('Clipboard access denied. Please copy manually.', 'error');
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatBoldText(text) {
  if (!text) return '';
  // Convert markdown **text** to <strong>text</strong> safely
  const escaped = escapeHtml(text);
  return escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}
