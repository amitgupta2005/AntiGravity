/**
 * Main Application Controller
 * Orchestrates Quantitative Stochastic Screener (4, 3, 3) on a strict Closing Basis,
 * dynamic real-time live stock price streaming, auto-refresh polling,
 * Light/Dark mode switching, oversold screening (<20), multi-format exports (.xlsx, .xls, .csv),
 * and high-res chart screenshots packaging.
 */

import { createIcons, icons } from 'lucide';
import { renderKpiBar } from './components/kpiBar.js';
import { ScreenerTable } from './components/screenerTable.js';
import { setupChartModal, openStockChartModal } from './components/chartModal.js';
import { 
  exportToExcel, 
  exportToXLS, 
  exportToCSV, 
  exportPackageWithCharts 
} from './services/exporter.js';
import { 
  runBatchScreening, 
  getInstantBaselineResults 
} from './services/marketData.js';
import { DEFAULT_STOCHASTIC_PARAMS } from './quant/stochastic.js';
import { PRESET_UNIVERSES, getUniverseList } from './data/presets.js';

// Attach safe lucide helper globally with icons bundle automatically pre-configured
window.lucide = {
  createIcons: (options = {}) => {
    try {
      return createIcons({ icons, ...options });
    } catch (err) {
      console.warn('Lucide icon rendering warning:', err);
    }
  },
  icons
};

// Global Application State
const state = {
  currentUniverseKey: 'nifty50',
  screenedResults: [],
  stochasticParams: { ...DEFAULT_STOCHASTIC_PARAMS },
  activeAbortController: null,
  screenerTable: null,
  isScanning: false,
  autoRefreshEnabled: typeof localStorage !== 'undefined' ? localStorage.getItem('antigravity_auto_refresh') !== 'off' : true,
  autoRefreshIntervalSec: 30,
  secondsRemaining: 30,
  autoRefreshTimerId: null
};

// Safe Application Initialization (guards against module execution timing)
function initApp() {
  applySavedTheme();

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // Initialize Screener Table with export oversold handler
  state.screenerTable = new ScreenerTable('table-container', {
    onExportOversold: (oversoldList) => {
      exportOversoldWithCharts(oversoldList);
    }
  });

  // Setup Modals & Handlers
  setupChartModal();
  setupSettingsModal();
  setupExportDropdown();
  setupThemeToggle();
  setupUniverseSelector();
  setupOversoldQuickFilter();
  setupAutoRefresh();

  // Run initial screening on Nifty 50 with instant zero-delay baseline
  const initialUniverse = getUniverseList('nifty50');
  startScreening(initialUniverse, 'Nifty 50');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

/**
 * Start Batch Quantitative Screening with Progressive Live Streaming
 *
 * @param {Array<Object>} stocks - List of stock objects
 * @param {string} universeLabel - Human-readable universe name
 * @param {boolean} isBackgroundRefresh - True if triggered by 30s auto-refresh
 */
async function startScreening(stocks, universeLabel = '', isBackgroundRefresh = false) {
  if (!stocks || stocks.length === 0) {
    alert('No stocks available to screen.');
    return;
  }

  // Cancel prior run if in progress
  if (state.activeAbortController) {
    state.activeAbortController.abort();
  }
  state.activeAbortController = new AbortController();
  state.isScanning = true;

  const banner = document.getElementById('batchProgressBanner');
  const progressBar = document.getElementById('batchProgressBar');
  const progressText = document.getElementById('batchProgressText');
  const liveStatusText = document.getElementById('liveStatusText');
  const rescanIcon = document.getElementById('rescanIcon');

  if (rescanIcon) rescanIcon.classList.add('spin-active');

  // STEP 1: ZERO-DELAY INSTANT BASELINE DISPLAY
  // If table is currently empty or changing universe, display instant baseline so screen is NEVER blank
  if (!isBackgroundRefresh || state.screenedResults.length === 0) {
    const instantBaseline = getInstantBaselineResults(stocks, state.stochasticParams);
    state.screenedResults = instantBaseline;
    state.screenerTable.setResults(state.screenedResults);
    renderKpiBar(state.screenedResults);
    setupKpiCardClickFilters();
  }

  if (banner && !isBackgroundRefresh) {
    banner.classList.remove('hidden');
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) {
      progressText.textContent = `Analyzing ${stocks.length} stocks using Stochastic (${state.stochasticParams.kPeriod}, ${state.stochasticParams.kSmoothing}, ${state.stochasticParams.dPeriod}) Close-Basis...`;
    }
  }

  if (liveStatusText) {
    liveStatusText.textContent = 'SYNCING LIVE...';
  }

  try {
    // STEP 2: STREAMING REAL-TIME LIVE MARKET QUOTES
    const results = await runBatchScreening(
      stocks,
      state.stochasticParams,
      (completed, total, currentItem, currentResult, allCurrentResults) => {
        const pct = Math.round((completed / total) * 100);
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressText) {
          progressText.textContent = `[${completed}/${total}] Streaming live closing quote for ${currentItem.ticker}... (${pct}%)`;
        }

        // Dynamically update the row in real-time as each quote arrives
        if (currentResult && state.screenerTable) {
          state.screenerTable.updateSingleStock(currentResult, true);
          renderKpiBar(state.screenedResults);
        }
      },
      state.activeAbortController.signal
    );

    state.screenedResults = results;
    state.isScanning = false;

    // Refresh KPI card click filters
    setupKpiCardClickFilters();

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (liveStatusText) {
      liveStatusText.textContent = state.autoRefreshEnabled ? `LIVE (${nowStr})` : `SYNCED (${nowStr})`;
    }

    if (banner) banner.classList.add('hidden');
    if (rescanIcon) rescanIcon.classList.remove('spin-active');

    // Reset countdown for next auto-refresh cycle
    state.secondsRemaining = state.autoRefreshIntervalSec;
  } catch (err) {
    console.error('Batch screening encountered an error:', err);
    state.isScanning = false;
    if (banner) banner.classList.add('hidden');
    if (rescanIcon) rescanIcon.classList.remove('spin-active');
  }
}

/**
 * Setup Dynamic Auto-Refresh Polling Engine with explicit ON/OFF toggle switch
 */
function setupAutoRefresh() {
  const widget = document.getElementById('autoRefreshWidget');
  const toggleBtn = document.getElementById('autoRefreshToggleBtn');
  const btnText = document.getElementById('autoRefreshBtnText');
  const liveIndicatorDot = document.getElementById('liveIndicatorDot');
  const liveStatusText = document.getElementById('liveStatusText');

  const updateDisplay = () => {
    if (!toggleBtn || !btnText) return;

    if (state.autoRefreshEnabled) {
      toggleBtn.classList.add('active');
      toggleBtn.setAttribute('aria-checked', 'true');
      toggleBtn.title = 'Click to turn Auto Refresh OFF';
      btnText.className = 'auto-refresh-tag tag-on';
      btnText.textContent = `ON (${state.secondsRemaining}s)`;

      if (liveIndicatorDot) liveIndicatorDot.classList.remove('paused');
      if (liveStatusText && !state.isScanning) {
        liveStatusText.textContent = 'LIVE FEED';
      }
    } else {
      toggleBtn.classList.remove('active');
      toggleBtn.setAttribute('aria-checked', 'false');
      toggleBtn.title = 'Click to turn Auto Refresh ON';
      btnText.className = 'auto-refresh-tag tag-off';
      btnText.textContent = 'OFF';

      if (liveIndicatorDot) liveIndicatorDot.classList.add('paused');
      if (liveStatusText && !state.isScanning) {
        liveStatusText.textContent = 'PAUSED';
      }
    }
  };

  const toggleAutoRefresh = () => {
    state.autoRefreshEnabled = !state.autoRefreshEnabled;
    localStorage.setItem('antigravity_auto_refresh', state.autoRefreshEnabled ? 'on' : 'off');
    if (state.autoRefreshEnabled) {
      state.secondsRemaining = state.autoRefreshIntervalSec;
    }
    updateDisplay();
  };

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAutoRefresh();
    });
  }

  if (widget) {
    widget.addEventListener('click', (e) => {
      if (e.target !== toggleBtn && !toggleBtn.contains(e.target)) {
        toggleAutoRefresh();
      }
    });
  }

  // Clear any existing timer
  if (state.autoRefreshTimerId) {
    clearInterval(state.autoRefreshTimerId);
  }

  // 1-second interval loop
  state.autoRefreshTimerId = setInterval(() => {
    if (!state.autoRefreshEnabled) return;

    if (!state.isScanning) {
      state.secondsRemaining -= 1;
      if (state.secondsRemaining <= 0) {
        state.secondsRemaining = state.autoRefreshIntervalSec;
        // Trigger background live refresh
        const list = getUniverseList(state.currentUniverseKey);
        startScreening(list, PRESET_UNIVERSES[state.currentUniverseKey]?.name || state.currentUniverseKey, true);
      }
    }
    updateDisplay();
  }, 1000);

  updateDisplay();
}

/**
 * Setup Universe Dropdown & Rescan button
 */
function setupUniverseSelector() {
  const universeSelect = document.getElementById('universeSelect');
  const rescanBtn = document.getElementById('rescanUniverseBtn');
  const cancelBtn = document.getElementById('cancelBatchBtn');

  if (universeSelect) {
    universeSelect.addEventListener('change', (e) => {
      const key = e.target.value;
      state.currentUniverseKey = key;
      const list = getUniverseList(key);
      startScreening(list, PRESET_UNIVERSES[key]?.name || key);
    });
  }

  if (rescanBtn) {
    rescanBtn.addEventListener('click', () => {
      const list = getUniverseList(state.currentUniverseKey);
      startScreening(list, PRESET_UNIVERSES[state.currentUniverseKey]?.name || state.currentUniverseKey);
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (state.activeAbortController) {
        state.activeAbortController.abort();
        const banner = document.getElementById('batchProgressBanner');
        if (banner) banner.classList.add('hidden');
        state.isScanning = false;
        const rescanIcon = document.getElementById('rescanIcon');
        if (rescanIcon) rescanIcon.classList.remove('spin-active');
      }
    });
  }
}

/**
 * Setup Quick Filter Trigger for Oversold Stocks (<20)
 */
function setupOversoldQuickFilter() {
  const bannerBtn = document.getElementById('bannerFilterOversoldBtn');
  if (bannerBtn) {
    bannerBtn.addEventListener('click', () => {
      if (state.screenerTable) {
        state.screenerTable.setFilter('oversold');
        const tableCard = document.querySelector('.screener-table-card');
        if (tableCard) {
          tableCard.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }
}

/**
 * Setup interactive click filters on KPI cards
 */
function setupKpiCardClickFilters() {
  const kpiCards = document.querySelectorAll('.kpi-card[data-filter]');
  kpiCards.forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const filter = card.getAttribute('data-filter');
      if (state.screenerTable && filter) {
        state.screenerTable.setFilter(filter);
        const tableCard = document.querySelector('.screener-table-card');
        if (tableCard) {
          tableCard.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}

/**
 * Export Oversold Stocks below threshold 20 (Charts Only, nothing else)
 */
async function exportOversoldWithCharts(explicitOversoldList = null) {
  const list = explicitOversoldList || state.screenedResults.filter(s => (s.slowK ?? 50) < 20);

  if (!list || list.length === 0) {
    alert('No stocks currently identified below oversold threshold 20 in this universe.\n\nTip: You can switch universes (e.g. Nifty Next 50, US Tech) to screen for deep-discount oversold stocks.');
    return;
  }

  // Export ONLY the high-res chart screenshots (.png) in the ZIP, nothing else
  await runArchiveExport(list, 'Oversold_Stocks_Below_20', { chartsOnly: true });
}

/**
 * Export All Screened Stocks along with chart screenshots in ZIP
 */
async function exportAllWithCharts() {
  if (state.screenedResults.length === 0) {
    alert('No screened stocks available to export.');
    return;
  }
  await runArchiveExport(state.screenedResults, 'All_Screened_Stocks', { chartsOnly: false });
}

/**
 * Run Archive Export with live progress modal
 */
async function runArchiveExport(stocks, packageTitle, options = {}) {
  const modal = document.getElementById('exportProgressModal');
  const heading = document.getElementById('exportProgressHeading') || document.getElementById('exportProgressTitle');
  const sub = document.getElementById('exportProgressSubtitle');
  const text = document.getElementById('exportProgressText');
  const progressBar = document.getElementById('exportProgressBar');

  if (modal) modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  const isChartsOnly = options.chartsOnly === true;
  if (heading) heading.textContent = isChartsOnly ? `Exporting ${stocks.length} Chart Screenshots` : `Packaging ${stocks.length} Stocks + Charts`;
  if (sub) sub.textContent = isChartsOnly ? 'Generating high-resolution chart screenshots (charts only)...' : 'Generating high-resolution chart screenshots...';
  if (progressBar) progressBar.style.width = '0%';

  try {
    await exportPackageWithCharts(
      stocks,
      state.stochasticParams,
      (current, total, label) => {
        const pct = Math.round((current / total) * 100);
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (text) {
          text.textContent = `[${current}/${total}] Rendering chart for ${label} (${pct}%)...`;
        }
      },
      packageTitle,
      options
    );

    setTimeout(() => {
      if (modal) modal.classList.remove('active');
      document.body.style.overflow = '';
    }, 600);
  } catch (err) {
    console.error('Archive export failed:', err);
    alert(`Export Error: ${err.message}`);
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/**
 * Setup Export Dropdown (Excel XLSX, Excel XLS, CSV, and Chart Screenshots ZIP)
 */
function setupExportDropdown() {
  const wrapper = document.querySelector('.dropdown-wrapper');
  const toggleBtn = document.getElementById('exportDropdownBtn');
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  const exportXlsBtn = document.getElementById('exportXlsBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportOversoldZipBtn = document.getElementById('exportOversoldZipBtn');
  const exportAllZipBtn = document.getElementById('exportAllZipBtn');

  if (toggleBtn && wrapper) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      wrapper.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        wrapper.classList.remove('open');
      }
    });
  }

  // Modern Excel (.xlsx)
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      wrapper.classList.remove('open');
      if (state.screenedResults.length === 0) {
        alert('No screened results to export.');
        return;
      }
      exportToExcel(state.screenedResults, state.stochasticParams);
    });
  }

  // Excel 97-2004 Binary (.xls)
  if (exportXlsBtn) {
    exportXlsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      wrapper.classList.remove('open');
      if (state.screenedResults.length === 0) {
        alert('No screened results to export.');
        return;
      }
      exportToXLS(state.screenedResults, state.stochasticParams);
    });
  }

  // CSV (.csv)
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', (e) => {
      e.preventDefault();
      wrapper.classList.remove('open');
      if (state.screenedResults.length === 0) {
        alert('No screened results to export.');
        return;
      }
      exportToCSV(state.screenedResults, state.stochasticParams);
    });
  }

  // Oversold (<20) + Chart Screenshots (.zip)
  if (exportOversoldZipBtn) {
    exportOversoldZipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      wrapper.classList.remove('open');
      exportOversoldWithCharts();
    });
  }

  // All Screened + Chart Screenshots (.zip)
  if (exportAllZipBtn) {
    exportAllZipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      wrapper.classList.remove('open');
      exportAllWithCharts();
    });
  }
}

/**
 * Setup Settings / Parameter Modal
 */
function setupSettingsModal() {
  const modal = document.getElementById('settingsModal');
  const openBtn = document.getElementById('openSettingsBtn');
  const closeBtn = document.getElementById('closeSettingsModalBtn');
  const saveBtn = document.getElementById('saveParamsBtn');
  const resetBtn = document.getElementById('resetParamsBtn');

  if (!modal) return;

  const openModal = () => {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  const kInp = document.getElementById('paramKPeriod');
  const sInp = document.getElementById('paramKSmooth');
  const dInp = document.getElementById('paramDPeriod');
  const obInp = document.getElementById('paramOverbought');
  const osInp = document.getElementById('paramOversold');
  const closeOnlyInp = document.getElementById('paramClosingBasis');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      state.stochasticParams.kPeriod = parseInt(kInp.value, 10) || 4;
      state.stochasticParams.kSmoothing = parseInt(sInp.value, 10) || 3;
      state.stochasticParams.dPeriod = parseInt(dInp.value, 10) || 3;
      state.stochasticParams.overboughtThreshold = parseInt(obInp.value, 10) || 80;
      state.stochasticParams.oversoldThreshold = parseInt(osInp.value, 10) || 20;
      state.stochasticParams.useClosingOnly = closeOnlyInp.checked;

      // Update banner pill displays
      const pillK = document.getElementById('currentKPeriod');
      const pillS = document.getElementById('currentKSmooth');
      const pillD = document.getElementById('currentDPeriod');
      if (pillK) pillK.textContent = state.stochasticParams.kPeriod;
      if (pillS) pillS.textContent = state.stochasticParams.kSmoothing;
      if (pillD) pillD.textContent = state.stochasticParams.dPeriod;

      closeModal();

      // Trigger re-screen
      const list = getUniverseList(state.currentUniverseKey);
      startScreening(list, PRESET_UNIVERSES[state.currentUniverseKey]?.name || state.currentUniverseKey);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      kInp.value = 4;
      sInp.value = 3;
      dInp.value = 3;
      obInp.value = 80;
      osInp.value = 20;
      closeOnlyInp.checked = true;
    });
  }
}

/**
 * Apply saved theme on initial boot
 */
function applySavedTheme() {
  const saved = localStorage.getItem('antigravity_stoch_theme');
  const isLight = saved === 'light';

  document.body.classList.toggle('light-theme', isLight);
  document.body.classList.toggle('dark-theme', !isLight);

  updateThemeButtonUI(isLight);
}

/**
 * Update Theme Toggle Button UI elements
 */
function updateThemeButtonUI(isLight) {
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeToggleText');

  if (themeIcon) {
    themeIcon.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
  }
  if (themeText) {
    themeText.textContent = isLight ? 'Dark Mode' : 'Light Mode';
  }
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Setup Theme Toggle Feature (Dark / Light Mode Switching)
 */
function setupThemeToggle() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const isNowLight = document.body.classList.toggle('light-theme');
    document.body.classList.toggle('dark-theme', !isNowLight);

    localStorage.setItem('antigravity_stoch_theme', isNowLight ? 'light' : 'dark');
    updateThemeButtonUI(isNowLight);
  });
}
