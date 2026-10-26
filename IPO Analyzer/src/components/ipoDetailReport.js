/**
 * IPO Analyzer Institutional IPO Dossier Modal & Component
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

  const df = dossier.drhpFinancials || {};
  const repCurrency = df.reportingCurrency || (isIndia ? 'INR Cr' : 'USD M');
  const currSym = repCurrency.includes('USD') ? '$' : '₹';
  const years = (df.revenue3Y && df.revenue3Y.length >= 3)
    ? df.revenue3Y.map(r => r.year)
    : ['FY24', 'FY25', 'FY26'];
  const rev = df.revenue3Y?.map(r => r.value) || [];
  const ebitda = df.ebitda3Y?.map(e => e.value) || [];
  const pat = df.pat3Y?.map(p => p.value) || [];
  const hasSpike = Boolean(df.hasPreIpoMarginSpike);

  const fmtFinancial = (val) => {
    if (val == null) return 'N/A';
    return (val < 0 ? '-' : '') + currSym + Math.abs(val).toLocaleString();
  };

  const calcMargin = (num, denom) => {
    if (num == null || denom == null || denom === 0) return 'N/A';
    return ((num / denom) * 100).toFixed(1) + '%';
  };

  modal.innerHTML = `
    <div class="modal-dialog institutional-dossier-dialog" role="dialog" aria-modal="true">
      <div class="modal-header">
        <div class="header-asset-info">
          <div class="asset-title-row">
            <h2 class="asset-name">${escapeHtml(ipo.name)}</h2>
            <span class="ticker-badge">${escapeHtml(ipo.ticker)}</span>
            <span class="market-badge market-${ipo.market.toLowerCase()}">${escapeHtml(ipo.market)}</span>
            <span class="tier-badge tier-${ipo.tier.toLowerCase()}">${escapeHtml(ipo.tier)}</span>
            <span class="status-badge ${ipo.status === 'ONGOING' ? 'status-badge-ongoing' : ipo.status === 'UPCOMING' ? 'status-badge-upcoming' : ipo.status === 'CLOSED' ? 'status-badge-closed' : 'status-badge-listed'}">
              ${escapeHtml(ipo.statusLabel || (ipo.status === 'ONGOING' ? '🟢 BID OPEN NOW' : ipo.status === 'UPCOMING' ? '🟡 UPCOMING' : ipo.status === 'CLOSED' ? '🔵 BIDDING CLOSED' : '⚪ RECENTLY LISTED'))}
            </span>
          </div>
          <p class="asset-subtitle">${escapeHtml(ipo.sector || 'Equities')} • ${escapeHtml(ipo.exchange || '')} • 📅 ${escapeHtml(ipo.biddingDates || '')}</p>
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
              <span class="dial-label">Institutional Score</span>
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
            <span class="m-label">${ipo.status === 'LISTED' ? 'Issue Price' : 'Issue Price / Band'}</span>
            <span class="m-value">${escapeHtml(issue.priceBand || (issue.currencySymbol + issue.issuePrice))}</span>
          </div>
          ${ipo.currentMarketPrice ? `
            <div class="metric-box">
              <span class="m-label">Live CMP (Yahoo Finance)</span>
              <span class="m-value text-accent">${issue.currencySymbol || '₹'}${ipo.currentMarketPrice} 
                <span class="cmp-gain ${ipo.listingGainPct >= 0 ? 'text-success' : 'text-danger'}" style="font-size:0.75rem;">
                  (${ipo.listingGainPct >= 0 ? '+' : ''}${ipo.listingGainPct}%)
                </span>
              </span>
              <span style="font-size:0.65rem; color:#38bdf8; display:block; margin-top:2px;">⚡ ${escapeHtml(ipo.liveDataSource || 'Yahoo Finance (Real-Time)')}</span>
            </div>
          ` : ''}
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

        <!-- DRHP FINANCIAL DATA DISCLOSURE -->
        <section class="dossier-section drhp-financials-section">
          <div class="section-badge drhp-badge">DRHP Disclosures</div>
          <div class="section-title-row">
            <h3 class="section-title">📊 Financial Data Disclosed in DRHP (Restated 3-Year Audited Financials)</h3>
            <span class="drhp-source-pill">SEBI / SEC Prospectus Filing • Reporting Currency: ${escapeHtml(repCurrency)}</span>
          </div>

          <!-- 3-Year Audited Restated Income Statement Table -->
          <div class="table-responsive">
            <table class="institutional-table drhp-financial-table">
              <thead>
                <tr>
                  <th>Financial Line Item (DRHP Restated)</th>
                  ${years.map(y => `<th class="text-right">${escapeHtml(y)}</th>`).join('')}
                  <th class="text-right">3-Year Trajectory / CAGR</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Revenue from Operations</strong></td>
                  ${rev.map(v => `<td class="text-right font-mono">${fmtFinancial(v)}</td>`).join('')}
                  <td class="text-right font-mono text-accent">
                    <strong>${df.cagrRevenue != null ? (df.cagrRevenue >= 0 ? '+' : '') + df.cagrRevenue + '% CAGR' : 'N/A'}</strong>
                  </td>
                </tr>
                <tr>
                  <td><strong>Operating EBITDA</strong></td>
                  ${ebitda.map(v => `<td class="text-right font-mono">${fmtFinancial(v)}</td>`).join('')}
                  <td class="text-right font-mono text-muted">
                    ${df.margins?.ebitdaMargin != null ? df.margins.ebitdaMargin + '% Margin' : 'N/A'}
                  </td>
                </tr>
                <tr class="sub-row">
                  <td class="text-dim" style="padding-left: 1.5rem;">↳ Operating EBITDA Margin %</td>
                  ${ebitda.map((v, i) => `<td class="text-right font-mono text-dim">${calcMargin(v, rev[i])}</td>`).join('')}
                  <td class="text-right text-dim">Operating Efficiency</td>
                </tr>
                <tr class="highlight-profit-row">
                  <td><strong>Profit After Tax (PAT / Net Profit)</strong></td>
                  ${pat.map(v => `<td class="text-right font-mono ${v < 0 ? 'text-danger' : 'text-success'}"><strong>${fmtFinancial(v)}</strong></td>`).join('')}
                  <td class="text-right font-mono ${df.cagrPat != null && df.cagrPat < 0 ? 'text-danger' : 'text-success'}">
                    <strong>${df.cagrPat != null ? (df.cagrPat >= 0 ? '+' : '') + df.cagrPat + '% CAGR' : 'N/A'}</strong>
                  </td>
                </tr>
                <tr class="sub-row">
                  <td class="text-dim" style="padding-left: 1.5rem;">↳ Net PAT Margin %</td>
                  ${pat.map((v, i) => `<td class="text-right font-mono text-dim">${calcMargin(v, rev[i])}</td>`).join('')}
                  <td class="text-right text-dim">${df.margins?.patMargin != null ? 'FY26 Margin: ' + df.margins.patMargin + '%' : ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- DRHP Solvency, Cash Flows & Forensic Integrity Grid -->
          <div class="drhp-solvency-grid mt-3">
            <div class="solvency-card">
              <span class="sc-label">Operating Cash Flow (OCF)</span>
              <span class="sc-val font-mono ${df.operatingCashFlow != null && df.operatingCashFlow < 0 ? 'text-danger' : 'text-success'}">
                ${df.operatingCashFlow != null ? (df.operatingCashFlow >= 0 ? '+' : '') + fmtFinancial(df.operatingCashFlow) : 'N/A'}
              </span>
              <span class="sc-hint">${df.operatingCashFlow != null && df.operatingCashFlow >= 0 ? '✓ Positive core operating cash flow' : '⚠️ Cash drain from operations / working capital'}</span>
            </div>

            <div class="solvency-card">
              <span class="sc-label">Net Debt & Capital Structure</span>
              <span class="sc-val font-mono">
                ${df.netDebt != null ? (df.netDebt <= 0 ? 'Net Cash (+ ' + fmtFinancial(Math.abs(df.netDebt)) + ')' : fmtFinancial(df.netDebt) + ' Debt') : 'N/A'}
              </span>
              <span class="sc-hint">Debt-to-Equity: <strong>${df.debtToEquity != null ? df.debtToEquity + 'x' : 'N/A'}</strong> ${df.debtToEquity != null && df.debtToEquity < 0.5 ? '(Conservative Leverage)' : '(Leveraged)'}</span>
            </div>

            <div class="solvency-card">
              <span class="sc-label">Gross Margin Profile</span>
              <span class="sc-val font-mono text-accent">
                ${df.margins?.grossMargin != null ? df.margins.grossMargin + '%' : 'N/A'}
              </span>
              <span class="sc-hint">Gross value addition & raw material discipline</span>
            </div>

            <div class="solvency-card ${hasSpike ? 'solvency-card-spike' : 'solvency-card-clean'}">
              <span class="sc-label">DRHP Forensic Window-Dressing Audit</span>
              <span class="sc-val ${hasSpike ? 'text-danger' : 'text-success'}">
                ${hasSpike ? '🚨 Margin Window-Dressing Risk' : '✓ Clean Restated Trajectory'}
              </span>
              <span class="sc-hint">${escapeHtml(df.marginSpikeDetail || df.forensicAuditVerdict)}</span>
            </div>
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

        <!-- PART 5: TACTICAL LISTING NOTE -->
        <section class="dossier-section part-5-tactical">
          <div class="section-badge">Part 5</div>
          <h3 class="section-title">Tactical Listing Note</h3>
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
        <span class="compliance-note">Institutional Research • Quantitative Underwriting via Institutional Valuation Engine</span>
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
      showToast(`Copied Institutional Memo for ${ipo.ticker} to clipboard!`, 'success');
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
