import React, { useState } from 'react';
import { X, Search, Sparkles, AlertCircle } from 'lucide-react';
import { analyzeCustomStockOnDemand } from '../services/catalystEngine';

export default function TickerAnalyzerModal({ isOpen, onClose, onAnalyzeComplete }) {
  const [tickerInput, setTickerInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const sym = tickerInput.trim().toUpperCase();
    if (!sym) return;

    setLoading(true);
    setError(null);

    try {
      const data = await analyzeCustomStockOnDemand(sym);
      onAnalyzeComplete(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Error analyzing ticker. Please check the symbol and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#06b6d4" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Analyze Custom Ticker</h2>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Enter any stock symbol across <strong>NSE India</strong> (e.g. <code>RELIANCE</code>, <code>TCS</code>, <code>TRENT</code>) or <strong>US Markets</strong> (e.g. <code>NVDA</code>, <code>TSLA</code>, <code>PLTR</code>) to run on-demand AI catalyst & risk analysis.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="search-input"
              style={{ paddingLeft: '40px', fontSize: '1rem', textTransform: 'uppercase' }}
              placeholder="e.g. NVDA, RELIANCE, TRENT, TSLA"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              autoFocus
            />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f43f5e', fontSize: '0.8125rem', marginBottom: '14px', background: 'rgba(244, 63, 94, 0.1)', padding: '8px 12px', borderRadius: '6px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn-refresh"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-custom-ticker"
              style={{ padding: '8px 18px' }}
              disabled={loading || !tickerInput.trim()}
            >
              {loading ? 'Analyzing with AI...' : 'Run Catalyst Analysis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
