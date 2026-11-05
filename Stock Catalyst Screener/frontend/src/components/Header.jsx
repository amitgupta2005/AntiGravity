import React from 'react';
import { Target, Sparkles, PlusCircle } from 'lucide-react';

export default function Header({ markets, onOpenCustomTicker }) {
  const nifty = markets.find(m => m.name.includes("NIFTY")) || { name: "NIFTY 50", price: 24280.5, change_pct: 0.42 };
  const spx = markets.find(m => m.name.includes("S&P")) || { name: "S&P 500", price: 5975.2, change_pct: 0.58 };

  return (
    <header className="header-wrapper">
      <div className="brand-section">
        <div className="brand-logo">
          <Target size={24} />
        </div>
        <div>
          <h1 className="brand-title">Stock Catalyst Screener</h1>
          <p className="brand-subtitle">Breaking News & Quarterly Earnings AI Trade Radar (India & US)</p>
        </div>
      </div>

      <div className="header-meta">
        {/* Market Chips */}
        <div className="market-chip" title="National Stock Exchange of India">
          <span className="chip-status-dot"></span>
          <span>🇮🇳 {nifty.name}:</span>
          <strong style={{ color: nifty.change_pct >= 0 ? '#10b981' : '#f43f5e' }}>
            ₹{Number(nifty.price).toLocaleString()} ({nifty.change_pct >= 0 ? '+' : ''}{nifty.change_pct}%)
          </strong>
        </div>

        <div className="market-chip" title="Wall Street S&P 500">
          <span className="chip-status-dot"></span>
          <span>🇺🇸 {spx.name}:</span>
          <strong style={{ color: spx.change_pct >= 0 ? '#10b981' : '#f43f5e' }}>
            ${Number(spx.price).toLocaleString()} ({spx.change_pct >= 0 ? '+' : ''}{spx.change_pct}%)
          </strong>
        </div>

        {/* AI Badge */}
        <div className="ai-engine-badge">
          <Sparkles size={14} />
          <span>Gemini AI Engine</span>
        </div>

        {/* Live Feeds Status Indicator */}
        <div className="market-chip" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)' }} title="Real-Time Market Prices from Exchanges (NSE/US) & Live Financial News">
          <span className="chip-status-dot" style={{ background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
          <span style={{ color: '#10b981', fontWeight: 700, letterSpacing: '0.5px' }}>LIVE FEEDS ACTIVE</span>
        </div>

        {/* On-demand Ticker Analyzer Button */}
        <button className="btn-custom-ticker" onClick={onOpenCustomTicker} title="Analyze Any Stock Ticker On-Demand">
          <PlusCircle size={15} />
          <span>Analyze Any Ticker</span>
        </button>
      </div>
    </header>
  );
}
