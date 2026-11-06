import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Zap, Rocket, TrendingUp, TrendingDown, Info, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CatalystTable({ catalysts, onSelectCatalyst }) {
  const [sortColumn, setSortColumn] = useState('catalyst_score');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  const tableWrapperRef = useRef(null);

  const SCROLL_STEP = 200; // Column scroll shift per key press

  const scrollTable = useCallback((direction) => {
    if (!tableWrapperRef.current) return;
    const container = tableWrapperRef.current;
    const delta = direction === 'left' ? -SCROLL_STEP : SCROLL_STEP;
    if (typeof container.scrollBy === 'function') {
      container.scrollBy({ left: delta, behavior: 'smooth' });
    } else {
      container.scrollLeft = (container.scrollLeft || 0) + delta;
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollTable('left');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollTable('right');
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (tableWrapperRef.current) {
        if (typeof tableWrapperRef.current.scrollTo === 'function') {
          tableWrapperRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          tableWrapperRef.current.scrollLeft = 0;
        }
      }
    } else if (e.key === 'End') {
      e.preventDefault();
      if (tableWrapperRef.current) {
        const maxScroll = tableWrapperRef.current.scrollWidth || 0;
        if (typeof tableWrapperRef.current.scrollTo === 'function') {
          tableWrapperRef.current.scrollTo({ left: maxScroll, behavior: 'smooth' });
        } else {
          tableWrapperRef.current.scrollLeft = maxScroll;
        }
      }
    }
  }, [scrollTable]);

  // Global arrow key listener for seamless table navigation
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      // Do not hijack arrow keys when user is typing in search bar or form inputs
      if (typeof document !== 'undefined' && document.activeElement) {
        const activeTag = document.activeElement.tagName ? document.activeElement.tagName.toLowerCase() : '';
        if (
          document.activeElement.isContentEditable ||
          activeTag === 'input' ||
          activeTag === 'textarea' ||
          activeTag === 'select'
        ) {
          return;
        }

        // If a modal dialog is currently open, let modal handle keyboard events
        if (document.querySelector('.modal-overlay')) {
          return;
        }
      }

      if (!tableWrapperRef.current) return;

      e.preventDefault();
      scrollTable(e.key === 'ArrowLeft' ? 'left' : 'right');
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => {
      window.removeEventListener('keydown', handleGlobalKey);
    };
  }, [scrollTable]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      // Natural defaults
      setSortDirection(column === 'display_ticker' || column === 'company_name' ? 'asc' : 'desc');
    }
  };

  // Memoized sorting logic (avoids expensive array clone and sort on unrelated parent re-renders)
  const sortedCatalysts = useMemo(() => {
    return [...catalysts].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'risk_reward_ratio') {
        aVal = parseFloat(a.risk_reward_ratio?.replace('1 : ', '')) || 0;
        bVal = parseFloat(b.risk_reward_ratio?.replace('1 : ', '')) || 0;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }

      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [catalysts, sortColumn, sortDirection]);

  const renderSortIndicator = (column) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={12} className="sort-icon" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp size={12} color="#10b981" /> 
      : <ArrowDown size={12} color="#10b981" />;
  };

  if (catalysts.length === 0) {
    return (
      <div className="table-card-container">
        <div className="empty-state">
          <Info size={40} className="empty-state-icon" />
          <h3 className="empty-state-title">No Catalysts Found</h3>
          <p>No stocks match your active filter criteria. Try selecting "All Markets" or clearing the search query.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-card-container">
      {/* Horizontal Scroll Toolbar & Arrow Key Hint */}
      <div className="table-header-toolbar">
        <div className="table-scroll-hint">
          <span className="kbd-badge">←</span>
          <span className="kbd-badge">→</span>
          <span>Use Left &amp; Right arrow keys to scroll columns horizontally</span>
        </div>
        <div className="table-scroll-nav-buttons">
          <button 
            type="button" 
            className="btn-scroll-arrow" 
            onClick={() => scrollTable('left')}
            title="Scroll columns left (or press ← key)"
            aria-label="Scroll left"
          >
            <ChevronLeft size={15} />
          </button>
          <button 
            type="button" 
            className="btn-scroll-arrow" 
            onClick={() => scrollTable('right')}
            title="Scroll columns right (or press → key)"
            aria-label="Scroll right"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div 
        ref={tableWrapperRef}
        className="table-responsive-wrapper"
        tabIndex={0}
        role="region"
        aria-label="Catalyst Screener Table (use left and right arrow keys to scroll horizontally)"
        onKeyDown={handleKeyDown}
      >
        <table className="screener-table">
          <thead>
            <tr>
              {/* Ticker & Company */}
              <th onClick={() => handleSort('display_ticker')} className={sortColumn === 'display_ticker' ? 'sorted-active' : ''}>
                <div className="th-content">
                  <span>Ticker</span>
                  {renderSortIndicator('display_ticker')}
                </div>
              </th>

              {/* Market */}
              <th onClick={() => handleSort('market')} className={sortColumn === 'market' ? 'sorted-active' : ''}>
                <div className="th-content">
                  <span>Market</span>
                  {renderSortIndicator('market')}
                </div>
              </th>

              {/* Direction (Buy/Sell) */}
              <th onClick={() => handleSort('direction')} className={sortColumn === 'direction' ? 'sorted-active' : ''}>
                <div className="th-content">
                  <span>Direction</span>
                  {renderSortIndicator('direction')}
                </div>
              </th>

              {/* Timeframe (Intraday / Short-term) */}
              <th onClick={() => handleSort('timeframe')} className={sortColumn === 'timeframe' ? 'sorted-active' : ''}>
                <div className="th-content">
                  <span>Timeframe</span>
                  {renderSortIndicator('timeframe')}
                </div>
              </th>

              {/* Reason (Catalyst Explanation) */}
              <th style={{ minWidth: '280px' }}>
                <span>Catalyst & Reason</span>
              </th>

              {/* Current Price */}
              <th onClick={() => handleSort('current_price')} className={sortColumn === 'current_price' ? 'sorted-active' : ''}>
                <div className="th-content">
                  <span>LTP</span>
                  {renderSortIndicator('current_price')}
                </div>
              </th>

              {/* Entry Price */}
              <th onClick={() => handleSort('entry_price')} className={sortColumn === 'entry_price' ? 'sorted-active' : ''}>
                <div className="th-content">
                  <span>Entry Price</span>
                  {renderSortIndicator('entry_price')}
                </div>
              </th>

              {/* Stop Loss Price */}
              <th onClick={() => handleSort('stop_loss_price')} className={sortColumn === 'stop_loss_price' ? 'sorted-active' : ''}>
                <div className="th-content">
                  <span>Stop Loss</span>
                  {renderSortIndicator('stop_loss_price')}
                </div>
              </th>

              {/* Target Price */}
              <th onClick={() => handleSort('target_price')} className={sortColumn === 'target_price' ? 'sorted-active' : ''}>
                <div className="th-content">
                  <span>Target Price</span>
                  {renderSortIndicator('target_price')}
                </div>
              </th>

              {/* Risk:Reward */}
              <th onClick={() => handleSort('risk_reward_ratio')} className={sortColumn === 'risk_reward_ratio' ? 'sorted-active' : ''}>
                <div className="th-content">
                  <span>R : R</span>
                  {renderSortIndicator('risk_reward_ratio')}
                </div>
              </th>

              {/* Conviction Score */}
              <th onClick={() => handleSort('catalyst_score')} className={sortColumn === 'catalyst_score' ? 'sorted-active' : ''}>
                <div className="th-content">
                  <span>AI Score</span>
                  {renderSortIndicator('catalyst_score')}
                </div>
              </th>

              {/* Actions */}
              <th style={{ textAlign: 'center' }}>
                <span>Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCatalysts.map((item, idx) => {
              const isIndia = item.market === 'India';
              const curr = item.currency || (isIndia ? '₹' : '$');
              const isBuy = item.direction === 'BUY';
              const isIntraday = item.timeframe === 'Intraday';

              return (
                <tr key={`${item.ticker}-${idx}`}>
                  {/* Ticker & Company */}
                  <td>
                    <div className="ticker-cell">
                      <span className="ticker-flag">{isIndia ? '🇮🇳' : '🇺🇸'}</span>
                      <div>
                        <div className="ticker-symbol">{item.display_ticker}</div>
                        <div className="company-name" title={item.company_name}>{item.company_name}</div>
                      </div>
                    </div>
                  </td>

                  {/* Market Badge */}
                  <td>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      color: isIndia ? '#38bdf8' : '#818cf8',
                      background: 'rgba(30, 41, 59, 0.5)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {item.market} ({item.exchange})
                    </span>
                  </td>

                  {/* Direction Badge */}
                  <td>
                    <span className={`badge-direction ${isBuy ? 'buy' : 'sell'}`}>
                      {isBuy ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {item.direction}
                    </span>
                  </td>

                  {/* Timeframe Pill */}
                  <td>
                    <span className={`pill-timeframe ${isIntraday ? 'intraday' : 'short-term'}`}>
                      {isIntraday ? <Zap size={12} /> : <Rocket size={12} />}
                      {item.timeframe}
                    </span>
                  </td>

                  {/* Reason, Execution Protocol & Regime Gatekeeper */}
                  <td>
                    <div className="reason-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span className="catalyst-tag">{item.catalyst_type}</span>
                        {item.execution_protocol && (
                          <span style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            color: '#38bdf8',
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            padding: '1px 6px',
                            borderRadius: '4px'
                          }}>
                            {item.timeframe === 'Intraday' ? '⚡ 15-Min ORB' : '🎯 PEAD Retest'}
                          </span>
                        )}
                        {item.market_regime && (
                          <span style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            color: item.market_regime === 'BULL' ? '#34d399' : item.market_regime === 'CHOPPY' ? '#fbbf24' : '#f87171',
                            background: item.market_regime === 'BULL' ? 'rgba(52, 211, 153, 0.1)' : item.market_regime === 'CHOPPY' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                            border: `1px solid ${item.market_regime === 'BULL' ? 'rgba(52, 211, 153, 0.25)' : item.market_regime === 'CHOPPY' ? 'rgba(251, 191, 36, 0.25)' : 'rgba(248, 113, 113, 0.25)'}`,
                            padding: '1px 6px',
                            borderRadius: '4px'
                          }} title={item.regime_advice}>
                            {item.market_regime === 'BULL' ? '🟢 Bull Expansion' : item.market_regime === 'CHOPPY' ? '🟡 Range Chop' : '🔴 Bear Headwind'}
                          </span>
                        )}
                      </div>
                      <p className="reason-text" title={item.reason}>
                        {item.reason}
                      </p>
                    </div>
                  </td>

                  {/* Current LTP */}
                  <td>
                    <span className="price-value">
                      {curr}{Number(item.current_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* Entry Price */}
                  <td>
                    <span className="price-value" style={{ color: '#ffffff' }}>
                      {curr}{Number(item.entry_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* Volatility (ATR) Anchored Stop Loss */}
                  <td>
                    <div>
                      <div className="price-value stop-loss-price">
                        {curr}{Number(item.stop_loss_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="stop-risk-sub" title="Volatility-adjusted (ATR) Stop Loss">
                        ATR Stop: -{item.risk_pct}%
                      </div>
                    </div>
                  </td>

                  {/* Tiered Target Prices (T1 Base & T2 Runner) */}
                  <td>
                    <div>
                      {item.target_price_t1 ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '1px 4px', borderRadius: '3px' }}>T1</span>
                            <span className="price-value" style={{ color: '#38bdf8', fontSize: '0.875rem' }}>
                              {curr}{Number(item.target_price_t1).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span style={{ fontSize: '0.6875rem', color: '#38bdf8', fontWeight: 600 }}>+{item.t1_roi_pct}%</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#34d399', background: 'rgba(52, 211, 153, 0.12)', padding: '1px 4px', borderRadius: '3px' }}>T2</span>
                            <span className="price-value target-price" style={{ fontSize: '0.875rem' }}>
                              {curr}{Number(item.target_price_t2 || item.target_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span style={{ fontSize: '0.6875rem', color: '#34d399', fontWeight: 600 }}>+{item.t2_roi_pct || item.projected_roi_pct}%</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="price-value target-price">
                            {curr}{Number(item.target_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="target-roi-sub">
                            +{item.projected_roi_pct}% Return
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Risk:Reward Ratio */}
                  <td>
                    <span className="rr-badge">
                      {item.risk_reward_ratio}
                    </span>
                  </td>

                  {/* AI Conviction Score */}
                  <td>
                    <span className={`score-pill ${item.catalyst_score >= 88 ? 'high' : 'moderate'}`}>
                      {item.catalyst_score}%
                    </span>
                  </td>

                  {/* Action Button */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn-action-deepdive"
                      onClick={() => onSelectCatalyst(item)}
                      title="View full catalyst report, financial disclosures, and trade plan"
                    >
                      <ExternalLink size={13} />
                      <span>Deep Dive</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
