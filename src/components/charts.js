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

// Register Chart.js components
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

let priceChartInstance = null;
let rsiChartInstance = null;
let epsChartInstance = null;
let marginsChartInstance = null;

export function getThemeColors(isDarkMode) {
  if (isDarkMode) {
    return {
      text: '#94a3b8',
      textBright: '#f8fafc',
      grid: 'rgba(255, 255, 255, 0.07)',
      tooltipBg: '#0f172a',
      tooltipBorder: 'rgba(255, 255, 255, 0.15)',
      primary: '#00f2fe',
      primaryAlpha: 'rgba(0, 242, 254, 0.15)',
      emerald: '#10b981',
      emeraldAlpha: 'rgba(16, 185, 129, 0.15)',
      amber: '#f59e0b',
      rose: '#f43f5e',
      blue: '#3b82f6',
      purple: '#a855f7'
    };
  } else {
    return {
      text: '#64748b',
      textBright: '#0f172a',
      grid: 'rgba(0, 0, 0, 0.06)',
      tooltipBg: '#ffffff',
      tooltipBorder: 'rgba(0, 0, 0, 0.12)',
      primary: '#0284c7',
      primaryAlpha: 'rgba(2, 132, 199, 0.12)',
      emerald: '#059669',
      emeraldAlpha: 'rgba(5, 150, 105, 0.12)',
      amber: '#d97706',
      rose: '#e11d48',
      blue: '#2563eb',
      purple: '#9333ea'
    };
  }
}

/**
 * Generate simulated 60-day historical daily price action that aligns with current price, 50 SMA, and 200 SMA
 */
function generateHistoricalPriceSeries(stock) {
  if (stock.dailySeries && stock.dailySeries.length > 0) {
    const labels = stock.dailySeries.map(s => s.date);
    const prices = stock.dailySeries.map(s => s.close);
    const volumes = stock.dailySeries.map(s => s.volume);

    // Generate accurate rolling SMA lines
    const sma50Series = [];
    const sma200Series = [];

    for (let i = 0; i < prices.length; i++) {
      const slice50 = prices.slice(Math.max(0, i - 49), i + 1);
      const avg50 = slice50.reduce((a, b) => a + b, 0) / slice50.length;
      sma50Series.push(Number(avg50.toFixed(2)));

      const slice200 = prices.slice(Math.max(0, i - 199), i + 1);
      const avg200 = slice200.reduce((a, b) => a + b, 0) / slice200.length;
      sma200Series.push(Number(avg200.toFixed(2)));
    }

    return { labels, prices, sma50Series, sma200Series, volumes };
  }

  const points = 60;
  const currentPrice = stock.price;
  const labels = [];
  const prices = [];
  const sma50Series = [];
  const sma200Series = [];
  const volumes = [];

  const today = new Date();
  let simulatedPrice = currentPrice * 0.88;
  const step = (currentPrice - simulatedPrice) / points;

  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

    const noise = (Math.sin(i * 0.4) + (Math.random() - 0.48) * 1.5) * (currentPrice * 0.015);
    const p = i === 0 ? currentPrice : Number((currentPrice - (i * step) + noise).toFixed(2));
    prices.push(p);

    const s50 = Number((stock.sma50 + (points - i) * 0.08).toFixed(2));
    const s200 = Number((stock.sma200 + (points - i) * 0.03).toFixed(2));
    sma50Series.push(s50);
    sma200Series.push(s200);

    const vol = Number((parseFloat(stock.volume) * (0.8 + Math.random() * 0.5)).toFixed(1));
    volumes.push(vol);
  }

  return { labels, prices, sma50Series, sma200Series, volumes };
}

/**
 * Render Price & Moving Averages Technical Chart
 */
export function renderPriceChart(stock, isDarkMode) {
  const canvas = document.getElementById('priceChartCanvas');
  if (!canvas) return;

  if (priceChartInstance) {
    priceChartInstance.destroy();
  }

  const colors = getThemeColors(isDarkMode);
  const data = generateHistoricalPriceSeries(stock);
  const curr = stock.currencySymbol || '$';

  priceChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: `${stock.ticker} Price (${curr})`,
          data: data.prices,
          borderColor: colors.primary,
          backgroundColor: colors.primaryAlpha,
          borderWidth: 2.2,
          pointRadius: 0,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.2,
          yAxisID: 'y'
        },
        {
          label: '50-Day SMA',
          data: data.sma50Series,
          borderColor: colors.amber,
          borderWidth: 1.6,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
          tension: 0.1,
          yAxisID: 'y'
        },
        {
          label: '200-Day SMA',
          data: data.sma200Series,
          borderColor: colors.purple,
          borderWidth: 1.6,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
          tension: 0.1,
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: 'Volume (M)',
          data: data.volumes,
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          yAxisID: 'yVolume',
          barPercentage: 0.6
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
          position: 'top',
          labels: {
            color: colors.textBright,
            boxWidth: 14,
            usePointStyle: true,
            font: { family: 'Inter', size: 11, weight: '500' }
          }
        },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.textBright,
          bodyColor: colors.text,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          callbacks: {
            label: function (context) {
              if (context.dataset.yAxisID === 'yVolume') {
                return ` Volume: ${context.parsed.y}M shares`;
              }
              return ` ${context.dataset.label}: ${curr}${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            maxTicksLimit: 10,
            font: { family: 'JetBrains Mono', size: 10 }
          }
        },
        y: {
          position: 'left',
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            callback: (val) => `${curr}${val}`,
            font: { family: 'JetBrains Mono', size: 10 }
          }
        },
        yVolume: {
          position: 'right',
          grid: { display: false },
          max: Math.max(...data.volumes) * 4,
          ticks: {
            color: colors.text,
            callback: (val) => `${val}M`,
            font: { family: 'JetBrains Mono', size: 9 },
            maxTicksLimit: 4
          }
        }
      }
    }
  });
}

/**
 * Render RSI Technical Indicator Sub-Chart
 */
export function renderRSIChart(stock, isDarkMode) {
  const canvas = document.getElementById('rsiChartCanvas');
  if (!canvas) return;

  if (rsiChartInstance) {
    rsiChartInstance.destroy();
  }

  const colors = getThemeColors(isDarkMode);
  const points = 30;
  const labels = [];
  const rsiValues = [];
  const today = new Date();

  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    
    // Wave towards current RSI
    const noise = Math.sin(i * 0.5) * 6 + (Math.random() - 0.5) * 4;
    const rsi = i === 0 ? stock.rsi14 : Math.min(85, Math.max(20, stock.rsi14 + noise));
    rsiValues.push(Number(rsi.toFixed(1)));
  }

  rsiChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'RSI (14)',
          data: rsiValues,
          borderColor: stock.rsi14 > 70 ? colors.rose : stock.rsi14 < 35 ? colors.emerald : colors.amber,
          backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(217, 119, 6, 0.08)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.textBright,
          bodyColor: colors.text,
          borderColor: colors.tooltipBorder,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          display: true,
          grid: { color: colors.grid },
          ticks: { color: colors.text, maxTicksLimit: 6, font: { family: 'JetBrains Mono', size: 9 } }
        },
        y: {
          min: 15,
          max: 85,
          grid: { color: colors.grid },
          ticks: {
            stepSize: 20,
            color: colors.text,
            font: { family: 'JetBrains Mono', size: 9 }
          }
        }
      }
    }
  });
}

/**
 * Render EPS Growth Trajectory: Past vs Future Projections
 */
export function renderEPSChart(stock, isDarkMode) {
  const canvas = document.getElementById('epsTrajectoryChartCanvas');
  if (!canvas) return;

  if (epsChartInstance) {
    epsChartInstance.destroy();
  }

  const colors = getThemeColors(isDarkMode);
  const curr = stock.currencySymbol || '$';

  // Combine historical and projected data
  const historical = stock.historicalEPS || [];
  const projected = stock.projectedEPS || [];

  const labels = [
    ...historical.map(h => h.year),
    ...projected.map(p => p.year)
  ];

  const historicalData = [
    ...historical.map(h => h.eps),
    ...projected.map(() => null)
  ];

  const projectedData = [
    ...historical.slice(0, -1).map(() => null),
    historical[historical.length - 1]?.eps || null, // Connect from last historical
    ...projected.map(p => p.eps)
  ];

  epsChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: `Historical Reported EPS (${curr})`,
          data: historicalData,
          backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.65)' : 'rgba(37, 99, 235, 0.7)',
          borderRadius: 4,
          order: 2
        },
        {
          type: 'bar',
          label: `Consensus Projected EPS (${curr})`,
          data: projectedData,
          backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.7)' : 'rgba(5, 150, 105, 0.75)',
          borderRadius: 4,
          order: 2
        },
        {
          type: 'line',
          label: 'EPS Trajectory Trend',
          data: [...historical.map(h => h.eps), ...projected.map(p => p.eps)],
          borderColor: colors.primary,
          borderWidth: 2.4,
          pointRadius: 4,
          pointBackgroundColor: colors.primary,
          tension: 0.25,
          order: 1
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
            color: colors.textBright,
            boxWidth: 12,
            font: { family: 'Inter', size: 11, weight: '500' }
          }
        },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.textBright,
          bodyColor: colors.text,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: (context) => ` ${context.dataset.label}: ${curr}${context.parsed.y?.toFixed(2)}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: colors.grid },
          ticks: { color: colors.text, font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            callback: (v) => `${curr}${v}`,
            font: { family: 'JetBrains Mono', size: 10 }
          }
        }
      }
    }
  });
}

/**
 * Render Revenue & Profit Margins Fundamental Chart
 */
export function renderMarginsChart(stock, isDarkMode) {
  const canvas = document.getElementById('marginsChartCanvas');
  if (!canvas) return;

  if (marginsChartInstance) {
    marginsChartInstance.destroy();
  }

  const colors = getThemeColors(isDarkMode);

  marginsChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Gross Margin', 'Operating Margin', 'Net Profit Margin', 'ROE'],
      datasets: [
        {
          label: `${stock.ticker} (%)`,
          data: [stock.grossMargin, stock.operatingMargin, stock.netMargin, stock.roe],
          backgroundColor: [
            isDarkMode ? 'rgba(0, 242, 254, 0.75)' : 'rgba(2, 132, 199, 0.8)',
            isDarkMode ? 'rgba(59, 130, 246, 0.75)' : 'rgba(37, 99, 235, 0.8)',
            isDarkMode ? 'rgba(16, 185, 129, 0.75)' : 'rgba(5, 150, 105, 0.8)',
            isDarkMode ? 'rgba(168, 85, 247, 0.75)' : 'rgba(147, 51, 234, 0.8)'
          ],
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.textBright,
          bodyColor: colors.text,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: (ctx) => ` Margin: ${ctx.parsed.y}%`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colors.textBright, font: { family: 'Inter', size: 10, weight: '500' } }
        },
        y: {
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            callback: (v) => `${v}%`,
            font: { family: 'JetBrains Mono', size: 10 }
          }
        }
      }
    }
  });
}

/**
 * Update all charts on theme switch or stock change
 */
export function updateAllCharts(stock, isDarkMode) {
  renderPriceChart(stock, isDarkMode);
  renderRSIChart(stock, isDarkMode);
  renderEPSChart(stock, isDarkMode);
  renderMarginsChart(stock, isDarkMode);
}
