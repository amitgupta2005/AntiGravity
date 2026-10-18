/**
 * Intraday Stock Picker - Client Application
 * - Ultra-readable high-resolution chart scaling (barSpacing & visible logical range)
 * - Dark Mode & Light Mode dynamic theme engine
 * - Fully responsive layout with mobile/tablet view switcher & desktop panel collapse
 * - Interactive zoom controls, pattern markers, MTF matrix, and session replay
 */

let currentMarket = "NSE_MOMENTUM";
let currentTicker = null;
let currentTimeframe = "1m";
let currentFilter = "all";
let autoRefreshTimer = null;
let currentStocks = [];
let activeStockAnalysis = null;
let rawChartData = null;
let currentTheme = localStorage.getItem("apex_theme") || "dark";

// Lightweight Charts instances
let mainChart = null;
let candleSeries = null;
let vwapSeries = null;
let ema9Series = null;
let ema21Series = null;
let ema50Series = null;
let volumeSeries = null;
let volMaSeries = null;
let activePriceLines = [];

let rsiChart = null;
let rsiSeries = null;

// Indicator & Marker display states
let showVWAP = true;
let showEMA = true;
let showLevels = true;
let showMarkers = true;
let soundEnabled = true;

// Session Replay Simulator states
let isReplayActive = false;
let replayIndex = 0;
let replayTimer = null;
let replaySpeed = 3;

// Panel collapse states (Desktop)
let leftCollapsed = false;
let rightCollapsed = false;

// DOM Elements
const terminalLayout = document.getElementById("terminal-layout");
const stockCardsContainer = document.getElementById("stock-cards-container");
const scanCountBadge = document.getElementById("scan-count-badge");
const mobBadgeCount = document.getElementById("mob-badge-count");
const marketStatusText = document.getElementById("market-status-text");
const tickerSearchInput = document.getElementById("ticker-search-input");
const btnSearchGo = document.getElementById("btn-search-go");
const btnManualScan = document.getElementById("btn-manual-scan");
const scanBtnLabel = document.getElementById("scan-btn-label");
const autoRefreshSelect = document.getElementById("auto-refresh-select");
const btnSoundToggle = document.getElementById("btn-sound-toggle");
const soundIcon = document.getElementById("sound-icon");
const soundLabel = document.getElementById("sound-label");
const btnThemeToggle = document.getElementById("btn-theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const themeLabel = document.getElementById("theme-label");

// Chart elements
const chartViewportContainer = document.getElementById("chart-viewport-container");
const mainChartContainer = document.getElementById("main-candlestick-chart");
const rsiChartContainer = document.getElementById("rsi-sub-chart");
const activeSymbolTicker = document.getElementById("active-symbol-ticker");
const activeSymbolName = document.getElementById("active-symbol-name");
const activePricePill = document.getElementById("active-price-pill");

// Controls
const toggleVwapBtn = document.getElementById("toggle-vwap");
const toggleEmaBtn = document.getElementById("toggle-ema");
const toggleLevelsBtn = document.getElementById("toggle-levels");
const toggleMarkersBtn = document.getElementById("toggle-markers");

const btnZoomIn = document.getElementById("btn-zoom-in");
const btnZoomOut = document.getElementById("btn-zoom-out");
const btnFitRecent = document.getElementById("btn-fit-recent");
const btnChartReset = document.getElementById("btn-chart-reset");
const btnToggleLeft = document.getElementById("btn-toggle-left");
const btnToggleRight = document.getElementById("btn-toggle-right");

// Replay controls
const btnReplayToggle = document.getElementById("btn-replay-toggle");
const replayBar = document.getElementById("replay-bar");
const replayTimeLabel = document.getElementById("replay-time-label");
const replayPlayBtn = document.getElementById("replay-play-btn");
const replayStepBtn = document.getElementById("replay-step-btn");
const replaySpeedSelect = document.getElementById("replay-speed-select");
const replayExitBtn = document.getElementById("replay-exit-btn");

// Floating legend elements
const legOpen = document.getElementById("leg-open");
const legHigh = document.getElementById("leg-high");
const legLow = document.getElementById("leg-low");
const legClose = document.getElementById("leg-close");
const legVol = document.getElementById("leg-vol");
const legVwap = document.getElementById("leg-vwap");
const legRsi = document.getElementById("leg-rsi");

// Detail panel elements
const signalBanner = document.getElementById("signal-banner");
const detailSignalBadge = document.getElementById("detail-signal-badge");
const detailSetupTitle = document.getElementById("detail-setup-title");
const detailSetupDesc = document.getElementById("detail-setup-desc");
const detailScoreNum = document.getElementById("detail-score-num");
const scoreCircleBadge = document.getElementById("score-circle-badge");
const mtfMatrixContainer = document.getElementById("mtf-matrix-container");
const btnCopyPlan = document.getElementById("btn-copy-plan");

const planEntry = document.getElementById("plan-entry");
const planActionType = document.getElementById("plan-action-type");
const planSl = document.getElementById("plan-sl");
const planSlDiff = document.getElementById("plan-sl-diff");
const planT1 = document.getElementById("plan-t1");
const planT1Diff = document.getElementById("plan-t1-diff");
const planT2 = document.getElementById("plan-t2");
const planT2Diff = document.getElementById("plan-t2-diff");
const planExecRule = document.getElementById("plan-exec-rule");

const calcCapitalInput = document.getElementById("calc-capital");
const calcRiskPctInput = document.getElementById("calc-risk-pct");
const calcQty = document.getElementById("calc-qty");
const calcMaxLoss = document.getElementById("calc-max-loss");
const calcCurrSymbol = document.getElementById("calc-curr-symbol");

const rationaleContainer = document.getElementById("rationale-container");
const checklistContainer = document.getElementById("checklist-container");


// ============================================================================
// Initialization & Theme Setup
// ============================================================================
window.addEventListener("DOMContentLoaded", () => {
  applyTheme(currentTheme);
  initLightweightCharts();
  setupResizeObserver();
  setupEventListeners();
  updateMarketStatus();
  fetchScreener(currentMarket);
  setupAutoRefresh();
});

function getThemeColors(theme = currentTheme) {
  if (theme === "light") {
    return {
      bg: "#ffffff",
      text: "#475569",
      grid: "#f1f5f9",
      border: "#cbd5e1",
      crosshair: "#2563eb",
      candleUp: "#059669",
      candleDown: "#dc2626",
      volumeUp: "rgba(5, 150, 105, 0.5)",
      volumeDown: "rgba(220, 38, 38, 0.5)"
    };
  }
  return {
    bg: "#080c14",
    text: "#94a3b8",
    grid: "#131a29",
    border: "#202b40",
    crosshair: "#3b82f6",
    candleUp: "#10b981",
    candleDown: "#ef4444",
    volumeUp: "rgba(16, 185, 129, 0.55)",
    volumeDown: "rgba(239, 68, 68, 0.55)"
  };
}

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("apex_theme", theme);

  if (theme === "light") {
    themeIcon.textContent = "☀️";
    themeLabel.textContent = "Light";
  } else {
    themeIcon.textContent = "🌙";
    themeLabel.textContent = "Dark";
  }

  // Update chart options if charts are already initialized
  if (mainChart && rsiChart) {
    const c = getThemeColors(theme);
    const layoutOpts = {
      background: { color: c.bg },
      textColor: c.text
    };
    const gridOpts = {
      vertLines: { color: c.grid },
      horzLines: { color: c.grid }
    };

    mainChart.applyOptions({
      layout: layoutOpts,
      grid: gridOpts,
      timeScale: { borderColor: c.border },
      rightPriceScale: { borderColor: c.border }
    });

    rsiChart.applyOptions({
      layout: layoutOpts,
      grid: gridOpts,
      timeScale: { borderColor: c.border },
      rightPriceScale: { borderColor: c.border }
    });

    if (candleSeries) {
      candleSeries.applyOptions({
        upColor: c.candleUp,
        downColor: c.candleDown,
        wickUpColor: c.candleUp,
        wickDownColor: c.candleDown,
        borderUpColor: c.candleUp,
        borderDownColor: c.candleDown
      });
    }
  }
}


// ============================================================================
// High-Resolution Chart Setup & Resize Engine
// ============================================================================
function initLightweightCharts() {
  if (!mainChartContainer || !rsiChartContainer || typeof LightweightCharts === "undefined") {
    console.error("LightweightCharts library not loaded or containers missing.");
    return;
  }

  const c = getThemeColors();

  const commonOptions = {
    layout: {
      background: { color: c.bg },
      textColor: c.text,
      fontSize: 12,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace'
    },
    grid: {
      vertLines: { color: c.grid },
      horzLines: { color: c.grid }
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: { color: c.crosshair, width: 1, style: 3 },
      horzLine: { color: c.crosshair, width: 1, style: 3 }
    },
    timeScale: {
      borderColor: c.border,
      timeVisible: true,
      secondsVisible: false,
      barSpacing: 11,      // Bold, readable default candle width!
      minBarSpacing: 3,
      rightOffset: 8
    }
  };

  const initialWidth = mainChartContainer.clientWidth || 600;
  const initialMainHeight = 320;
  const initialRsiHeight = 110;

  // 1. Main Candlestick Chart
  mainChart = LightweightCharts.createChart(mainChartContainer, {
    ...commonOptions,
    width: initialWidth,
    height: initialMainHeight,
    rightPriceScale: {
      borderColor: c.border,
      autoScale: true,
      scaleMargins: {
        top: 0.08,
        bottom: 0.22 // Leaves room for volume histogram
      }
    }
  });

  // Candlestick Series with crisp borders
  candleSeries = mainChart.addCandlestickSeries({
    upColor: c.candleUp,
    downColor: c.candleDown,
    borderVisible: true,
    borderUpColor: c.candleUp,
    borderDownColor: c.candleDown,
    wickUpColor: c.candleUp,
    wickDownColor: c.candleDown
  });

  // VWAP Series (Yellow line)
  vwapSeries = mainChart.addLineSeries({
    color: "#eab308",
    lineWidth: 2,
    priceLineVisible: false,
    title: "VWAP"
  });

  // EMA Ribbon
  ema9Series = mainChart.addLineSeries({
    color: "#a855f7",
    lineWidth: 1,
    priceLineVisible: false,
    title: "9 EMA"
  });

  ema21Series = mainChart.addLineSeries({
    color: "#f59e0b",
    lineWidth: 1,
    priceLineVisible: false,
    title: "21 EMA"
  });

  ema50Series = mainChart.addLineSeries({
    color: "#3b82f6",
    lineWidth: 1,
    priceLineVisible: false,
    title: "50 EMA"
  });

  // Volume Series on bottom of main chart
  volumeSeries = mainChart.addHistogramSeries({
    color: "#3b82f6",
    priceFormat: { type: "volume" },
    priceScaleId: "",
    scaleMargins: {
      top: 0.78,
      bottom: 0.0
    }
  });

  volMaSeries = mainChart.addLineSeries({
    color: "rgba(148, 163, 184, 0.4)",
    lineWidth: 1,
    priceScaleId: "",
    priceLineVisible: false,
    scaleMargins: {
      top: 0.78,
      bottom: 0.0
    }
  });

  // 2. RSI Sub-Chart
  rsiChart = LightweightCharts.createChart(rsiChartContainer, {
    ...commonOptions,
    width: initialWidth,
    height: initialRsiHeight,
    rightPriceScale: {
      borderColor: c.border,
      scaleMargins: { top: 0.1, bottom: 0.1 }
    }
  });

  rsiSeries = rsiChart.addLineSeries({
    color: "#8b5cf6",
    lineWidth: 2,
    priceLineVisible: false,
    title: "RSI 14"
  });

  // RSI Threshold lines
  rsiSeries.createPriceLine({
    price: 70,
    color: "rgba(239, 68, 68, 0.6)",
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    axisLabelVisible: true,
    title: "70 OB"
  });
  rsiSeries.createPriceLine({
    price: 50,
    color: "rgba(148, 163, 184, 0.3)",
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dotted,
    axisLabelVisible: false
  });
  rsiSeries.createPriceLine({
    price: 30,
    color: "rgba(16, 185, 129, 0.6)",
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    axisLabelVisible: true,
    title: "30 OS"
  });

  // Synchronize time scales
  mainChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
    if (range) rsiChart.timeScale().setVisibleLogicalRange(range);
  });
  rsiChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
    if (range) mainChart.timeScale().setVisibleLogicalRange(range);
  });

  // Crosshair listener
  mainChart.subscribeCrosshairMove(updateLegend);
}

function setupResizeObserver() {
  if (!chartViewportContainer) return;

  const ro = new ResizeObserver(entries => {
    for (const entry of entries) {
      const cr = entry.contentRect;
      if (cr.width > 50 && cr.height > 100) {
        resizeCharts(Math.floor(cr.width), Math.floor(cr.height));
      }
    }
  });
  ro.observe(chartViewportContainer);
}

function resizeCharts(width, totalHeight) {
  if (!mainChart || !rsiChart) return;
  // Reserve ~110px for RSI sub-chart, rest for main chart
  const rsiHeight = Math.max(90, Math.min(130, Math.floor(totalHeight * 0.25)));
  const mainHeight = Math.max(220, totalHeight - rsiHeight);

  mainChart.applyOptions({ width, height: mainHeight });
  rsiChart.applyOptions({ width, height: rsiHeight });
}

function updateLegend(param) {
  if (!param || !param.time || !param.seriesData) return;

  const candle = param.seriesData.get(candleSeries);
  if (candle) {
    legOpen.textContent = candle.open.toFixed(2);
    legHigh.textContent = candle.high.toFixed(2);
    legLow.textContent = candle.low.toFixed(2);
    legClose.textContent = candle.close.toFixed(2);
  }
  const vol = param.seriesData.get(volumeSeries);
  if (vol) legVol.textContent = vol.value.toLocaleString();

  const vwap = param.seriesData.get(vwapSeries);
  if (vwap) legVwap.textContent = vwap.value.toFixed(2);

  const rsi = param.seriesData.get(rsiSeries);
  if (rsi) legRsi.textContent = rsi.value.toFixed(1);
}


// ============================================================================
// Screener & API Interactions
// ============================================================================
async function fetchScreener(marketKey = currentMarket, isAuto = false) {
  if (!isAuto) {
    scanBtnLabel.textContent = "Scanning...";
    btnManualScan.disabled = true;
  }

  try {
    const url = `/api/scan?market=${encodeURIComponent(marketKey)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK") {
      currentStocks = data.stocks;
      scanCountBadge.textContent = `${currentStocks.length} Stocks`;
      mobBadgeCount.textContent = currentStocks.length;
      renderStockCards();

      // Audio alert if any stock has score >= 75 with RVOL >= 1.5
      if (soundEnabled && currentStocks.some(s => s.score >= 75 && s.rvol >= 1.5)) {
        playAlertSound();
      }

      // If no active ticker or current ticker not in list, auto-select top conviction pick
      if (!currentTicker || !currentStocks.some(s => s.ticker === currentTicker)) {
        if (currentStocks.length > 0) {
          selectStock(currentStocks[0].ticker);
        }
      } else {
        loadChartData(currentTicker, currentTimeframe, true);
      }
    }
  } catch (err) {
    console.error("Error scanning stocks:", err);
    if (!isAuto) {
      stockCardsContainer.innerHTML = `<div class="state-container"><p style="color:#ef4444;">Failed to fetch scan results. Check internet connection.</p></div>`;
    }
  } finally {
    if (!isAuto) {
      scanBtnLabel.textContent = "Scan";
      btnManualScan.disabled = false;
    }
  }
}

function renderStockCards() {
  if (!currentStocks || currentStocks.length === 0) {
    stockCardsContainer.innerHTML = `
      <div class="state-container">
        <p>No active stocks found for this market filter.</p>
      </div>`;
    return;
  }

  // Filter stocks based on active strategy filter
  const filtered = currentStocks.filter(stock => {
    const setup = (stock.setup_name || "").toLowerCase();
    if (currentFilter === "buy") return stock.score >= 35;
    if (currentFilter === "sell") return stock.score <= -35;
    if (currentFilter === "rvol") return stock.rvol >= 1.5;
    if (currentFilter === "breakout") return setup.includes("breakout") || setup.includes("orb");
    if (currentFilter === "vwap") return setup.includes("vwap");
    if (currentFilter === "ema") return setup.includes("ema") || setup.includes("trend");
    return true; // 'all'
  });

  if (filtered.length === 0) {
    stockCardsContainer.innerHTML = `
      <div class="state-container">
        <p>No stocks currently match the "${currentFilter.toUpperCase()}" filter.</p>
      </div>`;
    return;
  }

  stockCardsContainer.innerHTML = "";

  filtered.forEach(stock => {
    const card = document.createElement("div");
    card.className = `stock-card ${stock.ticker === currentTicker ? "active" : ""}`;
    card.id = `card-${stock.ticker.replace(".", "_")}`;

    const isUp = stock.change_pct >= 0;
    const changeClass = isUp ? "up" : "down";
    const changeSign = isUp ? "+" : "";

    const scoreColor = stock.score >= 35 ? "#10b981" : stock.score <= -35 ? "#ef4444" : "#94a3b8";
    const scoreFillWidth = `${stock.display_score}%`;
    const sigClass = stock.signal.toLowerCase().replace(" ", "-");

    card.innerHTML = `
      <div class="card-top">
        <div>
          <div class="card-ticker">${stock.ticker}</div>
          <div class="card-company">${stock.company_name}</div>
        </div>
        <div class="card-price-col">
          <div class="card-price">${stock.currency_symbol}${stock.price.toFixed(2)}</div>
          <div class="card-change ${changeClass}">${changeSign}${stock.change_pct.toFixed(2)}%</div>
        </div>
      </div>

      <div class="card-middle">
        <span class="badge-signal ${sigClass}">${stock.signal}</span>
        <span class="badge-rvol">${stock.rvol.toFixed(1)}x Vol</span>
        <span class="badge-setup">${stock.setup_name}</span>
      </div>

      <div class="score-bar-track">
        <div class="score-bar-fill" style="width: ${scoreFillWidth}; background: ${scoreColor};"></div>
      </div>

      <div class="card-targets-row">
        <span>SL: <strong style="color:#ef4444;">${stock.currency_symbol}${stock.trade_plan.stop_loss}</strong></span>
        <span>T1: <strong style="color:#10b981;">${stock.currency_symbol}${stock.trade_plan.target_1}</strong></span>
        <span>R:R ${stock.trade_plan.risk_reward_ratio}</span>
      </div>
    `;

    card.addEventListener("click", () => {
      selectStock(stock.ticker);
      // If mobile view, automatically switch to chart view on selection
      if (window.innerWidth <= 1024) {
        setMobileView("chart");
      }
    });

    stockCardsContainer.appendChild(card);
  });
}

function selectStock(ticker) {
  if (isReplayActive) exitReplayMode();

  currentTicker = ticker;
  document.querySelectorAll(".stock-card").forEach(c => c.classList.remove("active"));
  const activeCard = document.getElementById(`card-${ticker.replace(".", "_")}`);
  if (activeCard) activeCard.classList.add("active");

  loadChartData(ticker, currentTimeframe);
}

async function loadChartData(ticker, tf = currentTimeframe, silent = false) {
  try {
    if (!silent) {
      activeSymbolTicker.textContent = ticker;
      activeSymbolName.textContent = "Loading 1-min feed...";
    }

    const res = await fetch(`/api/chart/${encodeURIComponent(ticker)}?timeframe=${tf}`);
    const data = await res.json();

    if (data.status !== "OK") {
      alert(`Could not load chart data: ${data.detail || data.message}`);
      return;
    }

    rawChartData = data;
    activeStockAnalysis = data.analysis;

    // Render Candles and Indicators
    updateChartSeries(data);

    // Render Right Pane Details & Trade Blueprint
    renderAnalysisBlueprint(data.analysis);

    // Update Toolbar Meta
    const sym = data.analysis.currency_symbol || "₹";
    activeSymbolTicker.textContent = data.ticker;
    activeSymbolName.textContent = data.analysis.company_name;
    activePricePill.textContent = `${sym}${data.analysis.price.toFixed(2)}`;
    const isUp = data.analysis.change_pct >= 0;
    activePricePill.style.color = isUp ? "#10b981" : "#ef4444";

  } catch (err) {
    console.error("Error loading chart data:", err);
  }
}

function addPriceLevels(plan, sym) {
  if (!candleSeries || !plan) return;
  clearPriceLevels();

  // Stop Loss Line (Red dashed)
  const slLine = candleSeries.createPriceLine({
    price: plan.stop_loss,
    color: "#ef4444",
    lineWidth: 2,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    axisLabelVisible: true,
    title: `SL: ${sym}${plan.stop_loss} (${plan.stop_loss_pct}%)`
  });
  activePriceLines.push(slLine);

  // Target 1 Line (Green dashed)
  const t1Line = candleSeries.createPriceLine({
    price: plan.target_1,
    color: "#10b981",
    lineWidth: 2,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    axisLabelVisible: true,
    title: `TGT 1: ${sym}${plan.target_1} (+${plan.target_1_pct}%)`
  });
  activePriceLines.push(t1Line);

  // Target 2 Line (Cyan dashed)
  const t2Line = candleSeries.createPriceLine({
    price: plan.target_2,
    color: "#06b6d4",
    lineWidth: 2,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    axisLabelVisible: true,
    title: `TGT 2: ${sym}${plan.target_2} (+${plan.target_2_pct}%)`
  });
  activePriceLines.push(t2Line);

  // Entry Price Line (Amber dotted)
  const entryLine = candleSeries.createPriceLine({
    price: plan.entry_price,
    color: "#f59e0b",
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dotted,
    axisLabelVisible: true,
    title: `ENTRY: ${sym}${plan.entry_price}`
  });
  activePriceLines.push(entryLine);
}

function clearPriceLevels() {
  if (!candleSeries) return;
  activePriceLines.forEach(pl => {
    try { candleSeries.removePriceLine(pl); } catch (e) {}
  });
  activePriceLines = [];
}

function updateChartSeries(chartData) {
  if (!mainChart || !candleSeries) return;

  const candles = chartData.candles || [];
  const indicators = chartData.indicators || {};
  const markers = chartData.markers || [];

  candleSeries.setData(candles);
  vwapSeries.setData(indicators.vwap || []);
  ema9Series.setData(indicators.ema9 || []);
  ema21Series.setData(indicators.ema21 || []);
  ema50Series.setData(indicators.ema50 || []);
  volumeSeries.setData(indicators.volume || []);
  volMaSeries.setData(indicators.vol_ma || []);
  rsiSeries.setData(indicators.rsi || []);

  // Update Pattern & Signal Markers
  if (showMarkers && markers.length > 0) {
    candleSeries.setMarkers(markers);
  } else {
    candleSeries.setMarkers([]);
  }

  // Update Price Lines
  if (showLevels && chartData.analysis && chartData.analysis.trade_plan) {
    addPriceLevels(chartData.analysis.trade_plan, chartData.analysis.currency_symbol);
  } else {
    clearPriceLevels();
  }

  // CRITICAL READABILITY FIX:
  // Instead of fitContent() which squishes all 390 candles into hairline needles,
  // zoom in to show the most recent 65 candles (last 1 hour of trading).
  // This makes every candle 9-12px wide, clear, with bold body, wick, and volume alignment!
  fitRecentCandles(65);
}

function fitRecentCandles(barsToShow = 65) {
  if (!mainChart || !rawChartData || !rawChartData.candles) return;
  const total = rawChartData.candles.length;
  if (total === 0) return;

  const count = Math.min(barsToShow, total);
  mainChart.timeScale().setVisibleLogicalRange({
    from: total - count,
    to: total + 3
  });
  // Ensure barSpacing is comfortable
  mainChart.timeScale().applyOptions({ barSpacing: 11 });
}

function zoomCandles(delta) {
  if (!mainChart) return;
  const ts = mainChart.timeScale();
  const currentRange = ts.getVisibleLogicalRange();
  if (!currentRange) return;

  const span = currentRange.to - currentRange.from;
  const newSpan = Math.max(15, Math.min(400, span + delta));
  ts.setVisibleLogicalRange({
    from: currentRange.to - newSpan,
    to: currentRange.to
  });
}

function renderAnalysisBlueprint(analysis) {
  if (!analysis) return;

  const sym = analysis.currency_symbol;
  calcCurrSymbol.textContent = sym;

  // Signal Banner
  detailSignalBadge.textContent = analysis.signal;
  detailSignalBadge.className = `signal-badge-lg badge-signal ${analysis.signal.toLowerCase().replace(" ", "-")}`;
  detailSetupTitle.textContent = analysis.setup_name;
  detailSetupDesc.textContent = analysis.setup_desc;
  
  detailScoreNum.textContent = analysis.display_score;
  scoreCircleBadge.style.borderColor = analysis.color;
  scoreCircleBadge.style.backgroundColor = `${analysis.color}18`;

  // Render Multi-Timeframe Alignment Matrix
  renderMtfMatrix(analysis.mtf_alignment);

  // Execution Levels
  const plan = analysis.trade_plan;
  planEntry.textContent = `${sym}${plan.entry_price.toFixed(2)}`;
  planActionType.textContent = plan.action;
  planActionType.style.color = plan.action === "LONG" ? "#10b981" : (plan.action === "SHORT" ? "#ef4444" : "#f59e0b");

  planSl.textContent = `${sym}${plan.stop_loss.toFixed(2)}`;
  planSlDiff.textContent = `${plan.stop_loss_pct > 0 ? "+" : ""}${plan.stop_loss_pct.toFixed(2)}% Risk`;

  planT1.textContent = `${sym}${plan.target_1.toFixed(2)}`;
  planT1Diff.textContent = `+${plan.target_1_pct.toFixed(2)}% (1:1.5)`;

  planT2.textContent = `${sym}${plan.target_2.toFixed(2)}`;
  planT2Diff.textContent = `+${plan.target_2_pct.toFixed(2)}% (1:2.5)`;

  planExecRule.textContent = plan.execution_strategy;

  // Update Position Sizing
  updatePositionSizeCalc();

  // 6-Pillar Rationale
  rationaleContainer.innerHTML = "";
  if (analysis.rationale_points && analysis.rationale_points.length > 0) {
    analysis.rationale_points.forEach(point => {
      const item = document.createElement("div");
      item.className = "rationale-item";
      item.innerHTML = point.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      rationaleContainer.appendChild(item);
    });
  }

  // Checklist
  checklistContainer.innerHTML = "";
  if (analysis.checks && analysis.checks.length > 0) {
    analysis.checks.forEach(chk => {
      const item = document.createElement("div");
      item.className = "rationale-item";
      const isPositive = chk.score.includes("+");
      const isNegative = chk.score.includes("-");
      const scoreBadgeColor = isPositive ? "#10b981" : isNegative ? "#ef4444" : "#94a3b8";

      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
          <strong style="color:var(--text-main);">${chk.factor}</strong>
          <span style="font-family:var(--font-mono); font-weight:700; color:${scoreBadgeColor};">${chk.score}</span>
        </div>
        <div>${chk.detail}</div>
      `;
      checklistContainer.appendChild(item);
    });
  }
}

function renderMtfMatrix(mtf) {
  if (!mtfMatrixContainer) return;
  if (!mtf || !mtf.timeframes) {
    mtfMatrixContainer.innerHTML = `<div style="font-size:0.7rem; color:var(--text-dim);">MTF calculating...</div>`;
    return;
  }

  const tf1 = mtf.timeframes["1m"] || {};
  const tf5 = mtf.timeframes["5m"] || {};
  const tf15 = mtf.timeframes["15m"] || {};

  function getBadgeHtml(bias) {
    const b = (bias || "NEUTRAL").toLowerCase();
    return `<span class="mtf-bias-pill ${b}">${bias}</span>`;
  }

  mtfMatrixContainer.innerHTML = `
    <div class="mtf-matrix-grid">
      <div class="mtf-card">
        <div class="mtf-tf-label">1-Min (Trigger)</div>
        <div>${getBadgeHtml(tf1.bias)}</div>
        <div class="mtf-stats">RSI ${tf1.rsi || '--'}</div>
      </div>
      <div class="mtf-card">
        <div class="mtf-tf-label">5-Min (Tactical)</div>
        <div>${getBadgeHtml(tf5.bias)}</div>
        <div class="mtf-stats">RSI ${tf5.rsi || '--'}</div>
      </div>
      <div class="mtf-card">
        <div class="mtf-tf-label">15-Min (Macro)</div>
        <div>${getBadgeHtml(tf15.bias)}</div>
        <div class="mtf-stats">RSI ${tf15.rsi || '--'}</div>
      </div>
    </div>
    <div class="mtf-confluence-banner" style="border-left-color: ${mtf.badge_color};">
      <div class="mtf-verdict-title">
        <span style="color: ${mtf.badge_color}; font-weight: 800;">${mtf.confluence_level}</span>
        <span style="font-family:var(--font-mono); font-size:0.65rem;">${mtf.confluence_score}</span>
      </div>
      <div class="mtf-verdict-text">${mtf.verdict}</div>
    </div>
  `;
}

function updatePositionSizeCalc() {
  if (!activeStockAnalysis || !activeStockAnalysis.trade_plan) return;

  const plan = activeStockAnalysis.trade_plan;
  const sym = activeStockAnalysis.currency_symbol;
  const capital = parseFloat(calcCapitalInput.value) || 100000;
  const riskPct = parseFloat(calcRiskPctInput.value) || 1.0;

  const maxRiskAmount = (capital * riskPct) / 100.0;
  const riskPerShare = plan.risk_per_share || (plan.entry_price * 0.01);

  if (riskPerShare > 0) {
    const qty = Math.max(1, Math.floor(maxRiskAmount / riskPerShare));
    calcQty.textContent = `${qty.toLocaleString()} Shares`;
    calcMaxLoss.textContent = `${sym}${maxRiskAmount.toFixed(2)} (${riskPct}%)`;
  }
}


// ============================================================================
// Session Replay Simulator
// ============================================================================
function toggleReplayMode() {
  if (isReplayActive) exitReplayMode();
  else startReplayMode();
}

function startReplayMode() {
  if (!rawChartData || !rawChartData.candles || rawChartData.candles.length < 20) {
    alert("Insufficient historical bars for session replay.");
    return;
  }

  isReplayActive = true;
  btnReplayToggle.classList.add("active");
  btnReplayToggle.innerHTML = `<span>■ Exit</span>`;
  replayBar.style.display = "flex";

  replayIndex = 25;
  applyReplayStep();
}

function applyReplayStep() {
  if (!rawChartData || !rawChartData.candles) return;
  const total = rawChartData.candles.length;

  if (replayIndex >= total) {
    pauseReplay();
    replayTimeLabel.textContent = `Completed (${total}/${total})`;
    return;
  }

  const slicedCandles = rawChartData.candles.slice(0, replayIndex);
  candleSeries.setData(slicedCandles);

  const lastTime = slicedCandles[slicedCandles.length - 1].time;
  vwapSeries.setData(rawChartData.indicators.vwap.filter(d => d.time <= lastTime));
  ema9Series.setData(rawChartData.indicators.ema9.filter(d => d.time <= lastTime));
  ema21Series.setData(rawChartData.indicators.ema21.filter(d => d.time <= lastTime));
  ema50Series.setData(rawChartData.indicators.ema50.filter(d => d.time <= lastTime));
  volumeSeries.setData(rawChartData.indicators.volume.filter(d => d.time <= lastTime));
  volMaSeries.setData(rawChartData.indicators.vol_ma.filter(d => d.time <= lastTime));
  rsiSeries.setData(rawChartData.indicators.rsi.filter(d => d.time <= lastTime));

  if (showMarkers) {
    candleSeries.setMarkers(rawChartData.markers.filter(m => m.time <= lastTime));
  }

  const curr = slicedCandles[slicedCandles.length - 1];
  const sym = activeStockAnalysis.currency_symbol || "₹";
  activePricePill.textContent = `${sym}${curr.close.toFixed(2)}`;

  replayTimeLabel.textContent = `Bar ${replayIndex} / ${total} (${new Date(lastTime * 1000).toLocaleTimeString()})`;
}

function playReplay() {
  if (replayTimer) return;
  replayPlayBtn.textContent = "Pause";
  const interval = Math.max(100, Math.floor(600 / replaySpeed));

  replayTimer = setInterval(() => {
    replayIndex++;
    if (replayIndex >= rawChartData.candles.length) {
      pauseReplay();
    } else {
      applyReplayStep();
    }
  }, interval);
}

function pauseReplay() {
  if (replayTimer) {
    clearInterval(replayTimer);
    replayTimer = null;
  }
  replayPlayBtn.textContent = "Play";
}

function exitReplayMode() {
  pauseReplay();
  isReplayActive = false;
  btnReplayToggle.classList.remove("active");
  btnReplayToggle.innerHTML = `<span>▶ Replay</span>`;
  replayBar.style.display = "none";

  if (rawChartData) {
    updateChartSeries(rawChartData);
  }
}


// ============================================================================
// Audio Alerts & Toast Utilities
// ============================================================================
function playAlertSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (e) {}
}

function showToast(message) {
  const existing = document.querySelector(".toast-notice");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast-notice";
  toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2500);
}

function copyTradePlanToClipboard() {
  if (!activeStockAnalysis || !activeStockAnalysis.trade_plan) return;

  const a = activeStockAnalysis;
  const p = a.trade_plan;
  const sym = a.currency_symbol;

  const text = `⚡ INTRADAY TRADE SETUP: ${a.ticker} (${a.signal} - Score: ${a.display_score}/100)
🎯 Strategy: ${a.setup_name}
🟢 Action: ${p.action} @ ${sym}${p.entry_price.toFixed(2)}
🛑 Day Stop Loss: ${sym}${p.stop_loss.toFixed(2)} (${p.stop_loss_pct}%)
🚀 Target 1 (Scalp 1:1.5): ${sym}${p.target_1.toFixed(2)} (+${p.target_1_pct}%)
🎯 Target 2 (Main 1:2.5): ${sym}${p.target_2.toFixed(2)} (+${p.target_2_pct}%)
⚖️ Risk:Reward: ${p.risk_reward_ratio}
💡 Rule: ${p.execution_strategy}`;

  navigator.clipboard.writeText(text).then(() => {
    showToast(`Trade setup for ${a.ticker} copied to clipboard!`);
  }).catch(() => {
    prompt("Copy trade setup:", text);
  });
}

function setMobileView(viewName) {
  document.body.classList.remove("view-radar", "view-chart", "view-analysis");
  document.body.classList.add(`view-${viewName}`);

  document.querySelectorAll(".mobile-nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });

  // Re-trigger chart resize if switching to chart view
  if (viewName === "chart" && chartViewportContainer) {
    setTimeout(() => {
      const cr = chartViewportContainer.getBoundingClientRect();
      if (cr.width > 50 && cr.height > 100) {
        resizeCharts(Math.floor(cr.width), Math.floor(cr.height));
      }
    }, 50);
  }
}


// ============================================================================
// Event Listeners & UI Controls
// ============================================================================
function setupEventListeners() {
  // Mobile Navigation Switcher
  document.querySelectorAll(".mobile-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      setMobileView(btn.dataset.view);
    });
  });

  // Theme Switcher Toggle
  btnThemeToggle.addEventListener("click", () => {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });

  // Desktop Panel Collapse Buttons
  btnToggleLeft.addEventListener("click", () => {
    leftCollapsed = !leftCollapsed;
    updatePanelLayout();
  });

  btnToggleRight.addEventListener("click", () => {
    rightCollapsed = !rightCollapsed;
    updatePanelLayout();
  });

  // Market Selector Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentMarket = btn.dataset.market;

      if (currentMarket === "CUSTOM") {
        promptCustomTickers();
      } else {
        fetchScreener(currentMarket);
      }
    });
  });

  // Filter Pills (All, Buy, Sell, High Vol, Breakout, VWAP, EMA)
  document.querySelectorAll(".filter-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentFilter = pill.dataset.filter;
      renderStockCards();
    });
  });

  // Timeframe Buttons (1m, 5m, 15m)
  document.querySelectorAll(".tf-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tf-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentTimeframe = btn.dataset.tf;
      if (currentTicker) {
        loadChartData(currentTicker, currentTimeframe);
      }
    });
  });

  // Indicator & Marker Toggles
  toggleVwapBtn.addEventListener("click", () => {
    showVWAP = !showVWAP;
    toggleVwapBtn.classList.toggle("active", showVWAP);
    vwapSeries.applyOptions({ visible: showVWAP });
  });

  toggleEmaBtn.addEventListener("click", () => {
    showEMA = !showEMA;
    toggleEmaBtn.classList.toggle("active", showEMA);
    ema9Series.applyOptions({ visible: showEMA });
    ema21Series.applyOptions({ visible: showEMA });
    ema50Series.applyOptions({ visible: showEMA });
  });

  toggleLevelsBtn.addEventListener("click", () => {
    showLevels = !showLevels;
    toggleLevelsBtn.classList.toggle("active", showLevels);
    if (showLevels && activeStockAnalysis && activeStockAnalysis.trade_plan) {
      addPriceLevels(activeStockAnalysis.trade_plan, activeStockAnalysis.currency_symbol);
    } else {
      clearPriceLevels();
    }
  });

  toggleMarkersBtn.addEventListener("click", () => {
    showMarkers = !showMarkers;
    toggleMarkersBtn.classList.toggle("active", showMarkers);
    if (candleSeries && rawChartData) {
      candleSeries.setMarkers(showMarkers ? (rawChartData.markers || []) : []);
    }
  });

  // Zoom Controls
  btnZoomIn.addEventListener("click", () => zoomCandles(-15));
  btnZoomOut.addEventListener("click", () => zoomCandles(20));
  btnFitRecent.addEventListener("click", () => fitRecentCandles(65));
  btnChartReset.addEventListener("click", () => {
    if (mainChart) mainChart.timeScale().fitContent();
    if (rsiChart) rsiChart.timeScale().fitContent();
  });

  // Manual Scan Button
  btnManualScan.addEventListener("click", () => {
    fetchScreener(currentMarket);
  });

  // Ticker Search
  btnSearchGo.addEventListener("click", handleSearchTicker);
  tickerSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSearchTicker();
  });

  // Sound Alert Toggle
  btnSoundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundIcon.textContent = soundEnabled ? "🔔" : "🔕";
    soundLabel.textContent = `Alerts: ${soundEnabled ? "On" : "Off"}`;
    if (soundEnabled) playAlertSound();
  });

  // Copy Trade Setup Button
  btnCopyPlan.addEventListener("click", copyTradePlanToClipboard);

  // Position Size Calc Input Changes
  calcCapitalInput.addEventListener("input", updatePositionSizeCalc);
  calcRiskPctInput.addEventListener("input", updatePositionSizeCalc);

  // Auto-Refresh Select
  autoRefreshSelect.addEventListener("change", setupAutoRefresh);

  // Replay Simulator Controls
  btnReplayToggle.addEventListener("click", toggleReplayMode);
  replayPlayBtn.addEventListener("click", () => {
    if (replayTimer) pauseReplay();
    else playReplay();
  });
  replayStepBtn.addEventListener("click", () => {
    pauseReplay();
    replayIndex++;
    applyReplayStep();
  });
  replaySpeedSelect.addEventListener("change", (e) => {
    replaySpeed = parseInt(e.target.value, 10);
    if (replayTimer) {
      pauseReplay();
      playReplay();
    }
  });
  replayExitBtn.addEventListener("click", exitReplayMode);
}

function updatePanelLayout() {
  terminalLayout.classList.remove("collapsed-left", "collapsed-right", "collapsed-both");

  if (leftCollapsed && rightCollapsed) {
    terminalLayout.classList.add("collapsed-both");
  } else if (leftCollapsed) {
    terminalLayout.classList.add("collapsed-left");
  } else if (rightCollapsed) {
    terminalLayout.classList.add("collapsed-right");
  }

  btnToggleLeft.innerHTML = leftCollapsed ? "<span>▶</span>" : "<span>◀</span>";
  btnToggleRight.innerHTML = rightCollapsed ? "<span>◀</span>" : "<span>▶</span>";

  // Trigger resize observer calculation
  setTimeout(() => {
    if (chartViewportContainer) {
      const cr = chartViewportContainer.getBoundingClientRect();
      resizeCharts(Math.floor(cr.width), Math.floor(cr.height));
    }
  }, 260);
}

function handleSearchTicker() {
  const sym = tickerSearchInput.value.trim().toUpperCase();
  if (!sym) return;

  selectStock(sym);
  if (window.innerWidth <= 1024) setMobileView("chart");

  if (!currentStocks.some(s => s.ticker === sym)) {
    currentStocks.unshift({
      ticker: sym,
      company_name: sym,
      price: 0,
      change_pct: 0,
      signal: "ANALYZING",
      score: 50,
      display_score: 50,
      rvol: 1.0,
      currency_symbol: sym.includes(".NS") ? "₹" : "$",
      setup_name: "Custom Search",
      trade_plan: { stop_loss: 0, target_1: 0, target_2: 0, risk_reward_ratio: "1:2" }
    });
    renderStockCards();
  }
}

function promptCustomTickers() {
  const tickersInput = prompt("Enter comma-separated stock tickers to scan:\n(e.g. INFY.NS, SBIN.NS, NVDA, TSLA, AAPL)", "RELIANCE.NS, TCS.NS, NVDA, TSLA, INFY.NS");
  if (!tickersInput) return;

  const tickers = tickersInput.split(",").map(t => t.trim().toUpperCase()).filter(t => t);
  if (tickers.length === 0) return;

  stockCardsContainer.innerHTML = `<div class="state-container"><div class="spinner"></div><p>Scanning custom tickers in parallel...</p></div>`;

  fetch("/api/custom-scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tickers })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "OK") {
      currentStocks = data.stocks;
      scanCountBadge.textContent = `${currentStocks.length} Stocks`;
      mobBadgeCount.textContent = currentStocks.length;
      renderStockCards();
      if (currentStocks.length > 0) {
        selectStock(currentStocks[0].ticker);
      }
    }
  })
  .catch(err => {
    console.error("Custom scan failed:", err);
  });
}

function setupAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }

  const secs = parseInt(autoRefreshSelect.value, 10);
  if (secs > 0) {
    autoRefreshTimer = setInterval(() => {
      if (!isReplayActive) {
        fetchScreener(currentMarket, true);
      }
    }, secs * 1000);
  }
}

async function updateMarketStatus() {
  try {
    const res = await fetch("/api/market-status");
    const data = await res.json();
    if (data.status === "OK") {
      const nse = data.nse;
      const us = data.us;
      marketStatusText.innerHTML = `
        <span style="color:${nse.is_open ? '#10b981' : '#94a3b8'};">NSE: ${nse.is_open ? 'LIVE' : 'CLOSED'}</span>
        &nbsp;|&nbsp;
        <span style="color:${us.is_open ? '#10b981' : '#94a3b8'};">US: ${us.is_open ? 'LIVE' : 'CLOSED'}</span>
      `;
    }
  } catch (err) {
    marketStatusText.textContent = "1-Min Feed Connected";
  }
}
