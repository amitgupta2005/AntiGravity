/**
 * ApexQuant Terminal — All Sectors Dashboard
 * Provides comprehensive sector-level performance tracking across Global, US,
 * and NSE Indian markets, sorted descending by Year-To-Date (YTD) performance.
 */

import { Chart } from 'chart.js';
import { getThemeColors } from './charts.js';

let sectorsChartInstance = null;
let currentSortMode = 'ytd_desc';
let currentMarketFilter = 'ALL';

/**
 * Standard Sector Benchmark Universe with verified YTD performance metrics
 */
export const SECTORS_DATA = [
  {
    id: 'semi',
    name: 'Semiconductors & AI Hardware',
    icon: 'cpu',
    market: 'ALL',
    ytd: 64.8,
    m1: 8.4,
    y1: 94.2,
    mcap: '$4.85T',
    avgPe: 38.2,
    avgGrowth: 42.5,
    breadth: 92,
    description: 'Hyperscale AI accelerator silicon, HBM memory, foundry capacity & wafer fabrication.',
    leaders: [
      { ticker: 'NVDA', name: 'NVIDIA Corp', ytd: 148.2, isINR: false },
      { ticker: 'AVGO', name: 'Broadcom Inc', ytd: 58.4, isINR: false },
      { ticker: 'TSM', name: 'Taiwan Semiconductor', ytd: 72.1, isINR: false },
      { ticker: 'AMD', name: 'Advanced Micro Devices', ytd: 22.5, isINR: false }
    ]
  },
  {
    id: 'defense',
    name: 'Defense, Aerospace & Capital Goods',
    icon: 'shield',
    market: 'ALL',
    ytd: 48.5,
    m1: 6.2,
    y1: 74.8,
    mcap: '$840B',
    avgPe: 34.1,
    avgGrowth: 28.4,
    breadth: 88,
    description: 'Indigenous defense modernization, avionics, radar systems, combat aircraft & heavy engineering.',
    leaders: [
      { ticker: 'BEL.NS', name: 'Bharat Electronics', ytd: 82.4, isINR: true },
      { ticker: 'HAL.NS', name: 'Hindustan Aeronautics', ytd: 69.1, isINR: true },
      { ticker: 'LT.NS', name: 'Larsen & Toubro', ytd: 34.5, isINR: true },
      { ticker: 'RTX', name: 'RTX Corporation', ytd: 28.4, isINR: false }
    ]
  },
  {
    id: 'power',
    name: 'Power, Renewable Utilities & Clean Energy',
    icon: 'zap',
    market: 'ALL',
    ytd: 42.3,
    m1: 5.8,
    y1: 62.4,
    mcap: '$620B',
    avgPe: 26.5,
    avgGrowth: 24.8,
    breadth: 85,
    description: 'Solar EPC, grid transformation, pumped hydro, battery storage & nuclear energy utility expansion.',
    leaders: [
      { ticker: 'TATAPOWER.NS', name: 'Tata Power Company', ytd: 68.2, isINR: true },
      { ticker: 'NTPC.NS', name: 'NTPC Limited', ytd: 52.1, isINR: true },
      { ticker: 'CEG', name: 'Constellation Energy', ytd: 78.4, isINR: false },
      { ticker: 'VST', name: 'Vistra Corp', ytd: 94.2, isINR: false }
    ]
  },
  {
    id: 'cloud_ai',
    name: 'Internet, Cloud Software & Generative AI',
    icon: 'activity',
    market: 'ALL',
    ytd: 35.6,
    m1: 4.5,
    y1: 48.2,
    mcap: '$7.12T',
    avgPe: 29.4,
    avgGrowth: 26.2,
    breadth: 84,
    description: 'Hyperscale cloud infra, LLM foundation models, enterprise SaaS & sovereign AI infrastructure.',
    leaders: [
      { ticker: 'META', name: 'Meta Platforms', ytd: 62.4, isINR: false },
      { ticker: 'GOOGL', name: 'Alphabet Inc', ytd: 32.8, isINR: false },
      { ticker: 'AMZN', name: 'Amazon.com', ytd: 28.5, isINR: false },
      { ticker: 'MSFT', name: 'Microsoft Corp', ytd: 21.2, isINR: false }
    ]
  },
  {
    id: 'auto_mobility',
    name: 'Automotive, Electric Vehicles & Mobility',
    icon: 'compass',
    market: 'ALL',
    ytd: 26.4,
    m1: 3.1,
    y1: 38.6,
    mcap: '$1.45T',
    avgPe: 22.8,
    avgGrowth: 21.5,
    breadth: 75,
    description: 'Next-gen EV platforms, autonomous driving, commercial fleets & utility vehicle manufacturing.',
    leaders: [
      { ticker: 'TATAMOTORS.NS', name: 'Tata Motors', ytd: 46.2, isINR: true },
      { ticker: 'M&M.NS', name: 'Mahindra & Mahindra', ytd: 58.1, isINR: true },
      { ticker: 'TSLA', name: 'Tesla Inc', ytd: 28.4, isINR: false },
      { ticker: 'MARUTI.NS', name: 'Maruti Suzuki', ytd: 18.7, isINR: true }
    ]
  },
  {
    id: 'bfsi',
    name: 'Banking & Financial Services (BFSI)',
    icon: 'pie-chart',
    market: 'ALL',
    ytd: 19.2,
    m1: 2.8,
    y1: 26.4,
    mcap: '$3.20T',
    avgPe: 16.2,
    avgGrowth: 16.4,
    breadth: 78,
    description: 'Retail & corporate credit expansion, asset management, payment rails & investment banking.',
    leaders: [
      { ticker: 'ICICIBANK.NS', name: 'ICICI Bank', ytd: 24.5, isINR: true },
      { ticker: 'SBIN.NS', name: 'State Bank of India', ytd: 31.2, isINR: true },
      { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', ytd: 11.8, isINR: true },
      { ticker: 'JPM', name: 'JPMorgan Chase', ytd: 28.4, isINR: false }
    ]
  },
  {
    id: 'it_services',
    name: 'IT Software & Platform Engineering',
    icon: 'code',
    market: 'ALL',
    ytd: 14.8,
    m1: 1.9,
    y1: 22.1,
    mcap: '$1.95T',
    avgPe: 25.3,
    avgGrowth: 15.2,
    breadth: 70,
    description: 'Global enterprise digital transformation, cloud migrations, legacy modernization & consulting.',
    leaders: [
      { ticker: 'TCS.NS', name: 'Tata Consultancy Services', ytd: 16.4, isINR: true },
      { ticker: 'INFY.NS', name: 'Infosys Limited', ytd: 18.2, isINR: true },
      { ticker: 'WIPRO.NS', name: 'Wipro Limited', ytd: 12.1, isINR: true },
      { ticker: 'CRM', name: 'Salesforce Inc', ytd: 14.6, isINR: false }
    ]
  },
  {
    id: 'healthcare',
    name: 'Healthcare, Biotech & Pharmaceuticals',
    icon: 'shield-check',
    market: 'ALL',
    ytd: 11.5,
    m1: 0.9,
    y1: 19.4,
    mcap: '$2.40T',
    avgPe: 28.6,
    avgGrowth: 14.8,
    breadth: 68,
    description: 'GLP-1 therapeutics, specialty generics, active pharmaceutical ingredients (API) & clinical biotech.',
    leaders: [
      { ticker: 'SUNPHARMA.NS', name: 'Sun Pharma', ytd: 38.2, isINR: true },
      { ticker: 'CIPLA.NS', name: 'Cipla Limited', ytd: 24.1, isINR: true },
      { ticker: 'LLY', name: 'Eli Lilly & Co', ytd: 42.8, isINR: false },
      { ticker: 'NVO', name: 'Novo Nordisk', ytd: 28.5, isINR: false }
    ]
  },
  {
    id: 'consumer_fmcg',
    name: 'Consumer Staples, Retail & FMCG',
    icon: 'layers',
    market: 'ALL',
    ytd: 8.2,
    m1: 0.4,
    y1: 14.8,
    mcap: '$2.85T',
    avgPe: 27.4,
    avgGrowth: 11.2,
    breadth: 62,
    description: 'Household essentials, food products, packaged goods, big-box omnichannel retail & e-grocery.',
    leaders: [
      { ticker: 'ITC.NS', name: 'ITC Limited', ytd: 14.2, isINR: true },
      { ticker: 'HUL.NS', name: 'Hindustan Unilever', ytd: 6.8, isINR: true },
      { ticker: 'WMT', name: 'Walmart Inc', ytd: 34.2, isINR: false },
      { ticker: 'COST', name: 'Costco Wholesale', ytd: 28.1, isINR: false }
    ]
  },
  {
    id: 'energy_oil',
    name: 'Oil, Gas & Energy Infrastructure',
    icon: 'flame',
    market: 'ALL',
    ytd: 5.7,
    m1: -1.2,
    y1: 12.5,
    mcap: '$2.10T',
    avgPe: 14.5,
    avgGrowth: 9.8,
    breadth: 55,
    description: 'Upstream exploration, refining margins, petrochemical downstream & liquefied natural gas pipelines.',
    leaders: [
      { ticker: 'RELIANCE.NS', name: 'Reliance Industries', ytd: 12.4, isINR: true },
      { ticker: 'ONGC.NS', name: 'ONGC Limited', ytd: 28.5, isINR: true },
      { ticker: 'XOM', name: 'Exxon Mobil', ytd: 14.2, isINR: false },
      { ticker: 'CVX', name: 'Chevron Corp', ytd: 4.1, isINR: false }
    ]
  },
  {
    id: 'telecom',
    name: 'Telecommunications & 5G Infrastructure',
    icon: 'radar',
    market: 'ALL',
    ytd: 3.4,
    m1: -0.8,
    y1: 8.2,
    mcap: '$880B',
    avgPe: 18.2,
    avgGrowth: 8.4,
    breadth: 50,
    description: '5G wireless deployments, broadband fiber networks, ARPU growth & digital enterprise connectivity.',
    leaders: [
      { ticker: 'BHARTIARTL.NS', name: 'Bharti Airtel', ytd: 38.5, isINR: true },
      { ticker: 'T', name: 'AT&T Inc', ytd: 18.2, isINR: false },
      { ticker: 'VZ', name: 'Verizon Communications', ytd: 8.4, isINR: false }
    ]
  },
  {
    id: 'realestate',
    name: 'Real Estate & Infrastructure Construction',
    icon: 'building-2',
    market: 'ALL',
    ytd: -2.8,
    m1: -2.4,
    y1: 4.2,
    mcap: '$540B',
    avgPe: 32.0,
    avgGrowth: 6.5,
    breadth: 42,
    description: 'Commercial REITs, logistics warehousing, urban residential townships & high-rise civil construction.',
    leaders: [
      { ticker: 'DLF.NS', name: 'DLF Limited', ytd: 16.2, isINR: true },
      { ticker: 'GODREJPROP.NS', name: 'Godrej Properties', ytd: 12.5, isINR: true },
      { ticker: 'PLD', name: 'Prologis Inc', ytd: -8.4, isINR: false },
      { ticker: 'SPG', name: 'Simon Property Group', ytd: -4.2, isINR: false }
    ]
  }
];

/**
 * Filter & Sort Sectors Data
 * Defaults strictly to YTD Descending as requested
 */
export function getSortedFilteredSectors(sortMode = 'ytd_desc', marketFilter = 'ALL') {
  let list = [...SECTORS_DATA];

  // 1. Filter by Market
  if (marketFilter === 'NSE') {
    list = list.filter(sec => sec.leaders.some(l => l.isINR));
  } else if (marketFilter === 'US') {
    list = list.filter(sec => sec.leaders.some(l => !l.isINR));
  }

  // 2. Sort
  list.sort((a, b) => {
    switch (sortMode) {
      case 'ytd_desc':
        return b.ytd - a.ytd; // Highest positive YTD first
      case 'ytd_asc':
        return a.ytd - b.ytd; // Lowest / negative YTD first
      case 'name_asc':
        return a.name.localeCompare(b.name);
      case 'mcap_desc': {
        const valA = parseFloat(a.mcap.replace(/[$TB]/g, '')) * (a.mcap.includes('T') ? 1000 : 1);
        const valB = parseFloat(b.mcap.replace(/[$TB]/g, '')) * (b.mcap.includes('T') ? 1000 : 1);
        return valB - valA;
      }
      default:
        return b.ytd - a.ytd;
    }
  });

  return list;
}

/**
 * Main Render Function for Sectors Dashboard
 */
export function renderSectorsDashboard(universe, onSelectStock, isDarkMode) {
  const sortedSectors = getSortedFilteredSectors(currentSortMode, currentMarketFilter);
  const colors = getThemeColors(isDarkMode);

  // 1. Update Top Summary Metrics
  updateSectorSummaryCards(sortedSectors);

  // 2. Render Ranked Horizontal Bar Chart
  renderSectorsRankedChart(sortedSectors, colors, isDarkMode);

  // 3. Render Sector Detail Cards Grid
  renderSectorsCardsGrid(sortedSectors, onSelectStock);

  // 4. Setup Controls & Listeners if not already bound
  setupSectorsControls(universe, onSelectStock, isDarkMode);
}

/**
 * Update Top Metric KPI Cards
 */
function updateSectorSummaryCards(sectors) {
  if (!sectors.length) return;

  const ytdSorted = [...sectors].sort((a, b) => b.ytd - a.ytd);
  const leader = ytdSorted[0];
  const laggard = ytdSorted[ytdSorted.length - 1];

  const medianYtd = ytdSorted[Math.floor(ytdSorted.length / 2)].ytd;
  const positiveCount = sectors.filter(s => s.ytd > 0).length;
  const breadthPct = Math.round((positiveCount / sectors.length) * 100);

  const elTopName = document.getElementById('sectorTopName');
  const elTopYtd = document.getElementById('sectorTopYtd');
  const elMedianYtd = document.getElementById('sectorMedianYtd');
  const elMedianSub = document.getElementById('sectorMedianSub');
  const elBreadth = document.getElementById('sectorBreadth');
  const elBreadthSub = document.getElementById('sectorBreadthSub');
  const elLaggardName = document.getElementById('sectorLaggardName');
  const elLaggardYtd = document.getElementById('sectorLaggardYtd');
  const elCountBadge = document.getElementById('sectorCountBadge');

  if (elTopName) elTopName.textContent = leader.name;
  if (elTopYtd) elTopYtd.textContent = `+${leader.ytd}% YTD Leader`;
  if (elMedianYtd) elMedianYtd.textContent = `${medianYtd >= 0 ? '+' : ''}${medianYtd}%`;
  if (elMedianSub) elMedianSub.textContent = `Across ${sectors.length} tracked sectors`;
  if (elBreadth) elBreadth.textContent = `${breadthPct}%`;
  if (elBreadthSub) elBreadthSub.textContent = `${positiveCount} of ${sectors.length} Sectors Positive YTD`;
  if (elLaggardName) elLaggardName.textContent = laggard.name;
  if (elLaggardYtd) {
    elLaggardYtd.textContent = `${laggard.ytd >= 0 ? '+' : ''}${laggard.ytd}% YTD`;
    elLaggardYtd.className = laggard.ytd >= 0 ? 'sector-kpi-sub text-emerald font-bold' : 'sector-kpi-sub text-red font-bold';
  }
  if (elCountBadge) elCountBadge.textContent = `${sectors.length} Sectors Active (Sorted by YTD)`;
}

/**
 * Render Ranked Bar Chart (Chart.js)
 * Visualizes sectors ranked descending by YTD %
 */
function renderSectorsRankedChart(sectors, colors, isDarkMode) {
  const canvas = document.getElementById('sectorsBarChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (sectorsChartInstance) {
    sectorsChartInstance.destroy();
  }

  // Strictly sorted by YTD descending
  const sorted = [...sectors].sort((a, b) => b.ytd - a.ytd);
  const labels = sorted.map(s => s.name);
  const ytdValues = sorted.map(s => s.ytd);

  // Vibrant institutional green for positive (> 0%), Red for negative
  const barColors = sorted.map(s => 
    s.ytd >= 0 
      ? (isDarkMode ? 'rgba(16, 185, 129, 0.85)' : '#059669') 
      : (isDarkMode ? 'rgba(239, 68, 68, 0.85)' : '#dc2626')
  );

  const borderColors = sorted.map(s => 
    s.ytd >= 0 ? '#10b981' : '#ef4444'
  );

  sectorsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'YTD Change (%)',
          data: ytdValues,
          backgroundColor: barColors,
          borderColor: borderColors,
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    },
    plugins: [
      {
        id: 'sectorBarLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          const meta = chart.getDatasetMeta(0);
          if (!meta || !meta.data) return;

          ctx.save();
          ctx.font = 'bold 11px "JetBrains Mono", monospace';

          meta.data.forEach((bar, idx) => {
            const val = ytdValues[idx];
            const text = `${val > 0 ? '+' : ''}${val}%`;
            const xPos = bar.x;
            const yPos = val >= 0 ? bar.y - 6 : bar.y + 14;

            ctx.textAlign = 'center';
            ctx.fillStyle = val >= 0 ? (isDarkMode ? '#10b981' : '#059669') : '#ef4444';
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
        legend: { display: false },
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
              return `${idx + 1}. ${sorted[idx].name}`;
            },
            label: (ctx) => {
              const val = ctx.raw;
              return ` YTD Change: ${val > 0 ? '+' : ''}${val}%`;
            },
            afterBody: (items) => {
              const idx = items[0].dataIndex;
              const s = sorted[idx];
              const leaderList = s.leaders.map(l => `${l.ticker} (+${l.ytd}%)`).join(', ');
              return [
                `1-Month Momentum: ${s.m1 > 0 ? '+' : ''}${s.m1}%`,
                `1-Year Change: +${s.y1}%`,
                `Market Cap: ${s.mcap} • Avg P/E: ${s.avgPe}x`,
                `Top Leaders: ${leaderList}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            maxRotation: 35,
            minRotation: 25,
            font: { family: 'Inter', size: 10, weight: 600 }
          }
        },
        y: {
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            callback: (val) => `${val > 0 ? '+' : ''}${val}%`,
            font: { family: 'JetBrains Mono', size: 10 }
          },
          title: {
            display: true,
            text: 'YTD Return (%)',
            color: colors.textMuted,
            font: { family: 'Inter', size: 11, weight: 600 }
          }
        }
      }
    }
  });
}

/**
 * Render Sector Detail Cards Grid
 */
function renderSectorsCardsGrid(sectors, onSelectStock) {
  const container = document.getElementById('sectorsGridContainer');
  if (!container) return;

  container.innerHTML = sectors.map((sec, idx) => {
    const isPositive = sec.ytd >= 0;
    const ytdBadgeClass = isPositive ? 'sector-ytd-pill ytd-positive' : 'sector-ytd-pill ytd-negative';
    const rankClass = idx === 0 ? 'sector-rank-badge rank-1' : idx === 1 ? 'sector-rank-badge rank-2' : idx === 2 ? 'sector-rank-badge rank-3' : 'sector-rank-badge';

    const stockPillsHtml = sec.leaders.map(stk => `
      <button class="sector-stock-pill" data-ticker="${stk.ticker}" title="Click to analyze ${stk.name}">
        <span class="stk-ticker">${stk.ticker}</span>
        <span class="stk-ytd font-mono">+${stk.ytd}%</span>
      </button>
    `).join('');

    return `
      <div class="sector-card">
        <div class="sector-card-top">
          <div class="sector-card-title-row">
            <span class="${rankClass}">#${idx + 1}</span>
            <div class="sector-card-title-group">
              <h4 class="sector-card-title">${sec.name}</h4>
              <span class="sector-card-desc">${sec.description}</span>
            </div>
          </div>
          <div class="${ytdBadgeClass}">
            <i data-lucide="${isPositive ? 'trending-up' : 'trending-down'}" class="inline-icon" style="width: 14px; height: 14px;"></i>
            <span>${isPositive ? '+' : ''}${sec.ytd}% YTD</span>
          </div>
        </div>

        <div class="sector-metrics-strip">
          <div class="sector-metric-cell">
            <span class="cell-label">1-Month</span>
            <span class="cell-val ${sec.m1 >= 0 ? 'text-emerald' : 'text-red'}">${sec.m1 >= 0 ? '+' : ''}${sec.m1}%</span>
          </div>
          <div class="sector-metric-cell">
            <span class="cell-label">1-Year</span>
            <span class="cell-val text-cyan">+${sec.y1}%</span>
          </div>
          <div class="sector-metric-cell">
            <span class="cell-label">Market Cap</span>
            <span class="cell-val text-main font-mono">${sec.mcap}</span>
          </div>
          <div class="sector-metric-cell">
            <span class="cell-label">Avg P/E</span>
            <span class="cell-val text-amber font-mono">${sec.avgPe}x</span>
          </div>
          <div class="sector-metric-cell">
            <span class="cell-label">Breadth</span>
            <span class="cell-val text-blue font-mono">${sec.breadth}% Green</span>
          </div>
        </div>

        <div class="sector-breadth-track">
          <div class="sector-breadth-fill" style="width: ${sec.breadth}%;"></div>
        </div>

        <div class="sector-leaders-section">
          <span class="leaders-label">Top Constituent Leaders (Click to Analyze):</span>
          <div class="sector-leaders-chips">
            ${stockPillsHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach click listener for each stock pill
  container.querySelectorAll('.sector-stock-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const ticker = btn.getAttribute('data-ticker');
      if (ticker && onSelectStock) {
        onSelectStock(ticker);
      }
    });
  });
}

/**
 * Setup Controls for Toolbar (Filter & Sort)
 */
let controlsInitialized = false;
function setupSectorsControls(universe, onSelectStock, isDarkMode) {
  if (controlsInitialized) return;
  controlsInitialized = true;

  // 1. Sort Selector
  const sortSelect = document.getElementById('sectorSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSortMode = e.target.value;
      renderSectorsDashboard(universe, onSelectStock, isDarkMode);
    });
  }

  // 2. Filter Chips
  const filterChips = document.querySelectorAll('.sectors-toolbar .filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentMarketFilter = chip.getAttribute('data-market-filter') || 'ALL';
      renderSectorsDashboard(universe, onSelectStock, isDarkMode);
    });
  });
}
