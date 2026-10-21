/**
 * Comprehensive Results Exporter Service
 * Exports screened stock data to:
 * 1. Microsoft Excel (.xlsx)
 * 2. Microsoft Excel 97-2004 Binary (.xls)
 * 3. Comma-Separated Values (.csv)
 * 4. Complete Package (.zip) with Spreadsheets (.xlsx, .xls, .csv) AND High-Res Chart Screenshots (.png)
 */

import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { generateStockChartBlob } from './chartRenderer.js';

/**
 * Common data row generator for Excel/CSV/XLS
 */
function buildStockDataRows(screenedStocks, params = {}) {
  const kP = params.kPeriod || 4;
  const kS = params.kSmoothing || 3;
  const dP = params.dPeriod || 3;

  return screenedStocks.map((s, idx) => ({
    '#': idx + 1,
    'Ticker': s.ticker || s.symbol || '',
    'Company Name': s.name || s.ticker || '',
    'Exchange': s.exchange || (s.ticker?.endsWith('.NS') ? 'NSE' : 'US'),
    'Sector': s.sector || 'Equities',
    'Close Price': s.price ?? s.close ?? 0,
    '1D Change (%)': s.changePct ?? 0,
    [`%K (${kP}, ${kS})`]: s.slowK ?? 0,
    [`%D (${dP})`]: s.d ?? 0,
    'Spread (%K - %D)': s.spread ?? 0,
    'Oversold Status': (s.slowK ?? 50) < 20 ? '★ BELOW OVERSOLD 20' : (s.slowK ?? 50) > 80 ? 'OVERBOUGHT (>80)' : 'NEUTRAL',
    'Strategy Action': s.strategy?.actionLabel || s.signalLabel || '',
    'Entry Buy Zone': s.strategy?.entryRangeStr || `${s.price ?? 0}`,
    'Stop Loss (Risk Floor)': s.strategy?.stopLoss ?? 0,
    'Stop Loss Risk (%)': s.strategy?.riskPct != null ? `-${s.strategy.riskPct}%` : '',
    'Target 1 (Mid-Band 50)': s.strategy?.target1 ?? 0,
    'Target 1 Gain (%)': s.strategy?.target1GainPct != null ? `+${s.strategy.target1GainPct}%` : '',
    'Target 2 (Overbought 80)': s.strategy?.target2 ?? 0,
    'Target 2 Gain (%)': s.strategy?.target2GainPct != null ? `+${s.strategy.target2GainPct}%` : '',
    'Risk:Reward Ratio': s.strategy?.rrRatio || '1 : 2.5',
    'Signal Type': s.signalType || '',
    'Divergence': s.divergence ? s.divergence.label : 'None',
    'Strategy Execution Playbook': (s.strategy?.playbook || []).join(' | '),
    'Volume': s.volume ? Number(s.volume).toLocaleString() : 'N/A'
  }));
}

/**
 * Configure standard worksheet column widths
 */
function setWorksheetColumnWidths(ws) {
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 32 },
    { wch: 10 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 24 },
    { wch: 36 },
    { wch: 24 },
    { wch: 22 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 26 },
    { wch: 28 },
    { wch: 60 },
    { wch: 16 }
  ];
}

/**
 * Export results to Excel (.xlsx)
 */
export function exportResultsToExcel(screenedStocks, params = {}, customFilename = null) {
  if (!Array.isArray(screenedStocks) || screenedStocks.length === 0) {
    alert('No screened stocks available to export.');
    return;
  }

  const kP = params.kPeriod || 4;
  const kS = params.kSmoothing || 3;
  const dP = params.dPeriod || 3;
  const rows = buildStockDataRows(screenedStocks, params);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  setWorksheetColumnWidths(ws);

  XLSX.utils.book_append_sheet(wb, ws, `Stochastic_${kP}_${kS}_${dP}`);

  const fileName = customFilename || `Stochastic_Screener_${kP}_${kS}_${dP}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export results to Excel 97-2004 Binary (.xls)
 */
export function exportResultsToXLS(screenedStocks, params = {}, customFilename = null) {
  if (!Array.isArray(screenedStocks) || screenedStocks.length === 0) {
    alert('No screened stocks available to export.');
    return;
  }

  const kP = params.kPeriod || 4;
  const kS = params.kSmoothing || 3;
  const dP = params.dPeriod || 3;
  const rows = buildStockDataRows(screenedStocks, params);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  setWorksheetColumnWidths(ws);

  XLSX.utils.book_append_sheet(wb, ws, `Stoch_${kP}_${kS}_${dP}`);

  const xlsBuffer = XLSX.write(wb, { bookType: 'biff8', type: 'array' });
  const blob = new Blob([xlsBuffer], { type: 'application/vnd.ms-excel' });

  const fileName = customFilename || `Stochastic_Screener_${kP}_${kS}_${dP}_${new Date().toISOString().slice(0, 10)}.xls`;
  downloadBlob(blob, fileName);
}

/**
 * Export results to CSV (.csv)
 */
export function exportResultsToCSV(screenedStocks, params = {}, customFilename = null) {
  if (!Array.isArray(screenedStocks) || screenedStocks.length === 0) {
    alert('No screened stocks available to export.');
    return;
  }

  const kP = params.kPeriod || 4;
  const kS = params.kSmoothing || 3;
  const dP = params.dPeriod || 3;
  const rows = buildStockDataRows(screenedStocks, params);

  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const fileName = customFilename || `Stochastic_Screener_${kP}_${kS}_${dP}_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadBlob(blob, fileName);
}

/**
 * Export Complete Archive Package (.zip):
 * - Spreadsheets: .xlsx, .xls, .csv
 * - Individual High-Res Chart Screenshots (.png) for every stock in the screened set
 * - README_Report.txt summary
 *
 * @param {Array<Object>} screenedStocks - List of stocks (e.g. oversold stocks)
 * @param {Object} params - Stochastic parameters
 * @param {Function} onProgress - Progress callback: (current, total, currentTicker)
 * @param {String} packageTitle - Custom package title (e.g. 'Oversold_Stocks')
 */
export async function exportPackageWithChartScreenshots(
  screenedStocks, 
  params = {}, 
  onProgress = null, 
  packageTitle = 'Oversold_Stocks'
) {
  if (!Array.isArray(screenedStocks) || screenedStocks.length === 0) {
    alert('No screened stocks available to export with charts.');
    return;
  }

  const zip = new JSZip();
  const kP = params.kPeriod || 4;
  const kS = params.kSmoothing || 3;
  const dP = params.dPeriod || 3;
  const total = screenedStocks.length;
  const timestamp = new Date().toISOString().slice(0, 10);

  // 1. Generate Spreadsheets
  const rows = buildStockDataRows(screenedStocks, params);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  setWorksheetColumnWidths(ws);
  XLSX.utils.book_append_sheet(wb, ws, 'Screened_Stocks');

  // .xlsx
  const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  zip.file(`${packageTitle}_Stochastic_${kP}_${kS}_${dP}.xlsx`, xlsxBuffer);

  // .xls
  const xlsBuffer = XLSX.write(wb, { bookType: 'biff8', type: 'array' });
  zip.file(`${packageTitle}_Stochastic_${kP}_${kS}_${dP}.xls`, xlsBuffer);

  // .csv
  const csvContent = XLSX.utils.sheet_to_csv(ws);
  zip.file(`${packageTitle}_Stochastic_${kP}_${kS}_${dP}.csv`, csvContent);

  // 2. Generate Chart Screenshots for each stock into /charts/ folder
  const chartsFolder = zip.folder('chart_screenshots');

  for (let i = 0; i < total; i++) {
    const stock = screenedStocks[i];
    const ticker = stock.ticker || stock.symbol || `Stock_${i + 1}`;
    const cleanSym = ticker.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (onProgress) {
      onProgress(i + 1, total, ticker);
    }

    try {
      const pngBlob = await generateStockChartBlob(stock, { width: 1080, height: 640 });
      chartsFolder.file(`${cleanSym}_stochastic_${kP}_${kS}_${dP}.png`, pngBlob);
    } catch (err) {
      console.warn(`Failed to render screenshot for ${ticker}:`, err);
    }

    // Brief yield for UI responsiveness
    await new Promise(r => setTimeout(r, 20));
  }

  // 3. Add Summary README Report
  const oversoldBelow20 = screenedStocks.filter(s => (s.slowK ?? 50) < 20).length;
  const goldenCrosses = screenedStocks.filter(s => s.isBullishCross || (s.signalType && s.signalType.includes('BULLISH_CROSSOVER'))).length;

  const stockStrategySummaries = screenedStocks.map((s, idx) => {
    const strat = s.strategy || {};
    return [
      `[${idx + 1}] ${s.ticker} — ${s.name || s.ticker} (${s.exchange || 'EQUITY'})`,
      `    Current Close : ${s.price}`,
      `    Stochastic %K : ${s.slowK ?? 50} | %D: ${s.d ?? 50} | Spread: ${s.spread ?? 0}`,
      `    Action Signal : ${strat.actionLabel || s.signalLabel}`,
      `    Buy Entry Zone: ${strat.entryRangeStr || s.price}`,
      `    Stop Loss     : ${strat.stopLoss || 'N/A'} (-${strat.riskPct || 0}%)`,
      `    Target 1 (50%): ${strat.target1 || 'N/A'} (+${strat.target1GainPct || 0}%) [Mid-Band %K=50 Exit]`,
      `    Target 2 (80%): ${strat.target2 || 'N/A'} (+${strat.target2GainPct || 0}%) [Overbought %K>80 Exit]`,
      `    Risk:Reward   : ${strat.rrRatio || '1 : 2.5'}`,
      `    Tactical Execution Playbook:`,
      ...(strat.playbook || []).map(p => `      * ${p}`),
      ''
    ].join('\n');
  }).join('\n');

  const reportText = [
    '=========================================================================',
    `AntiGravity Stochastic Screener — Quantitative Entry & Exit Strategy Report`,
    '=========================================================================',
    `Generated On      : ${new Date().toLocaleString()}`,
    `Strategy Model    : Stochastic on Closing Basis (${kP}, ${kS}, ${dP})`,
    `Total Stocks      : ${total}`,
    `Oversold (< 20)   : ${oversoldBelow20}`,
    `Golden Crosses    : ${goldenCrosses}`,
    '-------------------------------------------------------------------------',
    'ARCHIVE CONTENTS:',
    `1. ${packageTitle}_Stochastic_${kP}_${kS}_${dP}.xlsx  -> Modern Excel format`,
    `2. ${packageTitle}_Stochastic_${kP}_${kS}_${dP}.xls   -> Excel 97-2004 Binary format`,
    `3. ${packageTitle}_Stochastic_${kP}_${kS}_${dP}.csv   -> Comma-Separated Values format`,
    `4. chart_screenshots/                               -> High-Res PNG Chart Screenshots (${total} stocks)`,
    '=========================================================================',
    '',
    'QUANTITATIVE ENTRY & EXIT STRATEGY BLUEPRINTS FOR IDENTIFIED STOCKS:',
    '=========================================================================',
    stockStrategySummaries
  ].join('\n');

  zip.file('README_SCREENING_REPORT.txt', reportText);

  // 4. Build and trigger ZIP download
  if (onProgress) {
    onProgress(total, total, 'Compressing archive package...');
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipFilename = `${packageTitle}_Screenshots_${kP}_${kS}_${dP}_${timestamp}.zip`;
  downloadBlob(zipBlob, zipFilename);
}

/**
 * Download helper
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Aliases
export const exportToExcel = exportResultsToExcel;
export const exportToXLS = exportResultsToXLS;
export const exportToCSV = exportResultsToCSV;
export const exportPackageWithCharts = exportPackageWithChartScreenshots;
