/**
 * Results Exporter Service (Excel XLSX, CSV, JSON)
 * Allows users to download screened stock results with Stochastic values and signals.
 */

import * as XLSX from 'xlsx';

/**
 * Export results to Excel (.xlsx)
 */
export function exportResultsToExcel(screenedStocks, params = {}) {
  if (!Array.isArray(screenedStocks) || screenedStocks.length === 0) {
    alert('No screened stocks available to export.');
    return;
  }

  const kP = params.kPeriod || 4;
  const kS = params.kSmoothing || 3;
  const dP = params.dPeriod || 3;
  const basisText = params.useClosingOnly !== false ? 'Closing Basis' : 'High-Low Basis';

  const rows = screenedStocks.map(s => ({
    'Ticker': s.ticker,
    'Company Name': s.name,
    'Exchange': s.exchange || (s.ticker.endsWith('.NS') ? 'NSE' : 'US'),
    'Close Price': s.price,
    '1D Change (%)': s.changePct,
    [`%K (${kP}, ${kS})`]: s.slowK,
    [`%D (${dP})`]: s.d,
    'Stoch Spread (%K - %D)': s.spread,
    'Signal Type': s.signalType,
    'Signal Classification': s.signalLabel,
    'Divergence': s.divergence ? s.divergence.label : 'None',
    'Zone': s.isOversold ? 'Oversold (< 20)' : s.isOverbought ? 'Overbought (> 80)' : 'Neutral (20-80)',
    'Volume': s.volume ? Number(s.volume).toLocaleString() : 'N/A'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  ws['!cols'] = [
    { wch: 14 },
    { wch: 30 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 22 },
    { wch: 26 },
    { wch: 34 },
    { wch: 30 },
    { wch: 20 },
    { wch: 16 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Stochastic_${kP}_${kS}_${dP}`);

  const fileName = `Stochastic_Screener_${kP}_${kS}_${dP}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export results to CSV
 */
export function exportResultsToCSV(screenedStocks, params = {}) {
  if (!Array.isArray(screenedStocks) || screenedStocks.length === 0) {
    alert('No screened stocks available to export.');
    return;
  }

  const kP = params.kPeriod || 4;
  const kS = params.kSmoothing || 3;
  const dP = params.dPeriod || 3;

  const rows = screenedStocks.map(s => ({
    'Ticker': s.ticker,
    'Company Name': s.name,
    'Exchange': s.exchange || (s.ticker.endsWith('.NS') ? 'NSE' : 'US'),
    'Close Price': s.price,
    'Change %': s.changePct,
    [`%K (${kP},${kS})`]: s.slowK,
    [`%D (${dP})`]: s.d,
    'Spread': s.spread,
    'Signal': s.signalLabel
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Stochastic_Screener_${kP}_${kS}_${dP}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Aliases
export const exportToExcel = exportResultsToExcel;
export const exportToCSV = exportResultsToCSV;

