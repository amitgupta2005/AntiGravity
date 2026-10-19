/**
 * Custom Option Strategy Builder Component
 * Build and customize multi-leg option combo strategies with live Greeks and Payoff sync
 */

import { OPTION_UNIVERSE } from '../data/stockUniverse.js';
import { calculateGreeks, calculatePOP } from '../quant/blackScholes.js';
import { calculatePayoffProfile } from '../quant/payoffCalculator.js';

let currentBuilderState = {
  asset: OPTION_UNIVERSE[0],
  dte: 14,
  legs: []
};

/**
 * Initialize Builder with an asset or existing strategy
 */
export function initBuilderState(asset, initialLegs = null, dte = 14) {
  currentBuilderState.asset = asset || OPTION_UNIVERSE[0];
  currentBuilderState.dte = dte || 14;

  if (initialLegs && Array.isArray(initialLegs) && initialLegs.length > 0) {
    currentBuilderState.legs = JSON.parse(JSON.stringify(initialLegs));
  } else {
    // Default to Bull Call Spread on the asset
    const S = currentBuilderState.asset.basePrice;
    const step = currentBuilderState.asset.strikeStep || 5;
    const atm = Math.round(S / step) * step;
    const T = currentBuilderState.dte / 365;
    const r = currentBuilderState.asset.riskFreeRate || 0.05;
    const iv = (currentBuilderState.asset.historicalIV || 25) / 100;

    const lowerGreeks = calculateGreeks('call', S, atm, T, r, iv);
    const upperGreeks = calculateGreeks('call', S, atm + step * 2, T, r, iv);

    currentBuilderState.legs = [
      { id: 1, type: 'call', action: 'buy', strike: atm, premium: lowerGreeks.price, contracts: 1 },
      { id: 2, type: 'call', action: 'sell', strike: atm + step * 2, premium: upperGreeks.price, contracts: 1 }
    ];
  }
}

/**
 * Add a leg directly to the builder
 */
export function addLegToBuilder(leg) {
  const newId = (currentBuilderState.legs.reduce((max, l) => Math.max(max, l.id || 0), 0) + 1);
  currentBuilderState.legs.push({
    id: newId,
    type: leg.type || 'call',
    action: leg.action || 'buy',
    strike: leg.strike || currentBuilderState.asset.basePrice,
    premium: leg.premium || 2.5,
    contracts: leg.contracts || 1
  });
}

/**
 * Render Strategy Builder UI
 */
export function renderStrategyBuilder(containerId, onPayoffUpdate) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const asset = currentBuilderState.asset;
  const curr = asset.currencySymbol || '$';
  const S = asset.price || asset.basePrice;
  const step = asset.strikeStep || 5;
  const atm = Math.round(S / step) * step;

  // Calculate Payoff Profile
  const ivDecimal = (asset.iv || asset.historicalIV || 25) / 100;
  const r = asset.riskFreeRate || (asset.currency === 'INR' ? 0.065 : 0.045);
  const payoff = calculatePayoffProfile(currentBuilderState.legs, S, asset.lotSize, currentBuilderState.dte, ivDecimal, r);

  // Compute POP
  let pop = 50.0;
  if (payoff && payoff.breakevens.length > 0) {
    const isBull = payoff.netDelta >= 0;
    pop = calculatePOP(S, payoff.breakevens[0], currentBuilderState.dte / 365, ivDecimal, isBull);
  }

  // Generate strike options
  const strikeOptions = [];
  for (let i = -12; i <= 12; i++) {
    strikeOptions.push(atm + i * step);
  }

  container.innerHTML = `
    <div class="builder-panel">
      <!-- Builder Header: Asset Selection & Strategy Presets -->
      <div class="builder-header-row">
        <div class="builder-asset-select">
          <label class="control-label text-dim">Underlying Asset</label>
          <select id="builderAssetPicker" class="input-select font-mono font-bold">
            ${OPTION_UNIVERSE.map(a => `
              <option value="${a.ticker}" ${a.ticker === asset.ticker ? 'selected' : ''}>
                ${a.market === 'US' ? '🇺🇸' : '🇮🇳'} ${a.displayTicker} (${a.name}) — ${a.currencySymbol}${a.basePrice}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="builder-template-select">
          <label class="control-label text-dim">Strategy Presets</label>
          <select id="builderPresetPicker" class="input-select">
            <option value="">-- Apply Strategy Template --</option>
            <option value="LONG_CALL">Long Call (Bullish Momentum)</option>
            <option value="BULL_CALL_SPREAD">Bull Call Spread (Debit)</option>
            <option value="BULL_PUT_SPREAD">Bull Put Spread (Credit)</option>
            <option value="LONG_PUT">Long Put (Bearish Breakdown)</option>
            <option value="BEAR_PUT_SPREAD">Bear Put Spread (Debit)</option>
            <option value="BEAR_CALL_SPREAD">Bear Call Spread (Credit)</option>
            <option value="IRON_CONDOR">Iron Condor (Delta-Neutral Range)</option>
            <option value="IRON_BUTTERFLY">Iron Butterfly (Pin Strike)</option>
            <option value="LONG_STRADDLE">Long Straddle (Vol Breakout)</option>
            <option value="LONG_STRANGLE">Long Strangle (OTM Breakout)</option>
          </select>
        </div>

        <div class="builder-dte-slider-wrap">
          <label class="control-label text-dim">
            DTE: <span id="builderDteVal" class="font-bold text-cyan font-mono">${currentBuilderState.dte} Days</span>
          </label>
          <input type="range" id="builderDteSlider" min="1" max="90" value="${currentBuilderState.dte}" class="slider">
        </div>
      </div>

      <!-- Legs Table -->
      <div class="builder-legs-container">
        <div class="legs-header-row">
          <h3 class="panel-sub-title">Strategy Structure (${currentBuilderState.legs.length} Legs)</h3>
          <button class="btn btn-secondary btn-sm" id="btnAddLegBtn">
            <i data-lucide="plus"></i> Add Option Leg
          </button>
        </div>

        <table class="builder-table font-mono" id="builderLegsTable">
          <thead>
            <tr>
              <th>Action</th>
              <th>Type</th>
              <th>Strike Price</th>
              <th>Expiry DTE</th>
              <th>Contracts</th>
              <th>Est. Premium</th>
              <th>Greek Delta</th>
              <th>Greek Theta</th>
              <th>Remove</th>
            </tr>
          </thead>
          <tbody>
            ${currentBuilderState.legs.map((leg, idx) => {
              const T = currentBuilderState.dte / 365;
              const greeks = calculateGreeks(leg.type, S, leg.strike, T, r, ivDecimal);
              const sign = leg.action === 'buy' ? 1 : -1;
              const legDelta = Number((sign * greeks.delta).toFixed(3));
              const legTheta = Number((sign * greeks.theta * (asset.lotSize || 100)).toFixed(2));

              return `
                <tr class="leg-row" data-id="${leg.id}">
                  <td>
                    <select class="leg-action-select ${leg.action === 'buy' ? 'action-buy' : 'action-sell'}" data-field="action">
                      <option value="buy" ${leg.action === 'buy' ? 'selected' : ''}>BUY</option>
                      <option value="sell" ${leg.action === 'sell' ? 'selected' : ''}>SELL</option>
                    </select>
                  </td>
                  <td>
                    <select class="leg-type-select font-bold" data-field="type">
                      <option value="call" ${leg.type === 'call' ? 'selected' : ''}>CALL</option>
                      <option value="put" ${leg.type === 'put' ? 'selected' : ''}>PUT</option>
                    </select>
                  </td>
                  <td>
                    <select class="leg-strike-select font-bold font-mono" data-field="strike">
                      ${strikeOptions.map(stk => `
                        <option value="${stk}" ${stk === leg.strike ? 'selected' : ''}>
                          ${curr}${stk} ${stk === atm ? '(ATM)' : ''}
                        </option>
                      `).join('')}
                    </select>
                  </td>
                  <td class="text-dim">${currentBuilderState.dte}d</td>
                  <td>
                    <input type="number" min="1" max="50" value="${leg.contracts || 1}" class="leg-contracts-input font-mono" data-field="contracts">
                  </td>
                  <td>
                    <span class="font-mono text-cyan">${curr}${leg.premium.toFixed(2)}</span>
                  </td>
                  <td class="${legDelta >= 0 ? 'text-emerald' : 'text-rose'}">${legDelta}</td>
                  <td class="${legTheta >= 0 ? 'text-emerald' : 'text-rose'}">${legTheta >= 0 ? '+' : ''}${curr}${legTheta}/d</td>
                  <td>
                    <button class="btn-icon-remove btn-remove-leg" data-id="${leg.id}" title="Remove Leg">
                      <i data-lucide="trash-2"></i>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Live Strategy Analytics Summary -->
      ${payoff ? `
        <div class="builder-metrics-card">
          <div class="builder-metric">
            <span class="bm-label text-dim">Net ${payoff.isCredit ? 'Credit (Received)' : 'Debit (Paid)'}</span>
            <span class="bm-val font-mono font-bold ${payoff.isCredit ? 'text-emerald' : 'text-cyan'}">
              ${curr}${Math.abs(payoff.netPremiumPaid).toLocaleString()}
            </span>
          </div>

          <div class="builder-metric">
            <span class="bm-label text-dim">Probability of Profit (POP)</span>
            <span class="bm-val font-mono font-bold ${pop >= 65 ? 'text-emerald' : 'text-cyan'}">${pop}%</span>
          </div>

          <div class="builder-metric">
            <span class="bm-label text-dim">Max Profit</span>
            <span class="bm-val font-mono font-bold text-emerald">
              ${typeof payoff.maxProfit === 'number' ? `${curr}${payoff.maxProfit.toLocaleString()}` : payoff.maxProfit}
            </span>
          </div>

          <div class="builder-metric">
            <span class="bm-label text-dim">Max Loss (Risk)</span>
            <span class="bm-val font-mono font-bold text-rose">
              ${typeof payoff.maxLoss === 'number' ? `${curr}${payoff.maxLoss.toLocaleString()}` : payoff.maxLoss}
            </span>
          </div>

          <div class="builder-metric">
            <span class="bm-label text-dim">Risk / Reward</span>
            <span class="bm-val font-mono font-bold text-cyan">${payoff.riskReward}</span>
          </div>

          <div class="builder-metric">
            <span class="bm-label text-dim">Breakeven(s)</span>
            <span class="bm-val font-mono">
              ${payoff.breakevens.length > 0 ? payoff.breakevens.map(b => `${curr}${b}`).join(' & ') : 'None'}
            </span>
          </div>

          <div class="builder-metric">
            <span class="bm-label text-dim">Net Greeks ($\Delta, \Theta$)</span>
            <span class="bm-val font-mono">
              Δ: ${payoff.netDelta} • Θ: <span class="${payoff.netTheta >= 0 ? 'text-emerald' : 'text-rose'}">${payoff.netTheta >= 0 ? '+' : ''}${curr}${payoff.netTheta}/d</span>
            </span>
          </div>
        </div>
      ` : ''}

      <!-- Action Button -->
      <div class="builder-footer-row">
        <button class="btn btn-primary" id="btnSyncToPayoff">
          <i data-lucide="line-chart"></i> Plot on Interactive Payoff Chart
        </button>
      </div>
    </div>
  `;

  if (typeof window.refreshIcons === 'function') {
    window.refreshIcons();
  }

  // Bind Event Listeners
  // 1. Asset Picker
  const assetSelect = document.getElementById('builderAssetPicker');
  if (assetSelect) {
    assetSelect.addEventListener('change', (e) => {
      const selectedTicker = e.target.value;
      const found = OPTION_UNIVERSE.find(a => a.ticker === selectedTicker);
      if (found) {
        initBuilderState(found, null, currentBuilderState.dte);
        renderStrategyBuilder(containerId, onPayoffUpdate);
      }
    });
  }

  // 2. Preset Picker
  const presetSelect = document.getElementById('builderPresetPicker');
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      const preset = e.target.value;
      if (!preset) return;
      applyStrategyPreset(preset, S, step, currentBuilderState.dte, ivDecimal, r);
      renderStrategyBuilder(containerId, onPayoffUpdate);
    });
  }

  // 3. DTE Slider
  const dteSlider = document.getElementById('builderDteSlider');
  if (dteSlider) {
    dteSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      currentBuilderState.dte = val;
      const dteValEl = document.getElementById('builderDteVal');
      if (dteValEl) dteValEl.textContent = `${val} Days`;
      // Recompute leg premiums
      currentBuilderState.legs.forEach(leg => {
        const g = calculateGreeks(leg.type, S, leg.strike, val / 365, r, ivDecimal);
        leg.premium = g.price;
      });
      renderStrategyBuilder(containerId, onPayoffUpdate);
    });
  }

  // 4. Add Leg Button
  const addLegBtn = document.getElementById('btnAddLegBtn');
  if (addLegBtn) {
    addLegBtn.addEventListener('click', () => {
      addLegToBuilder({
        type: 'call',
        action: 'buy',
        strike: atm,
        premium: calculateGreeks('call', S, atm, currentBuilderState.dte / 365, r, ivDecimal).price,
        contracts: 1
      });
      renderStrategyBuilder(containerId, onPayoffUpdate);
    });
  }

  // 5. Remove Leg Buttons
  container.querySelectorAll('.btn-remove-leg').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.dataset.id);
      currentBuilderState.legs = currentBuilderState.legs.filter(l => l.id !== id);
      renderStrategyBuilder(containerId, onPayoffUpdate);
    });
  });

  // 6. Leg Field Changes (Action, Type, Strike, Contracts)
  container.querySelectorAll('.leg-row').forEach(row => {
    const id = Number(row.dataset.id);
    const leg = currentBuilderState.legs.find(l => l.id === id);
    if (!leg) return;

    row.querySelectorAll('[data-field]').forEach(el => {
      el.addEventListener('change', (e) => {
        const field = e.target.dataset.field;
        let val = e.target.value;
        if (field === 'strike' || field === 'contracts') val = Number(val);
        leg[field] = val;

        // Recalculate estimated premium
        const g = calculateGreeks(leg.type, S, leg.strike, currentBuilderState.dte / 365, r, ivDecimal);
        leg.premium = g.price;

        renderStrategyBuilder(containerId, onPayoffUpdate);
      });
    });
  });

  // 7. Sync to Payoff
  const syncBtn = document.getElementById('btnSyncToPayoff');
  if (syncBtn) {
    syncBtn.addEventListener('click', () => {
      if (typeof onPayoffUpdate === 'function') {
        onPayoffUpdate({
          asset: currentBuilderState.asset,
          legs: currentBuilderState.legs,
          dte: currentBuilderState.dte,
          payoff
        });
      }
    });
  }
}

/**
 * Strategy Presets Generator
 */
function applyStrategyPreset(preset, S, step, dte, iv, r) {
  const atm = Math.round(S / step) * step;
  const T = dte / 365;

  const gCall = (k) => calculateGreeks('call', S, k, T, r, iv).price;
  const gPut  = (k) => calculateGreeks('put', S, k, T, r, iv).price;

  if (preset === 'LONG_CALL') {
    currentBuilderState.legs = [
      { id: 1, type: 'call', action: 'buy', strike: atm, premium: gCall(atm), contracts: 1 }
    ];
  } else if (preset === 'BULL_CALL_SPREAD') {
    currentBuilderState.legs = [
      { id: 1, type: 'call', action: 'buy', strike: atm, premium: gCall(atm), contracts: 1 },
      { id: 2, type: 'call', action: 'sell', strike: atm + step * 2, premium: gCall(atm + step * 2), contracts: 1 }
    ];
  } else if (preset === 'BULL_PUT_SPREAD') {
    currentBuilderState.legs = [
      { id: 1, type: 'put', action: 'sell', strike: atm - step * 2, premium: gPut(atm - step * 2), contracts: 1 },
      { id: 2, type: 'put', action: 'buy', strike: atm - step * 4, premium: gPut(atm - step * 4), contracts: 1 }
    ];
  } else if (preset === 'LONG_PUT') {
    currentBuilderState.legs = [
      { id: 1, type: 'put', action: 'buy', strike: atm, premium: gPut(atm), contracts: 1 }
    ];
  } else if (preset === 'BEAR_PUT_SPREAD') {
    currentBuilderState.legs = [
      { id: 1, type: 'put', action: 'buy', strike: atm, premium: gPut(atm), contracts: 1 },
      { id: 2, type: 'put', action: 'sell', strike: atm - step * 2, premium: gPut(atm - step * 2), contracts: 1 }
    ];
  } else if (preset === 'BEAR_CALL_SPREAD') {
    currentBuilderState.legs = [
      { id: 1, type: 'call', action: 'sell', strike: atm + step * 2, premium: gCall(atm + step * 2), contracts: 1 },
      { id: 2, type: 'call', action: 'buy', strike: atm + step * 4, premium: gCall(atm + step * 4), contracts: 1 }
    ];
  } else if (preset === 'IRON_CONDOR') {
    currentBuilderState.legs = [
      { id: 1, type: 'put', action: 'buy', strike: atm - step * 4, premium: gPut(atm - step * 4), contracts: 1 },
      { id: 2, type: 'put', action: 'sell', strike: atm - step * 2, premium: gPut(atm - step * 2), contracts: 1 },
      { id: 3, type: 'call', action: 'sell', strike: atm + step * 2, premium: gCall(atm + step * 2), contracts: 1 },
      { id: 4, type: 'call', action: 'buy', strike: atm + step * 4, premium: gCall(atm + step * 4), contracts: 1 }
    ];
  } else if (preset === 'IRON_BUTTERFLY') {
    currentBuilderState.legs = [
      { id: 1, type: 'put', action: 'buy', strike: atm - step * 3, premium: gPut(atm - step * 3), contracts: 1 },
      { id: 2, type: 'put', action: 'sell', strike: atm, premium: gPut(atm), contracts: 1 },
      { id: 3, type: 'call', action: 'sell', strike: atm, premium: gCall(atm), contracts: 1 },
      { id: 4, type: 'call', action: 'buy', strike: atm + step * 3, premium: gCall(atm + step * 3), contracts: 1 }
    ];
  } else if (preset === 'LONG_STRADDLE') {
    currentBuilderState.legs = [
      { id: 1, type: 'call', action: 'buy', strike: atm, premium: gCall(atm), contracts: 1 },
      { id: 2, type: 'put', action: 'buy', strike: atm, premium: gPut(atm), contracts: 1 }
    ];
  } else if (preset === 'LONG_STRANGLE') {
    currentBuilderState.legs = [
      { id: 1, type: 'put', action: 'buy', strike: atm - step * 2, premium: gPut(atm - step * 2), contracts: 1 },
      { id: 2, type: 'call', action: 'buy', strike: atm + step * 2, premium: gCall(atm + step * 2), contracts: 1 }
    ];
  }
}
