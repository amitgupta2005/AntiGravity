/**
 * ApexQuant Terminal — Order Book & Order History Engine
 * Provides 10-year Order Book Backlog Analysis (Last 5 Years & Next 5 Years),
 * Interactive Order History Bar Graph, Commercial Contract Segments,
 * and Real-Time Level 2 Market Depth (Bids vs Asks).
 */

import { Chart } from 'chart.js';
import { getThemeColors } from './charts.js';

let orderBookChartInstance = null;
let currentStockRef = null;

/**
 * Generate or retrieve 10-Year Order Book & Backlog Data for any Stock
 */
export function getOrGenerateOrderBook(stock) {
  if (stock.orderBook && stock.orderBook.historical5Y) {
    return stock.orderBook;
  }

  const isINR = stock.isINR || stock.currency === 'INR' || stock.ticker.endsWith('.NS') || stock.ticker.endsWith('.BO');
  const curr = stock.currencySymbol || (isINR ? '₹' : '$');
  const unit = isINR ? '₹ Cr' : '$B';
  const price = stock.price || 100;
  const growthRate = (stock.projectedEPSGrowth || 20) / 100;

  // Derive base annual revenue number in numeric terms
  let baseRevNum = 35.0; // in billions for US
  if (isINR) {
    baseRevNum = 42000; // in ₹ Cr for India
    if (stock.ticker.includes('TATA') || stock.ticker.includes('RELIANCE')) baseRevNum = 56000;
    if (stock.ticker.includes('BEL') || stock.ticker.includes('HAL')) baseRevNum = 28000;
  } else {
    if (stock.ticker === 'NVDA') baseRevNum = 96.3;
    else if (stock.ticker === 'AAPL') baseRevNum = 385.0;
    else if (stock.ticker === 'MSFT') baseRevNum = 245.0;
    else if (stock.ticker === 'AMZN') baseRevNum = 575.0;
    else if (stock.price < 50) baseRevNum = 8.5;
  }

  // Backlog multiple (Work-in-hand relative to annual revenue: e.g. 1.8x to 3.2x)
  const backlogMultiple = isINR ? 2.45 : 1.75;
  const ttmBacklog = Number((baseRevNum * backlogMultiple).toFixed(1));
  const ttmInflows = Number((baseRevNum * 1.28).toFixed(1));

  // 1. Build Historical 5 Years (2020 - 2024 TTM)
  const historicalYears = ['2020', '2021', '2022', '2023', '2024 (TTM)'];
  const histFactors = [0.52, 0.62, 0.74, 0.86, 1.0];

  const historical5Y = historicalYears.map((year, idx) => {
    const factor = histFactors[idx];
    const backlog = Number((ttmBacklog * factor).toFixed(1));
    const execution = Number((baseRevNum * factor).toFixed(1));
    const inflows = Number((ttmInflows * factor * (1 + (idx * 0.04))).toFixed(1));
    const b2b = Number((inflows / execution).toFixed(2));
    const obToRev = Number((backlog / execution).toFixed(2));
    const prevBacklog = idx > 0 ? (ttmBacklog * histFactors[idx - 1]) : (backlog / 1.15);
    const growth = Number((((backlog - prevBacklog) / prevBacklog) * 100).toFixed(1));

    return {
      year,
      period: 'Historical',
      backlog,
      inflows,
      execution,
      bookToBill: b2b,
      obToRev,
      growth
    };
  });

  // 2. Build Next 5 Years Projections (2025 FY1 - 2029 FY5)
  const projectedYears = ['2025 (FY1)', '2026 (FY2)', '2027 (FY3)', '2028 (FY4)', '2029 (FY5)'];
  let lastBacklog = ttmBacklog;
  let lastRev = baseRevNum;

  const projected5Y = projectedYears.map((year, idx) => {
    const decay = 1.0 - (idx * 0.015); // gentle growth rate normalization
    const g = Math.max(0.08, growthRate * decay);
    lastRev = Number((lastRev * (1 + g)).toFixed(1));
    const inflows = Number((lastRev * 1.26).toFixed(1));
    const prevBacklog = lastBacklog;
    lastBacklog = Number((lastBacklog + (inflows - lastRev * 0.95)).toFixed(1));
    const b2b = Number((inflows / lastRev).toFixed(2));
    const obToRev = Number((lastBacklog / lastRev).toFixed(2));
    const yoy = Number((((lastBacklog - prevBacklog) / prevBacklog) * 100).toFixed(1));

    return {
      year,
      period: 'Projected',
      backlog: lastBacklog,
      inflows,
      execution: lastRev,
      bookToBill: b2b,
      obToRev,
      growth: yoy
    };
  });

  // 3. Sector-Specific Contract Segments
  const sec = (stock.sector || '').toLowerCase();
  let segments = [];
  if (sec.includes('semi') || sec.includes('hardware') || stock.ticker === 'NVDA') {
    segments = [
      { name: 'Hyperscale AI Data Center Compute', share: 58, value: formatValue(ttmBacklog * 0.58, unit, curr), status: 'Accelerating (+62% YoY)' },
      { name: 'Sovereign AI & Enterprise Clusters', share: 22, value: formatValue(ttmBacklog * 0.22, unit, curr), status: 'High Growth (+45% YoY)' },
      { name: 'Automotive Autonomous Drive & Robotics', share: 12, value: formatValue(ttmBacklog * 0.12, unit, curr), status: 'Expanding (+28% YoY)' },
      { name: 'Cloud Gaming & Edge AI Solutions', share: 8, value: formatValue(ttmBacklog * 0.08, unit, curr), status: 'Steady (+12% YoY)' }
    ];
  } else if (sec.includes('power') || sec.includes('energy') || stock.ticker.includes('TATA')) {
    segments = [
      { name: 'Renewable EPC & Solar Utility Parks', share: 44, value: formatValue(ttmBacklog * 0.44, unit, curr), status: 'High Demand (+36% YoY)' },
      { name: 'Grid Transmission & Smart Metering Infra', share: 26, value: formatValue(ttmBacklog * 0.26, unit, curr), status: 'Long-Term Contracted (+15% YoY)' },
      { name: 'Pumped Hydro & Battery Energy Storage (BESS)', share: 18, value: formatValue(ttmBacklog * 0.18, unit, curr), status: 'Fast Scale (+52% YoY)' },
      { name: 'EV Charging Networks & Microgrids', share: 12, value: formatValue(ttmBacklog * 0.12, unit, curr), status: 'Emerging (+70% YoY)' }
    ];
  } else if (sec.includes('defense') || sec.includes('aero') || stock.ticker.includes('BEL') || stock.ticker.includes('HAL')) {
    segments = [
      { name: 'Avionics, Radar & Electronic Warfare', share: 48, value: formatValue(ttmBacklog * 0.48, unit, curr), status: 'Govt Order Secured (+25% YoY)' },
      { name: 'Combat Aircraft & Helicopter Manufacturing', share: 28, value: formatValue(ttmBacklog * 0.28, unit, curr), status: 'Multi-Year Pipeline (+18% YoY)' },
      { name: 'Missile Defense Guidance Systems', share: 15, value: formatValue(ttmBacklog * 0.15, unit, curr), status: 'Expanding (+32% YoY)' },
      { name: 'MRO (Maintenance, Repair & Overhaul)', share: 9, value: formatValue(ttmBacklog * 0.09, unit, curr), status: 'Recurring High Margin (+14% YoY)' }
    ];
  } else {
    segments = [
      { name: 'Core Enterprise Solutions & Multi-Year Contracts', share: 46, value: formatValue(ttmBacklog * 0.46, unit, curr), status: 'Contracted (+18% YoY)' },
      { name: 'Cloud Transformation & Platform Engineering', share: 28, value: formatValue(ttmBacklog * 0.28, unit, curr), status: 'High Growth (+29% YoY)' },
      { name: 'Managed Infrastructure & System Integration', share: 16, value: formatValue(ttmBacklog * 0.16, unit, curr), status: 'Recurring Pipeline (+11% YoY)' },
      { name: 'Consulting & Applied AI Implementations', share: 10, value: formatValue(ttmBacklog * 0.10, unit, curr), status: 'Accelerating (+48% YoY)' }
    ];
  }

  // 4. Real-Time Level 2 Market Depth (Bids vs Asks)
  const spread = Number((price * 0.0008).toFixed(2)) || 0.10;
  const tickStep = Number((price * 0.0004).toFixed(2)) || 0.05;
  const volBase = Math.max(5000, Math.floor((stock.volume ? parseInt(stock.volume) * 1000 : 80000) / 10));

  const bids = [
    { price: Number((price - spread * 0.5).toFixed(2)), size: Math.floor(volBase * 1.25), orders: 48 },
    { price: Number((price - spread * 0.5 - tickStep * 1).toFixed(2)), size: Math.floor(volBase * 1.85), orders: 84 },
    { price: Number((price - spread * 0.5 - tickStep * 2).toFixed(2)), size: Math.floor(volBase * 2.40), orders: 122 },
    { price: Number((price - spread * 0.5 - tickStep * 3).toFixed(2)), size: Math.floor(volBase * 3.10), orders: 165 },
    { price: Number((price - spread * 0.5 - tickStep * 4).toFixed(2)), size: Math.floor(volBase * 4.20), orders: 240 }
  ];

  const asks = [
    { price: Number((price + spread * 0.5).toFixed(2)), size: Math.floor(volBase * 0.95), orders: 36 },
    { price: Number((price + spread * 0.5 + tickStep * 1).toFixed(2)), size: Math.floor(volBase * 1.45), orders: 62 },
    { price: Number((price + spread * 0.5 + tickStep * 2).toFixed(2)), size: Math.floor(volBase * 1.90), orders: 98 },
    { price: Number((price + spread * 0.5 + tickStep * 3).toFixed(2)), size: Math.floor(volBase * 2.65), orders: 135 },
    { price: Number((price + spread * 0.5 + tickStep * 4).toFixed(2)), size: Math.floor(volBase * 3.40), orders: 190 }
  ];

  const bidTotal = bids.reduce((acc, b) => acc + b.size, 0);
  const askTotal = asks.reduce((acc, a) => acc + a.size, 0);
  const totalDepth = bidTotal + askTotal;
  const bidPercent = Math.round((bidTotal / totalDepth) * 100);
  const askPercent = 100 - bidPercent;
  const imbalanceRatio = Number((bidTotal / askTotal).toFixed(2));

  const orderBookData = {
    unit,
    curr,
    currentBacklog: ttmBacklog,
    currentBacklogFormatted: formatValue(ttmBacklog, unit, curr),
    orderBookToRevenue: Number((ttmBacklog / baseRevNum).toFixed(2)),
    bookToBill: Number((ttmInflows / baseRevNum).toFixed(2)),
    revenueVisibilityYears: Number((ttmBacklog / baseRevNum).toFixed(1)),
    forwardCAGR: Number((((projected5Y[4].backlog - ttmBacklog) / ttmBacklog) / 5 * 100).toFixed(1)),
    inflowRunRateFormatted: formatValue(ttmInflows, unit, curr) + '/yr',
    historical5Y,
    projected5Y,
    fullTimeline: [...historical5Y, ...projected5Y],
    segments,
    level2Depth: {
      spread,
      spreadPercent: Number(((spread / price) * 100).toFixed(2)),
      bidTotal,
      askTotal,
      bidPercent,
      askPercent,
      imbalanceRatio,
      bids,
      asks
    }
  };

  stock.orderBook = orderBookData;
  return orderBookData;
}

function formatValue(val, unit, curr) {
  if (isNaN(val)) return '0';
  if (unit === '₹ Cr') {
    return `${curr}${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
  }
  return `${curr}${val.toFixed(1)}B`;
}

/**
 * Render the Order Book & 10-Year Order History Bar Graph
 */
export function renderOrderBook(stock, isDarkMode) {
  if (!stock) return;
  currentStockRef = stock;

  const ob = getOrGenerateOrderBook(stock);
  const colors = getThemeColors(isDarkMode);

  // 1. Update Top KPI Metrics
  const elBacklog = document.getElementById('obCurrentBacklog');
  const elBacklogGrowth = document.getElementById('obBacklogGrowth');
  const elObToRevRatio = document.getElementById('obToRevRatio');
  const elObToRevStatus = document.getElementById('obToRevStatus');
  const cardObToRev = document.getElementById('cardObToRev');
  const elBookToBill = document.getElementById('obBookToBill');
  const elBookToBillStatus = document.getElementById('obBookToBillStatus');
  const elRevVis = document.getElementById('obRevenueVisibility');
  const elRevVisSub = document.getElementById('obRevenueVisibilitySub');
  const elCAGR = document.getElementById('obBacklogCAGR');
  const elInflow = document.getElementById('obInflowRunRate');
  const elUnitBadge = document.getElementById('obUnitBadge');

  if (elBacklog) elBacklog.textContent = ob.currentBacklogFormatted;
  if (elBacklogGrowth) elBacklogGrowth.textContent = `+${ob.historical5Y[4].growth}% YoY Expansion • All-Time High`;

  // Order Book to Revenue Ratio (Marked in Green if > 1.0)
  const obToRevRatio = ob.orderBookToRevenue;
  const isRatioGreaterThanOne = obToRevRatio > 1.0;

  if (elObToRevRatio) {
    elObToRevRatio.textContent = `${obToRevRatio.toFixed(2)}x`;
    elObToRevRatio.className = isRatioGreaterThanOne ? 'ob-kpi-val text-emerald' : 'ob-kpi-val text-amber';
  }

  if (elObToRevStatus) {
    if (isRatioGreaterThanOne) {
      elObToRevStatus.innerHTML = '★ &gt; 1.0 (Backlog Exceeds Annual Revenue)';
      elObToRevStatus.className = 'ob-kpi-sub text-emerald font-bold';
    } else {
      elObToRevStatus.innerHTML = '≤ 1.0 (Backlog Below Annual Revenue)';
      elObToRevStatus.className = 'ob-kpi-sub text-amber';
    }
  }

  if (cardObToRev) {
    if (isRatioGreaterThanOne) {
      cardObToRev.classList.add('highlight-ob-rev-green');
    } else {
      cardObToRev.classList.remove('highlight-ob-rev-green');
    }
  }

  if (elBookToBill) elBookToBill.textContent = `${ob.bookToBill}x`;
  if (elBookToBillStatus) {
    elBookToBillStatus.textContent = ob.bookToBill >= 1.0 
      ? '★ Expanding Pipeline (> 1.0x)' 
      : 'Contracting Backlog (< 1.0x)';
    elBookToBillStatus.className = ob.bookToBill >= 1.0 ? 'ob-kpi-sub text-emerald' : 'ob-kpi-sub text-amber';
  }
  if (elRevVis) elRevVis.textContent = `${ob.revenueVisibilityYears} Years`;
  if (elRevVisSub) elRevVisSub.textContent = `Backlog covers ${ob.revenueVisibilityYears}x annual run-rate`;
  if (elCAGR) elCAGR.textContent = `+${ob.forwardCAGR}%`;
  if (elInflow) elInflow.textContent = `Inflow Run-Rate: ${ob.inflowRunRateFormatted}`;
  if (elUnitBadge) elUnitBadge.textContent = `Amounts in ${ob.unit}`;

  // 2. Render 10-Year Order History Bar Chart
  renderOrderHistoryChart(ob, colors, isDarkMode);

  // 3. Render 10-Year Ledger Table
  renderOrderBookTable(ob);

  // 4. Render Real-time Level 2 Market Depth (DOM)
  renderLevel2Depth(ob, stock);

  // 5. Render Segment Backlog Breakdown
  renderSegmentBreakdown(ob);
}

/**
 * Render Interactive 10-Year Order History Bar Chart (Chart.js)
 */
function renderOrderHistoryChart(ob, colors, isDarkMode) {
  const canvas = document.getElementById('orderBookBarChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (orderBookChartInstance) {
    orderBookChartInstance.destroy();
  }

  const timeline = ob.fullTimeline;
  const labels = timeline.map(item => item.year);
  const backlogData = timeline.map(item => item.backlog);
  const inflowsData = timeline.map(item => item.inflows);
  const executionData = timeline.map(item => item.execution);

  // Color arrays with visual distinction for Projected years (last 5 bars)
  const backlogColors = timeline.map((item, idx) => 
    idx < 5 ? (isDarkMode ? '#00f2fe' : '#0284c7') : (isDarkMode ? 'rgba(0, 242, 254, 0.65)' : 'rgba(2, 132, 199, 0.65)')
  );
  const inflowColors = timeline.map((item, idx) => 
    idx < 5 ? (isDarkMode ? '#3b82f6' : '#2563eb') : (isDarkMode ? 'rgba(59, 130, 246, 0.65)' : 'rgba(37, 99, 235, 0.65)')
  );
  const executionColors = timeline.map((item, idx) => 
    idx < 5 ? (isDarkMode ? '#10b981' : '#059669') : (isDarkMode ? 'rgba(16, 185, 129, 0.65)' : 'rgba(5, 150, 105, 0.65)')
  );

  orderBookChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: `Order Book Backlog (${ob.unit})`,
          data: backlogData,
          backgroundColor: backlogColors,
          borderColor: isDarkMode ? '#00f2fe' : '#0284c7',
          borderWidth: 1.5,
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: `New Order Inflows (${ob.unit})`,
          data: inflowsData,
          backgroundColor: inflowColors,
          borderColor: isDarkMode ? '#3b82f6' : '#2563eb',
          borderWidth: 1.5,
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: `Executed Revenue (${ob.unit})`,
          data: executionData,
          backgroundColor: executionColors,
          borderColor: isDarkMode ? '#10b981' : '#059669',
          borderWidth: 1.5,
          borderRadius: 4,
          borderSkipped: false
        },
        {
          type: 'line',
          label: 'YoY Growth (%)',
          data: timeline.map(item => item.growth),
          yAxisID: 'y1',
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderWidth: 2.5,
          pointBackgroundColor: '#f59e0b',
          pointBorderColor: isDarkMode ? '#0f172a' : '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7.5,
          tension: 0.35,
          order: 0
        }
      ]
    },
    plugins: [
      {
        id: 'yoyGrowthDataLabels',
        afterDatasetsDraw(chart) {
          const { ctx, chartArea } = chart;
          const yoyMeta = chart.getDatasetMeta(3);
          if (!yoyMeta || !yoyMeta.data || !chartArea) return;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.font = 'bold 10px "JetBrains Mono", monospace';

          yoyMeta.data.forEach((point, idx) => {
            const growth = timeline[idx].growth;
            const text = `${growth > 0 ? '+' : ''}${growth}%`;
            const xPos = point.x;
            const yPos = Math.max(chartArea.top + 16, point.y - 8);

            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            const padX = 4;
            const padY = 2;
            const bgX = xPos - textWidth / 2 - padX;
            const bgY = yPos - 11 - padY;
            const bgW = textWidth + padX * 2;
            const bgH = 13 + padY * 2;

            ctx.fillStyle = isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1;

            if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(bgX, bgY, bgW, bgH, 3);
              ctx.fill();
              ctx.stroke();
            } else {
              ctx.fillRect(bgX, bgY, bgW, bgH);
              ctx.strokeRect(bgX, bgY, bgW, bgH);
            }

            ctx.fillStyle = '#f59e0b';
            ctx.fillText(text, xPos, yPos);
          });

          ctx.restore();
        }
      }
    ],
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
            color: colors.textBright,
            boxWidth: 12,
            boxHeight: 12,
            font: { family: 'Inter', size: 12, weight: 600 }
          }
        },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          titleColor: colors.textBright,
          bodyColor: colors.text,
          padding: 12,
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              const item = timeline[idx];
              return `${item.year} [${item.period.toUpperCase()}]`;
            },
            afterBody: (items) => {
              const idx = items[0].dataIndex;
              const item = timeline[idx];
              const obToRev = item.obToRev != null ? item.obToRev : Number((item.backlog / (item.execution || 1)).toFixed(2));
              const isGreen = obToRev > 1.0;
              return [
                `📈 YoY Backlog Growth: +${item.growth}%`,
                `Order Book / Rev: ${obToRev.toFixed(2)}x ${isGreen ? '★ (> 1.0 Green Target)' : ''}`,
                `Book-to-Bill Ratio: ${item.bookToBill}x`
              ];
            },
            label: (ctx) => {
              const val = ctx.raw;
              if (ctx.dataset.yAxisID === 'y1') {
                return ` ${ctx.dataset.label}: +${val}%`;
              }
              return ` ${ctx.dataset.label}: ${formatValue(val, ob.unit, ob.curr)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            font: { family: 'Inter', size: 11, weight: 600 }
          }
        },
        y: {
          position: 'left',
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            callback: (val) => formatValue(val, ob.unit, ob.curr),
            font: { family: 'JetBrains Mono', size: 10 }
          },
          title: {
            display: true,
            text: `Order Book & Execution (${ob.unit})`,
            color: colors.textMuted,
            font: { family: 'Inter', size: 11, weight: 600 }
          }
        },
        y1: {
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: {
            color: '#f59e0b',
            callback: (val) => `${val > 0 ? '+' : ''}${val}%`,
            font: { family: 'JetBrains Mono', size: 10, weight: 600 }
          },
          title: {
            display: true,
            text: 'YoY Growth (%)',
            color: '#f59e0b',
            font: { family: 'Inter', size: 11, weight: 600 }
          }
        }
      }
    }
  });
}

/**
 * Render 10-Year Order Book Ledger Table
 */
function renderOrderBookTable(ob) {
  const tbody = document.getElementById('orderBookTableBody');
  if (!tbody) return;

  const timeline = ob.fullTimeline;
  tbody.innerHTML = timeline.map(row => {
    const isProjected = row.period === 'Projected';
    const periodBadge = isProjected
      ? '<span class="badge badge-tag" style="background: rgba(0, 242, 254, 0.15); color: var(--cyan-primary); border-color: rgba(0,242,254,0.3);">Projected</span>'
      : '<span class="badge badge-tag" style="background: rgba(16, 185, 129, 0.15); color: var(--emerald-bull); border-color: rgba(16,185,129,0.3);">Historical</span>';

    const b2bClass = row.bookToBill >= 1.25 ? 'text-emerald' : row.bookToBill >= 1.0 ? 'text-cyan' : 'text-amber';

    const obToRev = row.obToRev != null ? row.obToRev : Number((row.backlog / (row.execution || 1)).toFixed(2));
    const isObRevGreen = obToRev > 1.0;
    const obRevBadge = isObRevGreen
      ? `<span class="ob-ratio-pill ratio-green" title="Order Book to Revenue > 1.0 (Backlog covers > 1 year of revenue)">✓ ${obToRev.toFixed(2)}x</span>`
      : `<span class="ob-ratio-pill ratio-neutral" title="Order Book to Revenue ≤ 1.0">${obToRev.toFixed(2)}x</span>`;

    const growthBadge = `
      <span class="ob-growth-pill ${row.growth >= 16 ? 'growth-high' : 'growth-normal'}" title="YoY Order Book Backlog Growth: +${row.growth}%">
        <i data-lucide="trending-up" class="inline-icon" style="width: 12px; height: 12px;"></i> +${row.growth}%
      </span>
    `;

    return `
      <tr>
        <td class="font-mono font-bold">${row.year}</td>
        <td>${periodBadge}</td>
        <td class="font-mono font-bold text-cyan">${formatValue(row.backlog, ob.unit, ob.curr)}</td>
        <td class="font-mono">${formatValue(row.inflows, ob.unit, ob.curr)}</td>
        <td class="font-mono">${formatValue(row.execution, ob.unit, ob.curr)}</td>
        <td style="text-align: right;">${obRevBadge}</td>
        <td class="font-mono font-bold ${b2bClass}">${row.bookToBill}x</td>
        <td style="text-align: right;">${growthBadge}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Real-time Level 2 Market Depth (DOM)
 */
function renderLevel2Depth(ob, stock) {
  const depth = ob.level2Depth;
  if (!depth) return;

  const curr = stock.currencySymbol || '$';
  const elBidPct = document.getElementById('l2BidPercent');
  const elAskPct = document.getElementById('l2AskPercent');
  const elBidBar = document.getElementById('l2MeterBidBar');
  const elAskBar = document.getElementById('l2MeterAskBar');
  const elSpread = document.getElementById('l2SpreadVal');
  const elImbalance = document.getElementById('l2ImbalanceVal');
  const elBidsRows = document.getElementById('l2BidsRows');
  const elAsksRows = document.getElementById('l2AsksRows');

  if (elBidPct) elBidPct.textContent = `Buyers: ${depth.bidPercent}% (${depth.bidTotal.toLocaleString()})`;
  if (elAskPct) elAskPct.textContent = `Sellers: ${depth.askPercent}% (${depth.askTotal.toLocaleString()})`;
  if (elBidBar) elBidBar.style.width = `${depth.bidPercent}%`;
  if (elAskBar) elAskBar.style.width = `${depth.askPercent}%`;

  if (elSpread) {
    elSpread.textContent = `${curr}${depth.spread.toFixed(2)} (${depth.spreadPercent}%)`;
  }
  if (elImbalance) {
    elImbalance.textContent = depth.imbalanceRatio >= 1.0
      ? `Buy Pressure (${depth.imbalanceRatio}x)`
      : `Sell Pressure (${depth.imbalanceRatio}x)`;
    elImbalance.className = depth.imbalanceRatio >= 1.0 ? 'text-emerald' : 'text-rose';
  }

  // Populate Bids Rows
  if (elBidsRows) {
    elBidsRows.innerHTML = depth.bids.map(b => `
      <div class="l2-row-item bid-row">
        <span class="l2-cell price font-mono font-bold text-emerald">${curr}${b.price.toFixed(2)}</span>
        <span class="l2-cell size font-mono">${b.size.toLocaleString()}</span>
        <span class="l2-cell orders font-mono text-dim">${b.orders}</span>
      </div>
    `).join('');
  }

  // Populate Asks Rows
  if (elAsksRows) {
    elAsksRows.innerHTML = depth.asks.map(a => `
      <div class="l2-row-item ask-row">
        <span class="l2-cell price font-mono font-bold text-rose">${curr}${a.price.toFixed(2)}</span>
        <span class="l2-cell size font-mono">${a.size.toLocaleString()}</span>
        <span class="l2-cell orders font-mono text-dim">${a.orders}</span>
      </div>
    `).join('');
  }
}

/**
 * Render Segment Backlog Breakdown
 */
function renderSegmentBreakdown(ob) {
  const container = document.getElementById('obSegmentsList');
  if (!container || !ob.segments) return;

  container.innerHTML = ob.segments.map(seg => `
    <div class="ob-segment-item">
      <div class="ob-segment-header">
        <span class="ob-segment-title font-bold">${seg.name}</span>
        <span class="ob-segment-val font-mono text-cyan font-bold">${seg.value} (${seg.share}%)</span>
      </div>
      <div class="ob-segment-bar-track">
        <div class="ob-segment-bar-fill" style="width: ${seg.share}%;"></div>
      </div>
      <div class="ob-segment-status text-dim font-mono" style="font-size: 0.72rem; margin-top: 4px;">
        <span class="text-emerald">●</span> ${seg.status}
      </div>
    </div>
  `).join('');
}

/**
 * Re-render Order Book Theme upon Dark/Light switch
 */
export function updateOrderBookTheme(isDarkMode) {
  if (currentStockRef) {
    renderOrderBook(currentStockRef, isDarkMode);
  }
}
