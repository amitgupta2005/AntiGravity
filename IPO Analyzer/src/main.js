/**
 * IPO Analyzer — Main Application Controller
 * Orchestrates real-time data feeds, reactive tab views, and live market updates.
 */

import { IPO_UNIVERSE } from './data/ipoUniverse.js';
import { MarketDataFeed } from './data/marketDataFeed.js';
import { IpoRadarView } from './components/ipoRadarView.js';
import { GmpTrackerView } from './components/gmpTrackerView.js';
import { RedFlagScanner } from './components/redFlagScanner.js';
import { IpoCustomAnalyzer } from './components/ipoCustomAnalyzer.js';
import { showToast } from './components/toast.js';

class IpoAnalyzerApp {
  constructor() {
    this.universe = [...IPO_UNIVERSE];
    this.marketFeed = MarketDataFeed;
    this.activeTab = 'radar';

    this.radarView = null;
    this.gmpView = null;
    this.scannerView = null;
    this.customAnalyzer = null;
  }

  async init() {
    console.log('🚀 Initializing IPO Analyzer Terminal with Live Real-Time Feeds...');

    // Initialize all views with marketFeed dependency
    this.radarView = new IpoRadarView({
      containerId: 'tab-radar',
      universe: this.universe,
      marketFeed: this.marketFeed
    });
    this.radarView.render();

    this.gmpView = new GmpTrackerView({
      containerId: 'tab-gmp',
      universe: this.universe,
      marketFeed: this.marketFeed
    });

    this.scannerView = new RedFlagScanner({
      containerId: 'tab-scanner',
      universe: this.universe,
      marketFeed: this.marketFeed
    });

    this.customAnalyzer = new IpoCustomAnalyzer({
      containerId: 'tab-analyzer',
      marketFeed: this.marketFeed,
      onEvaluated: (customIpo, evaluation) => {
        // Add custom IPO to active universe session
        const exists = this.universe.some(u => u.ticker === customIpo.ticker);
        if (!exists) {
          this.universe.unshift(customIpo);
          this.radarView.universe = this.universe;
          this.radarView.recalculateEvaluations();
          this.radarView.render();
          this.gmpView.updateUniverse(this.universe);
          this.scannerView.updateUniverse(this.universe);
          showToast(`Added ${customIpo.ticker} to Active Live Terminal Session`, 'info');
        }
      }
    });

    // Start centralized real-time market data feed engine
    this.marketFeed.init(this.universe);

    // Subscribe all views to live real-time market events
    this.setupRealtimeDataSubscribers();

    // Setup global sync and navigation controls
    this.setupGlobalHeaderControls();
    this.setupTabNavigation();

    showToast('Live Real-Time Data Feed Active Across Terminal', 'success');
  }

  setupRealtimeDataSubscribers() {
    this.marketFeed.subscribe(payload => {
      if (payload.type === 'LIVE_DATA_SYNC') {
        const { timestamp, vix, universe } = payload;

        // 1. Update Global Header Real-Time Metrics
        const inVixEl = document.getElementById('header-india-vix-val');
        if (inVixEl && vix?.indiaVix?.value) {
          inVixEl.innerText = vix.indiaVix.value.toFixed(2);
        }

        const usVixEl = document.getElementById('header-us-vix-val');
        if (usVixEl && vix?.usVix?.value) {
          usVixEl.innerText = vix.usVix.value.toFixed(2);
        }

        const syncTimeEl = document.getElementById('header-sync-timestamp');
        if (syncTimeEl) {
          syncTimeEl.innerText = timestamp;
        }

        // 2. Reactively Update Active Views
        if (this.radarView) {
          this.radarView.universe = universe;
          this.radarView.lastSynced = timestamp;
          this.radarView.recalculateEvaluations();
          if (this.activeTab === 'radar') {
            this.radarView.render();
          }
        }

        if (this.gmpView) {
          this.gmpView.updateUniverse(universe, timestamp);
        }

        if (this.scannerView) {
          this.scannerView.updateUniverse(universe, timestamp);
        }
      }
    });
  }

  setupGlobalHeaderControls() {
    const globalSyncBtn = document.getElementById('btn-global-live-sync');
    if (globalSyncBtn) {
      globalSyncBtn.addEventListener('click', async () => {
        globalSyncBtn.classList.add('loading');
        globalSyncBtn.innerText = 'Syncing...';
        await this.marketFeed.syncAll(true);
        globalSyncBtn.innerText = '🔄 Sync Live';
        globalSyncBtn.classList.remove('loading');
        showToast('Global Live Real-Time Feed Synced Across Terminal', 'success');
      });
    }
  }

  setupTabNavigation() {
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    const panes = {
      radar: document.getElementById('tab-radar'),
      gmp: document.getElementById('tab-gmp'),
      scanner: document.getElementById('tab-scanner'),
      analyzer: document.getElementById('tab-analyzer')
    };

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (targetTab === this.activeTab) return;

        // Switch active button class
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Hide all panes
        Object.values(panes).forEach(pane => {
          if (pane) pane.style.display = 'none';
        });

        // Show target pane
        if (panes[targetTab]) {
          panes[targetTab].style.display = 'block';
        }

        this.activeTab = targetTab;

        // Render target view dynamically with latest state
        if (targetTab === 'radar') {
          this.radarView.render();
        } else if (targetTab === 'gmp') {
          this.gmpView.render();
        } else if (targetTab === 'scanner') {
          this.scannerView.render();
        } else if (targetTab === 'analyzer') {
          this.customAnalyzer.render();
        }
      });
    });
  }
}

// Bootstrap app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new IpoAnalyzerApp();
  app.init().catch(err => {
    console.error('Fatal initialization error:', err);
    showToast('Error initializing terminal feeds', 'error');
  });
});
