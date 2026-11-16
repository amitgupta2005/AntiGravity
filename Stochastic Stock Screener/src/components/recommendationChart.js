/**
 * Real-Time Chart Terminal for Screened Recommendations
 * Displays interactive live candlestick/line chart and TradingView-style Stochastic (14,3,3) sub-chart
 * with live streaming market feed, quantitative strategy visual overlays (Entry Zone, SL, T1, T2, CMP),
 * and rapid recommendation switching.
 *
 * Defaults to Today's Intraday Price and 5-second auto-refresh with 10s and 15s options.
 */

import {
  Chart,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

Chart.register(
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
import { calculateStochasticSeries, computeEntryExitStrategy } from '../quant/stochastic.js';
import { downloadStockChartScreenshot } from '../services/chartRenderer.js';
import { openStockChartModal } from './chartModal.js';
import { formatISTTime } from '../utils/dateUtils.js';

export class RecommendationChartTerminal {
  constructor(containerId = 'recommendation-chart-container', options = {}) {
    this.container = document.getElementById(containerId);
    this.allResults = [];
    this.recommendations = [];
    this.selectedStock = null;
    this.activeTimeframe = 'today'; // 'today' (Default: Today's Price in Stochastic framework) or '1d' (Macro Daily)
    this.isCollapsed = false;
    this.priceChart = null;
    this.stochChart = null;
    this.unsubscribeFeed = null;
    this.onStockSelect = options.onStockSelect || null;
    
    // Auto-refresh cadence: 5s (Default), with 10s and 15s options
    const savedInterval = typeof localStorage !== 'undefined' 
      ? parseInt(localStorage.getItem('antigravity_rec_chart_refresh_interval'), 10) 
      : 5;
    this.refreshIntervalSec = [5, 10, 15].includes(savedInterval) ? savedInterval : 5;
    this.isFeedPaused = false;
    this.secondsUntilNextTick = this.refreshIntervalSec;
    this.countdownTimerId = null;

    // Cache for today's intraday series
    this.intradayCandlesCache = new Map();
  }

  setResults(results) {
    this.allResults = results || [];
    this.extractRecommendations();
    this.render();
  }

  extractRecommendations() {
    if (!this.allResults || this.allResults.length === 0) {
      this.recommendations = [];
      this.selectedStock = null;
      return;
    }

    // Identify actionable screened recommendations:
    // 1. Oversold (%K < 20)
    // 2. Bullish Crossovers (Golden Cross in oversold / reversal)
    // 3. Deep Oversold (%K < 10)
    // 4. Overbought Shorts (%K > 80)
    // 5. Divergence signals
    const actionables = this.allResults.filter(r => {
      const k = r.slowK ?? 50;
      const isOversold = k < 20;
      const isOverbought = k > 80;
      const isCross = (r.signalType || '').includes('CROSS') || (r.signalLabel || '').includes('Cross');
      const isDivergence = !!r.divergence;
      return isOversold || isOverbought || isCross || isDivergence;
    });

    if (actionables.length > 0) {
      actionables.sort((a, b) => {
        const aK = a.slowK ?? 50;
        const bK = b.slowK ?? 50;
        if (aK < 20 && bK >= 20) return -1;
        if (bK < 20 && aK >= 20) return 1;
        return aK - bK;
      });
      this.recommendations = actionables;
    } else {
      this.recommendations = [...this.allResults]
        .sort((a, b) => (a.slowK ?? 50) - (b.slowK ?? 50))
        .slice(0, 8);
    }

    if (this.selectedStock) {
      const sym = this.selectedStock.ticker || this.selectedStock.symbol;
      const found = this.recommendations.find(x => (x.ticker || x.symbol) === sym);
      if (found) {
        this.selectedStock = found;
      } else if (this.recommendations.length > 0) {
        this.selectedStock = this.recommendations[0];
      }
    } else if (this.recommendations.length > 0) {
      this.selectedStock = this.recommendations[0];
    }
  }

  selectStock(stock) {
    if (!stock) return;
    const sym = stock.ticker || stock.symbol;
    const item = this.allResults.find(x => (x.ticker || x.symbol) === sym) || stock;
    this.selectedStock = item;

    if (!this.recommendations.some(x => (x.ticker || x.symbol) === sym)) {
      this.recommendations.unshift(item);
    }

    if (this.isCollapsed) {
      this.isCollapsed = false;
    }

    this.render();
    if (this.container) {
      this.container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  setRefreshInterval(sec) {
    if (sec === 0) {
      // Toggle Pause / Resume
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

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.render();
  }

  render() {
    if (!this.container) return;

    this.cleanup();

    if (!this.selectedStock || this.recommendations.length === 0) {
      this.container.innerHTML = `
        <div class="rec-chart-card rec-chart-empty">
          <div class="empty-rec-icon"><i data-lucide="line-chart"></i></div>
          <div class="empty-rec-title">Live Recommendation Chart Terminal</div>
          <div class="empty-rec-desc">Screened stocks below oversold threshold 20 or with Golden Cross signals will appear here with live real-time market feeds.</div>
        </div>
      `;
      if (window.lucide?.createIcons) window.lucide.createIcons({ root: this.container });
      return;
    }

    const stock = this.selectedStock;
    const sym = stock.ticker || stock.symbol;
    const name = stock.name || sym;
    const isINR = sym.endsWith('.NS') || sym.endsWith('.BO') || stock.exchange === 'NSE';
    const curr = isINR ? '₹' : '$';
    const priceVal = stock.price ?? stock.close ?? 0;
    const chg = stock.changePct || 0;
    const isUp = chg >= 0;
    const kVal = stock.slowK ?? 50;
    const dVal = stock.d ?? 50;
    const strat = stock.strategy || {};
    const isShort = strat.direction === 'SHORT' || kVal > 80;

    // Estimate Today's Day High / Low / Open
    const dayOpen = stock.open ?? (priceVal / (1 + chg / 100));
    const dayHigh = stock.high ?? Math.max(priceVal, dayOpen * 1.012);
    const dayLow = stock.low ?? Math.min(priceVal, dayOpen * 0.988);

    const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');

    this.container.innerHTML = `
      <div class="rec-chart-card ${this.isCollapsed ? 'is-collapsed' : ''}" id="recChartCard">
        <!-- Top Toolbar & Controls -->
        <div class="rec-header-toolbar">
          <div class="rec-title-wrap">
            <span class="rec-terminal-badge">
              <span class="live-pulse-radar"></span>
              <span class="font-bold">LIVE STOCHASTIC TERMINAL</span>
            </span>
            <span class="rec-heading-text font-bold">Screened Strategy Recommendations</span>
            <span class="rec-count-pill font-mono font-bold">${this.recommendations.length} Active</span>
          </div>

          <div class="rec-controls-right">
            <!-- 1. Auto-Refresh Controls (5s Default, 10s, 15s, Pause) -->
            <div class="rec-autorefresh-container font-mono">
              <span class="rec-ar-title">
                <i data-lucide="timer" class="rec-ar-icon"></i>
                <span class="rec-ar-text">Auto-Refresh:</span>
              </span>
              <div class="rec-ar-btn-group" id="recAutoRefreshBtnGroup">
                <button class="rec-ar-btn ${this.refreshIntervalSec === 5 && !this.isFeedPaused ? 'active' : ''}" data-interval="5" title="Auto-Refresh every 5 seconds (Recommended Default)">
                  5s
                </button>
                <button class="rec-ar-btn ${this.refreshIntervalSec === 10 && !this.isFeedPaused ? 'active' : ''}" data-interval="10" title="Auto-Refresh every 10 seconds">
                  10s
                </button>
                <button class="rec-ar-btn ${this.refreshIntervalSec === 15 && !this.isFeedPaused ? 'active' : ''}" data-interval="15" title="Auto-Refresh every 15 seconds">
                  15s
                </button>
                <button class="rec-ar-btn rec-ar-pause ${this.isFeedPaused ? 'active' : ''}" data-interval="0" title="${this.isFeedPaused ? 'Resume Live Feed' : 'Pause Live Feed'}">
                  <i data-lucide="${this.isFeedPaused ? 'play' : 'pause'}"></i>
                  <span>${this.isFeedPaused ? 'Resume' : 'Pause'}</span>
                </button>
              </div>

              <!-- Live Countdown Badge -->
              <div class="rec-countdown-badge" id="recCountdownBadge" title="Next Live Market Tick">
                <span class="countdown-pulse-ring ${this.isFeedPaused ? 'paused' : ''}"></span>
                <span class="countdown-text font-mono font-bold" id="recCountdownSec">
                  ${this.isFeedPaused ? 'PAUSED' : `${this.secondsUntilNextTick}s`}
                </span>
                <div class="countdown-bar-wrap">
                  <div class="countdown-bar-fill" id="recCountdownFill" style="width: 100%;"></div>
                </div>
              </div>
            </div>

            <!-- 2. Timeframe Switcher (Default: Today's Live Intraday) -->
            <div class="rec-timeframe-group font-mono">
              <button class="rec-tf-btn ${this.activeTimeframe === 'today' ? 'active' : ''}" data-tf="today" title="Today's Live Intraday Price & Stochastic Framework">
                ⚡ Today's Live
              </button>
              <button class="rec-tf-btn ${this.activeTimeframe === '1d' ? 'active' : ''}" data-tf="1d" title="Historical Daily Closing Basis (60 Days)">
                📅 Daily (60D)
              </button>
            </div>

            <!-- 3. Screenshot & Deep-Dive Buttons -->
            <button class="btn btn-secondary btn-xs btn-rec-action" id="recDownloadScreenshotBtn" title="Download High-Res PNG Chart Screenshot">
              <i data-lucide="camera"></i>
              <span>Save PNG</span>
            </button>
            <button class="btn btn-secondary btn-xs btn-rec-action" id="recOpenModalBtn" title="Open Comprehensive 10-Bar Math Breakdown Modal">
              <i data-lucide="maximize-2"></i>
              <span>Deep-Dive</span>
            </button>
            <button class="btn btn-ghost btn-xs btn-collapse-rec" id="recToggleCollapseBtn" title="${this.isCollapsed ? 'Expand Chart' : 'Minimize Chart'}">
              <i data-lucide="${this.isCollapsed ? 'chevron-down' : 'chevron-up'}"></i>
            </button>
          </div>
        </div>

        <!-- Horizontal Recommendations Ribbon / Quick Switcher -->
        <div class="rec-chips-ribbon" id="recChipsRibbon">
          <div class="rec-chips-scroll">
            ${this.recommendations.map(r => {
              const rSym = r.ticker || r.symbol;
              const rK = r.slowK ?? 50;
              const isSelected = rSym === sym;
              const isOversold = rK < 20;
              const badgeClass = isOversold ? 'badge-oversold' : rK > 80 ? 'badge-overbought' : 'badge-cyan';
              return `
                <button class="rec-chip ${isSelected ? 'active' : ''}" data-ticker="${rSym}" title="${r.name || rSym} • %K: ${rK.toFixed(1)}">
                  <span class="rec-chip-flag">${rSym.endsWith('.NS') ? '🇮🇳' : '🇺🇸'}</span>
                  <span class="rec-chip-ticker font-mono font-bold">${rSym}</span>
                  <span class="badge ${badgeClass} rec-chip-badge">${r.signalLabel || (isOversold ? 'Oversold <20' : 'Reversal')}</span>
                  <span class="rec-chip-k font-mono ${isOversold ? 'text-cyan font-bold' : ''}">%K: ${rK.toFixed(1)}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        ${!this.isCollapsed ? `
          <!-- Active Stock Real-Time Price Strip & Today's Intraday Session Stats -->
          <div class="rec-stock-strip">
            <div class="rec-stock-left">
              <div class="rec-stock-primary">
                <span class="rec-country-flag">${isINR ? '🇮🇳' : '🇺🇸'}</span>
                <span class="rec-stock-symbol font-mono font-bold">${sym}</span>
                <span class="rec-stock-name text-dim">${name}</span>
                <span class="badge ${strat.actionBadge || (isShort ? 'badge-overbought' : 'badge-golden-cross')} font-bold">
                  ${strat.actionLabel || (isShort ? 'Overbought Short' : 'Oversold Accumulation')}
                </span>
                <span class="badge badge-cyan font-mono" id="recSessionModeBadge">
                  ${this.activeTimeframe === 'today' ? "TODAY'S INTRADAY SESSION" : 'HISTORICAL DAILY'}
                </span>
              </div>

              <!-- Live Streaming Price and Flasher -->
              <div class="rec-price-live-box">
                <span class="rec-live-price font-mono font-bold" id="recLivePrice">${curr}${priceVal.toFixed(2)}</span>
                <span class="rec-live-change font-mono font-bold ${isUp ? 'text-emerald' : 'text-rose'}" id="recLiveChange">
                  ${isUp ? '+' : ''}${chg.toFixed(2)}%
                </span>
                <div class="rec-feed-status-pill" id="recFeedStatusPill">
                  <span class="rec-live-dot" id="recLiveDot"></span>
                  <span class="font-mono" id="recFeedClock">FEED LIVE • ${formatISTTime(new Date())}</span>
                </div>
              </div>
            </div>

            <!-- Today's Session High / Low / Open Stats & Strategy Levels -->
            <div class="rec-strategy-kpi-grid font-mono">
              <div class="rec-kpi-box box-day-stats">
                <span class="rec-kpi-lbl">Today's Range (O/H/L):</span>
                <span class="rec-kpi-val text-dim">
                  <span title="Open">${curr}${Number(dayOpen).toFixed(1)}</span> / 
                  <span class="text-emerald" title="High">${curr}${Number(dayHigh).toFixed(1)}</span> / 
                  <span class="text-rose" title="Low">${curr}${Number(dayLow).toFixed(1)}</span>
                </span>
              </div>
              <div class="rec-kpi-box box-entry">
                <span class="rec-kpi-lbl">${isShort ? 'Short Entry:' : 'Buy Entry Zone:'}</span>
                <span class="rec-kpi-val ${isShort ? 'text-amber' : 'text-cyan'} font-bold">
                  ${strat.entryRangeStr || `${curr}${priceVal.toFixed(2)}`}
                </span>
              </div>
              <div class="rec-kpi-box box-sl">
                <span class="rec-kpi-lbl">🛑 Stop Loss:</span>
                <span class="rec-kpi-val text-rose font-bold">
                  ${curr}${strat.stopLoss != null ? Number(strat.stopLoss).toFixed(1) : '-'}
                  <span class="rec-kpi-sub">(${isShort ? '+' : '-'}${strat.riskPct || 0}%)</span>
                </span>
              </div>
              <div class="rec-kpi-box box-t1">
                <span class="rec-kpi-lbl">🎯 Target 1:</span>
                <span class="rec-kpi-val text-emerald font-bold">
                  ${curr}${strat.target1 != null ? Number(strat.target1).toFixed(1) : '-'}
                  <span class="rec-kpi-sub">(+${strat.target1GainPct || 0}%)</span>
                </span>
              </div>
              <div class="rec-kpi-box box-t2">
                <span class="rec-kpi-lbl">🏆 Target 2:</span>
                <span class="rec-kpi-val text-emerald font-bold">
                  ${curr}${strat.target2 != null ? Number(strat.target2).toFixed(1) : '-'}
                  <span class="rec-kpi-sub">(+${strat.target2GainPct || 0}%)</span>
                </span>
              </div>
              <div class="rec-kpi-box box-stoch">
                <span class="rec-kpi-lbl">Stoch %K / %D:</span>
                <span class="rec-kpi-val font-bold">
                  <span style="color: #2962ff;" id="recSlowKVal">${kVal.toFixed(1)}</span> / 
                  <span style="color: #ff6d00;" id="recDVal">${dVal.toFixed(1)}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Dual Synchronized Real-Time Canvas Charts -->
          <div class="rec-charts-wrapper">
            <!-- 1. Price Chart with Quantitative Strategy Overlays -->
            <div class="rec-chart-canvas-box">
              <div class="rec-canvas-header">
                <div class="rec-canvas-title">
                  <i data-lucide="trending-up" class="text-cyan"></i>
                  <span id="recPriceChartTitle">
                    ${this.activeTimeframe === 'today' ? "Today's Intraday Price Action (Market Open to Live CMP)" : "Historical Daily Closing Price (60 Days)"}
                  </span>
                </div>
                <div class="rec-canvas-legend font-mono">
                  <span class="legend-pill pill-sl">■ Stop Loss</span>
                  <span class="legend-pill pill-t1">■ Target 1</span>
                  <span class="legend-pill pill-t2">■ Target 2</span>
                  <span class="legend-pill pill-cmp">■ Live CMP</span>
                </div>
              </div>
              <div class="rec-canvas-container" style="height: 230px; position: relative;">
                <canvas id="recPriceChartCanvas"></canvas>
              </div>
            </div>

            <!-- 2. TradingView-Style Stochastic (14,3,3) Sub-Chart -->
            <div class="rec-chart-canvas-box tv-stoch-box" style="margin-top: 0.75rem;">
              <div class="rec-canvas-header">
                <div class="rec-canvas-title">
                  <i data-lucide="activity" style="color: #2962ff;"></i>
                  <span>Stochastic Framework (%K 14,3 Blue | %D 3 Orange | 20 Oversold | 80 Overbought)</span>
                </div>
                <div class="rec-canvas-legend font-mono tv-stoch-legend">
                  <span class="tv-pill-k">■ %K (Fast 14, Smooth 3)</span>
                  <span class="tv-pill-d">■ %D (Signal 3)</span>
                  <span class="tv-pill-zone">░ 20-80 Zone</span>
                </div>
              </div>
              <div class="rec-canvas-container" style="height: 175px; position: relative;">
                <canvas id="recStochChartCanvas"></canvas>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    if (window.lucide?.createIcons) {
      window.lucide.createIcons({ root: this.container });
    }

    this.attachEvents();

    if (!this.isCollapsed) {
      this.initCharts(stock, isDark, curr);
      this.startRealtimeFeed(stock, curr);
      this.startCountdownLoop();
    }
  }

  attachEvents() {
    // Recommendation Chip Click
    this.container.querySelectorAll('.rec-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        const sym = chip.getAttribute('data-ticker');
        const found = this.allResults.find(x => (x.ticker || x.symbol) === sym) ||
                      this.recommendations.find(x => (x.ticker || x.symbol) === sym);
        if (found) {
          this.selectStock(found);
          if (this.onStockSelect) this.onStockSelect(found);
        }
      });
    });

    // Timeframe switcher (Today Intraday vs Daily)
    this.container.querySelectorAll('.rec-tf-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const tf = btn.getAttribute('data-tf');
        if (tf !== this.activeTimeframe) {
          this.activeTimeframe = tf;
          this.render();
        }
      });
    });

    // Auto-Refresh interval buttons (5s, 10s, 15s, Pause)
    this.container.querySelectorAll('.rec-ar-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const val = parseInt(btn.getAttribute('data-interval'), 10);
        this.setRefreshInterval(val);
      });
    });

    // Collapse toggle
    const toggleCollapseBtn = this.container.querySelector('#recToggleCollapseBtn');
    if (toggleCollapseBtn) {
      toggleCollapseBtn.addEventListener('click', () => {
        this.toggleCollapse();
      });
    }

    // Save screenshot
    const screenshotBtn = this.container.querySelector('#recDownloadScreenshotBtn');
    if (screenshotBtn) {
      screenshotBtn.addEventListener('click', () => {
        if (this.selectedStock) {
          downloadStockChartScreenshot(this.selectedStock);
        }
      });
    }

    // Open Deep-Dive Modal
    const modalBtn = this.container.querySelector('#recOpenModalBtn');
    if (modalBtn) {
      modalBtn.addEventListener('click', () => {
        if (this.selectedStock) {
          const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
          openStockChartModal(this.selectedStock, isDark);
        }
      });
    }
  }

  updateAutoRefreshUI() {
    const btnGroup = this.container.querySelector('#recAutoRefreshBtnGroup');
    if (btnGroup) {
      btnGroup.querySelectorAll('.rec-ar-btn').forEach(b => {
        const interval = parseInt(b.getAttribute('data-interval'), 10);
        if (interval === 0) {
          b.classList.toggle('active', this.isFeedPaused);
          const icon = b.querySelector('[data-lucide]');
          const span = b.querySelector('span');
          if (icon) icon.setAttribute('data-lucide', this.isFeedPaused ? 'play' : 'pause');
          if (span) span.textContent = this.isFeedPaused ? 'Resume' : 'Pause';
        } else {
          b.classList.toggle('active', !this.isFeedPaused && this.refreshIntervalSec === interval);
        }
      });
      if (window.lucide?.createIcons) window.lucide.createIcons({ root: btnGroup });
    }

    const secEl = document.getElementById('recCountdownSec');
    const ringEl = this.container?.querySelector ? this.container.querySelector('.countdown-pulse-ring') : null;
    if (secEl) {
      secEl.textContent = this.isFeedPaused ? 'PAUSED' : `${this.secondsUntilNextTick}s`;
    }
    if (ringEl) {
      ringEl.classList.toggle('paused', this.isFeedPaused);
    }
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
      const fillEl = document.getElementById('recCountdownFill');
      if (secEl) {
        secEl.textContent = `${this.secondsUntilNextTick}s`;
      }
      if (fillEl) {
        const pct = Math.max(0, Math.min(100, (this.secondsUntilNextTick / this.refreshIntervalSec) * 100));
        fillEl.style.width = `${pct}%`;
      }
    }, 1000);
  }

  async initCharts(stock, isDarkMode, curr) {
    const priceCanvas = document.getElementById('recPriceChartCanvas');
    const stochCanvas = document.getElementById('recStochChartCanvas');
    if (!priceCanvas || !stochCanvas) return;

    let candles = [];
    const sym = stock.ticker || stock.symbol;
    const isINR = sym.endsWith('.NS') || sym.endsWith('.BO') || stock.exchange === 'NSE';

    if (this.activeTimeframe === 'today') {
      // Load Today's Intraday Session Candles
      if (this.intradayCandlesCache.has(sym)) {
        candles = this.intradayCandlesCache.get(sym);
      } else {
        try {
          const fetched = await fetchStockCandles(sym, '1d', '5m', true);
          if (fetched && fetched.length >= 10) {
            candles = fetched;
          }
        } catch (_) {}

        if (!candles || candles.length < 10) {
          candles = generateTodayIntradayCandles(sym, isINR, stock.price ?? stock.close, stock.changePct);
        }
        this.intradayCandlesCache.set(sym, candles);
      }
    } else {
      // Historical Daily Candles (60 Bars)
      candles = stock.history || [];
    }

    if (!candles || candles.length === 0) {
      candles = generateTodayIntradayCandles(sym, isINR, stock.price ?? stock.close, stock.changePct);
    }

    // Calculate Stochastic Series across the active candles
    const stochasticSeries = calculateStochasticSeries(candles, {
      kPeriod: stock.kPeriod || 14,
      kSmoothing: stock.kSmoothing || 3,
      dPeriod: stock.dPeriod || 3,
      useClosingOnly: true
    });

    const labels = candles.map(c => c.date);
    const closes = candles.map(c => c.close);
    const slowKs = stochasticSeries.map(s => s.slowK != null ? s.slowK : 50);
    const ds = stochasticSeries.map(s => s.d != null ? s.d : 50);

    const textColor = isDarkMode ? '#94a3b8' : '#64748b';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    // 1. Top Price Chart with Strategy Overlay Plugin
    this.priceChart = new Chart(priceCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: this.activeTimeframe === 'today' ? "Today's Price" : 'Closing Price',
            data: closes,
            borderColor: isDarkMode ? '#00f2fe' : '#0284c7',
            backgroundColor: isDarkMode ? 'rgba(0, 242, 254, 0.10)' : 'rgba(2, 132, 199, 0.08)',
            fill: true,
            tension: 0.18,
            borderWidth: 2,
            pointRadius: this.activeTimeframe === 'today' ? 0 : 2,
            pointHoverRadius: 5
          }
        ]
      },
      plugins: [strategyOverlayPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        layout: {
          padding: { right: 54, top: 6, bottom: 4 }
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
              title: (ctx) => `${this.activeTimeframe === 'today' ? 'Time: ' : 'Date: '}${ctx[0]?.label || ''}`,
              label: (ctx) => ` Price: ${curr}${ctx.parsed.y.toFixed(2)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'JetBrains Mono', size: 10 },
              maxTicksLimit: this.activeTimeframe === 'today' ? 12 : 10
            }
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

    // 2. Bottom TradingView-Style Stochastic (14,3,3) Oscillator Sub-Chart
    // Exact match to TradingView: Blue %K, Orange %D, 20-80 shaded band, right badges!
    const latestK = slowKs[slowKs.length - 1] ?? 50;
    const latestD = ds[ds.length - 1] ?? 50;

    this.stochChart = new Chart(stochCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `%K (14, 3)`,
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
            label: `%D (3 Signal)`,
            data: ds,
            borderColor: '#ff6d00', // TradingView Orange
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
          padding: {
            right: 54, // Space for right-axis colored floating badges (40.85 & 53.90)
            top: 6,
            bottom: 4
          }
        },
        plugins: {
          legend: { display: false }, // Rendered dynamically by tradingViewStochPlugin header
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
              title: (ctx) => `${this.activeTimeframe === 'today' ? 'Time: ' : 'Date: '}${ctx[0]?.label || ''}`,
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(2) : '-'}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'JetBrains Mono', size: 10 },
              maxTicksLimit: this.activeTimeframe === 'today' ? 12 : 10
            }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: gridColor },
            ticks: {
              stepSize: 20,
              color: textColor,
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (v) => `${Number(v).toFixed(2)}`
            }
          }
        }
      }
    });
  }

  startRealtimeFeed(stock, curr) {
    if (this.unsubscribeFeed) {
      this.unsubscribeFeed();
      this.unsubscribeFeed = null;
    }

    if (this.isFeedPaused) return;

    const priceEl = document.getElementById('recLivePrice');
    const changeEl = document.getElementById('recLiveChange');
    const clockEl = document.getElementById('recFeedClock');
    const dotEl = document.getElementById('recLiveDot');
    const slowKEl = document.getElementById('recSlowKVal');
    const dEl = document.getElementById('recDVal');

    const intervalMs = this.refreshIntervalSec * 1000;

    this.unsubscribeFeed = subscribeRealtimeStock(stock, (tick) => {
      if (!tick || !priceEl) return;

      // Reset countdown timer on each tick arrival
      this.secondsUntilNextTick = this.refreshIntervalSec;

      const newPrice = tick.price;
      const prevPrice = stock.price ?? stock.close ?? newPrice;
      const isUptick = newPrice >= prevPrice;

      // Update Stock Object State
      stock.price = newPrice;
      stock.change = tick.change;
      stock.changePct = tick.changePct;
      stock.lastUpdated = Date.now();

      // 1. Update DOM Elements with Flash Glow
      priceEl.textContent = `${curr}${newPrice.toFixed(2)}`;
      priceEl.className = `rec-live-price font-mono font-bold ${isUptick ? 'live-flash-green' : 'live-flash-red'}`;
      setTimeout(() => {
        if (priceEl) priceEl.className = 'rec-live-price font-mono font-bold';
      }, 900);

      if (changeEl) {
        const isUp = tick.changePct >= 0;
        changeEl.textContent = `${isUp ? '+' : ''}${tick.changePct.toFixed(2)}%`;
        changeEl.className = `rec-live-change font-mono font-bold ${isUp ? 'text-emerald' : 'text-rose'}`;
      }

      if (clockEl) {
        clockEl.textContent = `FEED LIVE (${this.refreshIntervalSec}s) • ${formatISTTime(new Date())}`;
      }
      if (dotEl) {
        dotEl.classList.add('pulse-tick');
        setTimeout(() => dotEl?.classList.remove('pulse-tick'), 600);
      }

      // 2. Dynamically Update Top Price Chart with new point
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

      // 3. Recalculate Stochastic on the active candles and update TradingView sub-chart
      const sym = stock.ticker || stock.symbol;
      const activeCandles = this.activeTimeframe === 'today'
        ? (this.intradayCandlesCache.get(sym) || stock.history || [])
        : (stock.history || []);

      if (activeCandles && activeCandles.length > 0) {
        const lastCandle = activeCandles[activeCandles.length - 1];
        lastCandle.close = newPrice;
        if (newPrice > (lastCandle.high || newPrice)) lastCandle.high = newPrice;
        if (newPrice < (lastCandle.low || newPrice)) lastCandle.low = newPrice;

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

          if (slowKEl) slowKEl.textContent = latestStoch.slowK.toFixed(1);
          if (dEl) dEl.textContent = latestStoch.d.toFixed(1);

          if (this.stochChart && this.stochChart.data?.datasets) {
            const kData = this.stochChart.data.datasets[0].data;
            const dData = this.stochChart.data.datasets[1].data;
            const lastIdx = kData.length - 1;
            if (lastIdx >= 0) {
              kData[lastIdx] = latestStoch.slowK;
              dData[lastIdx] = latestStoch.d;

              // Update TradingView plugin options for badges and header legend
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
  }

  cleanup() {
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

  destroy() {
    this.cleanup();
  }
}
