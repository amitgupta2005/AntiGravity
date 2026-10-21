/**
 * High-Resolution Stock Chart Screenshot Generator
 * Renders professional, publication-ready dual charts (Price + Stochastic 4,3,3)
 * onto an HTML5 Canvas and exports as high-res PNG Blob / DataURL.
 */

/**
 * Render a complete dual-chart screenshot on an offscreen canvas
 *
 * @param {Object} stock - Screened stock object
 * @param {Object} options - Custom options (width, height, isDarkMode)
 * @returns {HTMLCanvasElement} Rendered canvas
 */
export function renderStockChartCanvas(stock, options = {}) {
  const width = options.width || 1080;
  const height = options.height || 640;
  const isDark = options.isDarkMode !== false;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Theme colors
  const bgMain = isDark ? '#0a0d14' : '#ffffff';
  const bgCard = isDark ? '#111827' : '#f8fafc';
  const textMain = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)';
  const cyan = '#00f2fe';
  const amber = '#f59e0b';
  const emerald = '#10b981';
  const rose = '#f43f5e';

  // 1. Fill Background
  ctx.fillStyle = bgMain;
  ctx.fillRect(0, 0, width, height);

  // Background gradient glow
  const radGlow = ctx.createRadialGradient(width * 0.2, height * 0.2, 10, width * 0.2, height * 0.2, 400);
  radGlow.addColorStop(0, isDark ? 'rgba(0, 242, 254, 0.05)' : 'rgba(2, 132, 199, 0.04)');
  radGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = radGlow;
  ctx.fillRect(0, 0, width, height);

  // 2. Draw Top Header Bar
  const isINR = stock.ticker?.endsWith('.NS') || stock.ticker?.endsWith('.BO') || stock.exchange === 'NSE';
  const curr = isINR ? '₹' : '$';
  const priceVal = stock.price != null ? stock.price : 0;
  const priceStr = isINR 
    ? `₹${priceVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
    : `$${priceVal.toFixed(2)}`;
  
  const chg = stock.changePct || 0;
  const chgSign = chg >= 0 ? '+' : '';
  const chgColor = chg >= 0 ? emerald : rose;

  // Header background card
  ctx.fillStyle = bgCard;
  ctx.beginPath();
  roundRect(ctx, 24, 20, width - 48, 86, 12);
  ctx.fill();
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Ticker & Company Name
  ctx.fillStyle = cyan;
  ctx.font = 'bold 26px "JetBrains Mono", monospace';
  ctx.fillText(stock.ticker || 'UNKNOWN', 42, 56);

  ctx.fillStyle = textMuted;
  ctx.font = '500 14px "Inter", sans-serif';
  const stockName = stock.name || stock.ticker;
  const truncatedName = stockName.length > 34 ? stockName.slice(0, 31) + '...' : stockName;
  ctx.fillText(truncatedName, 42, 82);

  // Exchange badge
  const exX = 42 + ctx.measureText(stock.ticker || '').width + 14;
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  roundRect(ctx, exX, 38, 52, 22, 4);
  ctx.fill();
  ctx.fillStyle = textMuted;
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.fillText(stock.exchange || 'EQUITY', exX + 8, 53);

  // Price & Day Change
  const priceX = width - 42;
  ctx.textAlign = 'right';
  ctx.fillStyle = textMain;
  ctx.font = 'bold 24px "JetBrains Mono", monospace';
  ctx.fillText(priceStr, priceX, 56);

  ctx.fillStyle = chgColor;
  ctx.font = 'bold 14px "JetBrains Mono", monospace';
  ctx.fillText(`${chgSign}${chg.toFixed(2)}%`, priceX, 82);
  ctx.textAlign = 'left';

  // Quantitative Indicators Bar (in header)
  const kVal = stock.slowK != null ? stock.slowK : 50;
  const dVal = stock.d != null ? stock.d : 50;
  const spread = stock.spread != null ? stock.spread : (kVal - dVal);
  const isOversold = kVal < 20;

  const metricBoxX = width * 0.44;
  ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.7)';
  roundRect(ctx, metricBoxX, 28, width * 0.28, 70, 8);
  ctx.fill();

  ctx.font = '600 11px "Inter", sans-serif';
  ctx.fillStyle = textMuted;
  ctx.fillText('STOCHASTIC (4, 3, 3) CLOSE-BASIS', metricBoxX + 14, 46);

  ctx.font = 'bold 15px "JetBrains Mono", monospace';
  ctx.fillStyle = isOversold ? cyan : textMain;
  ctx.fillText(`%K: ${kVal.toFixed(1)}`, metricBoxX + 14, 70);

  ctx.fillStyle = amber;
  ctx.fillText(`%D: ${dVal.toFixed(1)}`, metricBoxX + 110, 70);

  ctx.fillStyle = spread >= 0 ? emerald : rose;
  ctx.fillText(`Spread: ${spread >= 0 ? '+' : ''}${spread.toFixed(1)}`, metricBoxX + 195, 70);

  if (isOversold) {
    // Oversold Badge
    ctx.fillStyle = 'rgba(0, 242, 254, 0.2)';
    roundRect(ctx, metricBoxX + 14, 76, 125, 16, 4);
    ctx.fill();
    ctx.fillStyle = cyan;
    ctx.font = 'bold 9px "Inter", sans-serif';
    ctx.fillText('★ BELOW OVERSOLD 20', metricBoxX + 20, 88);
  }

  // 3. Draw Price Chart Area (Top Panel)
  const history = (stock.history && stock.history.length > 0) ? stock.history : generateDummyHistory(stock.price);
  const pArea = {
    x: 48,
    y: 126,
    w: width - 96,
    h: 220
  };

  drawPanelFrame(ctx, pArea, isDark, 'DAILY CLOSING PRICE HISTORY (LAST 30 BARS)', textMuted, bgCard);
  drawPriceChart(ctx, pArea, history, curr, cyan, isDark, gridColor, textMuted);

  // 4. Draw Stochastic Oscillator Sub-Chart (Bottom Panel)
  const sArea = {
    x: 48,
    y: 366,
    w: width - 96,
    h: 200
  };

  drawPanelFrame(ctx, sArea, isDark, 'STOCHASTIC (4, 3, 3) OSCILLATOR SUB-CHART (0-100)', textMuted, bgCard);
  drawStochasticSubChart(ctx, sArea, history, cyan, amber, isDark, gridColor, textMuted);

  // 5. Draw Footer Info & Watermark
  ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
  ctx.font = '500 11px "Inter", sans-serif';
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  ctx.fillText(`AntiGravity Stochastic Screener • Closing Basis (4,3,3) • Generated ${dateStr}`, 48, height - 24);

  ctx.textAlign = 'right';
  ctx.fillStyle = isOversold ? cyan : textMuted;
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.fillText(stock.signalLabel || 'Institutional Screening Screenshot', width - 48, height - 24);
  ctx.textAlign = 'left';

  return canvas;
}

/**
 * Generate a PNG Blob for the stock chart screenshot
 */
export async function generateStockChartBlob(stock, options = {}) {
  const canvas = renderStockChartCanvas(stock, options);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png', 0.95);
  });
}

/**
 * Generate a Base64 PNG Data URL for immediate display
 */
export function generateStockChartDataUrl(stock, options = {}) {
  const canvas = renderStockChartCanvas(stock, options);
  return canvas.toDataURL('image/png', 0.95);
}

/**
 * Directly trigger download of a single stock's chart screenshot (.png)
 */
export async function downloadStockChartScreenshot(stock) {
  const blob = await generateStockChartBlob(stock);
  const tickerClean = (stock.ticker || 'STOCK').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${tickerClean}_Stochastic_4_3_3_${new Date().toISOString().slice(0, 10)}.png`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------------- Helper Drawing Functions ---------------- */

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawPanelFrame(ctx, area, isDark, title, textMuted, bgCard) {
  ctx.fillStyle = bgCard;
  roundRect(ctx, area.x, area.y, area.w, area.h, 10);
  ctx.fill();
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = textMuted;
  ctx.font = '600 11px "Inter", sans-serif';
  ctx.fillText(title, area.x + 16, area.y + 22);
}

function drawPriceChart(ctx, area, history, curr, lineColor, isDark, gridColor, textColor) {
  const innerX = area.x + 20;
  const innerY = area.y + 40;
  const innerW = area.w - 85;
  const innerH = area.h - 60;

  const closes = history.map(h => h.close).filter(c => c != null && !isNaN(c));
  if (closes.length < 2) return;

  const minPrice = Math.min(...closes);
  const maxPrice = Math.max(...closes);
  const priceRange = Math.max(0.01, maxPrice - minPrice);
  const paddedMin = minPrice - priceRange * 0.05;
  const paddedMax = maxPrice + priceRange * 0.05;
  const paddedRange = paddedMax - paddedMin;

  // Grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  const steps = 4;
  for (let s = 0; s <= steps; s++) {
    const y = innerY + (innerH / steps) * s;
    ctx.beginPath();
    ctx.moveTo(innerX, y);
    ctx.lineTo(innerX + innerW, y);
    ctx.stroke();

    const priceLabel = paddedMax - (paddedRange / steps) * s;
    ctx.fillStyle = textColor;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${curr}${priceLabel.toFixed(1)}`, innerX + innerW + 8, y + 3);
  }

  // Draw Price Line & Fill
  const n = history.length;
  const stepX = innerW / Math.max(1, n - 1);

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const c = history[i].close;
    const x = innerX + i * stepX;
    const y = innerY + innerH - ((c - paddedMin) / paddedRange) * innerH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  // Save path for stroke
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Gradient fill
  const lastX = innerX + (n - 1) * stepX;
  ctx.lineTo(lastX, innerY + innerH);
  ctx.lineTo(innerX, innerY + innerH);
  ctx.closePath();

  const fillGrad = ctx.createLinearGradient(0, innerY, 0, innerY + innerH);
  fillGrad.addColorStop(0, isDark ? 'rgba(0, 242, 254, 0.22)' : 'rgba(2, 132, 199, 0.15)');
  fillGrad.addColorStop(1, 'rgba(0, 242, 254, 0.0)');
  ctx.fillStyle = fillGrad;
  ctx.fill();

  // Date labels
  ctx.fillStyle = textColor;
  ctx.font = '9px "JetBrains Mono", monospace';
  const labelInterval = Math.max(1, Math.floor(n / 6));
  for (let i = 0; i < n; i += labelInterval) {
    const x = innerX + i * stepX;
    const dateStr = history[i].date ? history[i].date.slice(0, 6) : `B${i}`;
    ctx.fillText(dateStr, x - 12, innerY + innerH + 16);
  }
}

function drawStochasticSubChart(ctx, area, history, cyan, amber, isDark, gridColor, textColor) {
  const innerX = area.x + 20;
  const innerY = area.y + 40;
  const innerW = area.w - 85;
  const innerH = area.h - 60;

  // Draw Oversold Zone Shading (0 to 20)
  const y20 = innerY + innerH - (20 / 100) * innerH;
  const y80 = innerY + innerH - (80 / 100) * innerH;

  // Oversold shaded strip (<20)
  ctx.fillStyle = isDark ? 'rgba(0, 242, 254, 0.08)' : 'rgba(2, 132, 199, 0.08)';
  ctx.fillRect(innerX, y20, innerW, innerY + innerH - y20);

  // Overbought shaded strip (>80)
  ctx.fillStyle = isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(217, 119, 6, 0.08)';
  ctx.fillRect(innerX, innerY, innerW, y80 - innerY);

  // Horizontal Grid & Threshold Lines
  [0, 20, 50, 80, 100].forEach(level => {
    const y = innerY + innerH - (level / 100) * innerH;
    ctx.beginPath();
    ctx.moveTo(innerX, y);
    ctx.lineTo(innerX + innerW, y);

    if (level === 20) {
      ctx.strokeStyle = cyan;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = cyan;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText('20 (Oversold)', innerX + innerW + 8, y + 3);
    } else if (level === 80) {
      ctx.strokeStyle = amber;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = amber;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText('80 (Overbought)', innerX + innerW + 8, y + 3);
    } else {
      ctx.strokeStyle = gridColor;
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(String(level), innerX + innerW + 8, y + 3);
    }
  });

  const n = history.length;
  const stepX = innerW / Math.max(1, n - 1);

  // Plot %D Signal line (Amber)
  ctx.beginPath();
  let hasStartedD = false;
  for (let i = 0; i < n; i++) {
    const dVal = history[i].d;
    if (dVal != null) {
      const x = innerX + i * stepX;
      const y = innerY + innerH - (Math.min(100, Math.max(0, dVal)) / 100) * innerH;
      if (!hasStartedD) {
        ctx.moveTo(x, y);
        hasStartedD = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  }
  ctx.strokeStyle = amber;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Plot %K line (Cyan)
  ctx.beginPath();
  let hasStartedK = false;
  for (let i = 0; i < n; i++) {
    const kVal = history[i].slowK;
    if (kVal != null) {
      const x = innerX + i * stepX;
      const y = innerY + innerH - (Math.min(100, Math.max(0, kVal)) / 100) * innerH;
      if (!hasStartedK) {
        ctx.moveTo(x, y);
        hasStartedK = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  }
  ctx.strokeStyle = cyan;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw Legend in bottom right
  ctx.font = 'bold 10px "Inter", sans-serif';
  ctx.fillStyle = cyan;
  ctx.fillText('— %K (4, 3)', area.x + 28, area.y + 18);
  ctx.fillStyle = amber;
  ctx.fillText('— %D (3 Signal)', area.x + 115, area.y + 18);
}

function generateDummyHistory(basePrice = 100) {
  const bars = [];
  let p = basePrice || 100;
  for (let i = 30; i >= 0; i--) {
    p = p * (1 + (Math.sin(i * 0.7) * 0.015));
    bars.push({
      date: `Day -${i}`,
      close: Number(p.toFixed(2)),
      slowK: Math.max(5, Math.min(95, 50 + Math.sin(i * 0.5) * 45)),
      d: Math.max(5, Math.min(95, 50 + Math.sin((i - 1) * 0.5) * 40))
    });
  }
  return bars;
}
