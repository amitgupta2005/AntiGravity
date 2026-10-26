/**
 * KPI Bar Component
 * Displays quantitative summary cards for the screened stock universe
 */

export function renderKpiBar(results = [], containerId = 'kpi-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const total = results.length;
  const bullishCrosses = results.filter(r => r.isBullishCross || (r.signalType && r.signalType.includes('BULLISH_CROSSOVER'))).length;
  const bearishCrosses = results.filter(r => r.isBearishCross || (r.signalType && r.signalType.includes('BEARISH_CROSSOVER'))).length;
  const oversold = results.filter(r => (r.slowK ?? r.stoch?.k ?? 50) < 20).length;
  const overbought = results.filter(r => (r.slowK ?? r.stoch?.k ?? 50) > 80).length;

  const kP = results[0]?.kPeriod || 14;
  const kS = results[0]?.kSmoothing || 3;
  const dP = results[0]?.dPeriod || 3;

  container.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card" data-filter="all">
        <div class="kpi-header">
          <span class="kpi-title">Universe Size</span>
          <span class="kpi-icon"><i data-lucide="layers"></i></span>
        </div>
        <div class="kpi-value">${total}</div>
        <div class="kpi-subtitle">Closing-Basis Analyzed</div>
      </div>

      <div class="kpi-card bullish-card" data-filter="bullishCross">
        <div class="kpi-header">
          <span class="kpi-title">Bullish Cross (%K > %D)</span>
          <span class="kpi-icon"><i data-lucide="trending-up"></i></span>
        </div>
        <div class="kpi-value text-emerald">${bullishCrosses}</div>
        <div class="kpi-subtitle">Momentum Reversal Trigger</div>
      </div>

      <div class="kpi-card oversold-card" data-filter="oversold">
        <div class="kpi-header">
          <span class="kpi-title">Oversold (%K < 20)</span>
          <span class="kpi-icon"><i data-lucide="arrow-down-circle"></i></span>
        </div>
        <div class="kpi-value text-cyan">${oversold}</div>
        <div class="kpi-subtitle">Deep Discount Zone</div>
      </div>

      <div class="kpi-card bearish-card" data-filter="bearishCross">
        <div class="kpi-header">
          <span class="kpi-title">Bearish Cross (%K < %D)</span>
          <span class="kpi-icon"><i data-lucide="trending-down"></i></span>
        </div>
        <div class="kpi-value text-rose">${bearishCrosses}</div>
        <div class="kpi-subtitle">Top Exhaustion Trigger</div>
      </div>

      <div class="kpi-card overbought-card" data-filter="overbought">
        <div class="kpi-header">
          <span class="kpi-title">Overbought (%K > 80)</span>
          <span class="kpi-icon"><i data-lucide="arrow-up-circle"></i></span>
        </div>
        <div class="kpi-value text-amber">${overbought}</div>
        <div class="kpi-subtitle">Extended Rally Zone</div>
      </div>

      <div class="kpi-card strategy-card">
        <div class="kpi-header">
          <span class="kpi-title">Stochastic Model</span>
          <span class="kpi-badge">Active</span>
        </div>
        <div class="kpi-strategy-val">${kP}, ${kS}, ${dP}</div>
        <div class="kpi-subtitle">Strict Close-Only Basis</div>
      </div>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons({ root: container });
  }
}
