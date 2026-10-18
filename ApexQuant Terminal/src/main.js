import {
  createIcons,
  LineChart,
  Search,
  PlusCircle,
  Sun,
  Moon,
  Cpu,
  TrendingUp,
  Activity,
  Compass,
  Percent,
  FileSpreadsheet,
  Grid,
  Newspaper,
  Radar,
  Calculator,
  CandlestickChart,
  BarChart3,
  Sliders,
  RotateCcw,
  Code,
  ShieldCheck,
  Layers,
  Clock,
  CheckCircle2,
  ArrowRight,
  Check,
  PieChart,
  Calendar,
  RefreshCw,
  Zap,
  X,
  ArrowDownUp,
  BookOpen,
  ListOrdered,
  BarChart2,
  LayoutGrid,
  Award,
  TrendingDown,
  Building2,
  Flame,
  Shield,
  Filter,
  Sparkles,
  ChevronDown,
  Anchor
} from 'lucide';

import { STOCKS_DATA } from './data/stocks.js';
import {
  calculatePEG,
  calculatePeterLynchFairValue,
  calculateProjectedReturn,
  calculateScenarios,
  generateSensitivityMatrix,
  calculateQuantScore
} from './quant/engine.js';
import { updateAllCharts } from './components/charts.js';
import { renderNewsFeed } from './components/news.js';
import { renderOrderBook, updateOrderBookTheme } from './components/orderbook.js';
import { renderSectorsDashboard } from './components/sectors.js';
import { renderBigSharksView, updateSharkChartTheme, getOrGenerateSharkData } from './components/sharks.js';
import { renderScreenerTable, setupScreenerControls } from './components/screener.js';
import { setupCustomStockModal } from './components/customStockModal.js';
import { 
  fetchLiveStockData, 
  searchYahooStocks, 
  fetchAllUniverseQuotes, 
  resolveTickerSymbol, 
  sanitizeSearchQuery 
} from './services/yahooFinance.js';

// Application State
const state = {
  universe: { ...STOCKS_DATA },
  currentTicker: 'NVDA',
  isDarkMode: true,
  newsFilter: 'ALL',
  isLoadingRealtime: false,
  customModelParams: {
    growth: 34.5,
    pe: 33.3,
    years: 3
  }
};

/**
 * Initialize Lucide Icons
 */
function refreshIcons() {
  createIcons({
    icons: {
      LineChart,
      Search,
      PlusCircle,
      Sun,
      Moon,
      Cpu,
      TrendingUp,
      Activity,
      Compass,
      Percent,
      FileSpreadsheet,
      Grid,
      Newspaper,
      Radar,
      Calculator,
      CandlestickChart,
      BarChart3,
      Sliders,
      RotateCcw,
      Code,
      ShieldCheck,
      Layers,
      Clock,
      CheckCircle2,
      ArrowRight,
      Check,
      PieChart,
      Calendar,
      RefreshCw,
      Zap,
      X,
      ArrowDownUp,
      BookOpen,
      ListOrdered,
      BarChart2,
      LayoutGrid,
      Award,
      TrendingDown,
      Building2,
      Flame,
      Shield,
      Filter,
      Sparkles,
      ChevronDown,
      Anchor
    }
  });
}
window.refreshIcons = refreshIcons;

/**
 * Theme Engine: Toggle between Dark and Light mode
 */
function setupThemeEngine() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const sunIcon = document.getElementById('themeIconSun');
  const moonIcon = document.getElementById('themeIconMoon');
  const toggleText = document.getElementById('themeToggleText');

  const savedTheme = localStorage.getItem('apexquant_theme');
  if (savedTheme === 'light') {
    state.isDarkMode = false;
  } else {
    state.isDarkMode = true;
  }

  const applyTheme = (isDark) => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (isDark) {
      sunIcon.style.display = 'inline-block';
      moonIcon.style.display = 'none';
      toggleText.textContent = 'Light Mode';
    } else {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'inline-block';
      toggleText.textContent = 'Dark Mode';
    }
    localStorage.setItem('apexquant_theme', isDark ? 'dark' : 'light');
    
    const currentStock = state.universe[state.currentTicker];
    if (currentStock) {
      updateAllCharts(currentStock, isDark);
      updateOrderBookTheme(isDark);
      updateSharkChartTheme(isDark);
    }

    const isSectorsActive = document.getElementById('tab-sectors')?.classList.contains('active');
    if (isSectorsActive) {
      renderSectorsDashboard(state.universe, (t) => {
        if (window.exitSectorDashboard) window.exitSectorDashboard('tab-return-model');
        loadStockRealtime(t);
      }, isDark);
    }
  };

  applyTheme(state.isDarkMode);

  toggleBtn.addEventListener('click', () => {
    state.isDarkMode = !state.isDarkMode;
    applyTheme(state.isDarkMode);
    refreshIcons();
  });
}

/**
 * Tab Navigation Controller
 */
function setupTabNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const topNavSectorBtn = document.getElementById('topNavSectorDashboardBtn');
  const exitSectorBtn = document.getElementById('exitSectorDashboardBtn');

  let previousStockTabId = 'tab-return-model';

  const handleStockSelectionFromSector = (ticker) => {
    exitSectorDashboard('tab-return-model');
    loadStockRealtime(ticker);
  };

  const openSectorDashboard = () => {
    // Save currently active stock tab so user returns to it seamlessly
    const activeStockBtn = document.querySelector('.nav-tabs .tab-btn.active');
    if (activeStockBtn) {
      const activeId = activeStockBtn.getAttribute('data-tab');
      if (activeId && activeId !== 'tab-sectors') {
        previousStockTabId = activeId;
      }
    }

    // Enter Sector Dashboard Full-View Mode (Hides Stock Card & Nav Tabs)
    document.body.classList.add('view-sector-dashboard');

    tabBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    tabPanes.forEach(p => p.classList.remove('active'));

    const sectorsPane = document.getElementById('tab-sectors');
    if (sectorsPane) {
      sectorsPane.classList.add('active');
    }
    if (topNavSectorBtn) {
      topNavSectorBtn.classList.add('active');
    }

    // Update exit button label with active stock ticker
    const exitLabel = document.getElementById('exitSectorDashboardLabel');
    if (exitLabel && state.currentTicker) {
      exitLabel.textContent = `Back to Stock Terminal (${state.currentTicker})`;
    }

    renderSectorsDashboard(state.universe, handleStockSelectionFromSector, state.isDarkMode);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshIcons();
  };

  const exitSectorDashboard = (targetTabId = null) => {
    // Exit Sector Dashboard Mode (Unhides Stock Card & Nav Tabs)
    document.body.classList.remove('view-sector-dashboard');

    if (topNavSectorBtn) {
      topNavSectorBtn.classList.remove('active');
    }

    const sectorsPane = document.getElementById('tab-sectors');
    if (sectorsPane) {
      sectorsPane.classList.remove('active');
    }

    const tabToActivate = targetTabId || previousStockTabId || 'tab-return-model';
    const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabToActivate}"]`) || document.querySelector('.tab-btn[data-tab="tab-return-model"]');
    if (targetBtn) {
      targetBtn.click();
    } else {
      const pane = document.getElementById(tabToActivate);
      if (pane) pane.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshIcons();
  };

  // Expose methods globally for seamless transitions
  window.openSectorDashboard = openSectorDashboard;
  window.exitSectorDashboard = exitSectorDashboard;

  if (topNavSectorBtn) {
    topNavSectorBtn.addEventListener('click', () => {
      if (document.body.classList.contains('view-sector-dashboard')) {
        exitSectorDashboard();
      } else {
        openSectorDashboard();
      }
    });
  }

  if (exitSectorBtn) {
    exitSectorBtn.addEventListener('click', () => {
      exitSectorDashboard();
    });
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      // Clicking any stock tab exits Sector Dashboard mode
      if (document.body.classList.contains('view-sector-dashboard')) {
        document.body.classList.remove('view-sector-dashboard');
      }
      if (topNavSectorBtn) {
        topNavSectorBtn.classList.remove('active');
      }

      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      previousStockTabId = targetId;

      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
      }

      if (targetId === 'tab-sectors') {
        openSectorDashboard();
      } else {
        const stock = state.universe[state.currentTicker];
        if (stock) {
          if (targetId === 'tab-technicals' || targetId === 'tab-fundamentals') {
            updateAllCharts(stock, state.isDarkMode);
          } else if (targetId === 'tab-orderbook') {
            renderOrderBook(stock, state.isDarkMode);
          } else if (targetId === 'tab-big-sharks') {
            renderBigSharksView(stock, state.isDarkMode, (t) => {
              loadStockRealtime(t);
            });
          } else if (targetId === 'tab-sensitivity') {
            updateReturnModel(stock);
          } else if (targetId === 'tab-news') {
            renderNewsFeed(stock, state.newsFilter);
          } else if (targetId === 'tab-screener') {
            renderScreenerTable(state.universe, (t) => {
              loadStockRealtime(t);
              document.querySelector('.tab-btn[data-tab="tab-return-model"]')?.click();
            }, state.currentTicker);
          }
        }
      }

      refreshIcons();
    });
  });

  const heroSharkTag = document.getElementById('heroSharkActivityTag');
  if (heroSharkTag) {
    heroSharkTag.addEventListener('click', () => {
      const sharkTabBtn = document.querySelector('.tab-btn[data-tab="tab-big-sharks"]');
      if (sharkTabBtn) sharkTabBtn.click();
    });
  }
}

/**
 * Render Stock Hero Banner & Key Metrics
 */
function renderStockHero(stock) {
  const currentDateStr = stock.lastUpdatedDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isINR = stock.ticker.endsWith('.NS') || stock.currency === 'INR' || stock.exchange === 'NSE';
  const curr = stock.currencySymbol || (isINR ? '₹' : '$');

  document.getElementById('heroTicker').textContent = stock.ticker;
  document.getElementById('heroExchange').textContent = stock.exchange;
  document.getElementById('heroName').textContent = stock.name;
  document.getElementById('heroSector').innerHTML = `<i data-lucide="cpu" class="inline-icon"></i> ${stock.sector}`;
  document.getElementById('heroMarketCap').textContent = `Cap: ${stock.marketCap}`;
  document.getElementById('heroBeta').textContent = `Beta: ${stock.beta}`;
  document.getElementById('hero52Range').textContent = `52W Range: ${curr}${stock.week52Low.toFixed(2)} - ${curr}${stock.week52High.toFixed(2)}`;

  const exitLabel = document.getElementById('exitSectorDashboardLabel');
  if (exitLabel) {
    exitLabel.textContent = `Back to Stock Terminal (${stock.ticker})`;
  }

  const sessionStatus = document.getElementById('heroSessionStatus');
  if (sessionStatus) {
    if (stock.isMarketOpen) {
      sessionStatus.className = 'session-status-badge text-emerald';
      sessionStatus.innerHTML = `<i data-lucide="activity" class="inline-icon"></i> ${stock.marketSession || 'Market Open'}`;
    } else {
      sessionStatus.className = 'session-status-badge text-amber';
      sessionStatus.innerHTML = `<i data-lucide="clock" class="inline-icon"></i> ${stock.marketSession || 'Market Closed'}`;
    }
  }

  const heroSharkTag = document.getElementById('heroSharkActivityTag');
  const heroSharkText = document.getElementById('heroSharkActivityText');
  if (heroSharkTag && heroSharkText) {
    const sharkData = getOrGenerateSharkData(stock);
    const isAdding = sharkData.convictionScore >= 70;
    const isTrimming = sharkData.convictionScore < 45;
    heroSharkTag.className = `hero-shark-pill ${isAdding ? 'shark-pill-bull' : isTrimming ? 'shark-pill-bear' : 'shark-pill-neutral'}`;
    heroSharkText.textContent = `Whales: ${sharkData.sentiment}`;
  }

  document.getElementById('heroPrice').textContent = `${curr}${stock.price.toFixed(2)}`;

  const isPositive = stock.change >= 0;
  const changePill = document.getElementById('heroChangePill');
  changePill.className = `price-change-pill ${isPositive ? 'badge-strong-buy' : 'badge-sell'}`;
  document.getElementById('heroChange').textContent = `${isPositive ? '+' : ''}${curr}${stock.change.toFixed(2)} (${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%)`;

  // Quant Multi-Factor Rating
  const quant = calculateQuantScore(stock);
  document.getElementById('heroQuantScore').textContent = quant.totalScore;
  const ratingEl = document.getElementById('heroQuantRating');
  ratingEl.textContent = `${quant.rating} (Score: ${quant.totalScore}/100)`;
  ratingEl.className = `rating-verdict ${quant.totalScore >= 70 ? 'text-emerald' : quant.totalScore >= 50 ? 'text-amber' : 'text-rose'}`;

  // PEG Banner
  const peg = stock.pegRatio || calculatePEG(stock.peForward, stock.projectedEPSGrowth);
  const pegBanner = document.getElementById('heroPegBanner');
  const pegRatioEl = document.getElementById('heroPegRatio');
  const pegStatusEl = document.getElementById('heroPegStatus');
  const pegDetailEl = document.getElementById('heroPegDetail');

  pegRatioEl.textContent = peg.toFixed(2);
  if (peg < 1.0) {
    pegBanner.className = 'peg-highlight-banner';
    pegStatusEl.textContent = '★ PEG < 1.0 GARP DETECTED (High Margin of Safety)';
    pegDetailEl.textContent = `P/E (${stock.peForward.toFixed(1)}x) trades below annual EPS growth (${stock.projectedEPSGrowth.toFixed(1)}%), satisfying Peter Lynch GARP criteria.`;
  } else {
    pegBanner.className = 'peg-highlight-banner not-garp';
    pegStatusEl.textContent = 'PEG ≥ 1.0 (Growth Fully Priced In)';
    pegDetailEl.textContent = `Forward P/E (${stock.peForward.toFixed(1)}x) exceeds annual projected EPS growth rate (${stock.projectedEPSGrowth.toFixed(1)}%).`;
  }

  // Quick Metrics
  document.getElementById('metricTtmEPS').textContent = `${curr}${stock.ttmEPS.toFixed(2)}`;
  document.getElementById('metricForwardEPS').textContent = `${curr}${stock.forwardEPS.toFixed(2)}`;
  document.getElementById('metricEpsGrowth').textContent = `+${stock.projectedEPSGrowth.toFixed(1)}%`;
  document.getElementById('metricForwardPE').textContent = `${stock.peForward.toFixed(1)}x`;
  document.getElementById('metricOpMargin').textContent = `${stock.operatingMargin.toFixed(1)}%`;
  document.getElementById('metricROE').textContent = `${stock.roe.toFixed(1)}%`;
  document.getElementById('metricDebtEquity').textContent = stock.debtToEquity.toFixed(2);
  document.getElementById('metricRSI').textContent = stock.rsi14.toFixed(1);

  // Technical Details Tab
  document.getElementById('techCrossStatus').textContent = stock.sma50 > stock.sma200 ? 'Golden Cross Active (50 > 200 SMA)' : 'Consolidation / Death Cross';
  document.getElementById('techTrendSummary').textContent = stock.technicalTrend;
  document.getElementById('techResistanceVal').textContent = `${curr}${stock.resistance.toFixed(2)}`;
  document.getElementById('techSupportVal').textContent = `${curr}${stock.support.toFixed(2)}`;
  document.getElementById('techMacdVal').textContent = `${stock.macd.hist >= 0 ? '+' : ''}${stock.macd.hist.toFixed(2)} (${stock.macd.hist >= 0 ? 'Bullish' : 'Bearish'} Divergence)`;
  document.getElementById('rsiCurrentValue').textContent = `${stock.rsi14.toFixed(1)} (${stock.rsi14 > 70 ? 'Overbought' : stock.rsi14 < 35 ? 'Oversold' : 'Healthy Momentum'})`;

  // Fundamentals Tab Details - Synchronized with Selected Stock
  const fundTicker = document.getElementById('fundamentalsStockTicker');
  const fundName = document.getElementById('fundamentalsStockName');
  const fundDate = document.getElementById('fundamentalsCurrentDate');
  const marginsTicker = document.getElementById('marginsStockTicker');

  if (fundTicker) fundTicker.textContent = stock.ticker;
  if (fundName) fundName.textContent = stock.name;
  if (fundDate) fundDate.textContent = currentDateStr;
  if (marginsTicker) marginsTicker.textContent = stock.ticker;

  document.getElementById('fundRevenue').textContent = stock.ttmRevenue;
  document.getElementById('fundNetIncome').textContent = stock.netIncome;
  document.getElementById('fundFCF').textContent = stock.freeCashFlow;
  document.getElementById('fundEvEbitda').textContent = `${stock.evEbitda.toFixed(1)}x`;
  document.getElementById('fundPriceSales').textContent = `${stock.priceToSales.toFixed(1)}x`;

  // Sensitivity Tab Synchronized with Selected Stock
  const sensTicker = document.getElementById('sensitivityStockTicker');
  const sensSub = document.getElementById('sensitivityStockSub');
  const sensDate = document.getElementById('sensitivityCurrentDate');

  if (sensTicker) sensTicker.textContent = stock.ticker;
  if (sensSub) sensSub.textContent = stock.ticker;
  if (sensDate) sensDate.textContent = currentDateStr;

  // News Tab Synchronized with Selected Stock
  const newsTicker = document.getElementById('newsStockTicker');
  if (newsTicker) newsTicker.textContent = stock.ticker;
}

/**
 * Render Interactive Valuation & Return Model for Selected Stock
 */
function updateReturnModel(stock) {
  const growth = state.customModelParams.growth;
  const pe = state.customModelParams.pe;
  const years = state.customModelParams.years;
  const isINR = stock.ticker.endsWith('.NS') || stock.currency === 'INR' || stock.exchange === 'NSE';
  const curr = stock.currencySymbol || (isINR ? '₹' : '$');

  // Base calculation with selected stock's real-time price
  const result = calculateProjectedReturn({
    currentPrice: stock.price,
    baseEPS: stock.forwardEPS,
    annualGrowthPercent: growth,
    exitPE: pe,
    years
  });

  // KPI display
  const cagrEl = document.getElementById('kpiReturnCAGR');
  cagrEl.textContent = `${result.cagr >= 0 ? '+' : ''}${result.cagr.toFixed(1)}%`;
  cagrEl.className = `return-kpi-val ${result.cagr >= 15 ? 'text-emerald' : result.cagr >= 0 ? 'text-cyan' : 'text-rose'}`;

  document.getElementById('kpiReturnHorizon').textContent = `Over ${years}-Year Investment Horizon`;
  document.getElementById('kpiTargetPrice').textContent = `${curr}${result.targetPrice.toFixed(2)}`;
  document.getElementById('kpiTotalGain').textContent = `${result.dollarGain >= 0 ? '+' : ''}${curr}${result.dollarGain.toFixed(2)} (${result.totalReturn >= 0 ? '+' : ''}${result.totalReturn.toFixed(1)}%)`;
  document.getElementById('kpiProjectedEPS').textContent = `${curr}${result.projectedEPS.toFixed(2)}`;
  document.getElementById('kpiBaseEPS').textContent = `Compounded from FY1 ${curr}${stock.forwardEPS.toFixed(2)} Base`;

  // Peter Lynch Model for selected stock
  const lynch = calculatePeterLynchFairValue(stock.forwardEPS, growth, stock.price);
  document.getElementById('lynchFairPrice').textContent = `${curr}${lynch.fairValue.toFixed(2)}`;
  document.getElementById('lynchCurrentPrice').textContent = `${curr}${stock.price.toFixed(2)}`;

  const lynchMargin = document.getElementById('lynchMarginSafety');
  lynchMargin.textContent = `${lynch.marginOfSafety >= 0 ? '+' : ''}${lynch.marginOfSafety.toFixed(1)}%`;
  lynchMargin.className = `lynch-stat-val ${lynch.isUndervalued ? 'text-emerald' : 'text-rose'}`;

  const lynchText = document.getElementById('lynchExplanationText');
  if (lynch.isUndervalued) {
    lynchText.innerHTML = `<strong>★ Peter Lynch Value Bargain (${stock.ticker}):</strong> Fair value of ${curr}${lynch.fairValue.toFixed(2)} exceeds current real-time price of ${curr}${stock.price.toFixed(2)}, providing an estimated <strong>${lynch.marginOfSafety}% margin of safety</strong> based on a ${lynch.fairMultiple}x fair multiple.`;
  } else {
    lynchText.innerHTML = `Current price of ${curr}${stock.price.toFixed(2)} for ${stock.ticker} trades above Peter Lynch baseline fair value of ${curr}${lynch.fairValue.toFixed(2)}. Valuation incorporates a growth premium.`;
  }

  // 3-Scenario Stress Test Matrix for selected stock
  const scenarios = calculateScenarios({
    currentPrice: stock.price,
    baseEPS: stock.forwardEPS,
    growthBase: growth,
    peBase: pe,
    years
  });

  document.getElementById('scenBearGrowth').textContent = `${scenarios.bear.growth.toFixed(1)}%`;
  document.getElementById('scenBearPE').textContent = `${scenarios.bear.exitPE.toFixed(1)}x`;
  document.getElementById('scenBearTarget').textContent = `${curr}${scenarios.bear.targetPrice.toFixed(2)}`;
  const bearCagrEl = document.getElementById('scenBearCAGR');
  bearCagrEl.textContent = `${scenarios.bear.cagr >= 0 ? '+' : ''}${scenarios.bear.cagr.toFixed(1)}%`;
  bearCagrEl.className = `font-mono ${scenarios.bear.cagr >= 0 ? 'text-emerald' : 'text-rose'}`;

  document.getElementById('scenBaseGrowth').textContent = `${scenarios.base.growth.toFixed(1)}%`;
  document.getElementById('scenBasePE').textContent = `${scenarios.base.exitPE.toFixed(1)}x`;
  document.getElementById('scenBaseTarget').textContent = `${curr}${scenarios.base.targetPrice.toFixed(2)}`;
  const baseCagrEl = document.getElementById('scenBaseCAGR');
  baseCagrEl.textContent = `${scenarios.base.cagr >= 0 ? '+' : ''}${scenarios.base.cagr.toFixed(1)}%`;
  baseCagrEl.className = `font-mono ${scenarios.base.cagr >= 0 ? 'text-emerald' : 'text-rose'}`;

  document.getElementById('scenBullGrowth').textContent = `${scenarios.bull.growth.toFixed(1)}%`;
  document.getElementById('scenBullPE').textContent = `${scenarios.bull.exitPE.toFixed(1)}x`;
  document.getElementById('scenBullTarget').textContent = `${curr}${scenarios.bull.targetPrice.toFixed(2)}`;
  const bullCagrEl = document.getElementById('scenBullCAGR');
  bullCagrEl.textContent = `${scenarios.bull.cagr >= 0 ? '+' : ''}${scenarios.bull.cagr.toFixed(1)}%`;
  bullCagrEl.className = `font-mono ${scenarios.bull.cagr >= 0 ? 'text-emerald' : 'text-rose'}`;

  document.getElementById('scenWeightedCAGR').textContent = `${scenarios.weightedCAGR >= 0 ? '+' : ''}${scenarios.weightedCAGR.toFixed(1)}%`;

  // Render 2D Sensitivity Heatmap for selected stock
  renderSensitivityMatrix(stock, growth, pe, years);
}

/**
 * Render 2D Sensitivity Matrix Heatmap for Selected Stock
 */
function renderSensitivityMatrix(stock, growthBase, peBase, years) {
  const isINR = stock.ticker.endsWith('.NS') || stock.currency === 'INR' || stock.exchange === 'NSE';
  const curr = stock.currencySymbol || (isINR ? '₹' : '$');

  const matrix = generateSensitivityMatrix({
    currentPrice: stock.price,
    baseEPS: stock.forwardEPS,
    growthBase,
    peBase,
    years
  });

  const table = document.getElementById('sensitivityTable');
  if (!table) return;

  let html = '<thead><tr><th>EPS Growth \\ Exit P/E</th>';
  for (const pe of matrix.peHeaders) {
    html += `<th>${pe.toFixed(1)}x</th>`;
  }
  html += '</tr></thead><tbody>';

  for (const row of matrix.rows) {
    html += `<tr><td class="font-mono font-bold text-cyan">+${row.growth.toFixed(1)}%</td>`;
    for (const cell of row.cells) {
      let colorClass = 'cell-neutral';
      if (cell.cagr >= 25) colorClass = 'cell-high-green';
      else if (cell.cagr >= 10) colorClass = 'cell-mid-green';
      else if (cell.cagr < 0) colorClass = 'cell-negative';

      const baseHighlight = cell.isBase ? 'base-highlight' : '';
      const cagrFmt = `${cell.cagr >= 0 ? '+' : ''}${cell.cagr.toFixed(1)}%`;

      html += `
        <td class="sensitivity-cell ${colorClass} ${baseHighlight}" title="Target: ${curr}${cell.targetPrice.toFixed(2)} for ${stock.ticker}">
          ${cagrFmt}
        </td>
      `;
    }
    html += '</tr>';
  }
  html += '</tbody>';
  table.innerHTML = html;
}

/**
 * Setup Sliders and Inputs
 */
function setupModelSliders() {
  const sliderGrowth = document.getElementById('sliderGrowth');
  const sliderPE = document.getElementById('sliderPE');
  const sliderYears = document.getElementById('sliderYears');

  const valGrowth = document.getElementById('sliderValGrowth');
  const valPE = document.getElementById('sliderValPE');
  const valYears = document.getElementById('sliderValYears');

  const resetBtn = document.getElementById('resetSlidersBtn');

  const onSliderChange = () => {
    state.customModelParams.growth = parseFloat(sliderGrowth.value);
    state.customModelParams.pe = parseFloat(sliderPE.value);
    state.customModelParams.years = parseInt(sliderYears.value, 10);

    valGrowth.textContent = `${state.customModelParams.growth.toFixed(1)}%`;
    valPE.textContent = `${state.customModelParams.pe.toFixed(1)}x`;
    valYears.textContent = `${state.customModelParams.years} Year${state.customModelParams.years > 1 ? 's' : ''}`;

    const stock = state.universe[state.currentTicker];
    if (stock) {
      updateReturnModel(stock);
    }
  };

  [sliderGrowth, sliderPE, sliderYears].forEach(s => {
    s.addEventListener('input', onSliderChange);
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const stock = state.universe[state.currentTicker];
      if (!stock) return;

      sliderGrowth.value = stock.projectedEPSGrowth;
      sliderPE.value = stock.peForward;
      sliderYears.value = 3;

      onSliderChange();
    });
  }
}

/**
 * Sync Slider controls with selected stock
 */
function syncSlidersToStock(stock) {
  const sliderGrowth = document.getElementById('sliderGrowth');
  const sliderPE = document.getElementById('sliderPE');
  const sliderYears = document.getElementById('sliderYears');

  sliderGrowth.value = stock.projectedEPSGrowth;
  sliderPE.value = stock.peForward;
  sliderYears.value = 3;

  state.customModelParams.growth = stock.projectedEPSGrowth;
  state.customModelParams.pe = stock.peForward;
  state.customModelParams.years = 3;

  document.getElementById('sliderValGrowth').textContent = `${stock.projectedEPSGrowth.toFixed(1)}%`;
  document.getElementById('sliderValPE').textContent = `${stock.peForward.toFixed(1)}x`;
  document.getElementById('sliderValYears').textContent = '3 Years';
}

/**
 * Fetch and Load Live Real-time Stock Data from Yahoo Finance
 */
export async function loadStockRealtime(ticker, notify = true) {
  if (!ticker) return;
  const rawTicker = ticker.trim();
  const refreshIcon = document.getElementById('refreshIcon');
  const liveTimestamp = document.getElementById('liveTimestamp');

  if (state.isLoadingRealtime) return;
  state.isLoadingRealtime = true;

  if (notify) {
    if (refreshIcon) refreshIcon.classList.add('spinning');
    if (liveTimestamp) liveTimestamp.textContent = 'Resolving & Syncing...';
  }

  try {
    const liveData = await fetchLiveStockData(rawTicker);
    const sym = liveData.ticker;

    // Merge into universe
    state.universe[sym] = liveData;
    state.currentTicker = sym;

    // Update active state on quick chips
    document.querySelectorAll('.quick-chip-btn').forEach(btn => {
      if (btn.getAttribute('data-ticker') === sym) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update dropdown selector
    const selector = document.getElementById('stockSelector');
    if (selector) {
      let optionExists = false;
      for (const opt of selector.options) {
        if (opt.value === sym) {
          selector.value = sym;
          optionExists = true;
          break;
        }
      }
      if (!optionExists) {
        const customGroup = selector.querySelector('optgroup[label="Searched Stocks"]') || (() => {
          const group = document.createElement('optgroup');
          group.label = 'Searched Stocks';
          selector.appendChild(group);
          return group;
        })();
        const opt = document.createElement('option');
        opt.value = sym;
        opt.textContent = `${sym} - ${liveData.name} (Live)`;
        customGroup.appendChild(opt);
        selector.value = sym;
      }
    }

    // Keep search input updated with current symbol
    const searchInput = document.getElementById('stockSearchInput');
    if (searchInput && document.activeElement !== searchInput) {
      searchInput.value = sym;
    }

    // 1. Sync sliders and base metrics
    syncSlidersToStock(liveData);

    // 2. Render Hero Overview
    renderStockHero(liveData);

    // 3. Render Expected Return, Lynch GARP, and 2D Sensitivity Matrix
    updateReturnModel(liveData);

    // 4. Render News Feed sorted by current date
    renderNewsFeed(liveData, state.newsFilter);

    // 5. Update Technical & Fundamental Charts
    updateAllCharts(liveData, state.isDarkMode);

    // 6. Render Order Book & Backlog History
    renderOrderBook(liveData, state.isDarkMode);

    // 7. Render Big Sharks & Institutional Fund Managers Intelligence
    renderBigSharksView(liveData, state.isDarkMode, (t) => {
      loadStockRealtime(t);
    });

    // 8. Update Real-Time GARP Radar Table highlighting active stock
    renderScreenerTable(state.universe, (t) => {
      loadStockRealtime(t);
      document.querySelector('.tab-btn[data-tab="tab-return-model"]')?.click();
    }, state.currentTicker);

    if (liveTimestamp) {
      liveTimestamp.textContent = liveData.marketSession || `Updated ${liveData.lastUpdatedTime || 'Live'}`;
    }
    const liveFeedStatus = document.getElementById('liveFeedStatus');
    if (liveFeedStatus && liveData.feedLatency) {
      liveFeedStatus.title = `${liveData.exchange} Feed: ${liveData.feedLatency}`;
    }

    refreshIcons();
  } catch (err) {
    console.error(`Error loading live stock data for ${rawTicker}:`, err);
    if (liveTimestamp) {
      liveTimestamp.textContent = 'Offline Fallback';
    }

    // Fall back to local universe if available
    const upper = rawTicker.toUpperCase();
    if (state.universe[upper]) {
      const stock = state.universe[upper];
      syncSlidersToStock(stock);
      renderStockHero(stock);
      updateReturnModel(stock);
      renderNewsFeed(stock, state.newsFilter);
      updateAllCharts(stock, state.isDarkMode);
      renderOrderBook(stock, state.isDarkMode);
      renderBigSharksView(stock, state.isDarkMode, (t) => {
        loadStockRealtime(t);
      });
      renderScreenerTable(state.universe, (t) => {
        loadStockRealtime(t);
      }, state.currentTicker);
    }
  } finally {
    state.isLoadingRealtime = false;
    if (notify && refreshIcon) refreshIcon.classList.remove('spinning');
  }
}

/**
 * Setup Real-time Omnibar Autocomplete Search
 */
function setupOmnibarSearch() {
  const searchInput = document.getElementById('stockSearchInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  const dropdown = document.getElementById('searchResultsDropdown');
  const searchIcon = document.querySelector('.search-omnibar-wrapper .search-icon');

  if (!searchInput || !dropdown) return;

  let debounceTimer = null;

  async function executeSearch(query) {
    const clean = sanitizeSearchQuery(query);
    if (!clean) return;

    dropdown.innerHTML = `
      <div style="padding: 14px; color: var(--cyan-primary); font-size: 0.82rem; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <i data-lucide="refresh-cw" class="inline-icon spinning"></i>
        <span>Analyzing & Loading "${clean}" on NSE & US Exchanges...</span>
      </div>
    `;
    dropdown.classList.add('active');
    refreshIcons();

    try {
      const resolvedSym = await resolveTickerSymbol(clean);
      dropdown.classList.remove('active');
      dropdown.innerHTML = '';
      if (resolvedSym) {
        if (window.exitSectorDashboard && document.body.classList.contains('view-sector-dashboard')) {
          window.exitSectorDashboard('tab-return-model');
        }
        searchInput.value = resolvedSym;
        await loadStockRealtime(resolvedSym);
      }
    } catch (err) {
      console.error('Execute search error:', err);
      dropdown.innerHTML = `
        <div style="padding: 14px; color: var(--rose-loss); font-size: 0.82rem; text-align: center;">
          Could not find or analyze "${clean}". Please verify ticker or company name.
        </div>
      `;
      refreshIcons();
    }
  }

  searchInput.addEventListener('input', (e) => {
    const rawVal = e.target.value;
    const clean = sanitizeSearchQuery(rawVal);
    if (clearBtn) {
      clearBtn.style.display = rawVal.trim().length > 0 ? 'block' : 'none';
    }

    if (clean.length < 1) {
      dropdown.classList.remove('active');
      dropdown.innerHTML = '';
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      dropdown.innerHTML = `
        <div style="padding: 12px; color: var(--text-dim); font-size: 0.8rem; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i data-lucide="refresh-cw" class="inline-icon spinning"></i>
          <span>Searching NSE India & US Markets...</span>
        </div>
      `;
      dropdown.classList.add('active');
      refreshIcons();

      const results = await searchYahooStocks(clean);

      if (results.length === 0) {
        dropdown.innerHTML = `
          <div style="padding: 14px; color: var(--text-muted); font-size: 0.82rem; text-align: center;">
            No direct matches for "${clean}". Press <kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-weight: 600;">Enter</kbd> to analyze ticker directly.
          </div>
        `;
        return;
      }

      dropdown.innerHTML = results.map(item => `
        <div class="search-result-item" data-symbol="${item.symbol}">
          <div class="result-info">
            <span class="result-sym">${item.symbol}</span>
            <span class="result-name">${item.name}</span>
          </div>
          <div class="result-meta">
            <span class="result-tag" style="${item.isIndian ? 'background: rgba(16,185,129,0.2); color: var(--emerald-bull); border-color: rgba(16,185,129,0.4);' : ''}">${item.exchange}</span>
            <span class="result-tag" style="color: var(--cyan-primary);">${item.sector}</span>
          </div>
        </div>
      `).join('');

      dropdown.querySelectorAll('.search-result-item').forEach(item => {
        // Use pointerdown to ensure immediate trigger before input blur
        item.addEventListener('pointerdown', (evt) => {
          evt.preventDefault();
          const sym = item.getAttribute('data-symbol');
          if (sym) {
            if (window.exitSectorDashboard && document.body.classList.contains('view-sector-dashboard')) {
              window.exitSectorDashboard('tab-return-model');
            }
            searchInput.value = sym;
            dropdown.classList.remove('active');
            dropdown.innerHTML = '';
            loadStockRealtime(sym);
          }
        });
      });
    }, 180);
  });

  searchInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(debounceTimer);
      const firstItem = dropdown.querySelector('.search-result-item');
      if (dropdown.classList.contains('active') && firstItem) {
        const sym = firstItem.getAttribute('data-symbol');
        if (sym) {
          if (window.exitSectorDashboard && document.body.classList.contains('view-sector-dashboard')) {
            window.exitSectorDashboard('tab-return-model');
          }
          searchInput.value = sym;
          dropdown.classList.remove('active');
          dropdown.innerHTML = '';
          loadStockRealtime(sym);
          return;
        }
      }
      await executeSearch(searchInput.value);
    } else if (e.key === 'Escape') {
      dropdown.classList.remove('active');
    }
  });

  if (searchIcon) {
    searchIcon.style.cursor = 'pointer';
    searchIcon.title = 'Click to search and analyze';
    searchIcon.addEventListener('click', () => {
      executeSearch(searchInput.value);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      dropdown.classList.remove('active');
      dropdown.innerHTML = '';
      searchInput.focus();
    });
  }

  // Close dropdown on click outside
  document.addEventListener('pointerdown', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

/**
 * Real-Time Market Indices Ticker Tape Sync
 */
async function syncMarketTickerTape() {
  const indices = [
    { sym: '^NSEI', elId: 'tapeNifty', label: 'Nifty 50' },
    { sym: '^BSESN', elId: 'tapeSensex', label: 'Sensex' },
    { sym: '^INDIAVIX', elId: 'tapeIndiaVix', label: 'India VIX', isVix: true },
    { sym: '^GSPC', elId: 'tapeSp500', label: 'S&P 500' },
    { sym: '^IXIC', elId: 'tapeNasdaq', label: 'Nasdaq' },
    { sym: '^TNX', elId: 'tapeUs10Y', label: 'US 10Y Yield', isYield: true }
  ];

  const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:5173';

  await Promise.allSettled(
    indices.map(async (item) => {
      const el = document.getElementById(item.elId);
      if (!el) return;
      try {
        const res = await fetch(`${baseUrl}/api/yahoo/chart/${encodeURIComponent(item.sym)}?range=5d&interval=1d`);
        if (!res.ok) return;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) return;

        const price = meta.regularMarketPrice || meta.chartPreviousClose;
        const prevClose = meta.chartPreviousClose || price;
        const change = Number((meta.fulldayChange ?? (price - prevClose)).toFixed(2));
        const changePct = Number((meta.regularMarketChangePercent ?? ((change / prevClose) * 100)).toFixed(2));
        const isPos = change >= 0;

        el.className = `tape-val ${isPos ? 'text-emerald' : 'text-rose'}`;
        if (item.isYield) {
          el.textContent = `${price.toFixed(2)}% (${isPos ? '+' : ''}${change.toFixed(2)}%)`;
        } else if (item.isVix) {
          el.textContent = `${price.toFixed(2)} (${isPos ? '+' : ''}${changePct.toFixed(2)}%)`;
        } else {
          el.textContent = `${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${isPos ? '+' : ''}${changePct.toFixed(2)}%)`;
        }
      } catch (err) {
        console.warn(`Ticker tape sync warning for ${item.sym}:`, err);
      }
    })
  );
}

/**
 * Setup Quick Watch Chips
 */
function setupQuickChips() {
  document.querySelectorAll('.quick-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ticker = btn.getAttribute('data-ticker');
      if (ticker) {
        if (window.exitSectorDashboard && document.body.classList.contains('view-sector-dashboard')) {
          window.exitSectorDashboard('tab-return-model');
        }
        const searchInput = document.getElementById('stockSearchInput');
        if (searchInput) searchInput.value = ticker;
        loadStockRealtime(ticker);
      }
    });
  });
}

/**
 * Update Quick Watch Chips with Live Streaming Data
 */
function updateQuickChipsWithLiveData(universe) {
  document.querySelectorAll('.quick-chip-btn').forEach(btn => {
    const sym = btn.getAttribute('data-ticker');
    const stock = universe[sym];
    if (stock && stock.price) {
      const isINR = stock.ticker.endsWith('.NS') || stock.currency === 'INR';
      const curr = isINR ? '₹' : '$';
      const peg = stock.pegRatio ? stock.pegRatio.toFixed(2) : (stock.peForward / (stock.projectedEPSGrowth || 20)).toFixed(2);
      const isGarp = parseFloat(peg) < 1.0;
      const cleanSym = sym.replace('.NS', '');
      const changePct = stock.changePercent !== undefined ? stock.changePercent : 0;
      const isPos = changePct >= 0;
      const changeText = `${isPos ? '+' : ''}${changePct.toFixed(1)}%`;
      const changeColor = isPos ? 'var(--emerald-bull)' : 'var(--rose-bear)';
      btn.innerHTML = `
        <span class="chip-sym">${cleanSym}</span>
        <span class="chip-price font-mono font-bold">${curr}${stock.price.toFixed(1)}</span>
        <span class="chip-change font-mono" style="color: ${changeColor}; font-size: 0.72rem;">${changeText}</span>
        ${isGarp ? '<span class="chip-garp" style="color: var(--amber-gold); font-size: 0.75rem;">★</span>' : ''}
      `;
    }
  });
}

/**
 * Update Dropdown Options with Live Streaming Data
 */
function updateDropdownOptionsWithLiveData(universe) {
  const selector = document.getElementById('stockSelector');
  if (!selector) return;
  for (const opt of selector.options) {
    const sym = opt.value;
    const stock = universe[sym];
    if (stock && stock.price) {
      const isINR = stock.ticker.endsWith('.NS') || stock.currency === 'INR';
      const curr = isINR ? '₹' : '$';
      const peg = stock.pegRatio ? stock.pegRatio.toFixed(2) : (stock.peForward / (stock.projectedEPSGrowth || 20)).toFixed(2);
      const isGarp = parseFloat(peg) < 1.0;
      opt.textContent = `${stock.ticker} - ${stock.name} (${curr}${stock.price.toFixed(2)} • PEG ${peg}${isGarp ? ' ★ GARP' : ''})`;
    }
  }
}

let autoRefreshTimer = null;
const AUTO_REFRESH_INTERVAL_MS = 30000; // 30 seconds continuous polling

/**
 * Continuous Background Real-Time Polling Engine
 */
function startRealtimePolling() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);

  autoRefreshTimer = setInterval(async () => {
    if (document.hidden) return; // Conserve resources when window is hidden

    try {
      // 1. Refresh market ticker tape
      syncMarketTickerTape();

      // 2. Silently refresh active stock hero & models
      if (state.currentTicker) {
        await loadStockRealtime(state.currentTicker, false);
      }

      // 3. Batch sync all universe stocks
      const updated = await fetchAllUniverseQuotes(state.universe);
      state.universe = updated;

      // 4. Update Quick Watch Chips & Dropdown
      updateQuickChipsWithLiveData(state.universe);
      updateDropdownOptionsWithLiveData(state.universe);

      // 5. Update Screener Table
      renderScreenerTable(state.universe, (t) => {
        loadStockRealtime(t);
        document.querySelector('.tab-btn[data-tab="tab-return-model"]')?.click();
      }, state.currentTicker);

      // 6. Update Sector Dashboard if active
      const isSectorsActive = document.getElementById('tab-sectors')?.classList.contains('active');
      if (isSectorsActive) {
        renderSectorsDashboard(state.universe, (t) => {
          if (window.exitSectorDashboard) window.exitSectorDashboard('tab-return-model');
          loadStockRealtime(t);
        }, state.isDarkMode);
      }

      // 7. Update Live Timestamps
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const liveTimeEl = document.getElementById('liveTimestamp');
      if (liveTimeEl) {
        liveTimeEl.textContent = `Streaming (${timeStr})`;
      }
      const sectorTimeEl = document.getElementById('sectorLiveTimestamp');
      if (sectorTimeEl) {
        sectorTimeEl.textContent = timeStr;
      }

      refreshIcons();
    } catch (err) {
      console.warn('Real-time polling tick warning:', err);
    }
  }, AUTO_REFRESH_INTERVAL_MS);
}

/**
 * Setup Real-time Refresh Sync Button
 */
function setupRefreshButton() {
  const refreshBtn = document.getElementById('refreshLiveBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const refreshIcon = document.getElementById('refreshIcon');
      if (refreshIcon) refreshIcon.classList.add('spinning');
      const liveTimestamp = document.getElementById('liveTimestamp');
      if (liveTimestamp) liveTimestamp.textContent = 'Syncing All Feeds...';

      try {
        // Refresh market ticker tape
        await syncMarketTickerTape();

        // Refresh current stock
        await loadStockRealtime(state.currentTicker, true);

        // Batch refresh all universe stocks in parallel
        const updated = await fetchAllUniverseQuotes(state.universe);
        state.universe = updated;

        // Update Quick Watch Chips & Dropdown
        updateQuickChipsWithLiveData(state.universe);
        updateDropdownOptionsWithLiveData(state.universe);

        // Update screener table
        renderScreenerTable(state.universe, (t) => {
          loadStockRealtime(t);
        }, state.currentTicker);

        // Update sectors dashboard if open
        const isSectorsActive = document.getElementById('tab-sectors')?.classList.contains('active');
        if (isSectorsActive) {
          renderSectorsDashboard(state.universe, (t) => {
            if (window.exitSectorDashboard) window.exitSectorDashboard('tab-return-model');
            loadStockRealtime(t);
          }, state.isDarkMode);
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (liveTimestamp) liveTimestamp.textContent = `Live (${timeStr})`;
        const sectorTimeEl = document.getElementById('sectorLiveTimestamp');
        if (sectorTimeEl) sectorTimeEl.textContent = timeStr;
      } finally {
        if (refreshIcon) refreshIcon.classList.remove('spinning');
        refreshIcons();
      }
    });
  }
}

/**
 * Setup News Filter Buttons
 */
function setupNewsFilters() {
  const filterBtns = document.querySelectorAll('.news-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      state.newsFilter = filter;

      const stock = state.universe[state.currentTicker];
      if (stock) {
        renderNewsFeed(stock, filter);
        refreshIcons();
      }
    });
  });
}

/**
 * Add Custom Stock to Universe
 */
function handleAddCustomStock(newStock) {
  state.universe[newStock.ticker] = newStock;

  const selector = document.getElementById('stockSelector');
  const customGroup = selector.querySelector('optgroup[label="Custom Simulations"]') || (() => {
    const group = document.createElement('optgroup');
    group.label = 'Custom Simulations';
    selector.appendChild(group);
    return group;
  })();

  const opt = document.createElement('option');
  opt.value = newStock.ticker;
  opt.textContent = `${newStock.ticker} - ${newStock.name} (PEG ${newStock.pegRatio.toFixed(2)})`;
  customGroup.appendChild(opt);

  state.currentTicker = newStock.ticker;
  syncSlidersToStock(newStock);
  renderStockHero(newStock);
  updateReturnModel(newStock);
  renderNewsFeed(newStock, state.newsFilter);
  updateAllCharts(newStock, state.isDarkMode);
  renderScreenerTable(state.universe, (t) => {
    loadStockRealtime(t);
  }, state.currentTicker);

  document.querySelector('.tab-btn[data-tab="tab-return-model"]')?.click();
  refreshIcons();
}

/**
 * Application Bootstrap
 */
document.addEventListener('DOMContentLoaded', async () => {
  setupThemeEngine();
  setupTabNavigation();
  setupModelSliders();
  setupNewsFilters();
  setupOmnibarSearch();
  setupQuickChips();
  setupRefreshButton();

  // Setup GARP Radar sorting and filter controls
  setupScreenerControls(() => {
    renderScreenerTable(state.universe, (t) => {
      loadStockRealtime(t);
      document.querySelector('.tab-btn[data-tab="tab-return-model"]')?.click();
    }, state.currentTicker);
    refreshIcons();
  });

  // Stock dropdown change
  const selector = document.getElementById('stockSelector');
  if (selector) {
    selector.addEventListener('change', (e) => {
      if (window.exitSectorDashboard && document.body.classList.contains('view-sector-dashboard')) {
        window.exitSectorDashboard('tab-return-model');
      }
      loadStockRealtime(e.target.value);
    });
  }

  // Custom Stock Modal setup
  setupCustomStockModal(handleAddCustomStock);

  // Sync real-time market indices ticker tape (NIFTY 50, SENSEX, INDIA VIX, S&P 500, NASDAQ, US 10Y YIELD)
  syncMarketTickerTape();

  // 1. Initialize with real-time live data for default ticker (NVDA)
  await loadStockRealtime('NVDA');

  // 2. Batch-sync real-time quotes for all stocks in the universe so GARP Radar, Quick Chips & Dropdowns display live quotes
  fetchAllUniverseQuotes(state.universe).then(updated => {
    state.universe = updated;
    updateQuickChipsWithLiveData(state.universe);
    updateDropdownOptionsWithLiveData(state.universe);
    renderScreenerTable(state.universe, (t) => {
      loadStockRealtime(t);
      document.querySelector('.tab-btn[data-tab="tab-return-model"]')?.click();
    }, state.currentTicker);
    refreshIcons();
  });

  // 3. Start continuous automated real-time polling (every 30 seconds)
  startRealtimePolling();

  refreshIcons();
});
