/**
 * Real-Time Option Chain View Component
 * Institutional 3-way layout (Calls | Strike | Puts) with Greek analytics and OI heatmap
 */

import { generateOptionChain, getStandardExpirations } from '../data/marketDataFeed.js';
import { calculateExpectedMove } from '../quant/blackScholes.js';

let currentChainData = null;

/**
 * Render Option Chain for a given asset quote and expiration
 */
export function renderOptionChain(containerId, quote, selectedDte = null, onAddLegToBuilder) {
  const container = document.getElementById(containerId);
  if (!container || !quote) return;

  const expirations = getStandardExpirations();
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
      </div>
    </div>

    <!-- Expiration Selector Bar -->
    <div class="chain-expiry-bar">
      <span class="expiry-bar-label text-dim font-mono">
        <i data-lucide="calendar" class="inline-icon"></i> Expiry Cycle:
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

    <!-- Option Chain Grid (Calls | Strike | Puts) -->
    <div class="chain-table-container">
      <table class="chain-table font-mono" id="chainDataTable">
        <thead>
          <tr class="chain-super-header">
            <th colspan="7" class="calls-super-header">
              <i data-lucide="arrow-up-right" class="inline-icon text-emerald"></i> CALL OPTIONS (BULLISH)
            </th>
            <th class="strike-super-header">STRIKE</th>
            <th colspan="7" class="puts-super-header">
              <i data-lucide="arrow-down-right" class="inline-icon text-rose"></i> PUT OPTIONS (BEARISH)
            </th>
          </tr>
          <tr class="chain-column-header">
            <!-- Calls Columns -->
            <th title="Delta">Delta</th>
            <th title="Implied Volatility">IV</th>
            <th title="Open Interest Heatmap">OI</th>
            <th title="Volume">Vol</th>
            <th title="Bid Price">Bid</th>
            <th title="Ask Price">Ask</th>
            <th title="Last Traded Price">LTP</th>

            <!-- Strike -->
            <th class="col-strike">STRIKE</th>

            <!-- Puts Columns -->
            <th title="Last Traded Price">LTP</th>
            <th title="Bid Price">Bid</th>
            <th title="Ask Price">Ask</th>
            <th title="Volume">Vol</th>
            <th title="Open Interest Heatmap">OI</th>
            <th title="Implied Volatility">IV</th>
            <th title="Delta">Delta</th>
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
                <!-- Call Delta -->
                <td class="${callITMClass} text-dim">${row.call.delta}</td>
                <!-- Call IV -->
                <td class="${callITMClass} text-amber">${row.call.iv}%</td>
                <!-- Call OI with Heatmap Bar -->
                <td class="${callITMClass} oi-cell">
                  <div class="oi-bar oi-bar-call" style="width: ${callOIWidth}%;"></div>
                  <span class="oi-val">${row.call.oi.toLocaleString()}</span>
                </td>
                <!-- Call Volume -->
                <td class="${callITMClass} text-dim">${row.call.volume.toLocaleString()}</td>
                <!-- Call Bid (Click to Add Short Call) -->
                <td class="${callITMClass} font-bold text-cyan clickable-price" data-type="call" data-action="sell" data-strike="${row.strike}" data-prem="${row.call.bid}" title="Click to Sell Call">
                  ${curr}${row.call.bid}
                </td>
                <!-- Call Ask (Click to Add Long Call) -->
                <td class="${callITMClass} font-bold text-emerald clickable-price" data-type="call" data-action="buy" data-strike="${row.strike}" data-prem="${row.call.ask}" title="Click to Buy Call">
                  ${curr}${row.call.ask}
                </td>
                <!-- Call LTP -->
                <td class="${callITMClass} font-bold">${curr}${row.call.price}</td>

                <!-- CENTER STRIKE -->
                <td class="strike-cell font-bold ${isATM ? 'strike-atm' : ''}">
                  <span class="strike-number">${curr}${row.strike.toLocaleString()}</span>
                  ${isATM ? '<span class="badge badge-atm">ATM</span>' : ''}
                  ${isMaxPain ? '<span class="badge badge-maxpain">PIN</span>' : ''}
                </td>

                <!-- Put LTP -->
                <td class="${putITMClass} font-bold">${curr}${row.put.price}</td>
                <!-- Put Bid (Click to Add Short Put) -->
                <td class="${putITMClass} font-bold text-cyan clickable-price" data-type="put" data-action="sell" data-strike="${row.strike}" data-prem="${row.put.bid}" title="Click to Sell Put">
                  ${curr}${row.put.bid}
                </td>
                <!-- Put Ask (Click to Add Long Put) -->
                <td class="${putITMClass} font-bold text-rose clickable-price" data-type="put" data-action="buy" data-strike="${row.strike}" data-prem="${row.put.ask}" title="Click to Buy Put">
                  ${curr}${row.put.ask}
                </td>
                <!-- Put Volume -->
                <td class="${putITMClass} text-dim">${row.put.volume.toLocaleString()}</td>
                <!-- Put OI with Heatmap Bar -->
                <td class="${putITMClass} oi-cell">
                  <div class="oi-bar oi-bar-put" style="width: ${putOIWidth}%;"></div>
                  <span class="oi-val">${row.put.oi.toLocaleString()}</span>
                </td>
                <!-- Put IV -->
                <td class="${putITMClass} text-amber">${row.put.iv}%</td>
                <!-- Put Delta -->
                <td class="${putITMClass} text-dim">${row.put.delta}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // Bind Expiry chips
  container.querySelectorAll('#chainExpiryChips .expiry-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const dte = Number(e.currentTarget.dataset.dte);
      renderOptionChain(containerId, quote, dte, onAddLegToBuilder);
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
