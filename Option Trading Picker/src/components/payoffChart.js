/**
 * Interactive Option Payoff Chart Component (Chart.js)
 * Visualizes expiration P&L and T+0 curves with breakevens and profit/loss zones
 */

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

let payoffChartInstance = null;

/**
 * Render or update Payoff Chart
 * @param {string} canvasId - HTML canvas element id
 * @param {object} payoffData - Payoff data from calculatePayoffProfile
 * @param {number} spotPrice - Current underlying price
 * @param {string} currencySymbol - '$' or '₹'
 * @param {boolean} isDarkMode - Dark or light theme
 */
export function renderPayoffChart(canvasId, payoffData, spotPrice, currencySymbol = '$', isDarkMode = true) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (payoffChartInstance) {
    try {
      payoffChartInstance.destroy();
    } catch (_) {}
    payoffChartInstance = null;
  }

  if (!payoffData || !payoffData.pricePoints || payoffData.pricePoints.length === 0) {
    return;
  }

  const ctx = canvas.getContext('2d');
  const labels = payoffData.pricePoints;
  const expiryData = payoffData.expiryPnL;
  const currentData = payoffData.currentPnL;
  const breakevens = payoffData.breakevens || [];

  // Theme colors
  const textColor = isDarkMode ? '#94a3b8' : '#475569';
  const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
  const zeroLineColor = isDarkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)';

  // Gradient for Expiration Curve
  const pnlGradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 360);
  pnlGradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)'); // Emerald Green (Profit)
  pnlGradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.05)');
  pnlGradient.addColorStop(0.51, 'rgba(244, 63, 94, 0.05)');
  pnlGradient.addColorStop(1, 'rgba(244, 63, 94, 0.25)');  // Rose Red (Loss)

  payoffChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'P&L at Expiration',
          data: expiryData,
          borderColor: '#10b981', // Emerald
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#10b981',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
          fill: true,
          backgroundColor: pnlGradient,
          tension: 0.1,
          order: 1
        },
        {
          label: 'P&L Today (T+0)',
          data: currentData,
          borderColor: '#00f2fe', // Neon Cyan
          borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 0,
          pointHoverRadius: 5,
          fill: false,
          tension: 0.25,
          order: 2
        },
        {
          label: 'Zero Line',
          data: labels.map(() => 0),
          borderColor: zeroLineColor,
          borderWidth: 1.5,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false,
          order: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: textColor,
            font: { family: 'Inter', size: 12, weight: 600 },
            usePointStyle: true,
            boxWidth: 8
          }
        },
        tooltip: {
          backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: isDarkMode ? '#f8fafc' : '#0f172a',
          bodyColor: isDarkMode ? '#cbd5e1' : '#334155',
          borderColor: isDarkMode ? 'rgba(0, 242, 254, 0.3)' : 'rgba(2, 132, 199, 0.3)',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            title: (items) => {
              const price = items[0]?.label;
              return `Underlying Price: ${currencySymbol}${Number(price).toLocaleString()}`;
            },
            label: (item) => {
              if (item.datasetIndex === 2) return null; // Skip zero line
              const val = item.raw;
              const sign = val >= 0 ? '+' : '';
              const prefix = item.dataset.label;
              return `${prefix}: ${sign}${currencySymbol}${Math.round(val).toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'JetBrains Mono', size: 11 },
            maxTicksLimit: 12,
            callback: (val) => `${currencySymbol}${labels[val] || ''}`
          },
          title: {
            display: true,
            text: `Underlying Asset Price (${currencySymbol})`,
            color: textColor,
            font: { family: 'Inter', size: 11, weight: 600 }
          }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'JetBrains Mono', size: 11 },
            callback: (val) => `${val >= 0 ? '+' : ''}${currencySymbol}${val.toLocaleString()}`
          },
          title: {
            display: true,
            text: `Total Profit / Loss (${currencySymbol})`,
            color: textColor,
            font: { family: 'Inter', size: 11, weight: 600 }
          }
        }
      }
    }
  });

  return payoffChartInstance;
}

export function resizePayoffChart() {
  if (payoffChartInstance) {
    try {
      payoffChartInstance.resize();
    } catch (_) {}
  }
}
