# Stochastic Stock Screener (4, 3, 3) — Closing Basis

A professional quantitative stock screening platform built under the **AntiGravity** ecosystem to analyze equities on a strict **closing basis** using the **Stochastic Oscillator with input values 4, 3, 3**. Features dedicated screening for stocks below the **oversold threshold of 20**, multi-format exports (`.xlsx`, `.xls`, `.csv`), and high-resolution chart screenshots bundled into automated ZIP archives.

---

## 🎯 Key Features

1. **Closing-Basis Stochastic (4, 3, 3) Engine**:
   - **Fast %K Period**: `4` closing prices.
   - **%K Smoothing (Slow %K)**: `3`-period Simple Moving Average.
   - **%D Signal Line**: `3`-period Simple Moving Average of Slow %K.
   - **Formula**:
     $$\text{LowestClose}_4 = \min(\text{Close}_t, \text{Close}_{t-1}, \text{Close}_{t-2}, \text{Close}_{t-3})$$
     $$\text{HighestClose}_4 = \max(\text{Close}_t, \text{Close}_{t-1}, \text{Close}_{t-2}, \text{Close}_{t-3})$$
     $$\text{Fast \%K} = \frac{\text{Close}_t - \text{LowestClose}_4}{\text{HighestClose}_4 - \text{LowestClose}_4} \times 100$$
     $$\text{Slow \%K} = \text{SMA}_3(\text{Fast \%K})$$
     $$\text{\%D} = \text{SMA}_3(\text{Slow \%K})$$
   - Evaluated strictly using closing prices, eliminating intraday wick distortions and providing clean momentum reversal signals.

2. **Dedicated Oversold Screening (< 20)**:
   - Dedicated one-click filter and quick-action banner to isolate all stocks trading below the oversold threshold of `20`.
   - Distinguishes **Extreme Oversold** (%K < 10), **Standard Oversold** (10-20), and **Golden Crossovers in the Oversold Zone** (%K crossing %D from below while < 20).
   - Real-time indicator meters showing exact oscillator positions relative to the 20 and 80 boundaries.

3. **Multi-Format Exporting (`.xlsx`, `.xls`, `.csv`) & Chart Screenshots**:
   - **Modern Excel (`.xlsx`)**: Full OpenXML formatted spreadsheet with column widths, percentages, and signals.
   - **Legacy Excel 97-2004 (`.xls`)**: Native BIFF8 binary format for legacy Excel compatibility.
   - **Comma-Separated Values (`.csv`)**: Clean flat file format for downstream analytical pipelines.
   - **High-Res Chart Screenshots Archive (`.zip`)**:
     - Automatically generates 1080x640 publication-ready PNG chart screenshots for every screened or oversold stock.
     - Dual sub-charts: Closing Price history + Stochastic Oscillator (4,3,3) sub-chart with shaded oversold zone, %K cyan line, %D amber line, and quantitative signal stamps.
     - Bundles `.xlsx`, `.xls`, `.csv` plus all generated PNG chart screenshots into an organized `.zip` archive.
   - **Single Stock Screenshot Download**: Instant PNG chart screenshot download directly from table rows or the deep-dive chart modal.

4. **Spreadsheet Document Upload (`.xlsx` & `.csv`)**:
   - Client-side document parsing powered by **SheetJS (`xlsx`)**.
   - Intelligent column recognition supporting:
     - `Symbol` / `Ticker` / `Stock` / `Code`
     - `Company Name` / `Name` / `Security`
     - `Exchange` (auto-detects NSE, BSE, NASDAQ, NYSE)
     - `Sector` / `Industry`
   - Instant document preview table with duplicate detection and removal.
   - Downloadable template generators (`Sample_Stocks_List.xlsx` and `Sample_Stocks_List.csv`).

5. **Curated Out-of-the-Box Universes**:
   - 🇮🇳 **NIFTY 50** (NSE India Bluechips)
   - 🇮🇳 **NIFTY Next 50** (High Growth & Momentum)
   - 🇺🇸 **US Mega Tech & S&P 500 Leaders** (NVDA, AAPL, MSFT, GOOGL, etc.)
   - 🌐 **Benchmark Indices & ETFs** (Nifty BeES, SPY, QQQ, SMH)

6. **Deep-Dive Stock Inspector & Dual Chart Modal**:
   - Closing price history chart with volume context.
   - Stochastic oscillator sub-chart plotting `%K (Cyan)`, `%D (Amber)`, and overbought/oversold boundaries.
   - 10-bar mathematical calculation breakdown table detailing bar-by-bar `Close`, `Fast %K`, `Slow %K`, `%D`, `Spread`, and `Signal State`.
   - Direct "Save Screenshot (.png)" action.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation
```bash
cd "Stochastic Stock Screener"
npm install
```

### Running Locally
```bash
npm run dev
```
The application will launch on **http://localhost:5175/**.

### Production Build
```bash
npm run build
```

### Running Automated Test Suite
```bash
node test_screener.js
```

---

## 📁 Project Structure

```
Stochastic Stock Screener/
├── index.html                  # Main application structure, modals, & progress overlay
├── package.json                # Project dependencies & scripts
├── vite.config.js              # Vite server & Yahoo Finance proxy middleware (port 5175)
├── test_screener.js            # Automated test suite for quant engine, exports, & zip
└── src/
    ├── main.js                 # Main application state orchestrator
    ├── style.css               # Modern dark/light fintech theme & design system
    ├── components/
    │   ├── kpiBar.js           # Quantitative summary metric cards
    │   ├── screenerTable.js    # Filterable & sortable results table with visual gauges
    │   ├── chartModal.js       # Price chart + Stochastic sub-chart + breakdown table
    │   └── uploadModal.js      # Drag-and-drop XLSX/CSV parser with preview
    ├── data/
    │   └── presets.js          # Built-in Nifty 50, Nifty Next 50, US Tech, & ETFs
    ├── quant/
    │   └── stochastic.js       # Mathematical close-only Stochastic (4,3,3) engine
    └── services/
        ├── chartRenderer.js    # Canvas-based high-res PNG chart screenshot generator
        ├── fileParser.js       # SheetJS parser for custom XLSX/CSV files
        ├── marketData.js       # Live candle fetcher & batch queue
        └── exporter.js         # Multi-format exporter (.xlsx, .xls, .csv, and .zip with charts)
```
