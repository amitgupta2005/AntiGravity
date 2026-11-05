import React, { useState, useEffect, useCallback } from 'react';
import DisclaimerBanner from './components/DisclaimerBanner';
import Header from './components/Header';
import SummaryCards from './components/SummaryCards';
import FilterToolbar from './components/FilterToolbar';
import CatalystTable from './components/CatalystTable';
import CatalystModal from './components/CatalystModal';
import TickerAnalyzerModal from './components/TickerAnalyzerModal';

// High-fidelity fallback dataset for offline presentation
const FALLBACK_CATALYSTS = [
  {
    ticker: "DIXON.NS",
    display_ticker: "DIXON",
    company_name: "Dixon Technologies (India)",
    market: "India",
    exchange: "NSE",
    currency: "₹",
    direction: "BUY",
    timeframe: "Short-term",
    catalyst_type: "Earnings Beat",
    catalyst_score: 95,
    confidence: "High Conviction",
    reason: "Blockbuster Q2 PAT surge (+68.5% YoY) driven by smartphone PLI incentives and onboarding major US tech OEM for export assembly.",
    headline: "Dixon Tech Q2 PAT Surges 68% YoY on Smartphone Export Surge; Signs Global ODM Agreement",
    source: "CNBC-TV18",
    published_at: "Today, 07:45 IST",
    current_price: 15420.00,
    entry_price: 15497.10,
    stop_loss_price: 14691.25,
    target_price: 21386.00,
    risk_pct: 5.2,
    projected_roi_pct: 38.0,
    risk_reward_ratio: "1 : 7.3",
    volume_surge: 3.4,
    financials: { revenue_growth_yoy: "+84.0%", pat_growth_yoy: "+68.5%", ebitda_margin: "4.1%" }
  },
  {
    ticker: "NVDA",
    display_ticker: "NVDA",
    company_name: "NVIDIA Corporation",
    market: "US",
    exchange: "NASDAQ",
    currency: "$",
    direction: "BUY",
    timeframe: "Short-term",
    catalyst_type: "Earnings Beat",
    catalyst_score: 96,
    confidence: "High Conviction",
    reason: "Q3 Data Center revenue reached $30.8B (+112% YoY) with Blackwell architecture in full production and sold out across all hyperscalers.",
    headline: "NVIDIA Q3 Data Center Revenue Smashes Estimates at $30.8B (+112% YoY); Blackwell Architecture in Full Production",
    source: "Bloomberg",
    published_at: "Today, 06:30 EST",
    current_price: 138.50,
    entry_price: 139.19,
    stop_loss_price: 131.95,
    target_price: 192.08,
    risk_pct: 5.2,
    projected_roi_pct: 38.0,
    risk_reward_ratio: "1 : 7.3",
    volume_surge: 2.8,
    financials: { revenue_growth_yoy: "+94.0%", gross_margin: "75.0%", datacenter_rev: "$30.8B" }
  },
  {
    ticker: "TATAMOTORS.NS",
    display_ticker: "TATAMOTORS",
    company_name: "Tata Motors Ltd",
    market: "India",
    exchange: "NSE",
    currency: "₹",
    direction: "BUY",
    timeframe: "Intraday",
    catalyst_type: "Major Contract/Order",
    catalyst_score: 88,
    confidence: "High Conviction",
    reason: "Secured ₹4,200 Cr EV bus contract; JLR EBIT margin guidance upgraded to 8.5% on strong Range Rover order books.",
    headline: "Tata Motors Wins ₹4,200 Cr Electric Bus Order from State Transport Corporations; JLR Order Book at All-Time High",
    source: "Business Standard",
    published_at: "Today, 09:15 IST",
    current_price: 845.20,
    entry_price: 847.74,
    stop_loss_price: 835.87,
    target_price: 885.89,
    risk_pct: 1.4,
    projected_roi_pct: 4.5,
    risk_reward_ratio: "1 : 3.2",
    volume_surge: 2.2,
    financials: { revenue_growth_yoy: "+15.1%", pat_growth_yoy: "+32.0%", ebitda_margin: "14.2%" }
  },
  {
    ticker: "PLTR",
    display_ticker: "PLTR",
    company_name: "Palantir Technologies",
    market: "US",
    exchange: "NYSE",
    currency: "$",
    direction: "BUY",
    timeframe: "Short-term",
    catalyst_type: "Earnings Beat",
    catalyst_score: 93,
    confidence: "High Conviction",
    reason: "54% US commercial revenue growth powered by AIP platform; raised full-year operating income guidance.",
    headline: "Palantir Raises FY24 Revenue Guidance on 54% US Commercial Growth; AIP Bootcamps Sparking Deal Avalanche",
    source: "CNBC",
    published_at: "Today, 07:00 EST",
    current_price: 44.20,
    entry_price: 44.42,
    stop_loss_price: 42.11,
    target_price: 59.97,
    risk_pct: 5.2,
    projected_roi_pct: 35.0,
    risk_reward_ratio: "1 : 6.7",
    volume_surge: 2.6,
    financials: { us_commercial_growth: "+54%", rule_of_40_score: "68%", fcf_margin: "38%" }
  },
  {
    ticker: "HAL.NS",
    display_ticker: "HAL",
    company_name: "Hindustan Aeronautics",
    market: "India",
    exchange: "NSE",
    currency: "₹",
    direction: "BUY",
    timeframe: "Short-term",
    catalyst_type: "Major Contract/Order",
    catalyst_score: 94,
    confidence: "High Conviction",
    reason: "DAC clearances for ₹26,000 Cr Tejas fighter jet order elevates order book visibility beyond 6.5 years of annual revenue.",
    headline: "Defense Ministry Clears ₹26,000 Cr Tejas Mk1A Fighter Jet Procurement from HAL",
    source: "Moneycontrol",
    published_at: "Today, 10:00 IST",
    current_price: 4210.00,
    entry_price: 4231.05,
    stop_loss_price: 4011.04,
    target_price: 5838.85,
    risk_pct: 5.2,
    projected_roi_pct: 38.0,
    risk_reward_ratio: "1 : 7.3",
    volume_surge: 3.1,
    financials: { order_book: "₹94,000 Cr", pat_growth_yoy: "+22.5%", ebitda_margin: "28.5%" }
  },
  {
    ticker: "TSLA",
    display_ticker: "TSLA",
    company_name: "Tesla Inc.",
    market: "US",
    exchange: "NASDAQ",
    currency: "$",
    direction: "BUY",
    timeframe: "Intraday",
    catalyst_type: "Guidance Upgrade",
    catalyst_score: 89,
    confidence: "High Conviction",
    reason: "Elon Musk forecasts 20%-30% vehicle volume growth for 2025; automotive gross margins beat consensus at 17.1%.",
    headline: "Tesla Surprises with 20%-30% Vehicle Volume Growth Forecast for 2025; Automotive Gross Margin Ex-Regulatory Credits Beats at 17.1%",
    source: "Reuters",
    published_at: "Today, 06:45 EST",
    current_price: 252.30,
    entry_price: 253.06,
    stop_loss_price: 249.51,
    target_price: 265.20,
    risk_pct: 1.4,
    projected_roi_pct: 4.8,
    risk_reward_ratio: "1 : 3.4",
    volume_surge: 2.5,
    financials: { cost_per_vehicle: "$35,100", fcf_quarter: "$2.7B", auto_gross_margin: "17.1%" }
  },
  {
    ticker: "TRENT.NS",
    display_ticker: "TRENT",
    company_name: "Trent Ltd (Zudio/Westside)",
    market: "India",
    exchange: "NSE",
    currency: "₹",
    direction: "BUY",
    timeframe: "Short-term",
    catalyst_type: "Earnings Beat",
    catalyst_score: 90,
    confidence: "High Conviction",
    reason: "46% YoY revenue surge and accelerating Zudio format rollout driving operating leverage and ROCE over 32%.",
    headline: "Trent Reports 46% YoY Revenue Growth; Zudio Store Expansion Accelerates with 50 New Openings",
    source: "Mint",
    published_at: "Today, 09:00 IST",
    current_price: 6850.00,
    entry_price: 6884.25,
    stop_loss_price: 6526.27,
    target_price: 8949.53,
    risk_pct: 5.2,
    projected_roi_pct: 30.0,
    risk_reward_ratio: "1 : 5.8",
    volume_surge: 2.7,
    financials: { revenue_growth_yoy: "+46.2%", pat_growth_yoy: "+54.0%", ebitda_margin: "15.8%" }
  },
  {
    ticker: "COIN",
    display_ticker: "COIN",
    company_name: "Coinbase Global",
    market: "US",
    exchange: "NASDAQ",
    currency: "$",
    direction: "BUY",
    timeframe: "Short-term",
    catalyst_type: "Breakout News",
    catalyst_score: 91,
    confidence: "High Conviction",
    reason: "Institutional crypto trading volumes expand 140% as Base Layer-2 generates record fee margins.",
    headline: "Coinbase Institutional Trading Volume Surges 140% as Bitcoin Breaches New All-Time Highs; Base Layer-2 Transactions Cross 400M",
    source: "Barron's",
    published_at: "Today, 07:30 EST",
    current_price: 268.00,
    entry_price: 269.34,
    stop_loss_price: 255.33,
    target_price: 363.61,
    risk_pct: 5.2,
    projected_roi_pct: 35.0,
    risk_reward_ratio: "1 : 6.7",
    volume_surge: 2.9,
    financials: { trading_volume_growth: "+140%", subscription_services_rev: "$655M" }
  }
];

export default function App() {
  const [catalysts, setCatalysts] = useState(FALLBACK_CATALYSTS);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCatalyst, setSelectedCatalyst] = useState(null);
  const [customTickerOpen, setCustomTickerOpen] = useState(false);

  // Filters
  const [market, setMarket] = useState('All');
  const [timeframe, setTimeframe] = useState('All');
  const [direction, setDirection] = useState('All');
  const [search, setSearch] = useState('');

  // Fetch Catalysts from Backend
  const fetchCatalysts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (market !== 'All') params.append('market', market);
      if (timeframe !== 'All') params.append('timeframe', timeframe);
      if (direction !== 'All') params.append('direction', direction);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/catalysts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCatalysts(data);
        }
      }
    } catch (err) {
      console.warn('Backend API connection warning. Utilizing high-fidelity catalog:', err);
    } finally {
      setLoading(false);
    }
  }, [market, timeframe, direction, search]);

  // Fetch Market Indices
  const fetchMarkets = useCallback(async () => {
    try {
      const res = await fetch('/api/markets');
      if (res.ok) {
        const data = await res.json();
        if (data && data.markets) {
          setMarkets(data.markets);
        }
      }
    } catch (err) {
      console.warn('Could not fetch market indices from backend:', err);
    }
  }, []);

  useEffect(() => {
    fetchCatalysts();
    fetchMarkets();
  }, [fetchCatalysts, fetchMarkets]);

  // Handle addition of custom ticker recommendation
  const handleCustomTickerAnalyzed = (rec) => {
    setCatalysts(prev => [rec, ...prev.filter(c => c.ticker !== rec.ticker)]);
    setSelectedCatalyst(rec);
  };

  // Filter client-side if offline/fallback is active
  const filteredCatalysts = catalysts.filter(c => {
    if (market !== 'All' && c.market.toLowerCase() !== market.toLowerCase()) return false;
    if (timeframe !== 'All' && c.timeframe.toLowerCase() !== timeframe.toLowerCase()) return false;
    if (direction !== 'All' && c.direction.toLowerCase() !== direction.toLowerCase()) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = c.display_ticker.toLowerCase().includes(q) ||
                    c.company_name.toLowerCase().includes(q) ||
                    c.reason.toLowerCase().includes(q) ||
                    c.catalyst_type.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="app-container">
      {/* Mandatory Regulatory Disclaimer */}
      <DisclaimerBanner />

      {/* Main Header */}
      <Header
        markets={markets}
        onOpenCustomTicker={() => setCustomTickerOpen(true)}
      />

      {/* Summary KPI Cards */}
      <SummaryCards catalysts={filteredCatalysts} />

      {/* Filter Toolbar & Omnibar */}
      <FilterToolbar
        market={market}
        setMarket={setMarket}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        direction={direction}
        setDirection={setDirection}
        search={search}
        setSearch={setSearch}
        onRefresh={fetchCatalysts}
        loading={loading}
      />

      {/* Main Tabular Screener */}
      <CatalystTable
        catalysts={filteredCatalysts}
        onSelectCatalyst={(item) => setSelectedCatalyst(item)}
      />

      {/* Deep Dive Catalyst Modal */}
      {selectedCatalyst && (
        <CatalystModal
          catalyst={selectedCatalyst}
          onClose={() => setSelectedCatalyst(null)}
        />
      )}

      {/* Custom Ticker Analyzer Modal */}
      <TickerAnalyzerModal
        isOpen={customTickerOpen}
        onClose={() => setCustomTickerOpen(false)}
        onAnalyzeComplete={handleCustomTickerAnalyzed}
      />
    </div>
  );
}
