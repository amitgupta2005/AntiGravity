import React, { useState } from 'react';
import { X, Copy, Check, ShieldAlert, Zap, Rocket, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function CatalystModal({ catalyst, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!catalyst) return null;

  const isIndia = catalyst.market === 'India';
  const curr = catalyst.currency || (isIndia ? '₹' : '$');
  const isIntraday = catalyst.timeframe === 'Intraday';
  const isBull = catalyst.market_regime === 'BULL';
  const isChoppy = catalyst.market_regime === 'CHOPPY';

  const copyTradePlan = () => {
    const text = `🎯 STOCK CATALYST INSTITUTIONAL TRADE PLAN: ${catalyst.display_ticker} (${catalyst.company_name})
Market: ${catalyst.market} (${catalyst.exchange})
Direction: ${catalyst.direction}
Timeframe: ${catalyst.timeframe}
Market Regime Gatekeeper: ${catalyst.market_regime || 'BULL'} (${catalyst.regime_advice || 'Active'})

⚡ Execution Rule:
${catalyst.execution_protocol || 'Enter on confirmation.'}

📈 Execution Levels:
• Current Spot: ${curr}${catalyst.current_price}
• Entry Level: ${curr}${catalyst.entry_price}
• ATR Stop Loss: ${curr}${catalyst.stop_loss_price} (-${catalyst.risk_pct}%)
• Target 1 (50% Position Base Exit): ${curr}${catalyst.target_price_t1 || catalyst.target_price} (+${catalyst.t1_roi_pct || catalyst.projected_roi_pct}%)
• Target 2 (50% Runner Trailing Exit): ${curr}${catalyst.target_price_t2 || catalyst.target_price} (+${catalyst.t2_roi_pct || catalyst.projected_roi_pct}%)
• Risk:Reward Ratio: ${catalyst.risk_reward_ratio}
• Breakeven Shift Rule: ${catalyst.breakeven_rule || 'Shift stop loss to entry once Target 1 is achieved.'}
• AI Conviction: ${catalyst.catalyst_score}% (${catalyst.confidence})

Breaking Catalyst:
"${catalyst.headline}" (${catalyst.source} • ${catalyst.published_at})

⚠️ Regulatory Disclaimer: Analytical & educational research only. Not registered financial advice.`;

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

        {/* Macro Regime Gatekeeper Banner */}
        {catalyst.market_regime && (
          <div style={{
            background: isBull ? 'rgba(52, 211, 153, 0.08)' : isChoppy ? 'rgba(251, 191, 36, 0.08)' : 'rgba(248, 113, 113, 0.08)',
            border: `1px solid ${isBull ? 'rgba(52, 211, 153, 0.3)' : isChoppy ? 'rgba(251, 191, 36, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            {isBull ? <ShieldCheck size={18} color="#34d399" style={{ marginTop: '2px', flexShrink: 0 }} /> : <AlertTriangle size={18} color={isChoppy ? '#fbbf24' : '#f87171'} style={{ marginTop: '2px', flexShrink: 0 }} />}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isBull ? '#34d399' : isChoppy ? '#fbbf24' : '#f87171', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Macro Market Regime: {isBull ? '🟢 Bullish Expansion' : isChoppy ? '🟡 Consolidation Range Chop' : '🔴 Bearish Headwind'}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                {catalyst.regime_advice}
              </div>
            </div>
          </div>
        )}

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

        {/* Execution Protocol & Disciplined Timing Rule */}
        {catalyst.execution_protocol && (
          <div className="modal-section">
            <div className="modal-section-title">Strict Execution Trigger Protocol</div>
            <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)', padding: '10px 14px', borderRadius: '8px', color: '#38bdf8', fontSize: '0.8125rem', lineHeight: '1.45' }}>
              <strong>Execution Rule:</strong> {catalyst.execution_protocol}
            </div>
          </div>
        )}

        {/* AI Catalyst Rationale */}
        <div className="modal-section">
          <div className="modal-section-title">AI Quantitative Catalyst Analysis</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5', background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            {catalyst.reason}
          </p>
        </div>

        {/* Tiered Risk-Managed Execution Levels */}
        <div className="modal-section">
          <div className="modal-section-title">Institutional Tiered Execution Levels</div>
          <div className="trade-levels-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {/* Stop Loss */}
            <div className="trade-level-box stoploss">
              <div className="trade-level-label">ATR Stop Loss</div>
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

            {/* Target 1 (Base Exit) */}
            <div className="trade-level-box" style={{ borderColor: 'rgba(56, 189, 248, 0.35)', background: 'rgba(56, 189, 248, 0.05)' }}>
              <div className="trade-level-label" style={{ color: '#38bdf8' }}>Target 1 (50% Exit)</div>
              <div className="trade-level-val" style={{ color: '#38bdf8' }}>
                {curr}{Number(catalyst.target_price_t1 || catalyst.target_price).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#38bdf8', marginTop: '2px' }}>
                +{catalyst.t1_roi_pct || catalyst.projected_roi_pct}% Base
              </div>
            </div>

            {/* Target 2 (Runner) */}
            <div className="trade-level-box target">
              <div className="trade-level-label">Target 2 (Runner)</div>
              <div className="trade-level-val target-price">
                {curr}{Number(catalyst.target_price_t2 || catalyst.target_price).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#34d399', marginTop: '2px' }}>
                +{catalyst.t2_roi_pct || catalyst.projected_roi_pct}% Runner
              </div>
            </div>
          </div>

          {/* Breakeven Rule Notification */}
          {catalyst.breakeven_rule && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '10px', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', border: '1px dashed var(--border-subtle)' }}>
              🛡️ <strong>Breakeven Protocol:</strong> {catalyst.breakeven_rule}
            </div>
          )}
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
