/**
 * Interactive Stock Deep-Dive & Stochastic Dual Sub-Chart Modal
 * Renders Price Closing Chart and Stochastic Oscillator Sub-Chart with breakdown table.
 */

import {
  Chart,
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

Chart.register(
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

import { downloadStockChartScreenshot } from '../services/chartRenderer.js';

let priceChartInstance = null;
let stochChartInstance = null;
let activeModalStock = null;

export function setupChartModal() {
  const modal = document.getElementById('chartModal');
  const closeBtn = document.getElementById('closeChartModalBtn');
  const downloadBtn = document.getElementById('downloadChartScreenshotBtn');

  if (!modal) return;

  const closeModal = () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (priceChartInstance) {
      priceChartInstance.destroy();
      priceChartInstance = null;
    }
    if (stochChartInstance) {
      stochChartInstance.destroy();
      stochChartInstance = null;
    }
    activeModalStock = null;
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (activeModalStock) {
        downloadStockChartScreenshot(activeModalStock);
      }
    });
  }
}

/**
 * Open and render the Stochastic Inspector Modal for a given screened stock
 */
export function openStockChartModal(stock, isDarkMode = true) {
  const modal = document.getElementById('chartModal');
  if (!modal || !stock) return;

  activeModalStock = stock;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  const isINR = stock.ticker.endsWith('.NS') || stock.ticker.endsWith('.BO') || stock.exchange === 'NSE';
  const curr = isINR ? '₹' : '$';

  // 1. Populate Header
  const titleTicker = document.getElementById('modalStockTicker');
  const titleName = document.getElementById('modalStockName');
  const modalPrice = document.getElementById('modalStockPrice');
  const modalChange = document.getElementById('modalStockChange');
  const modalSlowK = document.getElementById('modalSlowK');
  const modalD = document.getElementById('modalD');
  const modalSpread = document.getElementById('modalSpread');
  const modalSignal = document.getElementById('modalSignal');

  if (titleTicker) titleTicker.textContent = stock.ticker;
  if (titleName) titleName.textContent = stock.name;
  if (modalPrice) modalPrice.textContent = `${curr}${stock.price.toFixed(2)}`;

  if (modalChange) {
    const isUp = stock.change >= 0;
    modalChange.textContent = `${isUp ? '+' : ''}${stock.change.toFixed(2)} (${isUp ? '+' : ''}${stock.changePct}%)`;
    modalChange.className = `modal-metric-sub ${isUp ? 'text-emerald' : 'text-rose'}`;
  }

  if (modalSlowK) modalSlowK.textContent = stock.slowK != null ? stock.slowK.toFixed(2) : 'N/A';
  if (modalD) modalD.textContent = stock.d != null ? stock.d.toFixed(2) : 'N/A';

  if (modalSpread) {
    const spreadVal = stock.spread ?? 0;
    modalSpread.textContent = `${spreadVal >= 0 ? '+' : ''}${spreadVal.toFixed(2)}`;
    modalSpread.className = `modal-metric-val font-mono ${spreadVal >= 0 ? 'text-cyan' : 'text-amber'}`;
  }

  if (modalSignal) {
    modalSignal.textContent = stock.signalLabel;
    modalSignal.className = `badge badge-${stock.signalSeverity || 'neutral'} font-bold`;
  }

  // 2. Render Charts
  const history = stock.history || [];
  renderPriceChart(history, isDarkMode, curr);
  renderStochasticSubChart(history, isDarkMode, stock);

  // 3. Render Breakdown Table
  renderBreakdownTable(history, curr, stock);

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function renderPriceChart(history, isDarkMode, curr) {
  const canvas = document.getElementById('modalPriceChartCanvas');
  if (!canvas) return;

  if (priceChartInstance) {
    priceChartInstance.destroy();
    priceChartInstance = null;
  }

  const labels = history.map(h => h.date);
  const closes = history.map(h => h.close);

  const textColor = isDarkMode ? '#94a3b8' : '#64748b';
  const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

  priceChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Closing Price',
          data: closes,
          borderColor: isDarkMode ? '#00f2fe' : '#0284c7',
          backgroundColor: isDarkMode ? 'rgba(0, 242, 254, 0.12)' : 'rgba(2, 132, 199, 0.10)',
          fill: true,
          tension: 0.2,
          borderWidth: 2.2,
          pointRadius: 2,
          pointHoverRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Close: ${curr}${ctx.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'JetBrains Mono', size: 10 },
            callback: (v) => `${curr}${v}`
          }
        }
      }
    }
  });
}

function renderStochasticSubChart(history, isDarkMode, stock) {
  const canvas = document.getElementById('modalStochChartCanvas');
  if (!canvas) return;

  if (stochChartInstance) {
    stochChartInstance.destroy();
    stochChartInstance = null;
  }

  const labels = history.map(h => h.date);
  const slowKs = history.map(h => h.slowK);
  const ds = history.map(h => h.d);

  const kP = stock.kPeriod || 4;
  const kS = stock.kSmoothing || 3;
  const dP = stock.dPeriod || 3;

  const textColor = isDarkMode ? '#94a3b8' : '#64748b';
  const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

  stochChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `%K (${kP}, ${kS})`,
          data: slowKs,
          borderColor: '#00f2fe',
          backgroundColor: 'transparent',
          borderWidth: 2.4,
          pointRadius: 2.5,
          pointHoverRadius: 5,
          tension: 0.25,
          order: 1
        },
        {
          label: `%D (${dP} Signal)`,
          data: ds,
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 4,
          tension: 0.25,
          order: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: isDarkMode ? '#f8fafc' : '#0f172a',
            boxWidth: 12,
            font: { family: 'Inter', size: 11, weight: '500' }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(2) : 'N/A'}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: gridColor },
          ticks: {
            stepSize: 20,
            color: textColor,
            font: { family: 'JetBrains Mono', size: 10 }
          }
        }
      }
    }
  });
}

function renderBreakdownTable(history, curr, stock) {
  const container = document.getElementById('modalBreakdownContainer');
  if (!container) return;

  const recent = history.slice(-10).reverse();

  container.innerHTML = `
    <h4 class="breakdown-title">
      <i data-lucide="calculator" class="inline-icon text-cyan"></i>
      Stochastic (${stock.kPeriod}, ${stock.kSmoothing}, ${stock.dPeriod}) Closing-Basis Step-by-Step Calculation
    </h4>
    <div class="table-responsive">
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Date</th>
            <th class="text-right">Close Price</th>
            <th class="text-right">Fast %K (Raw)</th>
            <th class="text-right">%K (Smoothed ${stock.kSmoothing})</th>
            <th class="text-right">%D (Signal ${stock.dPeriod})</th>
            <th class="text-right">Spread</th>
            <th>Signal State</th>
          </tr>
        </thead>
        <tbody>
          ${recent.map((row, idx) => `
            <tr class="${idx === 0 ? 'row-latest' : ''}">
              <td class="font-mono ${idx === 0 ? 'text-cyan font-bold' : ''}">
                ${row.date} ${idx === 0 ? '<strong>(Latest)</strong>' : ''}
              </td>
              <td class="text-right font-mono font-bold">${curr}${row.close.toFixed(2)}</td>
              <td class="text-right font-mono text-muted">${row.fastK != null ? row.fastK.toFixed(1) : '-'}</td>
              <td class="text-right font-mono font-bold text-cyan">${row.slowK != null ? row.slowK.toFixed(2) : '-'}</td>
              <td class="text-right font-mono font-bold text-amber">${row.d != null ? row.d.toFixed(2) : '-'}</td>
              <td class="text-right font-mono ${row.spread >= 0 ? 'text-emerald' : 'text-rose'}">
                ${row.spread != null ? `${row.spread >= 0 ? '+' : ''}${row.spread.toFixed(2)}` : '-'}
              </td>
              <td><span class="badge badge-${row.signalSeverity}">${row.signalLabel}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
