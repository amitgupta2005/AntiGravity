/**
 * Custom Stock & Quant Scenario Simulator Modal
 */

export function setupCustomStockModal(onAddCustomStock) {
  const modal = document.getElementById('customStockModal');
  const openBtn = document.getElementById('openCustomStockBtn');
  const closeBtn = document.getElementById('closeCustomStockBtn');
  const cancelBtn = document.getElementById('cancelCustomStockBtn');
  const form = document.getElementById('customStockForm');

  if (!modal || !form) return;

  const openModal = () => {
    modal.classList.add('active');
  };

  const closeModal = () => {
    modal.classList.remove('active');
  };

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Calculate live preview in modal
  const priceInput = document.getElementById('customPrice');
  const epsInput = document.getElementById('customEPS');
  const growthInput = document.getElementById('customGrowth');
  const peInput = document.getElementById('customPE');
  const previewPeg = document.getElementById('modalPreviewPeg');
  const previewCAGR = document.getElementById('modalPreviewCAGR');
  const previewBadge = document.getElementById('modalPreviewBadge');

  const updateModalPreview = () => {
    const price = parseFloat(priceInput.value) || 100;
    const eps = parseFloat(epsInput.value) || 5;
    const growth = parseFloat(growthInput.value) || 20;
    const pe = parseFloat(peInput.value) || 20;

    const peg = growth > 0 ? (pe / growth) : 999;
    const futureEPS = eps * Math.pow(1 + growth / 100, 3);
    const targetPrice = futureEPS * pe;
    const cagr = ((Math.pow(targetPrice / price, 1 / 3) - 1) * 100);

    if (previewPeg) previewPeg.textContent = peg.toFixed(2);
    if (previewCAGR) previewCAGR.textContent = `${cagr >= 0 ? '+' : ''}${cagr.toFixed(1)}%`;

    if (previewBadge) {
      if (peg < 1.0) {
        previewBadge.textContent = 'PEG < 1 (GARP Opportunity)';
        previewBadge.className = 'badge badge-peg-garp';
      } else {
        previewBadge.textContent = 'PEG ≥ 1 (Premium Valuation)';
        previewBadge.className = 'badge badge-peg-normal';
      }
    }
  };

  [priceInput, epsInput, growthInput, peInput].forEach(inp => {
    if (inp) inp.addEventListener('input', updateModalPreview);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const ticker = (document.getElementById('customTicker').value || 'CUSTOM').toUpperCase().trim();
    const name = document.getElementById('customName').value || `${ticker} Custom Model`;
    const price = parseFloat(priceInput.value) || 100;
    const ttmEPS = parseFloat(epsInput.value) || 5;
    const forwardEPS = Number((ttmEPS * 1.15).toFixed(2));
    const projectedEPSGrowth = parseFloat(growthInput.value) || 20;
    const peForward = parseFloat(peInput.value) || 20;
    const pegRatio = Number((peForward / projectedEPSGrowth).toFixed(2));

    const isINR = ticker.endsWith('.NS') || ticker.endsWith('.BO');
    const currencySymbol = isINR ? '₹' : '$';
    const currency = isINR ? 'INR' : 'USD';
    const exchange = isINR ? 'NSE' : 'CUSTOM';

    const newStock = {
      ticker,
      name,
      exchange,
      country: isINR ? 'IN' : 'US',
      currency,
      currencySymbol,
      isINR,
      sector: document.getElementById('customSector').value || 'Technology',
      price,
      change: 0.0,
      changePercent: 0.0,
      marketCap: isINR ? '₹1.5L Cr' : '$50.0B',
      beta: 1.10,
      week52High: Number((price * 1.2).toFixed(2)),
      week52Low: Number((price * 0.8).toFixed(2)),
      volume: '15.0M',
      avgVolume: '15.0M',
      dividendYield: 0.5,
      ttmEPS,
      forwardEPS,
      ttmRevenue: isINR ? '₹35,000 Cr' : '$20.0B',
      netIncome: isINR ? '₹5,500 Cr' : '$3.5B',
      grossMargin: 55.0,
      operatingMargin: 25.0,
      netMargin: 18.0,
      roe: 22.0,
      debtToEquity: 0.25,
      freeCashFlow: isINR ? '₹4,200 Cr' : '$2.8B',
      growthRate3Y: projectedEPSGrowth,
      projectedEPSGrowth,
      projectedRevenueGrowth: projectedEPSGrowth * 0.85,
      consensusPriceTarget: Number((forwardEPS * peForward).toFixed(2)),
      analystRatings: { buy: 20, hold: 5, sell: 1 },
      peTTM: Number((price / ttmEPS).toFixed(2)),
      peForward,
      evEbitda: 15.0,
      priceToSales: 4.5,
      pegRatio,
      rsi14: 52.0,
      sma50: Number((price * 0.96).toFixed(2)),
      sma200: Number((price * 0.90).toFixed(2)),
      macd: { value: 1.2, signal: 0.9, hist: 0.3 },
      support: Number((price * 0.92).toFixed(2)),
      resistance: Number((price * 1.15).toFixed(2)),
      technicalTrend: 'User Custom Simulation',
      historicalEPS: [
        { year: `${new Date().getFullYear() - 2}`, eps: Number((ttmEPS * 0.7).toFixed(2)), rev: 14.0 },
        { year: `${new Date().getFullYear() - 1}`, eps: Number((ttmEPS * 0.85).toFixed(2)), rev: 17.0 },
        { year: `${new Date().getFullYear()} (TTM)`, eps: ttmEPS, rev: 20.0 }
      ],
      projectedEPS: [
        { year: `${new Date().getFullYear() + 1} (FY1)`, eps: forwardEPS, rev: 24.0, growth: projectedEPSGrowth },
        { year: `${new Date().getFullYear() + 2} (FY2)`, eps: Number((forwardEPS * (1 + projectedEPSGrowth / 100)).toFixed(2)), rev: 28.5, growth: projectedEPSGrowth },
        { year: `${new Date().getFullYear() + 3} (FY3)`, eps: Number((forwardEPS * Math.pow(1 + projectedEPSGrowth / 100, 2)).toFixed(2)), rev: 34.0, growth: projectedEPSGrowth },
        { year: `${new Date().getFullYear() + 4} (FY4)`, eps: Number((forwardEPS * Math.pow(1 + projectedEPSGrowth / 100, 3)).toFixed(2)), rev: 40.0, growth: projectedEPSGrowth }
      ],
      news: [
        {
          id: 'c1',
          title: `Custom Quantitative Valuation Model Initiated for ${ticker}`,
          source: 'ApexQuant Engine',
          time: 'Just now',
          sentiment: pegRatio < 1.0 ? 'Bullish' : 'Neutral',
          sentimentScore: pegRatio < 1.0 ? 0.85 : 0.20,
          summary: `Model parameterized with ${projectedEPSGrowth}% EPS growth rate and ${peForward}x exit multiple. PEG is ${pegRatio}.`
        }
      ]
    };

    closeModal();
    if (onAddCustomStock) {
      onAddCustomStock(newStock);
    }
  });
}
