/**
 * Apex Custom IPO Analyzer Component
 * Allows users to input any custom IPO across India Mainboard, SME, or US Market
 * and generates the complete 5-part institutional evaluation dossier instantly.
 */

import { IpoEvaluationEngine } from '../quant/ipoEvaluationEngine.js';
import { openIpoDetailModal } from './ipoDetailReport.js';
import { showToast } from './toast.js';

export class IpoCustomAnalyzer {
  constructor({ containerId, onEvaluated, marketFeed }) {
    this.container = document.getElementById(containerId);
    this.onEvaluated = onEvaluated;
    this.marketFeed = marketFeed;
    this.lastEvaluation = null;
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="custom-analyzer-wrapper">
        <div class="analyzer-header">
          <div class="analyzer-title-box">
            <h2>⚡ Custom IPO Institutional Underwriter</h2>
            <p>Input issue parameters, 3-year financials, valuation multiples, and sentiment to generate an institutional-grade underwriting dossier.</p>
          </div>
          <div class="analyzer-presets-box">
            <span>Quick Presets (FY 2026–27):</span>
            <button class="preset-btn" data-preset="premier-energies">Premier Energies (IN)</button>
            <button class="preset-btn" data-preset="sme-flagged">High-Risk SME (Margin Spike)</button>
            <button class="preset-btn" data-preset="us-ai-cloud">US AI SaaS Unicorn</button>
            <button class="preset-btn" id="btn-clear-form">Clear Form</button>
          </div>
        </div>

        <form id="custom-ipo-form" class="custom-analyzer-form">
          <!-- 1. GENERAL & ISSUE DETAILS -->
          <div class="form-card">
            <div class="form-card-header">
              <span class="card-step-badge">Pillar 1</span>
              <h3>1. Issue Parameters & Float Structure</h3>
            </div>
            <div class="form-grid-3">
              <div class="form-group">
                <label for="inp-name">Company Name *</label>
                <input type="text" id="inp-name" required placeholder="e.g. Premier Energies Ltd" value="Premier Energies Ltd" />
              </div>
              <div class="form-group">
                <label for="inp-ticker">Ticker / Symbol *</label>
                <input type="text" id="inp-ticker" required placeholder="e.g. PREMIER" value="PREMIER" />
              </div>
              <div class="form-group">
                <label for="inp-market">Market & Tier *</label>
                <select id="inp-market" class="terminal-select">
                  <option value="IN_MAINBOARD" selected>🇮🇳 India Mainboard (NSE/BSE)</option>
                  <option value="IN_SME">🇮🇳 India SME (BSE SME / NSE Emerge)</option>
                  <option value="US">🇺🇸 US Market (NYSE / NASDAQ)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="inp-sector">Sector / Industry</label>
                <input type="text" id="inp-sector" placeholder="e.g. Solar Cells & Renewable Clean Energy" value="Solar Cells & Renewable Clean Energy" />
              </div>
              <div class="form-group">
                <label for="inp-issue-size">Total Issue Size</label>
                <input type="text" id="inp-issue-size" placeholder="e.g. ₹2,830 Cr" value="₹2,830 Cr" />
              </div>
              <div class="form-group">
                <label for="inp-price-band">Price Band</label>
                <input type="text" id="inp-price-band" placeholder="e.g. ₹427 - ₹450" value="₹427 - ₹450" />
              </div>
              <div class="form-group">
                <label for="inp-fresh-pct">Fresh Issue % (Reinvested in Business) *</label>
                <input type="number" id="inp-fresh-pct" min="0" max="100" required value="46" />
                <span class="input-hint">Reinvested in business capex & solar capacity</span>
              </div>
              <div class="form-group">
                <label for="inp-ofs-pct">Offer For Sale (OFS) % (Promoter/PE Exit) *</label>
                <input type="number" id="inp-ofs-pct" min="0" max="100" required value="54" />
                <span class="input-hint">High OFS (>60%) triggers severe red flag</span>
              </div>
              <div class="form-group">
                <label for="inp-float-pct">Post-Issue Public Float %</label>
                <input type="number" id="inp-float-pct" min="1" max="100" value="19" />
                <span class="input-hint">Low float (<20% in SME) = illiquidity risk</span>
              </div>
            </div>

            <div class="form-group mt-3">
              <label for="inp-business-desc">Business Reality & Moat Summary</label>
              <textarea id="inp-business-desc" rows="2" placeholder="Describe core products/services, target addressable market, and sustainable competitive advantages...">India’s second largest integrated manufacturer of solar cells and photovoltaic modules, operating advanced TOPCon manufacturing lines with domestic PLI accreditation.</textarea>
            </div>
          </div>

          <!-- 2. 3-YEAR FINANCIAL TRAJECTORY -->
          <div class="form-card">
            <div class="form-card-header">
              <span class="card-step-badge">Pillar 2</span>
              <h3>2. Financial Trajectory & Margin Forensics</h3>
            </div>
            <div class="form-grid-4">
              <div class="form-group">
                <label for="inp-rev-cagr">3-Year Revenue CAGR % *</label>
                <input type="number" step="0.1" id="inp-rev-cagr" value="46.8" />
              </div>
              <div class="form-group">
                <label for="inp-pat-cagr">3-Year PAT CAGR % *</label>
                <input type="number" step="0.1" id="inp-pat-cagr" value="90.5" />
              </div>
              <div class="form-group">
                <label for="inp-pat-margin">Latest PAT Margin %</label>
                <input type="number" step="0.1" id="inp-pat-margin" value="17.4" />
              </div>
              <div class="form-group">
                <label for="inp-margin-spike">🚨 Pre-IPO Margin Spike Check</label>
                <select id="inp-margin-spike" class="terminal-select highlight-select">
                  <option value="clean" selected>Clean (Organic Trajectory)</option>
                  <option value="spike">🚨 Abnormal Spike in 12M Prior to IPO</option>
                </select>
                <span class="input-hint">Pre-IPO window dressing SEBI alert</span>
              </div>
            </div>
          </div>

          <!-- 3. VALUATION & PEER BENCHMARK -->
          <div class="form-card">
            <div class="form-card-header">
              <span class="card-step-badge">Pillar 3</span>
              <h3>3. Valuation Multiples & Listed Peer Comps</h3>
            </div>
            <div class="form-grid-3">
              <div class="form-group">
                <label for="inp-pe-ratio">Issue P/E Multiple *</label>
                <input type="number" step="0.1" id="inp-pe-ratio" required value="48.5" />
              </div>
              <div class="form-group">
                <label for="inp-pb-ratio">Issue P/B Multiple</label>
                <input type="number" step="0.1" id="inp-pb-ratio" value="4.2" />
              </div>
              <div class="form-group">
                <label for="inp-ev-ebitda">Issue EV / EBITDA</label>
                <input type="number" step="0.1" id="inp-ev-ebitda" value="22.4" />
              </div>
            </div>

            <!-- Peer inputs table -->
            <div class="peer-inputs-box mt-3">
              <label>Comparison Against Listed Industry Peers (2-3 Peers)</label>
              <div class="peer-row-inputs">
                <div class="peer-input-entry">
                  <input type="text" id="inp-peer1-name" placeholder="Peer 1 Name" value="Adani Green Energy" />
                  <input type="number" step="0.1" id="inp-peer1-pe" placeholder="Peer 1 P/E" value="142.0" />
                  <input type="number" step="0.1" id="inp-peer1-margin" placeholder="Peer 1 Margin %" value="14.2" />
                </div>
                <div class="peer-input-entry mt-2">
                  <input type="text" id="inp-peer2-name" placeholder="Peer 2 Name" value="Tata Power Solar" />
                  <input type="number" step="0.1" id="inp-peer2-pe" placeholder="Peer 2 P/E" value="38.5" />
                  <input type="number" step="0.1" id="inp-peer2-margin" placeholder="Peer 2 Margin %" value="8.5" />
                </div>
              </div>
            </div>
          </div>

          <!-- 4. TECHNICAL & MARKET SENTIMENT -->
          <div class="form-card">
            <div class="form-card-header">
              <span class="card-step-badge">Pillar 4</span>
              <h3>4. Sentiment, GMP & Subscription Momentum</h3>
            </div>
            <div class="form-grid-4">
              <div class="form-group">
                <label for="inp-gmp-pct">GMP % (Grey Market Premium)</label>
                <input type="number" step="0.1" id="inp-gmp-pct" value="15.2" />
                <span class="input-hint">>30% strong, <2% risk of discount</span>
              </div>
              <div class="form-group">
                <label for="inp-gmp-trend">GMP 3-Day Progression</label>
                <select id="inp-gmp-trend" class="terminal-select">
                  <option value="rising" selected>Rising (Expanding Demand)</option>
                  <option value="stable">Stable / Flat</option>
                  <option value="falling">Collapsing / Softening</option>
                </select>
              </div>
              <div class="form-group">
                <label for="inp-qib-sub">QIB / Institutional Coverage</label>
                <input type="number" step="0.1" id="inp-qib-sub" value="18.5" />
                <span class="input-hint">Multiples (e.g. 18.5x)</span>
              </div>
              <div class="form-group">
                <label for="inp-underwriter-tier">Lead Underwriter Reputation</label>
                <select id="inp-underwriter-tier" class="terminal-select">
                  <option value="TIER_1" selected>Tier-1 (Goldman, Kotak, Morgan Stanley, Axis)</option>
                  <option value="TIER_2">Tier-2 National Investment Banks</option>
                  <option value="BOUTIQUE">Boutique / SME Syndicate</option>
                </select>
              </div>
            </div>
          </div>

          <!-- SUBMIT ACTION -->
          <div class="analyzer-submit-strip">
            <button type="submit" class="btn btn-primary btn-lg" id="btn-run-analysis">
              ⚡ Run Institutional Evaluation
            </button>
          </div>
        </form>

        <!-- EVALUATION RESULTS PREVIEW CONTAINER -->
        <div id="custom-evaluation-results" class="custom-results-container"></div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const form = this.container.querySelector('#custom-ipo-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.runCustomEvaluation();
      });
    }

    // Preset handlers
    const presetButtons = this.container.querySelectorAll('.preset-btn[data-preset]');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-preset');
        this.applyPreset(p);
      });
    });

    const btnClear = this.container.querySelector('#btn-clear-form');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        form.reset();
        document.getElementById('custom-evaluation-results').innerHTML = '';
        showToast('Form cleared', 'info');
      });
    }

    // Auto-balance Fresh vs OFS %
    const inpFresh = this.container.querySelector('#inp-fresh-pct');
    const inpOfs = this.container.querySelector('#inp-ofs-pct');
    if (inpFresh && inpOfs) {
      inpFresh.addEventListener('input', () => {
        const val = Math.min(100, Math.max(0, Number(inpFresh.value) || 0));
        inpOfs.value = 100 - val;
      });
      inpOfs.addEventListener('input', () => {
        const val = Math.min(100, Math.max(0, Number(inpOfs.value) || 0));
        inpFresh.value = 100 - val;
      });
    }
  }

  applyPreset(presetKey) {
    if (presetKey === 'premier-energies') {
      this.populateForm({
        name: 'Premier Energies Ltd',
        ticker: 'PREMIER',
        market: 'IN_MAINBOARD',
        sector: 'Solar Cells & Renewable Clean Energy',
        issueSize: '₹2,830 Cr',
        priceBand: '₹427 - ₹450',
        freshPct: 46,
        ofsPct: 54,
        floatPct: 19,
        businessDesc: 'India’s second largest integrated manufacturer of solar cells and photovoltaic modules, operating advanced TOPCon manufacturing lines with domestic PLI accreditation.',
        revCagr: 71.8,
        patCagr: 266.3,
        patMargin: 11.5,
        marginSpike: 'clean',
        peRatio: 26.5,
        pbRatio: 5.2,
        evEbitda: 14.8,
        peer1Name: 'Websol Energy System',
        peer1Pe: 38.6,
        peer1Margin: 8.4,
        peer2Name: 'Waaree Energies',
        peer2Pe: 48.2,
        peer2Margin: 12.8,
        gmpPct: 108.9,
        gmpTrend: 'rising',
        qibSub: 216.4,
        underwriterTier: 'TIER_1'
      });
    } else if (presetKey === 'sme-flagged') {
      this.populateForm({
        name: 'Apex Precision Tools SME',
        ticker: 'APEXTOOLS',
        market: 'IN_SME',
        sector: 'Industrial Tooling & Hardware',
        issueSize: '₹18 Cr',
        priceBand: '₹84',
        freshPct: 30,
        ofsPct: 70,
        floatPct: 14,
        businessDesc: 'Single-factory manufacturer of industrial hand tools facing client concentration with top 2 distributors making up 85% of sales.',
        revCagr: 12.4,
        patCagr: 280.0,
        patMargin: 21.5,
        marginSpike: 'spike',
        peRatio: 38.2,
        pbRatio: 6.8,
        evEbitda: 18.5,
        peer1Name: 'Taparia Tools',
        peer1Pe: 12.4,
        peer1Margin: 6.2,
        peer2Name: 'GKW Ltd',
        peer2Pe: 16.0,
        peer2Margin: 5.8,
        gmpPct: 75.0,
        gmpTrend: 'falling',
        qibSub: 1.0,
        underwriterTier: 'BOUTIQUE'
      });
    } else if (presetKey === 'us-ai-cloud') {
      this.populateForm({
        name: 'CoreWeave Inc',
        ticker: 'CWVE',
        market: 'US',
        sector: 'AI Cloud Infrastructure & GPU Hyperscaler',
        issueSize: '$3,500M',
        priceBand: '$42 - $48',
        freshPct: 85,
        ofsPct: 15,
        floatPct: 28,
        businessDesc: 'Specialized GPU cloud provider for AI training clusters backed by NVIDIA, holding multi-billion dollar compute reservations with leading AI labs.',
        revCagr: 180.0,
        patCagr: 65.0,
        patMargin: 14.8,
        marginSpike: 'clean',
        peRatio: 52.0,
        pbRatio: 9.4,
        evEbitda: 28.0,
        peer1Name: 'Amazon AWS / AMZN',
        peer1Pe: 42.0,
        peer1Margin: 12.0,
        peer2Name: 'Microsoft Azure / MSFT',
        peer2Pe: 35.0,
        peer2Margin: 34.0,
        gmpPct: 45.0,
        gmpTrend: 'rising',
        qibSub: 22.0,
        underwriterTier: 'TIER_1'
      });
    }

    showToast(`Loaded "${presetKey}" preset`, 'info');
  }

  populateForm(d) {
    const set = (id, val) => {
      const el = this.container.querySelector(id);
      if (el) el.value = val;
    };
    set('#inp-name', d.name);
    set('#inp-ticker', d.ticker);
    set('#inp-market', d.market);
    set('#inp-sector', d.sector);
    set('#inp-issue-size', d.issueSize);
    set('#inp-price-band', d.priceBand);
    set('#inp-fresh-pct', d.freshPct);
    set('#inp-ofs-pct', d.ofsPct);
    set('#inp-float-pct', d.floatPct);
    set('#inp-business-desc', d.businessDesc);
    set('#inp-rev-cagr', d.revCagr);
    set('#inp-pat-cagr', d.patCagr);
    set('#inp-pat-margin', d.patMargin);
    set('#inp-margin-spike', d.marginSpike);
    set('#inp-pe-ratio', d.peRatio);
    set('#inp-pb-ratio', d.pbRatio);
    set('#inp-ev-ebitda', d.evEbitda);
    set('#inp-peer1-name', d.peer1Name);
    set('#inp-peer1-pe', d.peer1Pe);
    set('#inp-peer1-margin', d.peer1Margin);
    set('#inp-peer2-name', d.peer2Name);
    set('#inp-peer2-pe', d.peer2Pe);
    set('#inp-peer2-margin', d.peer2Margin);
    set('#inp-gmp-pct', d.gmpPct);
    set('#inp-gmp-trend', d.gmpTrend);
    set('#inp-qib-sub', d.qibSub);
    set('#inp-underwriter-tier', d.underwriterTier);
  }

  runCustomEvaluation() {
    const getVal = (id) => this.container.querySelector(id)?.value;
    const getNum = (id) => Number(this.container.querySelector(id)?.value) || 0;

    const marketTier = getVal('#inp-market');
    let market = 'IN';
    let tier = 'MAINBOARD';
    if (marketTier === 'IN_SME') {
      tier = 'SME';
    } else if (marketTier === 'US') {
      market = 'US';
      tier = 'MAINBOARD';
    }

    const gmpPct = getNum('#inp-gmp-pct');
    const gmpTrendChoice = getVal('#inp-gmp-trend');
    let gmpTrend = [gmpPct - 5, gmpPct - 2, gmpPct];
    if (gmpTrendChoice === 'falling') gmpTrend = [gmpPct + 10, gmpPct + 4, gmpPct];
    else if (gmpTrendChoice === 'stable') gmpTrend = [gmpPct, gmpPct, gmpPct];

    const peers = [];
    const p1Name = getVal('#inp-peer1-name');
    if (p1Name) {
      peers.push({
        name: p1Name,
        ticker: p1Name.split(' ')[0].toUpperCase(),
        pe: getNum('#inp-peer1-pe'),
        pb: 3.5,
        evEbitda: 18.0,
        patMargin: getNum('#inp-peer1-margin'),
        mcap: 'Listed Peer'
      });
    }
    const p2Name = getVal('#inp-peer2-name');
    if (p2Name) {
      peers.push({
        name: p2Name,
        ticker: p2Name.split(' ')[0].toUpperCase(),
        pe: getNum('#inp-peer2-pe'),
        pb: 4.0,
        evEbitda: 16.5,
        patMargin: getNum('#inp-peer2-margin'),
        mcap: 'Listed Peer'
      });
    }

    const revCagr = getNum('#inp-rev-cagr');
    const patCagr = getNum('#inp-pat-cagr');
    const latestMargin = getNum('#inp-pat-margin');
    const isSpike = getVal('#inp-margin-spike') === 'spike';
    const repCurr = market === 'IN' ? 'INR Cr' : 'USD M';
    const baseRev = 1000;
    const r1 = Math.round(baseRev / (1 + (revCagr / 100)));
    const r2 = Math.round(baseRev);
    const r3 = Math.round(baseRev * (1 + (revCagr / 100)));
    const m1 = isSpike ? latestMargin * 0.35 : latestMargin * 0.85;
    const m2 = isSpike ? latestMargin * 0.45 : latestMargin * 0.92;
    const m3 = latestMargin;
    const p1 = Math.round(r1 * (m1 / 100) * 10) / 10;
    const p2 = Math.round(r2 * (m2 / 100) * 10) / 10;
    const p3 = Math.round(r3 * (m3 / 100) * 10) / 10;
    const e1 = Math.round(p1 * 1.8 * 10) / 10;
    const e2 = Math.round(p2 * 1.8 * 10) / 10;
    const e3 = Math.round(p3 * 1.8 * 10) / 10;

    const customIpo = {
      id: `CUSTOM-${getVal('#inp-ticker')}`,
      name: getVal('#inp-name'),
      ticker: getVal('#inp-ticker').toUpperCase(),
      market,
      tier,
      sector: getVal('#inp-sector'),
      businessSummary: getVal('#inp-business-desc'),
      issueDetails: {
        priceBand: getVal('#inp-price-band'),
        currencySymbol: market === 'IN' ? '₹' : '$',
        issueSize: getVal('#inp-issue-size'),
        freshIssuePct: getNum('#inp-fresh-pct'),
        ofsPct: getNum('#inp-ofs-pct'),
        leadManagers: ['Institutional Syndicate']
      },
      financials: {
        reportingCurrency: repCurr,
        revenueCAGR: revCagr,
        patCAGR: patCagr,
        cagrRevenue: revCagr,
        cagrPat: patCagr,
        revenue3Y: [
          { year: 'FY24', value: r1 },
          { year: 'FY25', value: r2 },
          { year: 'FY26', value: r3 }
        ],
        pat3Y: [
          { year: 'FY24', value: p1 },
          { year: 'FY25', value: p2 },
          { year: 'FY26', value: p3 }
        ],
        ebitda3Y: [
          { year: 'FY24', value: e1 },
          { year: 'FY25', value: e2 },
          { year: 'FY26', value: e3 }
        ],
        operatingCashFlow: Math.round(p3 * 0.85),
        netDebt: Math.round(p3 * 0.5),
        debtToEquity: 0.25,
        margins: {
          grossMargin: Math.round(m3 * 2.8),
          ebitdaMargin: Math.round((e3 / r3) * 100 * 10) / 10,
          patMargin: m3,
          spikeDetected: isSpike
        },
        patMargin: [m1, m2, m3],
        preIpoMarginSpike: isSpike,
        marginSpikeDetail: isSpike 
          ? `Pre-IPO PAT margin surged from ${m1.toFixed(1)}% in FY24 to ${m3.toFixed(1)}% in FY26 immediately prior to DRHP filing.`
          : 'Audited 3-year restated financial statements indicate sustainable organic trajectory.'
      },
      valuation: {
        peRatio: getNum('#inp-pe-ratio'),
        pbRatio: getNum('#inp-pb-ratio'),
        evEbitda: getNum('#inp-ev-ebitda'),
        publicFloatPct: getNum('#inp-float-pct')
      },
      peers,
      sentiment: {
        gmpPct,
        gmpTrend,
        subscription: {
          qib: getNum('#inp-qib-sub'),
          nii: getNum('#inp-qib-sub') * 0.6,
          retail: 3.5,
          total: getNum('#inp-qib-sub') * 0.8
        },
        underwriterTier: getVal('#inp-underwriter-tier'),
        anchorQuality: 'Underwriter Book Syndicate',
        macroVix: this.marketFeed?.cachedVix 
          ? (market === 'IN' ? this.marketFeed.cachedVix.indiaVix.value : this.marketFeed.cachedVix.usVix.value)
          : 14.2
      }
    };

    const evaluation = IpoEvaluationEngine.evaluate(customIpo);
    this.lastEvaluation = evaluation;

    this.renderEvaluationResults(customIpo, evaluation);
    showToast(`Evaluated ${customIpo.ticker}: Verdict ${evaluation.verdictLabel}`, 'success');

    if (this.onEvaluated) {
      this.onEvaluated(customIpo, evaluation);
    }
  }

  renderEvaluationResults(ipo, evaluation) {
    const resultsContainer = this.container.querySelector('#custom-evaluation-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
      <div class="custom-results-card">
        <div class="results-header">
          <div>
            <span class="results-tag">Institutional Instant Evaluation</span>
            <h3>${escapeHtml(ipo.name)} (${escapeHtml(ipo.ticker)})</h3>
          </div>
          <div class="results-actions">
            <button class="btn btn-primary" id="btn-open-custom-dossier">
              📖 Open Full 5-Part Institutional Dossier
            </button>
          </div>
        </div>

        <div class="results-verdict-strip verdict-banner-${evaluation.verdict.toLowerCase()}">
          <div class="rv-left">
            <span class="verdict-badge verdict-badge-${evaluation.verdict.toLowerCase()}">${escapeHtml(evaluation.verdictLabel)}</span>
            <p class="rv-rationale">${escapeHtml(evaluation.dossier.part1_executiveVerdict.split('.')[0] + '.')}</p>
          </div>
          <div class="rv-score">
            <span class="rv-num">${evaluation.score}</span>
            <span class="rv-denom">/100</span>
          </div>
        </div>

        <div class="results-pillars-grid">
          <div class="rp-box">
            <span class="rp-title">Fundamental Score</span>
            <strong class="rp-val">${evaluation.pillarScores.fundamental}</strong>
          </div>
          <div class="rp-box">
            <span class="rp-title">Valuation Score</span>
            <strong class="rp-val">${evaluation.pillarScores.quantitative}</strong>
          </div>
          <div class="rp-box">
            <span class="rp-title">Sentiment Score</span>
            <strong class="rp-val">${evaluation.pillarScores.sentiment}</strong>
          </div>
          <div class="rp-box">
            <span class="rp-title">Red Flags Detected</span>
            <strong class="rp-val ${evaluation.redFlags.length > 0 ? 'text-danger' : 'text-success'}">${evaluation.redFlags.length}</strong>
          </div>
        </div>

        ${evaluation.redFlags.length > 0 ? `
          <div class="results-red-flags-alert">
            <h4>⚠️ Underwriting Red Flags Detected:</h4>
            <ul>
              ${evaluation.redFlags.map(rf => `<li><strong>${escapeHtml(rf.title)}:</strong> ${escapeHtml(rf.detail)}</li>`).join('')}
            </ul>
          </div>
        ` : '<div class="no-red-flags-pill mt-3">✓ Zero critical underwriting red flags detected.</div>'}
      </div>
    `;

    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    resultsContainer.querySelector('#btn-open-custom-dossier').addEventListener('click', () => {
      openIpoDetailModal(ipo);
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
