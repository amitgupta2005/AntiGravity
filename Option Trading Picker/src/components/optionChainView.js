/**
 * Real-Time Option Chain View Component
 * Institutional 3-way layout (Calls | Strike | Puts) with Greek analytics (Alpha, Beta, Gamma, Theta, Delta),
 * OI heatmap, and dynamic column view modes.
 */

import { generateOptionChain, getMarketExpirations } from '../data/marketDataFeed.js';
import { calculateExpectedMove, formatGamma, formatTheta } from '../quant/blackScholes.js';

let currentChainData = null;
let currentChainViewMode = 'all'; // 'all' | 'greeks' | 'depth'

/**
 * Render Option Chain for a given asset quote and expiration
 */
export function renderOptionChain(containerId, quote, selectedDte = null, onAddLegToBuilder) {
  const container = document.getElementById(containerId);
  if (!container || !quote) return;

  const expirations = getMarketExpirations(quote);
  const activeDte = selectedDte != null ? selectedDte : expirations[0].dte;
  const chain = generateOptionChain(quote, activeDte);
  currentChainData = chain;

  const curr = quote.currencySymbol || '$';
  const S = quote.price;
  const changeClass = quote.change >= 0 ? 'text-emerald' : 'text-rose';
  const changeSign = quote.change >= 0 ? '+' : '';

  // Expected move
  const expMove = calculateExpectedMove(S, (quote.iv || 25) / 100, activeDte / 365);

  // Maximum OI across calls and puts for heatmap scaling
  const maxOI = Math.max(
    ...chain.strikes.map(s => Math.max(s.call.oi, s.put.oi)),
    1000
  );

  const mode = currentChainViewMode;

  // Determine column spans based on active view mode
  const sideColSpan = mode === 'all' ? 11 : 7;

  // Render HTML structure
  container.innerHTML = `
    <!-- Option Chain Header & Market Pulse -->
    <div class="chain-header-panel">
      <div class="chain-asset-meta">
        <div class="chain-title-row">
          <span class="chain-flag">${quote.market === 'US' ? '🇺🇸' : '🇮🇳'}</span>
          <h2 class="chain-ticker font-mono font-bold">${quote.displayTicker}</h2>
          <span class="badge badge-subtle font-mono">${quote.type}</span>
          <span class="badge badge-tag">${quote.sector || 'Equities'}</span>
        </div>
        <p class="chain-company-name text-dim">${quote.name}</p>
      </div>

      <!-- Institutional KPI Dashboard: Spot, IV, PCR, Max Pain, Move, and Greeks -->
      <div class="chain-kpi-row">
        <div class="chain-kpi-pill">
          <span class="kpi-label text-dim">Spot Price</span>
          <span class="kpi-val font-mono font-bold">${curr}${S.toLocaleString()}</span>
          <span class="kpi-sub font-mono ${changeClass}">${changeSign}${quote.change} (${changeSign}${quote.changePercent}%)</span>
        </div>

        <div class="chain-kpi-pill">
          <span class="kpi-label text-dim">Implied Vol (IV)</span>
          <span class="kpi-val font-mono font-bold text-amber">${quote.iv}%</span>
          <span class="kpi-sub text-dim">IV Rank: ${quote.ivRank}%</span>
        </div>

        <div class="chain-kpi-pill">
          <span class="kpi-label text-dim">Put-Call Ratio (PCR)</span>
          <span class="kpi-val font-mono font-bold ${chain.chainPCR > 1 ? 'text-emerald' : 'text-rose'}">${chain.chainPCR}</span>
          <span class="kpi-sub text-dim">${chain.chainPCR > 1 ? 'Bullish Support' : 'Bearish / Neutral'}</span>
        </div>

        <div class="chain-kpi-pill highlight-maxpain">
          <span class="kpi-label text-dim">Max Pain Strike</span>
          <span class="kpi-val font-mono font-bold text-purple">${curr}${quote.maxPain}</span>
          <span class="kpi-sub text-dim">Pinning Target</span>
        </div>

        <div class="chain-kpi-pill">
          <span class="kpi-label text-dim">Expected Move (±1σ)</span>
          <span class="kpi-val font-mono font-bold text-cyan">±${curr}${expMove.absolute} (±${expMove.percent}%)</span>
          <span class="kpi-sub text-dim">${curr}${expMove.lower} — ${curr}${expMove.upper}</span>
        </div>

        <!-- NEW: ATM Gamma Greek KPI -->
        <div class="chain-kpi-pill highlight-gamma">
          <span class="kpi-label text-dim">ATM Gamma (γ)</span>
          <span class="kpi-val font-mono font-bold text-gold">${formatGamma(chain.atmGamma)}</span>
          <span class="kpi-sub text-dim">Δ Move / ${curr}1 underlying</span>
        </div>

        <!-- NEW: ATM Theta Greek KPI -->
        <div class="chain-kpi-pill highlight-theta">
          <span class="kpi-label text-dim">ATM Theta (θ)</span>
          <span class="kpi-val font-mono font-bold text-rose">${formatTheta(chain.atmTheta, curr)}/day</span>
          <span class="kpi-sub text-dim">Daily Time Decay</span>
        </div>

        <!-- NEW: Asset Beta KPI -->
        <div class="chain-kpi-pill highlight-beta">
          <span class="kpi-label text-dim">Asset Beta (β)</span>
          <span class="kpi-val font-mono font-bold text-cyan">${chain.assetBeta}x</span>
          <span class="kpi-sub text-dim">Benchmark Sensitivity</span>
        </div>

        <!-- NEW: Option Alpha Edge KPI -->
        <div class="chain-kpi-pill highlight-alpha">
          <span class="kpi-label text-dim">Option Alpha (α)</span>
          <span class="kpi-val font-mono font-bold ${chain.avgAlpha >= 0 ? 'text-emerald' : 'text-amber'}">${chain.avgAlpha >= 0 ? '+' : ''}${chain.avgAlpha}%</span>
          <span class="kpi-sub text-dim">ATM Vol Edge / Yield</span>
        </div>
      </div>
    </div>

    <!-- Controls Bar: Expiration Selector + Column View Switcher -->
    <div class="chain-controls-bar">
      <!-- Expiry Cycle Selector -->
      <div class="chain-expiry-bar">
        <span class="expiry-bar-label text-dim font-mono">
          <i data-lucide="calendar" class="inline-icon"></i> Expiry:
        </span>
        <div class="expiry-chips" id="chainExpiryChips">
          ${expirations.map(exp => `
            <button class="expiry-chip ${exp.dte === activeDte ? 'active' : ''}" data-dte="${exp.dte}">
              <span class="font-bold">${exp.label}</span>
              <span class="chip-dte font-mono">(${exp.dte} DTE • ${exp.type})</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- View Mode Segmented Controls -->
      <div class="chain-view-mode-bar">
        <span class="view-mode-label text-dim font-mono">
          <i data-lucide="sliders-horizontal" class="inline-icon"></i> View Mode:
        </span>
        <div class="view-mode-toggle" id="chainViewModeToggle">
          <button class="view-mode-btn ${mode === 'all' ? 'active' : ''}" data-mode="all" title="Full Desk: Displays Alpha, Beta, Gamma, Theta, Delta, IV, OI, Volume, Bid, Ask, LTP">
            <i data-lucide="table-2" class="inline-icon"></i> All Columns
          </button>
          <button class="view-mode-btn ${mode === 'greeks' ? 'active' : ''}" data-mode="greeks" title="Greeks Suite: Displays Alpha (α), Beta (β), Gamma (γ), Theta (θ), Delta (Δ), IV, LTP">
            <i data-lucide="activity" class="inline-icon"></i> Greeks Suite (α, β, γ, θ, Δ)
          </button>
          <button class="view-mode-btn ${mode === 'depth' ? 'active' : ''}" data-mode="depth" title="Market Depth: Displays Delta, IV, Open Interest, Volume, Bid, Ask, LTP">
            <i data-lucide="bar-chart-2" class="inline-icon"></i> Depth & Liquidity
          </button>
        </div>
      </div>
    </div>

    <!-- Option Chain Grid (Calls | Strike | Puts) -->
    <div class="chain-table-container">
      <table class="chain-table font-mono" id="chainDataTable">
        <thead>
          <tr class="chain-super-header">
            <th colspan="${sideColSpan}" class="calls-super-header">
              <i data-lucide="arrow-up-right" class="inline-icon text-emerald"></i> CALL OPTIONS (BULLISH)
            </th>
            <th class="strike-super-header">STRIKE</th>
            <th colspan="${sideColSpan}" class="puts-super-header">
              <i data-lucide="arrow-down-right" class="inline-icon text-rose"></i> PUT OPTIONS (BEARISH)
            </th>
          </tr>
          <tr class="chain-column-header">
            <!-- Calls Columns Based on Active View Mode -->
            ${renderCallsHeader(mode)}

            <!-- Center Strike Header -->
            <th class="col-strike" title="Strike Price">STRIKE</th>

            <!-- Puts Columns Based on Active View Mode -->
            ${renderPutsHeader(mode)}
          </tr>
        </thead>
        <tbody>
          ${chain.strikes.map(row => {
            const isATM = row.isATM;
            const isMaxPain = row.isMaxPain;

            const callOIWidth = Math.min(100, Math.round((row.call.oi / maxOI) * 100));
            const putOIWidth = Math.min(100, Math.round((row.put.oi / maxOI) * 100));

            const callITMClass = row.call.moneyness === 'ITM' ? 'call-itm' : 'call-otm';
            const putITMClass = row.put.moneyness === 'ITM' ? 'put-itm' : 'put-otm';
            const rowHighlight = isATM ? 'row-atm' : '';

            return `
              <tr class="chain-row ${rowHighlight}">
                <!-- CALLS SIDE CELLS -->
                ${renderCallsCells(row, callITMClass, callOIWidth, curr, mode)}

                <!-- CENTER STRIKE -->
                <td class="strike-cell font-bold ${isATM ? 'strike-atm' : ''}">
                  <span class="strike-number">${curr}${row.strike.toLocaleString()}</span>
                  ${isATM ? '<span class="badge badge-atm">ATM</span>' : ''}
                  ${isMaxPain ? '<span class="badge badge-maxpain">PIN</span>' : ''}
                </td>

                <!-- PUTS SIDE CELLS -->
                ${renderPutsCells(row, putITMClass, putOIWidth, curr, mode)}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  if (typeof window.refreshIcons === 'function') {
    window.refreshIcons();
  }

  // Bind Expiry chips
  container.querySelectorAll('#chainExpiryChips .expiry-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const dte = Number(e.currentTarget.dataset.dte);
      renderOptionChain(containerId, quote, dte, onAddLegToBuilder);
    });
  });

  // Bind View Mode buttons
  container.querySelectorAll('#chainViewModeToggle .view-mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentChainViewMode = e.currentTarget.dataset.mode;
      renderOptionChain(containerId, quote, activeDte, onAddLegToBuilder);
    });
  });

  // Bind Clickable Prices to add leg directly to builder
  container.querySelectorAll('.clickable-price').forEach(cell => {
    cell.addEventListener('click', (e) => {
      const type = e.currentTarget.dataset.type;
      const action = e.currentTarget.dataset.action;
      const strike = Number(e.currentTarget.dataset.strike);
      const premium = Number(e.currentTarget.dataset.prem);

      if (typeof onAddLegToBuilder === 'function') {
        onAddLegToBuilder({
          quote,
          leg: {
            type,
            action,
            strike,
            premium,
            contracts: 1,
            label: `${action.toUpperCase()} ${quote.currencySymbol}${strike} ${type.toUpperCase()}`
          },
          dte: activeDte
        });
      }
    });
  });
}

/**
 * Render Header Columns for Calls Side
 */
function renderCallsHeader(mode) {
  if (mode === 'greeks') {
    return `
      <th title="Option Alpha (α): Theoretical pricing edge & expected excess yield (%)">Alpha (α)</th>
      <th title="Option Beta (β): Systematic market exposure multiplier (Elasticity × Asset Beta)">Beta (β)</th>
      <th title="Option Gamma (γ): Rate of Delta change per 1 unit underlying move">Gamma (γ)</th>
      <th title="Option Theta (θ): Daily time decay per share">Theta (θ)</th>
      <th title="Option Delta (Δ): Directional price sensitivity (0 to 1)">Delta (Δ)</th>
      <th title="Implied Volatility (%)">IV</th>
      <th title="Last Traded Price">LTP</th>
    `;
  }

  if (mode === 'depth') {
    return `
      <th title="Option Delta (Δ)">Delta</th>
      <th title="Implied Volatility (%)">IV</th>
      <th title="Open Interest Heatmap">OI</th>
      <th title="Volume">Vol</th>
      <th title="Bid Price - Click to Sell Call">Bid</th>
      <th title="Ask Price - Click to Buy Call">Ask</th>
      <th title="Last Traded Price">LTP</th>
    `;
  }

  // mode === 'all'
  return `
    <th title="Option Alpha (α): Theoretical pricing edge & expected excess yield (%)">Alpha (α)</th>
    <th title="Option Beta (β): Systematic market exposure multiplier (Elasticity × Asset Beta)">Beta (β)</th>
    <th title="Option Gamma (γ): Rate of Delta change per 1 unit underlying move">Gamma (γ)</th>
    <th title="Option Theta (θ): Daily time decay per share">Theta (θ)</th>
    <th title="Option Delta (Δ)">Delta (Δ)</th>
    <th title="Implied Volatility (%)">IV</th>
    <th title="Open Interest Heatmap">OI</th>
    <th title="Volume">Vol</th>
    <th title="Bid Price - Click to Sell Call">Bid</th>
    <th title="Ask Price - Click to Buy Call">Ask</th>
    <th title="Last Traded Price">LTP</th>
  `;
}

/**
 * Render Header Columns for Puts Side
 */
function renderPutsHeader(mode) {
  if (mode === 'greeks') {
    return `
      <th title="Last Traded Price">LTP</th>
      <th title="Implied Volatility (%)">IV</th>
      <th title="Option Delta (Δ): Directional price sensitivity (-1 to 0)">Delta (Δ)</th>
      <th title="Option Theta (θ): Daily time decay per share">Theta (θ)</th>
      <th title="Option Gamma (γ): Rate of Delta change per 1 unit underlying move">Gamma (γ)</th>
      <th title="Option Beta (β): Inverse systematic market hedge exposure">Beta (β)</th>
      <th title="Option Alpha (α): Theoretical pricing edge & expected excess yield (%)">Alpha (α)</th>
    `;
  }

  if (mode === 'depth') {
    return `
      <th title="Last Traded Price">LTP</th>
      <th title="Bid Price - Click to Sell Put">Bid</th>
      <th title="Ask Price - Click to Buy Put">Ask</th>
      <th title="Volume">Vol</th>
      <th title="Open Interest Heatmap">OI</th>
      <th title="Implied Volatility (%)">IV</th>
      <th title="Option Delta (Δ)">Delta</th>
    `;
  }

  // mode === 'all'
  return `
    <th title="Last Traded Price">LTP</th>
    <th title="Bid Price - Click to Sell Put">Bid</th>
    <th title="Ask Price - Click to Buy Put">Ask</th>
    <th title="Volume">Vol</th>
    <th title="Open Interest Heatmap">OI</th>
    <th title="Implied Volatility (%)">IV</th>
    <th title="Option Delta (Δ)">Delta (Δ)</th>
    <th title="Option Theta (θ): Daily time decay per share">Theta (θ)</th>
    <th title="Option Gamma (γ): Rate of Delta change per 1 unit underlying move">Gamma (γ)</th>
    <th title="Option Beta (β): Inverse systematic market hedge exposure">Beta (β)</th>
    <th title="Option Alpha (α): Theoretical pricing edge & expected excess yield (%)">Alpha (α)</th>
  `;
}

/**
 * Render Data Cells for Calls Side
 */
function renderCallsCells(row, callITMClass, callOIWidth, curr, mode) {
  const call = row.call;
  const alphaSign = call.alpha >= 0 ? '+' : '';
  const alphaClass = call.alpha >= 0 ? 'text-emerald font-bold' : 'text-amber';
  const betaSign = call.beta >= 0 ? '+' : '';
  const gammaStr = formatGamma(call.gamma);
  const thetaStr = formatTheta(call.theta, curr);

  const cellAlpha = `<td class="${callITMClass} ${alphaClass} col-alpha" title="Call Alpha: ${alphaSign}${call.alpha}%">${alphaSign}${call.alpha}%</td>`;
  const cellBeta = `<td class="${callITMClass} text-cyan font-bold col-beta" title="Call Beta: ${betaSign}${call.beta}x">${betaSign}${call.beta}x</td>`;
  const cellGamma = `<td class="${callITMClass} text-gold col-gamma" title="Call Gamma: ${call.gamma}">${gammaStr}</td>`;
  const cellTheta = `<td class="${callITMClass} text-rose col-theta" title="Call Daily Theta: ${thetaStr}">${thetaStr}</td>`;
  const cellDelta = `<td class="${callITMClass} text-dim col-delta">${call.delta}</td>`;
  const cellIV = `<td class="${callITMClass} text-amber col-iv">${call.iv}%</td>`;
  const cellOI = `
    <td class="${callITMClass} oi-cell col-oi">
      <div class="oi-bar oi-bar-call" style="width: ${callOIWidth}%;"></div>
      <span class="oi-val">${call.oi.toLocaleString()}</span>
    </td>
  `;
  const cellVol = `<td class="${callITMClass} text-dim col-vol">${call.volume.toLocaleString()}</td>`;
  const cellBid = `
    <td class="${callITMClass} font-bold text-cyan clickable-price col-bid" data-type="call" data-action="sell" data-strike="${row.strike}" data-prem="${call.bid}" title="Click to Sell Call at Bid">
      ${curr}${call.bid}
    </td>
  `;
  const cellAsk = `
    <td class="${callITMClass} font-bold text-emerald clickable-price col-ask" data-type="call" data-action="buy" data-strike="${row.strike}" data-prem="${call.ask}" title="Click to Buy Call at Ask">
      ${curr}${call.ask}
    </td>
  `;
  const cellLTP = `<td class="${callITMClass} font-bold col-ltp">${curr}${call.price}</td>`;

  if (mode === 'greeks') {
    return `${cellAlpha}${cellBeta}${cellGamma}${cellTheta}${cellDelta}${cellIV}${cellLTP}`;
  }

  if (mode === 'depth') {
    return `${cellDelta}${cellIV}${cellOI}${cellVol}${cellBid}${cellAsk}${cellLTP}`;
  }

  // mode === 'all'
  return `${cellAlpha}${cellBeta}${cellGamma}${cellTheta}${cellDelta}${cellIV}${cellOI}${cellVol}${cellBid}${cellAsk}${cellLTP}`;
}

/**
 * Render Data Cells for Puts Side
 */
function renderPutsCells(row, putITMClass, putOIWidth, curr, mode) {
  const put = row.put;
  const alphaSign = put.alpha >= 0 ? '+' : '';
  const alphaClass = put.alpha >= 0 ? 'text-emerald font-bold' : 'text-amber';
  const betaSign = put.beta >= 0 ? '+' : '';
  const gammaStr = formatGamma(put.gamma);
  const thetaStr = formatTheta(put.theta, curr);

  const cellLTP = `<td class="${putITMClass} font-bold col-ltp">${curr}${put.price}</td>`;
  const cellBid = `
    <td class="${putITMClass} font-bold text-cyan clickable-price col-bid" data-type="put" data-action="sell" data-strike="${row.strike}" data-prem="${put.bid}" title="Click to Sell Put at Bid">
      ${curr}${put.bid}
    </td>
  `;
  const cellAsk = `
    <td class="${putITMClass} font-bold text-rose clickable-price col-ask" data-type="put" data-action="buy" data-strike="${row.strike}" data-prem="${put.ask}" title="Click to Buy Put at Ask">
      ${curr}${put.ask}
    </td>
  `;
  const cellVol = `<td class="${putITMClass} text-dim col-vol">${put.volume.toLocaleString()}</td>`;
  const cellOI = `
    <td class="${putITMClass} oi-cell col-oi">
      <div class="oi-bar oi-bar-put" style="width: ${putOIWidth}%;"></div>
      <span class="oi-val">${put.oi.toLocaleString()}</span>
    </td>
  `;
  const cellIV = `<td class="${putITMClass} text-amber col-iv">${put.iv}%</td>`;
  const cellDelta = `<td class="${putITMClass} text-dim col-delta">${put.delta}</td>`;
  const cellTheta = `<td class="${putITMClass} text-rose col-theta" title="Put Daily Theta: ${thetaStr}">${thetaStr}</td>`;
  const cellGamma = `<td class="${putITMClass} text-gold col-gamma" title="Put Gamma: ${put.gamma}">${gammaStr}</td>`;
  const cellBeta = `<td class="${putITMClass} text-purple font-bold col-beta" title="Put Beta: ${betaSign}${put.beta}x">${betaSign}${put.beta}x</td>`;
  const cellAlpha = `<td class="${putITMClass} ${alphaClass} col-alpha" title="Put Alpha: ${alphaSign}${put.alpha}%">${alphaSign}${put.alpha}%</td>`;

  if (mode === 'greeks') {
    return `${cellLTP}${cellIV}${cellDelta}${cellTheta}${cellGamma}${cellBeta}${cellAlpha}`;
  }

  if (mode === 'depth') {
    return `${cellLTP}${cellBid}${cellAsk}${cellVol}${cellOI}${cellIV}${cellDelta}`;
  }

  // mode === 'all'
  return `${cellLTP}${cellBid}${cellAsk}${cellVol}${cellOI}${cellIV}${cellDelta}${cellTheta}${cellGamma}${cellBeta}${cellAlpha}`;
}
