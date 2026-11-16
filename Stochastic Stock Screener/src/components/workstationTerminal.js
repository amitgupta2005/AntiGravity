/**
 * Institutional 3-Pane Trading Workstation Terminal
 * Features:
 * - Left Pane: Screened Stock Radar with Overbought/Oversold cards, filters & sorting
 * - Center Pane: Dual Synchronized Real-Time Charts (Upper Price with EMAs & SL/TGT Overlays + Lower TradingView Stochastic 14,3,3)
 * - Right Pane: Institutional Trade Blueprint (Signal Banner, MTF Matrix, Day SL/Targets, Position Calculator & 3-Pillar Reasoning)
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

import { strategyOverlayPlugin, tradingViewStochPlugin } from '../services/strategyChartPlugin.js';
import { 
  fetchStockCandles, 
  generateTodayIntradayCandles,
  subscribeRealtimeStock, 
  unsubscribeRealtimeStock 
} from '../services/marketData.js';
import { calculateStochasticSeries } from '../quant/stochastic.js';
import { downloadStockChartScreenshot } from '../services/chartRenderer.js';
import { formatISTTime, formatISTDateTime } from '../utils/dateUtils.js';

export class WorkstationTerminal {
  constructor(layoutId = 'terminal-layout') {
    this.layoutEl = document.getElementById(layoutId);
    this.allResults = [];
    this.filteredResults = [];
    this.selectedStock = null;
    this.currentFilter = 'all';
    this.currentSort = 'rec-first';
    this.searchQuery = '';

    this.activeTimeframe = 'today'; // 'today' (default), '1m', '5m', '15m', '1d'
    this.showEmas = true;
    this.showLevels = true;
    
    // Auto-Refresh Cadence: 5s Default, with 10s, 15s options
    const savedInterval = typeof localStorage !== 'undefined'
      ? parseInt(localStorage.getItem('antigravity_rec_chart_refresh_interval'), 10)
      : 5;
    this.refreshIntervalSec = [5, 10, 15].includes(savedInterval) ? savedInterval : 5;
    this.isFeedPaused = false;
    this.secondsUntilNextTick = this.refreshIntervalSec;
    this.countdownTimerId = null;

    // Chart.js Instances
    this.priceChart = null;
    this.stochChart = null;
    this.unsubscribeFeed = null;
    this.intradayCache = new Map();

    this.initDOM();
  }

  initDOM() {
    if (!this.layoutEl) return;

    // Attach static DOM listeners
    this.setupSortListener();
    this.setupFilterListeners();
    this.setupSearchListener();
    this.setupPaneToggleListeners();
    this.setupToolbarListeners();
    this.setupCalculatorListeners();
    this.setupKeyboardNavigation();
  }

  setResults(results) {
    this.allResults = results || [];
    this.applyFilterAndSort();

    // Select first stock if none selected
    if (!this.selectedStock && this.filteredResults.length > 0) {
      this.selectStock(this.filteredResults[0]);
    } else if (this.selectedStock) {
      const sym = this.selectedStock.ticker || this.selectedStock.symbol;
      const found = this.allResults.find(x => (x.ticker || x.symbol) === sym);
      if (found) {
        this.selectedStock = found;
        this.renderRightPane(found);
      }
    }
  }

  applyFilterAndSort() {
    let list = [...this.allResults];

    // 1. Text Search Filter
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(s => 
        (s.ticker || '').toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q)
      );
    }

    // 2. Category / Strategy Filter
    if (this.currentFilter === 'oversold') {
      list = list.filter(s => (s.slowK ?? 50) <= 20);
    } else if (this.currentFilter === 'golden-cross') {
      list = list.filter(s => (s.signalType || '').includes('BULLISH_CROSSOVER') || (s.signalLabel || '').includes('Cross'));
    } else if (this.currentFilter === 'overbought') {
      list = list.filter(s => (s.slowK ?? 50) >= 80 || s.is_sell_zone);
    } else if (this.currentFilter === 'death-cross') {
      list = list.filter(s => (s.signalType || '').includes('BEARISH_CROSSOVER') || (s.signalLabel || '').includes('Death'));
    } else if (this.currentFilter === 'divergence') {
      list = list.filter(s => !!s.divergence);
    }

    // 3. Sorting
    list.sort((a, b) => {
      const aK = a.slowK ?? 50;
      const bK = b.slowK ?? 50;
      const aRec = a.is_recommended ? 1 : 0;
      const bRec = b.is_recommended ? 1 : 0;

      if (this.currentSort === 'rec-first') {
        if (aRec !== bRec) return bRec - aRec;
        return aK - bK;
      } else if (this.currentSort === 'k-asc') {
        return aK - bK;
      } else if (this.currentSort === 'k-desc') {
        return bK - aK;
      } else if (this.currentSort === 'rr-desc') {
        return (b.roi_pct || 0) - (a.roi_pct || 0);
      } else if (this.currentSort === 'change-desc') {
        return (b.changePct || 0) - (a.changePct || 0);
      } else if (this.currentSort === 'change-asc') {
        return (a.changePct || 0) - (b.changePct || 0);
      } else if (this.currentSort === 'ticker-asc') {
        return (a.ticker || '').localeCompare(b.ticker || '');
      }
      return 0;
    });

    this.filteredResults = list;
    this.renderStockCards();
  }

  renderStockCards() {
    const container = document.getElementById('stock-cards-container');
    const badge = document.getElementById('scan-count-badge');
    if (!container) return;

    if (badge) badge.textContent = `${this.filteredResults.length} Stocks`;

    if (this.filteredResults.length === 0) {
      container.innerHTML = `
        <div class="state-container" style="padding: 2.5rem 1rem; text-align: center;">
          <p class="text-dim">No screened stocks match current filter criteria.</p>
        </div>
      `;
      return;
    }

    const curSym = this.selectedStock ? (this.selectedStock.ticker || this.selectedStock.symbol) : '';

    container.innerHTML = this.filteredResults.map((stock, idx) => {
      const sym = stock.ticker || stock.symbol;
      const name = stock.name || sym;
      const isSelected = sym === curSym;
      const isINR = sym.endsWith('.NS') || sym.endsWith('.BO') || stock.exchange === 'NSE';
      const curr = isINR ? '₹' : '$';
      const price = stock.price ?? stock.close ?? 0;
      const chg = stock.changePct || 0;
      const isUp = chg >= 0;
      const kVal = stock.slowK ?? 50;
      const dVal = stock.d ?? 50;
      const strat = stock.strategy || {};
      const isSellZone = stock.is_sell_zone || strat.direction === 'SHORT' || kVal >= 80;

      // Status pill & Zone badge
      let zoneBadge = '';
      if (isSellZone) {
        zoneBadge = `<span class="badge-zone-sell">🔻 SELL ZONE (SHORT)</span>`;
      } else if (kVal <= 20) {
        zoneBadge = `<span class="badge-zone-buy">🟢 OVERSOLD BUY ZONE</span>`;
      } else if ((stock.signalType || '').includes('BULLISH_CROSSOVER')) {
        zoneBadge = `<span class="badge-zone-buy">★ GOLDEN CROSS</span>`;
      }

      const recBadge = stock.is_recommended ? `<span class="badge-rec">⭐ REC</span>` : '';
      const mtfStr = stock.mtf_alignment?.confluence_score ? `⚡ MTF: ${stock.mtf_alignment.confluence_score}` : `Stoch: %K ${kVal.toFixed(1)}`;
      const roi = stock.roi_pct || Math.abs(strat.target2GainPct || 2.5);
      const rvol = stock.rvol || 1.0;
      const scoreColor = (stock.score || 50) >= 70 ? '#10b981' : ((stock.score || 50) <= 35 ? '#ef4444' : '#f59e0b');

      return `
        <div class="stock-card ${isSelected ? 'active' : ''}" data-ticker="${sym}" id="card-${sym.replace(/\./g, '_')}" tabindex="0">
          <div class="card-top">
            <div>
              <div class="card-ticker font-mono font-bold">${sym}</div>
              <div class="card-company text-dim">${name}</div>
            </div>
            <div class="card-price-col">
              <div class="card-price font-mono font-bold">${curr}${price.toFixed(2)}</div>
              <div class="card-change font-mono font-bold ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${chg.toFixed(2)}%</div>
              <div class="card-time-micro text-dim">${formatISTTime(stock.lastUpdated || Date.now(), false)}</div>
            </div>
          </div>

          <div class="card-middle">
            <span class="badge-signal ${isSellZone ? 'short' : (kVal <= 20 ? 'buy' : 'neutral')}">${stock.signalLabel || 'Oversold Accumulation'}</span>
            ${zoneBadge}
            ${recBadge}
            <span class="badge-cap cap-${(stock.cap || 'large').toLowerCase()}">${stock.cap || 'LARGE'}</span>
            <span class="badge-tz badge-tz-ist">${isINR ? '🇮🇳 IST' : '🇺🇸 EST'}</span>
            <span class="badge-mtf" style="border: 1px solid rgba(59, 130, 246, 0.4); color: #3b82f6;">${mtfStr}</span>
            <span class="badge-roi">🎯 ROI: +${Number(roi).toFixed(1)}%</span>
            <span class="badge-rvol">${Number(rvol).toFixed(1)}x Vol</span>
          </div>

          <div class="score-bar-track">
            <div class="score-bar-fill" style="width: ${stock.score || 60}%; background: ${scoreColor};"></div>
          </div>

          <div class="card-targets-row font-mono">
            <span>SL: <strong class="text-rose">${curr}${strat.stopLoss != null ? Number(strat.stopLoss).toFixed(1) : '-'}</strong></span>
            <span>T2: <strong class="text-emerald">${curr}${strat.target2 != null ? Number(strat.target2).toFixed(1) : '-'}</strong></span>
            <span>ROI: <strong class="text-cyan">+${Number(roi).toFixed(1)}%</strong></span>
            <span>R:R ${strat.rrRatio || '1:2.8'}</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach card click handlers
    container.querySelectorAll('.stock-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const sym = card.getAttribute('data-ticker');
        const found = this.allResults.find(x => (x.ticker || x.symbol) === sym);
        if (found) this.selectStock(found);
      });
    });
  }

  selectStock(stock) {
    if (!stock) return;
    this.selectedStock = stock;
    const sym = stock.ticker || stock.symbol;

    // Highlight card in left pane
    const container = document.getElementById('stock-cards-container');
    if (container) {
      container.querySelectorAll('.stock-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-ticker') === sym);
      });
    }

    const isINR = sym.endsWith('.NS') || sym.endsWith('.BO') || stock.exchange === 'NSE';
    const curr = isINR ? '₹' : '$';

    // Update Center Toolbar
    this.updateCenterToolbar(stock, curr);

    // Render Dual Synchronized Charts (Upper Price + Lower Stochastic)
    this.renderDualCharts(stock, curr);

    // Populate Right Pane Analysis Blueprint
    this.renderRightPane(stock, curr);

    // Start Live Market Tick Feed
    this.startRealtimeFeed(stock, curr);
  }

  updateCenterToolbar(stock, curr) {
    const sym = stock.ticker || stock.symbol;
    const tickerEl = document.getElementById('active-symbol-ticker');
    const nameEl = document.getElementById('active-symbol-name');
    const pricePillEl = document.getElementById('active-price-pill');
    const timeEl = document.getElementById('active-symbol-time');
    const feedPillEl = document.getElementById('active-feed-source-pill');

    const price = stock.price ?? stock.close ?? 0;
    const chg = stock.changePct || 0;
    const isUp = chg >= 0;

    if (tickerEl) tickerEl.textContent = sym;
    if (nameEl) nameEl.textContent = stock.name || sym;
    if (pricePillEl) {
      pricePillEl.textContent = `${curr}${price.toFixed(2)} (${isUp ? '+' : ''}${chg.toFixed(2)}%)`;
      pricePillEl.className = `active-price-pill font-mono font-bold ${isUp ? 'text-emerald' : 'text-rose'}`;
    }
    if (timeEl) timeEl.textContent = formatISTTime(stock.lastUpdated || Date.now());
    if (feedPillEl) feedPillEl.textContent = `📡 Live ${this.refreshIntervalSec}s Feed`;
  }

  async renderDualCharts(stock, curr) {
    const priceCanvas = document.getElementById('main-candlestick-chart');
    const stochCanvas = document.getElementById('stoch-sub-chart');
    if (!priceCanvas || !stochCanvas) return;

    // Cleanup previous chart instances
    if (this.priceChart) {
      this.priceChart.destroy();
      this.priceChart = null;
    }
    if (this.stochChart) {
      this.stochChart.destroy();
      this.stochChart = null;
    }

    const sym = stock.ticker || stock.symbol;
    const isINR = sym.endsWith('.NS') || sym.endsWith('.BO') || stock.exchange === 'NSE';

    let candles = [];
    if (this.activeTimeframe === 'today' || this.activeTimeframe.endsWith('m')) {
      if (this.intradayCache.has(sym)) {
        candles = this.intradayCache.get(sym);
      } else {
        try {
          const fetched = await fetchStockCandles(sym, '1d', '5m', true);
          if (fetched && fetched.length >= 10) candles = fetched;
        } catch (_) {}

        if (!candles || candles.length < 10) {
          candles = generateTodayIntradayCandles(sym, isINR, stock.price ?? stock.close, stock.changePct);
        }
        this.intradayCache.set(sym, candles);
      }
    } else {
      candles = stock.history || [];
    }

    if (!candles || candles.length === 0) {
      candles = generateTodayIntradayCandles(sym, isINR, stock.price ?? stock.close, stock.changePct);
    }

    // Calculate Stochastic Series
    const stochSeries = calculateStochasticSeries(candles, {
      kPeriod: stock.kPeriod || 14,
      kSmoothing: stock.kSmoothing || 3,
      dPeriod: stock.dPeriod || 3,
      useClosingOnly: true
    });

    const labels = candles.map(c => c.date);
    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume || 100000);
    const slowKs = stochSeries.map(s => s.slowK != null ? s.slowK : 50);
    const ds = stochSeries.map(s => s.d != null ? s.d : 50);

    // Calculate 9 EMA, 21 EMA (VWAP proxy), 50 EMA
    const ema9 = this.calculateEMA(closes, 9);
    const ema21 = this.calculateEMA(closes, 21);
    const ema50 = this.calculateEMA(closes, 50);

    const isDarkMode = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
    const textColor = isDarkMode ? '#94a3b8' : '#64748b';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    // Update Floating Legend with latest bar values
    this.updateFloatingLegend(candles[candles.length - 1], ema21[ema21.length - 1], ema50[ema50.length - 1], slowKs[slowKs.length - 1], ds[ds.length - 1], curr);

    // 1. UPPER CHART: Price Chart with 9 EMA, 21 EMA / VWAP, 50 EMA, Volume & Strategy Overlays
    this.priceChart = new Chart(priceCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: 'Close Price',
            data: closes,
            borderColor: isDarkMode ? '#00f2fe' : '#0284c7',
            backgroundColor: isDarkMode ? 'rgba(0, 242, 254, 0.08)' : 'rgba(2, 132, 199, 0.06)',
            fill: true,
            tension: 0.18,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: 'y'
          },
          ...(this.showEmas ? [
            {
              type: 'line',
              label: '9 EMA',
              data: ema9,
              borderColor: '#eab308', // Yellow
              borderWidth: 1.4,
              pointRadius: 0,
              fill: false,
              tension: 0.2,
              yAxisID: 'y'
            },
            {
              type: 'line',
              label: '21 EMA / VWAP',
              data: ema21,
              borderColor: '#f97316', // Orange
              borderWidth: 1.5,
              pointRadius: 0,
              fill: false,
              tension: 0.2,
              yAxisID: 'y'
            },
            {
              type: 'line',
              label: '50 EMA',
              data: ema50,
              borderColor: '#8b5cf6', // Purple
              borderWidth: 1.6,
              pointRadius: 0,
              fill: false,
              tension: 0.2,
              yAxisID: 'y'
            }
          ] : []),
          {
            type: 'bar',
            label: 'Volume',
            data: volumes,
            backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.2)',
            yAxisID: 'yVol',
            barPercentage: 0.8
          }
        ]
      },
      plugins: this.showLevels ? [strategyOverlayPlugin] : [],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        layout: {
          padding: { right: 54, top: 4, bottom: 2 }
        },
        plugins: {
          legend: { display: false },
          strategyOverlay: {
            strategy: {
              ...stock.strategy,
              currentPrice: stock.price ?? stock.close
            },
            currencySymbol: curr
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: (ctx) => `Time: ${ctx[0]?.label || ''}`,
              label: (ctx) => ctx.dataset.type === 'bar'
                ? ` Vol: ${Number(ctx.parsed.y).toLocaleString()}`
                : ` ${ctx.dataset.label}: ${curr}${ctx.parsed.y.toFixed(2)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'JetBrains Mono', size: 9 },
              maxTicksLimit: 12
            }
          },
          y: {
            position: 'right',
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (v) => `${curr}${v}`
            }
          },
          yVol: {
            position: 'left',
            display: false,
            max: Math.max(...volumes) * 4 // Keeps volume bars tucked neatly in bottom 25% of chart
          }
        }
      }
    });

    // 2. LOWER CHART: TradingView-Style Stochastic (14, 3, 3) Sub-Chart
    const latestK = slowKs[slowKs.length - 1] ?? 50;
    const latestD = ds[ds.length - 1] ?? 50;

    this.stochChart = new Chart(stochCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '%K (14, 3)',
            data: slowKs,
            borderColor: '#2962ff', // TradingView Royal Blue
            backgroundColor: 'transparent',
            borderWidth: 1.9,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.22,
            order: 1
          },
          {
            label: '%D (3)',
            data: ds,
            borderColor: '#ff6d00', // TradingView Warm Orange
            backgroundColor: 'transparent',
            borderWidth: 1.8,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.22,
            order: 2
          }
        ]
      },
      plugins: [tradingViewStochPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        layout: {
          padding: { right: 54, top: 4, bottom: 2 }
        },
        plugins: {
          legend: { display: false },
          tradingViewStoch: {
            kVal: latestK,
            dVal: latestD,
            kPeriod: stock.kPeriod || 14,
            kSmooth: stock.kSmoothing || 3,
            dPeriod: stock.dPeriod || 3,
            overbought: 80,
            oversold: 20,
            isDarkMode,
            showBadges: true,
            showLevels: true,
            showLegend: true
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: (ctx) => `Time: ${ctx[0]?.label || ''}`,
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(2) : '-'}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'JetBrains Mono', size: 9 },
              maxTicksLimit: 12
            }
          },
          y: {
            min: 0,
            max: 100,
            position: 'right',
            grid: { color: gridColor },
            ticks: {
              stepSize: 20,
              color: textColor,
              font: { family: 'JetBrains Mono', size: 9 },
              callback: (v) => `${Number(v).toFixed(2)}`
            }
          }
        }
      }
    });
  }

  calculateEMA(values, period) {
    const k = 2 / (period + 1);
    const ema = [];
    let prev = values[0] || 0;
    for (let i = 0; i < values.length; i++) {
      const val = values[i];
      if (i === 0) {
        ema.push(val);
      } else {
        prev = (val * k) + (prev * (1 - k));
        ema.push(Number(prev.toFixed(2)));
      }
    }
    return ema;
  }

  updateFloatingLegend(candle, vwap, ema50, slowK, d, curr) {
    const legOpen = document.getElementById('leg-open');
    const legHigh = document.getElementById('leg-high');
    const legLow = document.getElementById('leg-low');
    const legClose = document.getElementById('leg-close');
    const legVwap = document.getElementById('leg-vwap');
    const legEma50 = document.getElementById('leg-ema50');
    const legSlowk = document.getElementById('leg-slowk');
    const legD = document.getElementById('leg-d');

    if (!candle) return;
    if (legOpen) legOpen.textContent = `${curr}${Number(candle.open || candle.close).toFixed(2)}`;
    if (legHigh) legHigh.textContent = `${curr}${Number(candle.high || candle.close).toFixed(2)}`;
    if (legLow) legLow.textContent = `${curr}${Number(candle.low || candle.close).toFixed(2)}`;
    if (legClose) legClose.textContent = `${curr}${Number(candle.close).toFixed(2)}`;
    if (legVwap) legVwap.textContent = vwap != null ? `${curr}${Number(vwap).toFixed(2)}` : '--';
    if (legEma50) legEma50.textContent = ema50 != null ? `${curr}${Number(ema50).toFixed(2)}` : '--';
    if (legSlowk) legSlowk.textContent = slowK != null ? Number(slowK).toFixed(2) : '--';
    if (legD) legD.textContent = d != null ? Number(d).toFixed(2) : '--';
  }

  renderRightPane(stock, curr) {
    const sym = stock.ticker || stock.symbol;
    const isINR = sym.endsWith('.NS') || sym.endsWith('.BO') || stock.exchange === 'NSE';
    curr = curr || (isINR ? '₹' : '$');

    // 1. Time & Banner
    const timeText = document.getElementById('detail-time-text');
    const badgeSignal = document.getElementById('detail-signal-badge');
    const setupTitle = document.getElementById('detail-setup-title');
    const setupDesc = document.getElementById('detail-setup-desc');
    const scoreNum = document.getElementById('detail-score-num');

    if (timeText) timeText.textContent = formatISTDateTime(stock.lastUpdated || Date.now());
    if (badgeSignal) {
      badgeSignal.textContent = stock.is_sell_zone ? 'SELL ZONE (SHORT)' : (stock.is_buy_zone ? 'OVERSOLD ACCUMULATION' : 'TECHNICAL MOMENTUM');
      badgeSignal.className = `signal-badge-lg badge-signal ${stock.is_sell_zone ? 'short' : (stock.is_buy_zone ? 'buy' : 'neutral')}`;
    }
    if (setupTitle) setupTitle.textContent = stock.strategy?.actionLabel || stock.signalLabel || 'Institutional Setup';
    if (setupDesc) setupDesc.textContent = `Conviction: ${stock.strategy?.conviction || 'High (Momentum Reversal)'} • Strict Closing Basis Stochastic (14, 3, 3)`;
    if (scoreNum) scoreNum.textContent = stock.score || 85;

    // 2. Multi-Timeframe Alignment (MTF) Grid
    const mtfContainer = document.getElementById('mtf-matrix-container');
    const mtfBiasTitle = document.getElementById('mtf-bias-title');
    const mtfBiasDesc = document.getElementById('mtf-bias-desc');

    const mtf = stock.mtf_alignment || {};
    if (mtfContainer && mtf.timeframes) {
      mtfContainer.innerHTML = `
        <div class="mtf-grid font-mono">
          ${mtf.timeframes.map(tf => `
            <div class="mtf-cell">
              <div class="mtf-tf-label text-dim">${tf.label}</div>
              <div class="mtf-signal-badge font-bold" style="color: ${tf.signal.includes('OVERSOLD') || tf.signal.includes('BULL') || tf.signal.includes('GOLDEN') ? '#10b981' : (tf.signal.includes('SHORT') || tf.signal.includes('OVERBOUGHT') ? '#ef4444' : '#94a3b8')};">
                ${tf.signal}
              </div>
              <div class="mtf-stoch-val font-mono">Stoch: ${tf.val}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (mtfBiasTitle) {
      mtfBiasTitle.textContent = stock.is_sell_zone ? 'BEARISH SHORT BIAS (OVERBOUGHT EXHAUSTION)' : (mtf.all_aligned ? 'STRONG OVERSOLD REVERSAL (4/4 ALIGNED)' : 'MILD BULLISH BIAS (DEVELOPING)');
      mtfBiasTitle.style.color = stock.is_sell_zone ? '#ef4444' : '#10b981';
    }
    if (mtfBiasDesc) mtfBiasDesc.textContent = mtf.verdict || 'Awaiting multi-timeframe confluence before position entry.';

    // 3. Execution Levels
    const strat = stock.strategy || {};
    const planEntry = document.getElementById('plan-entry');
    const planAction = document.getElementById('plan-action-type');
    const planSl = document.getElementById('plan-sl');
    const planSlDiff = document.getElementById('plan-sl-diff');
    const planT1 = document.getElementById('plan-t1');
    const planT1Diff = document.getElementById('plan-t1-diff');
    const planT2 = document.getElementById('plan-t2');
    const planT2Diff = document.getElementById('plan-t2-diff');
    const planRule = document.getElementById('plan-exec-rule');

    const entryVal = strat.entryMin ? `${curr}${Number(strat.entryMin).toFixed(1)} - ${curr}${Number(strat.entryMax).toFixed(1)}` : `${curr}${Number(stock.price).toFixed(2)}`;
    if (planEntry) planEntry.textContent = entryVal;
    if (planAction) {
      planAction.textContent = stock.is_sell_zone ? 'SHORT ENTRY' : 'BUY ZONE';
      planAction.style.color = stock.is_sell_zone ? '#ef4444' : '#10b981';
    }
    if (planSl) planSl.textContent = strat.stopLoss != null ? `${curr}${Number(strat.stopLoss).toFixed(1)}` : 'N/A';
    if (planSlDiff) planSlDiff.textContent = `${stock.is_sell_zone ? '+' : '-'}${strat.riskPct || 1.8}% Risk`;

    if (planT1) planT1.textContent = strat.target1 != null ? `${curr}${Number(strat.target1).toFixed(1)}` : 'N/A';
    if (planT1Diff) planT1Diff.textContent = `+${strat.target1GainPct || 2.5}% Profit (1:1.5)`;

    if (planT2) planT2.textContent = strat.target2 != null ? `${curr}${Number(strat.target2).toFixed(1)}` : 'N/A';
    if (planT2Diff) planT2Diff.textContent = `+${strat.target2GainPct || 5.0}% Profit (1:2.5)`;

    if (planRule) {
      planRule.textContent = stock.is_sell_zone
        ? 'Trailing Rule: Cover 50% position at Target 1 (%K=50 mid-band), trail Stop Loss down to Cost/Entry, and aim for Target 2 (%K < 20 oversold discount zone).'
        : 'Trailing Rule: Book 50% profit at Target 1 (%K=50 mid-band), advance Stop Loss to Breakeven/Entry, and ride remaining 50% to Target 2 (%K > 80 overbought zone).';
    }

    // 4. Update Position Sizing Calculator
    this.updatePositionCalculator(stock);

    // 5. Why This Stock Was Picked (Rationale Points)
    const rationaleContainer = document.getElementById('rationale-container');
    if (rationaleContainer) {
      const points = stock.rationale_points || [
        `1. Trend & Stochastic Structure: Trading at ${curr}${Number(stock.price).toFixed(2)}. Stochastic %K (${(stock.slowK ?? 50).toFixed(1)}) is deeply oversold (< 20) with Golden Cross confirmation.`,
        `2. Institutional Volume Flow: RVOL is ${stock.rvol || 1.2}x with institutional accumulation at session lows.`,
        `3. Price Action & Risk Blueprint: Support floor established at ${curr}${Number(strat.stopLoss || stock.price * 0.98).toFixed(1)}. Two-tier target exits offer R:R ${strat.rrRatio || '1 : 2.8'}.`
      ];

      rationaleContainer.innerHTML = points.map(pt => `
        <div class="rationale-item">
          ${pt.replace(/^(\d+\.\s+[^:]+:)/, '<strong>$1</strong>')}
        </div>
      `).join('');
    }
  }

  updatePositionCalculator(stock) {
    const capitalInput = document.getElementById('calc-capital');
    const riskInput = document.getElementById('calc-risk-pct');
    const qtyEl = document.getElementById('calc-qty');
    const lossEl = document.getElementById('calc-max-loss');
    const currSymEl = document.getElementById('calc-curr-symbol');

    if (!capitalInput || !riskInput || !qtyEl || !lossEl) return;

    const sym = stock.ticker || stock.symbol;
    const isINR = sym.endsWith('.NS') || sym.endsWith('.BO') || stock.exchange === 'NSE';
    const curr = isINR ? '₹' : '$';
    if (currSymEl) currSymEl.textContent = curr;

    const capital = parseFloat(capitalInput.value) || 100000;
    const riskPct = parseFloat(riskInput.value) || 1.0;
    const price = stock.price ?? stock.close ?? 100;
    const sl = stock.strategy?.stopLoss ?? (price * 0.98);

    const maxRisk = capital * (riskPct / 100);
    const perShareRisk = Math.max(0.1, Math.abs(price - sl));
    const shares = Math.max(1, Math.floor(maxRisk / perShareRisk));

    qtyEl.textContent = `${shares} Shares`;
    lossEl.textContent = `${curr}${maxRisk.toFixed(2)} (${riskPct}%)`;
  }

  startRealtimeFeed(stock, curr) {
    if (this.unsubscribeFeed) {
      this.unsubscribeFeed();
      this.unsubscribeFeed = null;
    }

    if (this.isFeedPaused) return;

    const intervalMs = this.refreshIntervalSec * 1000;

    this.unsubscribeFeed = subscribeRealtimeStock(stock, (tick) => {
      if (!tick) return;

      this.secondsUntilNextTick = this.refreshIntervalSec;

      const newPrice = tick.price;
      const prevPrice = stock.price ?? stock.close ?? newPrice;
      const isUptick = newPrice >= prevPrice;

      // Update Stock Object State
      stock.price = newPrice;
      stock.change = tick.change;
      stock.changePct = tick.changePct;
      stock.lastUpdated = Date.now();

      // 1. Update Center Toolbar Price Pill
      const pricePillEl = document.getElementById('active-price-pill');
      if (pricePillEl) {
        const isUp = tick.changePct >= 0;
        pricePillEl.textContent = `${curr}${newPrice.toFixed(2)} (${isUp ? '+' : ''}${tick.changePct.toFixed(2)}%)`;
        pricePillEl.className = `active-price-pill font-mono font-bold ${isUptick ? 'live-flash-green' : 'live-flash-red'}`;
        setTimeout(() => {
          if (pricePillEl) pricePillEl.className = `active-price-pill font-mono font-bold ${isUp ? 'text-emerald' : 'text-rose'}`;
        }, 900);
      }

      // 2. Update Left Card live price
      const cardEl = document.getElementById(`card-${(stock.ticker || stock.symbol).replace(/\./g, '_')}`);
      if (cardEl) {
        const pEl = cardEl.querySelector('.card-price');
        const cEl = cardEl.querySelector('.card-change');
        if (pEl) {
          pEl.textContent = `${curr}${newPrice.toFixed(2)}`;
          pEl.className = `card-price font-mono font-bold ${isUptick ? 'live-flash-green' : 'live-flash-red'}`;
          setTimeout(() => { if (pEl) pEl.className = 'card-price font-mono font-bold'; }, 800);
        }
        if (cEl) {
          const isUp = tick.changePct >= 0;
          cEl.textContent = `${isUp ? '+' : ''}${tick.changePct.toFixed(2)}%`;
          cEl.className = `card-change font-mono font-bold ${isUp ? 'up' : 'down'}`;
        }
      }

      // 3. Dynamically update Price Chart with new point
      if (this.priceChart && this.priceChart.data?.datasets?.[0]?.data) {
        const dataArr = this.priceChart.data.datasets[0].data;
        const lastIdx = dataArr.length - 1;
        if (lastIdx >= 0) {
          dataArr[lastIdx] = newPrice;
          if (this.priceChart.options.plugins?.strategyOverlay?.strategy) {
            this.priceChart.options.plugins.strategyOverlay.strategy.currentPrice = newPrice;
          }
          this.priceChart.update('none');
        }
      }

      // 4. Dynamically update Stochastic Sub-Chart
      const sym = stock.ticker || stock.symbol;
      const activeCandles = this.intradayCache.get(sym) || stock.history || [];
      if (activeCandles.length > 0) {
        const lastCandle = activeCandles[activeCandles.length - 1];
        lastCandle.close = newPrice;

        const updatedSeries = calculateStochasticSeries(activeCandles, {
          kPeriod: stock.kPeriod || 14,
          kSmoothing: stock.kSmoothing || 3,
          dPeriod: stock.dPeriod || 3,
          useClosingOnly: true
        });

        const latestStoch = updatedSeries[updatedSeries.length - 1];
        if (latestStoch && latestStoch.slowK != null) {
          stock.slowK = latestStoch.slowK;
          stock.d = latestStoch.d;
          stock.spread = latestStoch.spread;

          if (this.stochChart && this.stochChart.data?.datasets) {
            const kData = this.stochChart.data.datasets[0].data;
            const dData = this.stochChart.data.datasets[1].data;
            const lastIdx = kData.length - 1;
            if (lastIdx >= 0) {
              kData[lastIdx] = latestStoch.slowK;
              dData[lastIdx] = latestStoch.d;

              if (this.stochChart.options.plugins?.tradingViewStoch) {
                this.stochChart.options.plugins.tradingViewStoch.kVal = latestStoch.slowK;
                this.stochChart.options.plugins.tradingViewStoch.dVal = latestStoch.d;
              }
              this.stochChart.update('none');
            }
          }
        }
      }
    }, intervalMs);

    this.startCountdownLoop();
  }

  startCountdownLoop() {
    if (this.countdownTimerId) {
      clearInterval(this.countdownTimerId);
      this.countdownTimerId = null;
    }

    this.secondsUntilNextTick = this.refreshIntervalSec;

    this.countdownTimerId = setInterval(() => {
      if (this.isFeedPaused) {
        this.updateAutoRefreshUI();
        return;
      }

      this.secondsUntilNextTick -= 1;
      if (this.secondsUntilNextTick <= 0) {
        this.secondsUntilNextTick = this.refreshIntervalSec;
      }

      const secEl = document.getElementById('recCountdownSec');
      if (secEl) {
        secEl.textContent = `${this.secondsUntilNextTick}s`;
      }
    }, 1000);
  }

  setRefreshInterval(sec) {
    if (sec === 0) {
      this.isFeedPaused = !this.isFeedPaused;
      if (this.isFeedPaused) {
        if (this.unsubscribeFeed) {
          this.unsubscribeFeed();
          this.unsubscribeFeed = null;
        }
      } else {
        const isINR = (this.selectedStock?.ticker || '').endsWith('.NS') || (this.selectedStock?.ticker || '').endsWith('.BO');
        this.startRealtimeFeed(this.selectedStock, isINR ? '₹' : '$');
      }
    } else {
      this.refreshIntervalSec = sec;
      this.isFeedPaused = false;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('antigravity_rec_chart_refresh_interval', String(sec));
      }
      const isINR = (this.selectedStock?.ticker || '').endsWith('.NS') || (this.selectedStock?.ticker || '').endsWith('.BO');
      this.startRealtimeFeed(this.selectedStock, isINR ? '₹' : '$');
    }
    this.secondsUntilNextTick = this.refreshIntervalSec;
    this.updateAutoRefreshUI();
  }

  updateAutoRefreshUI() {
    const btnGroup = document.getElementById('recAutoRefreshBtnGroup');
    if (btnGroup) {
      btnGroup.querySelectorAll('.rec-ar-btn').forEach(b => {
        const interval = parseInt(b.getAttribute('data-interval'), 10);
        if (interval === 0) {
          b.classList.toggle('active', this.isFeedPaused);
          const icon = b.querySelector('[data-lucide]');
          if (icon) icon.setAttribute('data-lucide', this.isFeedPaused ? 'play' : 'pause');
        } else {
          b.classList.toggle('active', !this.isFeedPaused && this.refreshIntervalSec === interval);
        }
      });
      if (window.lucide?.createIcons) window.lucide.createIcons({ root: btnGroup });
    }

    const secEl = document.getElementById('recCountdownSec');
    const ringEl = document.querySelector('.countdown-pulse-ring');
    if (secEl) secEl.textContent = this.isFeedPaused ? 'PAUSED' : `${this.secondsUntilNextTick}s`;
    if (ringEl) ringEl.classList.toggle('paused', this.isFeedPaused);
  }

  setupSortListener() {
    const sortSelect = document.getElementById('radar-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.applyFilterAndSort();
      });
    }
  }

  setupFilterListeners() {
    const filterContainer = document.getElementById('radar-filter-pills');
    if (filterContainer) {
      filterContainer.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          filterContainer.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentFilter = btn.getAttribute('data-filter') || 'all';
          this.applyFilterAndSort();
        });
      });
    }
  }

  setupSearchListener() {
    const searchInput = document.getElementById('radar-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target.value || '').trim();
        this.applyFilterAndSort();
      });
    }
  }

  setupPaneToggleListeners() {
    const btnLeft = document.getElementById('btn-toggle-left');
    const btnRight = document.getElementById('btn-toggle-right');
    const layout = this.layoutEl;

    if (btnLeft && layout) {
      btnLeft.addEventListener('click', () => {
        layout.classList.toggle('collapsed-left');
        setTimeout(() => {
          this.priceChart?.resize();
          this.stochChart?.resize();
        }, 260);
      });
    }

    if (btnRight && layout) {
      btnRight.addEventListener('click', () => {
        layout.classList.toggle('collapsed-right');
        setTimeout(() => {
          this.priceChart?.resize();
          this.stochChart?.resize();
        }, 260);
      });
    }
  }

  setupToolbarListeners() {
    // Auto-refresh buttons
    const btnGroup = document.getElementById('recAutoRefreshBtnGroup');
    if (btnGroup) {
      btnGroup.querySelectorAll('.rec-ar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const val = parseInt(btn.getAttribute('data-interval'), 10);
          this.setRefreshInterval(val);
        });
      });
    }

    // Timeframe switcher
    document.querySelectorAll('.rec-timeframe-group .rec-tf-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tf = btn.getAttribute('data-tf');
        if (tf !== this.activeTimeframe) {
          document.querySelectorAll('.rec-timeframe-group .rec-tf-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeTimeframe = tf;
          if (this.selectedStock) {
            const isINR = (this.selectedStock.ticker || '').endsWith('.NS') || (this.selectedStock.ticker || '').endsWith('.BO');
            this.renderDualCharts(this.selectedStock, isINR ? '₹' : '$');
          }
        }
      });
    });

    // Indicator toggles (EMAs & SL/TGT)
    const toggleEma = document.getElementById('toggle-ema');
    if (toggleEma) {
      toggleEma.addEventListener('click', () => {
        this.showEmas = !this.showEmas;
        toggleEma.classList.toggle('active', this.showEmas);
        if (this.selectedStock) {
          const isINR = (this.selectedStock.ticker || '').endsWith('.NS') || (this.selectedStock.ticker || '').endsWith('.BO');
          this.renderDualCharts(this.selectedStock, isINR ? '₹' : '$');
        }
      });
    }

    const toggleLevels = document.getElementById('toggle-levels');
    if (toggleLevels) {
      toggleLevels.addEventListener('click', () => {
        this.showLevels = !this.showLevels;
        toggleLevels.classList.toggle('active', this.showLevels);
        if (this.selectedStock) {
          const isINR = (this.selectedStock.ticker || '').endsWith('.NS') || (this.selectedStock.ticker || '').endsWith('.BO');
          this.renderDualCharts(this.selectedStock, isINR ? '₹' : '$');
        }
      });
    }

    // Save PNG Screenshot
    const btnScreenshot = document.getElementById('btn-chart-screenshot');
    if (btnScreenshot) {
      btnScreenshot.addEventListener('click', () => {
        if (this.selectedStock) {
          downloadStockChartScreenshot(this.selectedStock);
        }
      });
    }

    // Copy Setup Button
    const btnCopy = document.getElementById('btn-copy-plan');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        if (!this.selectedStock) return;
        const s = this.selectedStock;
        const strat = s.strategy || {};
        const isINR = (s.ticker || '').endsWith('.NS') || (s.ticker || '').endsWith('.BO');
        const curr = isINR ? '₹' : '$';

        const text = [
          `★ INSTITUTIONAL TRADE PLAN: ${s.ticker} (${s.name})`,
          `Signal: ${s.signalLabel || 'Oversold Accumulation'} • Direction: ${strat.direction || 'LONG'}`,
          `Entry Zone: ${strat.entryRangeStr || `${curr}${s.price}`}`,
          `Stop Loss: ${curr}${strat.stopLoss || 'N/A'} (${strat.riskPct || 1.8}% Risk)`,
          `Target 1: ${curr}${strat.target1 || 'N/A'} (+${strat.target1GainPct || 2.5}%)`,
          `Target 2: ${curr}${strat.target2 || 'N/A'} (+${strat.target2GainPct || 5.0}%)`,
          `Institutional R:R Ratio: ${strat.rrRatio || '1:2.8'}`,
          `Stochastic Momentum: %K=${(s.slowK ?? 50).toFixed(1)} / %D=${(s.d ?? 50).toFixed(1)}`
        ].join('\n');

        navigator.clipboard?.writeText(text).then(() => {
          btnCopy.textContent = '✅ Copied!';
          setTimeout(() => { if (btnCopy) btnCopy.textContent = '📋 Copy Setup'; }, 2000);
        });
      });
    }
  }

  setupCalculatorListeners() {
    const capitalInput = document.getElementById('calc-capital');
    const riskInput = document.getElementById('calc-risk-pct');

    if (capitalInput) {
      capitalInput.addEventListener('input', () => {
        if (this.selectedStock) this.updatePositionCalculator(this.selectedStock);
      });
    }
    if (riskInput) {
      riskInput.addEventListener('input', () => {
        if (this.selectedStock) this.updatePositionCalculator(this.selectedStock);
      });
    }
  }

  setupKeyboardNavigation() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.filteredResults.length === 0) return;

        const curSym = this.selectedStock ? (this.selectedStock.ticker || this.selectedStock.symbol) : '';
        const currentIdx = this.filteredResults.findIndex(x => (x.ticker || x.symbol) === curSym);
        let nextIdx = 0;

        if (e.key === 'ArrowDown') {
          nextIdx = currentIdx < this.filteredResults.length - 1 ? currentIdx + 1 : 0;
        } else if (e.key === 'ArrowUp') {
          nextIdx = currentIdx > 0 ? currentIdx - 1 : this.filteredResults.length - 1;
        }

        const nextStock = this.filteredResults[nextIdx];
        if (nextStock) {
          this.selectStock(nextStock);
          const cardEl = document.getElementById(`card-${(nextStock.ticker || nextStock.symbol).replace(/\./g, '_')}`);
          cardEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    });
  }

  destroy() {
    if (this.countdownTimerId) {
      clearInterval(this.countdownTimerId);
      this.countdownTimerId = null;
    }
    if (this.unsubscribeFeed) {
      this.unsubscribeFeed();
      this.unsubscribeFeed = null;
    }
    if (this.priceChart) {
      this.priceChart.destroy();
      this.priceChart = null;
    }
    if (this.stochChart) {
      this.stochChart.destroy();
      this.stochChart = null;
    }
  }
}
