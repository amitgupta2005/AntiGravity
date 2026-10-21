/**
 * Main Application Controller
 * Orchestrates Quantitative Stochastic Screener (4, 3, 3), document upload pipeline,
 * batch queue, interactive tables, charts, and export actions.
 */

import * as lucide from 'lucide';
import { renderKpiBar } from './components/kpiBar.js';
import { ScreenerTable } from './components/screenerTable.js';
import { setupUploadModal } from './components/uploadModal.js';
import { setupChartModal } from './components/chartModal.js';
import { exportToExcel, exportToCSV } from './services/exporter.js';
import { runBatchScreening } from './services/marketData.js';
import { DEFAULT_STOCHASTIC_PARAMS } from './quant/stochastic.js';
import { PRESET_UNIVERSES, getUniverseList } from './data/presets.js';

// Attach lucide globally
window.lucide = lucide;

// Global Application State
const state = {
  currentUniverseKey: 'nifty50',
  customStockList: null,
  customListName: '',
  screenedResults: [],
  stochasticParams: { ...DEFAULT_STOCHASTIC_PARAMS },
  activeAbortController: null,
  screenerTable: null,
  isScanning: false
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // Initialize Screener Table
  state.screenerTable = new ScreenerTable('table-container');

  // Setup Modals
  setupUploadModal(handleUploadedStocks);
  setupChartModal();
  setupSettingsModal();
  setupExportDropdown();
  setupThemeToggle();
  setupUniverseSelector();

  // Run initial screening on Nifty 50
  const initialUniverse = getUniverseList('nifty50');
  startScreening(initialUniverse, 'Nifty 50');
});

/**
 * Start Batch Quantitative Screening
 */
async function startScreening(stocks, universeLabel = '') {
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

  if (banner) banner.classList.remove('hidden');
  if (progressBar) progressBar.style.width = '0%';
  if (progressText) {
    progressText.textContent = `Analyzing ${stocks.length} stocks using Stochastic (${state.stochasticParams.kPeriod}, ${state.stochasticParams.kSmoothing}, ${state.stochasticParams.dPeriod}) Close-Basis...`;
  }

  // Temporary clear table during first batch run
  state.screenerTable.setResults([]);
  renderKpiBar([]);

  try {
    const results = await runBatchScreening(
      stocks,
      state.stochasticParams,
      (completed, total, currentItem, currentResult) => {
        const pct = Math.round((completed / total) * 100);
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressText) {
          progressText.textContent = `[${completed}/${total}] Screening ${currentItem.ticker} on closing basis... (${pct}%)`;
        }
      },
      state.activeAbortController.signal
    );

    state.screenedResults = results;
    state.isScanning = false;

    // Render Table & KPI Bar
    state.screenerTable.setResults(results);
    renderKpiBar(results);

    if (banner) banner.classList.add('hidden');
  } catch (err) {
    console.error('Batch screening encountered an error:', err);
    state.isScanning = false;
    if (banner) banner.classList.add('hidden');
  }
}

/**
 * Handle Custom Stocks List uploaded by user (.xlsx or .csv)
 */
function handleUploadedStocks(uploadedData) {
  state.customStockList = uploadedData.stocks;
  state.customListName = uploadedData.fileName;

  const universeSelect = document.getElementById('universeSelect');
  const customOption = document.getElementById('customUniverseOption');

  if (customOption) {
    customOption.disabled = false;
    customOption.textContent = `📄 ${uploadedData.fileName} (${uploadedData.validCount} Stocks)`;
  }
  if (universeSelect) {
    universeSelect.value = 'custom';
  }

  state.currentUniverseKey = 'custom';
  startScreening(state.customStockList, uploadedData.fileName);
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

      if (key === 'custom' && state.customStockList) {
        startScreening(state.customStockList, state.customListName);
      } else {
        const list = getUniverseList(key);
        startScreening(list, PRESET_UNIVERSES[key]?.name || key);
      }
    });
  }

  if (rescanBtn) {
    rescanBtn.addEventListener('click', () => {
      if (state.currentUniverseKey === 'custom' && state.customStockList) {
        startScreening(state.customStockList, state.customListName);
      } else {
        const list = getUniverseList(state.currentUniverseKey);
        startScreening(list, PRESET_UNIVERSES[state.currentUniverseKey]?.name || state.currentUniverseKey);
      }
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (state.activeAbortController) {
        state.activeAbortController.abort();
        const banner = document.getElementById('batchProgressBanner');
        if (banner) banner.classList.add('hidden');
        state.isScanning = false;
      }
    });
  }
}

/**
 * Setup Export Dropdown (Excel & CSV)
 */
function setupExportDropdown() {
  const wrapper = document.querySelector('.dropdown-wrapper');
  const toggleBtn = document.getElementById('exportDropdownBtn');
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

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

  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      wrapper.classList.remove('open');
      if (state.screenedResults.length === 0) {
        alert('No screened results to export.');
        return;
      }
      exportToExcel(state.screenedResults, `Stochastic_4_3_3_Screen_${Date.now()}.xlsx`);
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', (e) => {
      e.preventDefault();
      wrapper.classList.remove('open');
      if (state.screenedResults.length === 0) {
        alert('No screened results to export.');
        return;
      }
      exportToCSV(state.screenedResults, `Stochastic_4_3_3_Screen_${Date.now()}.csv`);
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
      if (state.currentUniverseKey === 'custom' && state.customStockList) {
        startScreening(state.customStockList, state.customListName);
      } else {
        const list = getUniverseList(state.currentUniverseKey);
        startScreening(list, PRESET_UNIVERSES[state.currentUniverseKey]?.name || state.currentUniverseKey);
      }
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
 * Setup Theme Toggle (Dark / Light)
 */
function setupThemeToggle() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');

  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-theme');
    document.body.classList.toggle('dark-theme', !isLight);

    if (themeIcon) {
      themeIcon.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
  });
}
