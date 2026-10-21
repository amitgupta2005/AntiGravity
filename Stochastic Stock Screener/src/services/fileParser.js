/**
 * Document Upload & Stock List Parser Service (XLSX & CSV)
 * Uses SheetJS to parse and validate stock lists from Excel or CSV spreadsheets,
 * with intelligent column mapping and template generation.
 */

import * as XLSX from 'xlsx';

/**
 * Common column header variations for intelligent mapping
 */
const SYMBOL_HEADERS = [
  'symbol', 'ticker', 'stock', 'code', 'scrip', 'instrument', 
  'symbol_code', 'company_symbol', 'scrip_code', 'ticker_symbol', 'equity'
];

const NAME_HEADERS = [
  'name', 'company', 'company_name', 'stock_name', 'security_name', 
  'description', 'instrument_name', 'security', 'issuer'
];

const EXCHANGE_HEADERS = [
  'exchange', 'market', 'country', 'series', 'segment', 'bse_nse'
];

const SECTOR_HEADERS = [
  'sector', 'industry', 'category', 'group'
];

/**
 * Parse an uploaded File (XLSX, XLS, CSV, TXT)
 *
 * @param {File} file - Browser File object
 * @returns {Promise<Object>} Result object with parsed stocks array and metadata
 */
export async function parseStockDocument(file) {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const fileName = file.name;
  const fileExt = fileName.split('.').pop().toLowerCase();

  if (!['xlsx', 'xls', 'csv', 'tsv', 'txt'].includes(fileExt)) {
    throw new Error(`Unsupported file format ".${fileExt}". Please upload a valid .xlsx or .csv document.`);
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded spreadsheet contains no sheets.');
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to 2D array of rows
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rawRows.length === 0) {
    throw new Error('The uploaded file is empty.');
  }

  // 1. Identify header row index and mapped column indices
  let headerRowIdx = -1;
  let symbolColIdx = -1;
  let nameColIdx = -1;
  let exchangeColIdx = -1;
  let sectorColIdx = -1;

  for (let r = 0; r < Math.min(10, rawRows.length); r++) {
    const row = rawRows[r].map(cell => String(cell || '').trim().toLowerCase());
    const sIdx = row.findIndex(c => SYMBOL_HEADERS.includes(c));
    if (sIdx !== -1) {
      headerRowIdx = r;
      symbolColIdx = sIdx;
      nameColIdx = row.findIndex(c => NAME_HEADERS.includes(c));
      exchangeColIdx = row.findIndex(c => EXCHANGE_HEADERS.includes(c));
      sectorColIdx = row.findIndex(c => SECTOR_HEADERS.includes(c));
      break;
    }
  }

  // If no explicit symbol header found, default to column 0 if row 0 looks like tickers
  if (symbolColIdx === -1) {
    headerRowIdx = 0;
    symbolColIdx = 0;
    if (rawRows[0].length > 1) nameColIdx = 1;
  }

  // 2. Extract and sanitize stock entries
  const startRow = headerRowIdx + 1;
  const parsedStocks = [];
  const seenTickers = new Set();
  let duplicates = 0;

  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    let rawSymbol = String(row[symbolColIdx] || '').trim();
    if (!rawSymbol || rawSymbol.length < 1) continue;

    // Clean ticker: remove extra quotes, commas, brackets
    rawSymbol = rawSymbol.replace(/[\[\]\{\}\(\)\<\>\\\/\|\$\*\+\?`~@#!%=:;,"']/g, '').trim().toUpperCase();

    // Skip if header-like word repeated
    if (SYMBOL_HEADERS.includes(rawSymbol.toLowerCase())) continue;

    // Normalize Indian tickers: if exchange is NSE or marked India, ensure .NS
    let exchangeVal = exchangeColIdx !== -1 ? String(row[exchangeColIdx] || '').trim().toUpperCase() : '';
    if ((exchangeVal.includes('NSE') || exchangeVal.includes('INDIA')) && !rawSymbol.endsWith('.NS') && !rawSymbol.endsWith('.BO')) {
      rawSymbol = `${rawSymbol}.NS`;
    }

    if (seenTickers.has(rawSymbol)) {
      duplicates++;
      continue;
    }

    seenTickers.add(rawSymbol);

    const nameVal = nameColIdx !== -1 ? String(row[nameColIdx] || '').trim() : rawSymbol;
    const sectorVal = sectorColIdx !== -1 ? String(row[sectorColIdx] || '').trim() : '';

    parsedStocks.push({
      ticker: rawSymbol,
      name: nameVal || rawSymbol,
      exchange: exchangeVal || (rawSymbol.endsWith('.NS') ? 'NSE' : rawSymbol.endsWith('.BO') ? 'BSE' : 'US'),
      sector: sectorVal || 'Custom Universe',
      source: 'Uploaded File'
    });
  }

  if (parsedStocks.length === 0) {
    throw new Error('Could not find any valid stock tickers in the uploaded document. Please check column format.');
  }

  return {
    success: true,
    fileName,
    sheetName,
    fileSizeFormatted: formatFileSize(file.size),
    totalRows: rawRows.length,
    validCount: parsedStocks.length,
    duplicateCount: duplicates,
    stocks: parsedStocks,
    headers: rawRows[headerRowIdx] || []
  };
}

/**
 * Format file size helper
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Generate a downloadable sample CSV template
 */
export function generateSampleCSV() {
  const sampleData = [
    ['Symbol', 'Company Name', 'Exchange', 'Sector'],
    ['RELIANCE.NS', 'Reliance Industries Ltd', 'NSE', 'Energy & Telecom'],
    ['TCS.NS', 'Tata Consultancy Services', 'NSE', 'Information Technology'],
    ['HDFCBANK.NS', 'HDFC Bank Ltd', 'NSE', 'Banking & Financials'],
    ['INFY.NS', 'Infosys Ltd', 'NSE', 'Information Technology'],
    ['TATAMOTORS.NS', 'Tata Motors Ltd', 'NSE', 'Automobiles'],
    ['NVDA', 'NVIDIA Corporation', 'NASDAQ', 'Semiconductors & AI'],
    ['AAPL', 'Apple Inc', 'NASDAQ', 'Consumer Electronics'],
    ['MSFT', 'Microsoft Corporation', 'NASDAQ', 'Cloud & Software'],
    ['AMZN', 'Amazon.com Inc', 'NASDAQ', 'E-Commerce & Cloud'],
    ['TSLA', 'Tesla Inc', 'NASDAQ', 'Electric Vehicles & Clean Tech']
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  return XLSX.utils.sheet_to_csv(ws);
}

/**
 * Generate a downloadable sample XLSX template Blob
 */
export function generateSampleXLSX() {
  const sampleData = [
    ['Symbol', 'Company Name', 'Exchange', 'Sector'],
    ['RELIANCE.NS', 'Reliance Industries Ltd', 'NSE', 'Energy & Telecom'],
    ['TCS.NS', 'Tata Consultancy Services', 'NSE', 'Information Technology'],
    ['HDFCBANK.NS', 'HDFC Bank Ltd', 'NSE', 'Banking & Financials'],
    ['INFY.NS', 'Infosys Ltd', 'NSE', 'Information Technology'],
    ['TATAMOTORS.NS', 'Tata Motors Ltd', 'NSE', 'Automobiles'],
    ['ICICIBANK.NS', 'ICICI Bank Ltd', 'NSE', 'Banking & Financials'],
    ['BHARTIARTL.NS', 'Bharti Airtel Ltd', 'NSE', 'Telecommunications'],
    ['ITC.NS', 'ITC Limited', 'NSE', 'FMCG & Consumer'],
    ['LT.NS', 'Larsen & Toubro', 'NSE', 'Engineering & Construction'],
    ['NVDA', 'NVIDIA Corporation', 'NASDAQ', 'Semiconductors & AI'],
    ['AAPL', 'Apple Inc', 'NASDAQ', 'Consumer Electronics'],
    ['MSFT', 'Microsoft Corporation', 'NASDAQ', 'Cloud & Software'],
    ['GOOGL', 'Alphabet Inc', 'NASDAQ', 'Internet & AI'],
    ['AMZN', 'Amazon.com Inc', 'NASDAQ', 'E-Commerce & Cloud'],
    ['META', 'Meta Platforms Inc', 'NASDAQ', 'Social Media & AI'],
    ['TSLA', 'Tesla Inc', 'NASDAQ', 'Electric Vehicles'],
    ['AMD', 'Advanced Micro Devices', 'NASDAQ', 'Semiconductors'],
    ['SPY', 'SPDR S&P 500 ETF Trust', 'NYSE Arca', 'Benchmark ETF'],
    ['QQQ', 'Invesco QQQ Trust', 'NASDAQ', 'Benchmark Tech ETF']
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sampleData);

  // Column widths
  ws['!cols'] = [
    { wch: 16 },
    { wch: 32 },
    { wch: 14 },
    { wch: 28 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Stocks_To_Screen');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
