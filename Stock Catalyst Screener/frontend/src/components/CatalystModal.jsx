import React, { useState } from 'react';
import { X, Copy, Check, FileText, BarChart3, ShieldAlert, ArrowRight, Zap, Rocket } from 'lucide-react';

export default function CatalystModal({ catalyst, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!catalyst) return null;

  const isIndia = catalyst.market === 'India';
  const curr = catalyst.currency || (isIndia ? '₹' : '$');
  const isIntraday = catalyst.timeframe === 'Intraday';

  const copyTradePlan = () => {
    const text = `🎯 STOCK CATALYST TRADE PLAN: ${catalyst.display_ticker} (${catalyst.company_name})
Market: ${catalyst.market} (${catalyst.exchange})
Direction: ${catalyst.direction}
Timeframe: ${catalyst.timeframe} (Expected Return: +${catalyst.projected_roi_pct}%)
Catalyst: ${catalyst.headline}
Source: ${catalyst.source} (${catalyst.published_at})

📈 Execution Levels:
• Current Price: ${curr}${catalyst.current_price}
• Entry Level: ${curr}${catalyst.entry_price}
• Stop Loss: ${curr}${catalyst.stop_loss_price} (-${catalyst.risk_pct}%)
• Target Price: ${curr}${catalyst.target_price} (+${catalyst.projected_roi_pct}%)
• Risk : Reward: ${catalyst.risk_reward_ratio}
• AI Conviction: ${catalyst.catalyst_score}% (${catalyst.confidence})

⚠️ Note: AI-generated research only. Not registered financial advice.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span style={{ fontSize: '1.75rem' }}>{isIndia ? '🇮🇳' : '🇺🇸'}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>{catalyst.display_ticker}</h2>
                <span className={`badge-direction ${catalyst.direction.toLowerCase()}`}>
                  {catalyst.direction}
                </span>
                <span className={`pill-timeframe ${isIntraday ? 'intraday' : 'short-term'}`}>
                  {isIntraday ? <Zap size={11} /> : <Rocket size={11} />}
                  {catalyst.timeframe}
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{catalyst.company_name} • {catalyst.market} ({catalyst.exchange})</p>
            </div>
          </div>

          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Breaking News Headline */}
        <div className="modal-section">
          <div className="modal-section-title">Breaking News / Earnings Disclosure</div>
          <div className="modal-headline-box">
            "{catalyst.headline}"
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Source: <strong>{catalyst.source}</strong></span>
            <span>Published: <strong>{catalyst.published_at}</strong></span>
          </div>
        </div>

        {/* AI Catalyst Rationale */}
        <div className="modal-section">
          <div className="modal-section-title">AI Quantitative Catalyst Analysis</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5', background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            {catalyst.reason}
          </p>
        </div>

        {/* Financial Disclosures (if available) */}
        {catalyst.financials && Object.keys(catalyst.financials).length > 0 && (
          <div className="modal-section">
            <div className="modal-section-title">Quarterly Financial Scorecard</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              {Object.entries(catalyst.financials).map(([key, val]) => (
                <div key={key} style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8', fontSize: '0.9375rem' }}>
                    {String(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Execution Trade Levels */}
        <div className="modal-section">
          <div className="modal-section-title">Institutional Risk-Managed Execution Levels</div>
          <div className="trade-levels-grid">
            {/* Stop Loss */}
            <div className="trade-level-box stoploss">
              <div className="trade-level-label">Stop Loss Price</div>
              <div className="trade-level-val stop-loss-price">
                {curr}{Number(catalyst.stop_loss_price).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#fb7185', marginTop: '2px' }}>
                Risk: -{catalyst.risk_pct}%
              </div>
            </div>

            {/* Entry Trigger */}
            <div className="trade-level-box">
              <div className="trade-level-label">Entry Level</div>
              <div className="trade-level-val" style={{ color: '#ffffff' }}>
                {curr}{Number(catalyst.entry_price).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Spot: {curr}{catalyst.current_price}
              </div>
            </div>

            {/* Target Price */}
            <div className="trade-level-box target">
              <div className="trade-level-label">Target Price</div>
              <div className="trade-level-val target-price">
                {curr}{Number(catalyst.target_price).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#34d399', marginTop: '2px' }}>
                Return: +{catalyst.projected_roi_pct}%
              </div>
            </div>
          </div>
        </div>

        {/* Copy Trade Plan Button */}
        <button className="btn-copy-plan" onClick={copyTradePlan}>
          {copied ? <Check size={18} /> : <Copy size={18} />}
          <span>{copied ? 'Copied Trade Plan to Clipboard!' : 'Copy Structured Trade Plan'}</span>
        </button>
      </div>
    </div>
  );
}
