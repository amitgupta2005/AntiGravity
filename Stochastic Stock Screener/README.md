# Stochastic Stock Screener (4, 3, 3) — Closing Basis

A quantitative stock screening platform built under the **AntiGravity** ecosystem to analyze equities on a strict **closing basis** using the **Stochastic Oscillator with input values 4, 3, 3**. Features seamless document upload (`.xlsx` and `.csv`) to screen custom watchlists or portfolios, live multi-chart inspector, and out-of-the-box benchmark universes.

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

2. **Spreadsheet Document Upload (`.xlsx` & `.csv`)**:
   - Client-side document parsing powered by **SheetJS (`xlsx`)**.
   - Intelligent column recognition supporting:
     - `Symbol` / `Ticker` / `Stock` / `Code`
     - `Company Name` / `Name` / `Security`
     - `Exchange` (auto-detects NSE, BSE, NASDAQ, NYSE)
     - `Sector` / `Industry`
   - Instant document preview table with duplicate detection and removal.
   - Downloadable template generators (`Sample_Stocks_List.xlsx` and `Sample_Stocks_List.csv`).

3. **Curated Out-of-the-Box Universes**:
   - 🇮🇳 **NIFTY 50** (NSE India Bluechips)
   - 🇮🇳 **NIFTY Next 50** (High Growth & Momentum)
   - 🇺🇸 **US Mega Tech & S&P 500 Leaders** (NVDA, AAPL, MSFT, GOOGL, etc.)
   - 🌐 **Benchmark Indices & ETFs** (Nifty BeES, SPY, QQQ, SMH)

4. **Quantitative KPI Bar & Screening Table**:
   - Real-time summary cards: Total Screened, Bullish Golden Crosses, Oversold (<20), Bearish Death Crosses, Overbought (>80).
   - Fast filter tabs: All, Bullish Cross, Oversold, Bearish Cross, Overbought, Divergences.
   - Instant search by symbol, company name, or sector.
   - Dual-gauge oscillator visual meter displaying `%K` position, `%D` pin, and 20/80 boundary zones.

5. **Deep-Dive Stock Inspector & Dual Chart Modal**:
   - Closing price history chart with volume context.
   - Stochastic oscillator sub-chart plotting `%K (Cyan)`, `%D (Amber)`, and overbought/oversold boundaries.
   - 10-bar mathematical calculation breakdown table detailing bar-by-bar `Close`, `Fast %K`, `Slow %K`, `%D`, `Spread`, and `Signal State`.

6. **Exporting**:
   - Export screened results with all quantitative metrics directly to `.xlsx` (Excel) or `.csv`.

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
├── index.html                  # Main application structure & modals
├── package.json                # Project dependencies & scripts
├── vite.config.js              # Vite server & Yahoo Finance proxy middleware (port 5175)
├── test_screener.js            # Automated test suite for quant engine & parsing
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
        ├── fileParser.js       # SheetJS parser for custom XLSX/CSV files
        ├── marketData.js       # Live candle fetcher & batch queue
        └── exporter.js         # Export screened results to Excel & CSV
```
