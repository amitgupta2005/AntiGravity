/**
 * Real-Time Chart Terminal for Screened Recommendations
 * Displays interactive live candlestick/line chart and Stochastic (14,3,3) sub-chart
 * with live streaming market feed, quantitative strategy visual overlays (Entry Zone, SL, T1, T2, CMP),
 * and rapid recommendation switching.
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

import { strategyOverlayPlugin } from '../services/strategyChartPlugin.js';
import { 
  fetchStockCandles, 
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
    this.activeTimeframe = '1d'; // '1d' or '5m'
    this.isCollapsed = false;
    this.priceChart = null;
    this.stochChart = null;
    this.unsubscribeFeed = null;
    this.onStockSelect = options.onStockSelect || null;
    this.lastTickTime = Date.now();
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
      // Sort recommendations: Oversold <20 first, then Golden Crosses
      actionables.sort((a, b) => {
        const aK = a.slowK ?? 50;
        const bK = b.slowK ?? 50;
        if (aK < 20 && bK >= 20) return -1;
        if (bK < 20 && aK >= 20) return 1;
        return aK - bK;
      });
      this.recommendations = actionables;
    } else {
      // Fallback: take top 6 lowest %K stocks
      this.recommendations = [...this.allResults]
        .sort((a, b) => (a.slowK ?? 50) - (b.slowK ?? 50))
        .slice(0, 8);
    }

    // Preserve selected stock if still in recommendations, else pick first recommendation
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

    // Ensure it exists in recommendations list
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

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.render();
  }

  render() {
    if (!this.container) return;

    // Cleanup active feed & charts before re-rendering
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
    const spreadVal = stock.spread ?? (kVal - dVal);
    const strat = stock.strategy || {};
    const isShort = strat.direction === 'SHORT' || kVal > 80;

    const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');

    this.container.innerHTML = `
      <div class="rec-chart-card ${this.isCollapsed ? 'is-collapsed' : ''}" id="recChartCard">
        <!-- Top Toolbar & Recommendation Chips -->
        <div class="rec-header-toolbar">
          <div class="rec-title-wrap">
            <span class="rec-terminal-badge">
              <span class="live-pulse-radar"></span>
              <span class="font-bold">REAL-TIME CHART</span>
            </span>
            <span class="rec-heading-text font-bold">Screened Strategy Recommendations</span>
            <span class="rec-count-pill font-mono font-bold">${this.recommendations.length} Active</span>
          </div>

          <div class="rec-controls-right">
            <!-- Timeframe switcher -->
            <div class="rec-timeframe-group">
              <button class="rec-tf-btn ${this.activeTimeframe === '1d' ? 'active' : ''}" data-tf="1d" title="Daily Closing Basis (60 Bars)">
                1D Daily
              </button>
              <button class="rec-tf-btn ${this.activeTimeframe === '5m' ? 'active' : ''}" data-tf="5m" title="Intraday Live 5-Minute Stream">
                5m Intraday
              </button>
            </div>

            <!-- Screenshot button -->
            <button class="btn btn-secondary btn-xs btn-rec-action" id="recDownloadScreenshotBtn" title="Download High-Res PNG Chart Screenshot">
              <i data-lucide="camera"></i>
              <span>Save PNG</span>
            </button>

            <!-- Deep Dive modal button -->
            <button class="btn btn-secondary btn-xs btn-rec-action" id="recOpenModalBtn" title="Open Comprehensive 10-Bar Math Breakdown Modal">
              <i data-lucide="maximize-2"></i>
              <span>Deep-Dive</span>
            </button>

            <!-- Collapse toggle button -->
            <button class="btn btn-ghost btn-xs btn-collapse-rec" id="recToggleCollapseBtn" title="${this.isCollapsed ? 'Expand Chart' : 'Minimize Chart'}">
              <i data-lucide="${this.isCollapsed ? 'chevron-down' : 'chevron-up'}"></i>
            </button>
          </div>
        </div>

        <!-- Horizontal Recommendations Ribbon / Carousel -->
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
          <!-- Active Stock Real-Time Price Strip & Live Feed Beacon -->
          <div class="rec-stock-strip">
            <div class="rec-stock-left">
              <div class="rec-stock-primary">
                <span class="rec-country-flag">${isINR ? '🇮🇳' : '🇺🇸'}</span>
                <span class="rec-stock-symbol font-mono font-bold">${sym}</span>
                <span class="rec-stock-name text-dim">${name}</span>
                <span class="badge ${strat.actionBadge || (isShort ? 'badge-overbought' : 'badge-golden-cross')} font-bold">
                  ${strat.actionLabel || (isShort ? 'Overbought Short' : 'Oversold Accumulation')}
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

            <!-- Quantitative Strategy Level Summary Chips -->
            <div class="rec-strategy-kpi-grid font-mono">
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
              <div class="rec-kpi-box box-rr">
                <span class="rec-kpi-lbl">Target R:R:</span>
                <span class="rec-kpi-val text-cyan font-bold">${strat.rrRatio || '1 : 2.8'}</span>
              </div>
              <div class="rec-kpi-box box-stoch">
                <span class="rec-kpi-lbl">Stoch %K / %D:</span>
                <span class="rec-kpi-val font-bold">
                  <span class="text-cyan" id="recSlowKVal">${kVal.toFixed(1)}</span> / 
                  <span class="text-amber" id="recDVal">${dVal.toFixed(1)}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Dual Real-Time Canvas Charts Container -->
          <div class="rec-charts-wrapper">
            <!-- 1. Real-Time Price Chart with Strategy Overlays -->
            <div class="rec-chart-canvas-box">
              <div class="rec-canvas-header">
                <div class="rec-canvas-title">
                  <i data-lucide="trending-up" class="text-cyan"></i>
                  <span>Price History with Quantitative Strategy Lines (SL, Target 1, Target 2, Entry Zone)</span>
                </div>
                <div class="rec-canvas-legend font-mono">
                  <span class="legend-pill pill-sl">■ Stop Loss</span>
                  <span class="legend-pill pill-t1">■ Target 1</span>
                  <span class="legend-pill pill-t2">■ Target 2</span>
                  <span class="legend-pill pill-cmp">■ Live CMP</span>
                </div>
              </div>
              <div class="rec-canvas-container" style="height: 250px; position: relative;">
                <canvas id="recPriceChartCanvas"></canvas>
              </div>
            </div>

            <!-- 2. Real-Time Stochastic (14,3,3) Sub-Chart -->
            <div class="rec-chart-canvas-box" style="margin-top: 0.75rem;">
              <div class="rec-canvas-header">
                <div class="rec-canvas-title">
                  <i data-lucide="activity" class="text-amber"></i>
                  <span>Stochastic Oscillator (%K 14,3 Cyan | %D 3 Amber | Oversold &lt;20 | Overbought &gt;80)</span>
                </div>
                <div class="rec-canvas-legend font-mono text-dim">
                  <span>Fast %K: 14 • Smooth: 3 • Signal: 3 • Close-Only Basis</span>
                </div>
              </div>
              <div class="rec-canvas-container" style="height: 160px; position: relative;">
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

    // Timeframe switcher
    this.container.querySelectorAll('.rec-tf-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const tf = btn.getAttribute('data-tf');
        if (tf !== this.activeTimeframe) {
          this.activeTimeframe = tf;
          this.render();
        }
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

  async initCharts(stock, isDarkMode, curr) {
    const priceCanvas = document.getElementById('recPriceChartCanvas');
    const stochCanvas = document.getElementById('recStochChartCanvas');
    if (!priceCanvas || !stochCanvas) return;

    let candles = stock.history || [];
    if (this.activeTimeframe === '5m') {
      try {
        const intraday = await fetchStockCandles(stock.ticker, '1d', '5m', true);
        if (intraday && intraday.length > 5) {
          candles = intraday;
        }
      } catch (_) {}
    }

    if (!candles || candles.length === 0) {
      candles = stock.history || [];
    }

    const labels = candles.map(c => c.date);
    const closes = candles.map(c => c.close);
    const slowKs = candles.map(c => c.slowK != null ? c.slowK : 50);
    const ds = candles.map(c => c.d != null ? c.d : 50);

    const textColor = isDarkMode ? '#94a3b8' : '#64748b';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    // 1. Price Chart with Strategy Overlay Plugin
    this.priceChart = new Chart(priceCanvas, {
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
            pointHoverRadius: 6
          }
        ]
      },
      plugins: [strategyOverlayPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
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
            callbacks: {
              label: (ctx) => ` Price: ${curr}${ctx.parsed.y.toFixed(2)}`
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

    // 2. Stochastic Oscillator Sub-Chart
    this.stochChart = new Chart(stochCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `%K (14, 3)`,
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
            label: `%D (3 Signal)`,
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
        animation: { duration: 400 },
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

  startRealtimeFeed(stock, curr) {
    if (this.unsubscribeFeed) {
      this.unsubscribeFeed();
      this.unsubscribeFeed = null;
    }

    const priceEl = document.getElementById('recLivePrice');
    const changeEl = document.getElementById('recLiveChange');
    const clockEl = document.getElementById('recFeedClock');
    const dotEl = document.getElementById('recLiveDot');
    const slowKEl = document.getElementById('recSlowKVal');
    const dEl = document.getElementById('recDVal');

    this.unsubscribeFeed = subscribeRealtimeStock(stock, (tick) => {
      if (!tick || !priceEl) return;

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
        clockEl.textContent = `FEED LIVE • ${formatISTTime(new Date())}`;
      }
      if (dotEl) {
        dotEl.classList.add('pulse-tick');
        setTimeout(() => dotEl?.classList.remove('pulse-tick'), 600);
      }

      // 2. Dynamically Update Charts with new point
      if (this.priceChart && this.priceChart.data?.datasets?.[0]?.data) {
        const dataArr = this.priceChart.data.datasets[0].data;
        const lastIdx = dataArr.length - 1;
        if (lastIdx >= 0) {
          dataArr[lastIdx] = newPrice;
          // Update strategy overlay CMP line
          if (this.priceChart.options.plugins?.strategyOverlay?.strategy) {
            this.priceChart.options.plugins.strategyOverlay.strategy.currentPrice = newPrice;
          }
          this.priceChart.update('none'); // Silky 60fps update without full rebuild
        }
      }

      // 3. Recalculate and update Stochastic values on latest tick
      if (stock.history && stock.history.length > 0) {
        const lastHistory = stock.history[stock.history.length - 1];
        lastHistory.close = newPrice;
        if (newPrice > (lastHistory.high || newPrice)) lastHistory.high = newPrice;
        if (newPrice < (lastHistory.low || newPrice)) lastHistory.low = newPrice;

        const updatedSeries = calculateStochasticSeries(stock.history, {
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
              this.stochChart.update('none');
            }
          }
        }
      }
    }, 3000);
  }

  destroy() {
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
