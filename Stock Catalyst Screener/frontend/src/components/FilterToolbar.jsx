import React from 'react';
import { Search, RotateCw, Globe, Zap, Rocket, Filter, Activity } from 'lucide-react';

export default function FilterToolbar({
  market,
  setMarket,
  timeframe,
  setTimeframe,
  direction,
  setDirection,
  search,
  setSearch,
  onRefresh,
  loading,
  autoScan,
  setAutoScan,
  isAutoScanActive
}) {
  return (
    <div className="toolbar-container">
      {/* Top Controls Row */}
      <div className="toolbar-row">
        {/* Market Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>MARKET:</span>
          <div className="segmented-group">
            <button
              className={`segmented-btn ${market === 'All' ? 'active' : ''}`}
              onClick={() => setMarket('All')}
            >
              <Globe size={14} />
              <span>All Markets</span>
            </button>
            <button
              className={`segmented-btn ${market === 'India' ? 'active' : ''}`}
              onClick={() => setMarket('India')}
            >
              <span>🇮🇳 India (NSE)</span>
            </button>
            <button
              className={`segmented-btn ${market === 'US' ? 'active' : ''}`}
              onClick={() => setMarket('US')}
            >
              <span>🇺🇸 US (NYSE/NASDAQ)</span>
            </button>
          </div>
        </div>

        {/* Timeframe Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>TIMEFRAME:</span>
          <div className="segmented-group">
            <button
              className={`segmented-btn ${timeframe === 'All' ? 'active' : ''}`}
              onClick={() => setTimeframe('All')}
            >
              <span>All Horizons</span>
            </button>
            <button
              className={`segmented-btn ${timeframe === 'Intraday' ? 'active' : ''}`}
              onClick={() => setTimeframe('Intraday')}
            >
              <Zap size={14} color="#f59e0b" />
              <span>Intraday (0-3%)</span>
            </button>
            <button
              className={`segmented-btn ${timeframe === 'Short-term' ? 'active' : ''}`}
              onClick={() => setTimeframe('Short-term')}
            >
              <Rocket size={14} color="#a855f7" />
              <span>Short-Term (10-50%)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Controls Row: Direction, Search, Auto-Scan & Refresh */}
      <div className="toolbar-row">
        {/* Direction Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>BIAS:</span>
          <div className="segmented-group">
            <button
              className={`segmented-btn ${direction === 'All' ? 'active' : ''}`}
              onClick={() => setDirection('All')}
            >
              <span>All</span>
            </button>
            <button
              className={`segmented-btn ${direction === 'BUY' ? 'active' : ''}`}
              onClick={() => setDirection('BUY')}
              style={{ color: direction === 'BUY' ? '#10b981' : undefined }}
            >
              <span>BUY (Long)</span>
            </button>
            <button
              className={`segmented-btn ${direction === 'SELL' ? 'active' : ''}`}
              onClick={() => setDirection('SELL')}
              style={{ color: direction === 'SELL' ? '#f43f5e' : undefined }}
            >
              <span>SELL (Short)</span>
            </button>
          </div>
        </div>

        {/* Search Omnibar */}
        <div className="search-box-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search ticker, company, or catalyst (e.g. NVDA, Q2 PAT, Defense)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Auto-Scan 5s Status / Toggle Button */}
        <button
          type="button"
          className={`btn-auto-scan ${isAutoScanActive ? 'active' : 'paused'}`}
          onClick={() => setAutoScan(prev => !prev)}
          title={isAutoScanActive ? "Auto-Scan active: Scanning live exchange feeds every 5 seconds (Click to pause)" : "Auto-Scan paused: Click to enable 5s live exchange scanning"}
        >
          <span className="pulse-beacon"></span>
          <Activity size={14} />
          <span>{isAutoScanActive ? 'Auto-Scan: 5s' : 'Auto-Scan: Off'}</span>
        </button>

        {/* Re-scan / Refresh Button */}
        <button
          className={`btn-refresh ${loading ? 'loading' : ''}`}
          onClick={onRefresh}
          disabled={loading}
          title="Fetch latest live market quotes and re-evaluate news"
        >
          <RotateCw size={15} />
          <span>{loading ? 'Scanning News...' : 'Scan Live Catalysts'}</span>
        </button>
      </div>
    </div>
  );
}
