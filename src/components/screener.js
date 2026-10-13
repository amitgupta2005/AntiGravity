import { calculatePEG, calculatePeterLynchFairValue, calculateProjectedReturn, calculateQuantScore } from '../quant/engine.js';

let currentSortCriteria = 'date'; // 'date', 'peg', 'cagr', 'upside', 'ticker'
let currentMarketFilter = 'ALL'; // 'ALL', 'NSE', 'US'
let filterGarpOnly = false;

/**
 * Screen stocks universe and generate interactive GARP Radar table based on real-time data
 */
export function renderScreenerTable(stocksUniverse, onSelectStock, activeTicker = null) {
  const tableBody = document.getElementById('screenerTableBody');
  const countBadge = document.getElementById('garpMatchCount');
  if (!tableBody) return;

  const stocksList = Object.values(stocksUniverse);
  const now = new Date();
  const defaultDateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Calculate real-time quant metrics for each stock in the universe
  const analyzed = stocksList.map(stock => {
    const livePrice = stock.price;
    const fwdEPS = stock.forwardEPS || (livePrice / 25);
    const growth = stock.projectedEPSGrowth || 20;
    const peForward = Number((livePrice / fwdEPS).toFixed(1));
    const peg = stock.pegRatio || calculatePEG(peForward, growth);

    const lynch = calculatePeterLynchFairValue(fwdEPS, growth, livePrice);
    const proj = calculateProjectedReturn({
      currentPrice: livePrice,
      baseEPS: fwdEPS,
      annualGrowthPercent: growth,
      exitPE: peForward,
      years: 3
    });
    const quant = calculateQuantScore(stock);
    const isSelected = activeTicker && stock.ticker === activeTicker;
    const dateStr = stock.lastUpdatedFormatted || defaultDateStr;
    const dateTimestamp = stock.lastUpdatedTimestamp || now.getTime();
    const isNSE = stock.ticker.endsWith('.NS') || stock.exchange === 'NSE' || stock.currency === 'INR';
    const curr = stock.currencySymbol || (isNSE ? '₹' : '$');

    return {
      stock,
      peg,
      lynch,
      proj,
      quant,
      isGarp: peg < 1.0,
      isSelected,
      dateStr,
      dateTimestamp,
      isNSE,
      curr
    };
  });

  // Filter by Market (ALL, NSE, US)
  let displayed = analyzed;
  if (currentMarketFilter === 'NSE') {
    displayed = displayed.filter(a => a.isNSE);
  } else if (currentMarketFilter === 'US') {
    displayed = displayed.filter(a => !a.isNSE);
  }

  // Filter if GARP only selected
  if (filterGarpOnly) {
    displayed = displayed.filter(a => a.isGarp);
  }

  // Count PEG < 1 based on real-time data
  const garpCount = analyzed.filter(a => a.isGarp).length;
  const nseCount = analyzed.filter(a => a.isNSE).length;
  if (countBadge) {
    countBadge.textContent = `${garpCount} PEG < 1 GARP (${nseCount} NSE Listed) • Live`;
  }

  // Sort based on currentSortCriteria (default: current date / newest updated first)
  if (currentSortCriteria === 'date') {
    displayed.sort((a, b) => b.dateTimestamp - a.dateTimestamp);
  } else if (currentSortCriteria === 'peg') {
    displayed.sort((a, b) => a.peg - b.peg);
  } else if (currentSortCriteria === 'cagr') {
    displayed.sort((a, b) => b.proj.cagr - a.proj.cagr);
  } else if (currentSortCriteria === 'upside') {
    displayed.sort((a, b) => b.lynch.upsidePercent - a.lynch.upsidePercent);
  } else if (currentSortCriteria === 'ticker') {
    displayed.sort((a, b) => a.stock.ticker.localeCompare(b.stock.ticker));
  }

  tableBody.innerHTML = displayed.map(item => {
    const s = item.stock;
    const isGarp = item.isGarp;
    const isSelected = item.isSelected;
    const isNSE = item.isNSE;
    const curr = item.curr;
    const pegDisplay = item.peg.toFixed(2);
    const pegBadgeClass = isGarp ? 'badge-peg-garp' : 'badge-peg-normal';
    const cagrClass = item.proj.cagr > 15 ? 'text-emerald' : item.proj.cagr > 0 ? 'text-blue' : 'text-rose';
    const upsideClass = item.lynch.upsidePercent > 0 ? 'text-emerald' : 'text-rose';

    return `
      <tr class="${isSelected ? 'selected-stock-row' : isGarp ? 'garp-row-highlight' : ''}" data-ticker="${s.ticker}">
        <td>
          <div class="table-stock-cell">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span class="ticker-sym">${s.ticker}</span>
              <span class="badge ${isNSE ? 'badge-strong-buy' : 'badge-neutral'}" style="font-size: 0.65rem; padding: 1px 5px; border-radius: 4px;">
                ${isNSE ? '🇮🇳 NSE' : '🇺🇸 US'}
              </span>
              ${isSelected ? '<span class="badge badge-strong-buy" style="font-size: 0.65rem; padding: 1px 6px;">ACTIVE</span>' : ''}
            </div>
            <span class="ticker-name">${s.name}</span>
          </div>
        </td>
        <td class="font-mono font-bold">${curr}${s.price.toFixed(2)}</td>
        <td class="font-mono">${s.peForward.toFixed(1)}x</td>
        <td class="font-mono text-cyan">+${s.projectedEPSGrowth.toFixed(1)}%</td>
        <td>
          <span class="badge ${pegBadgeClass}">
            ${pegDisplay} ${isGarp ? '★ GARP' : ''}
          </span>
        </td>
        <td class="font-mono ${cagrClass}">
          ${item.proj.cagr >= 0 ? '+' : ''}${item.proj.cagr.toFixed(1)}%
        </td>
        <td class="font-mono ${upsideClass}" title="Lynch Fair Value: ${curr}${item.lynch.fairValue.toFixed(2)}">
          ${item.lynch.upsidePercent >= 0 ? '+' : ''}${item.lynch.upsidePercent.toFixed(1)}%
        </td>
        <td class="font-mono" style="font-size: 0.75rem; color: var(--text-dim);">
          <i data-lucide="clock" class="inline-icon" style="width: 12px; height: 12px;"></i> ${item.dateStr}
        </td>
        <td>
          <button class="btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'} select-stock-btn" data-ticker="${s.ticker}">
            ${isSelected ? 'Selected' : 'Analyze'} <i data-lucide="arrow-right" class="inline-icon"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Wire up click handlers
  tableBody.querySelectorAll('.select-stock-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ticker = e.currentTarget.getAttribute('data-ticker');
      if (ticker && onSelectStock) {
        onSelectStock(ticker);
      }
    });
  });
}

/**
 * Setup Screener sorting and filter controls
 */
export function setupScreenerControls(onRefreshRequest) {
  const sortBtns = document.querySelectorAll('.screener-sort-btn');
  const marketBtns = document.querySelectorAll('.screener-market-btn');
  const garpToggle = document.getElementById('screenerGarpToggle');

  sortBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sortBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSortCriteria = btn.getAttribute('data-sort') || 'date';
      if (onRefreshRequest) onRefreshRequest();
    });
  });

  marketBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      marketBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMarketFilter = btn.getAttribute('data-market') || 'ALL';
      if (onRefreshRequest) onRefreshRequest();
    });
  });

  if (garpToggle) {
    garpToggle.addEventListener('click', () => {
      filterGarpOnly = !filterGarpOnly;
      garpToggle.classList.toggle('active', filterGarpOnly);
      garpToggle.textContent = filterGarpOnly ? '★ Showing PEG < 1 Only' : 'Show PEG < 1.0 Only';
      if (onRefreshRequest) onRefreshRequest();
    });
  }
}

