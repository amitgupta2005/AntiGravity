# ApexQuant Terminal — Institutional Stock Market Analysis & Valuation Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![JavaScript](https://img.shields.io/badge/ES6+-Vanilla%20JS-F7DF1E.svg?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Exchange](https://img.shields.io/badge/Exchanges-NSE%20India%20%7C%20NASDAQ%20%7C%20NYSE-10B981.svg)](#supported-exchanges)
[![Data Feed](https://img.shields.io/badge/Live%20Data-Yahoo%20Finance%20Stream-00F2FE.svg)](#market-data-architecture)

ApexQuant Terminal is an institutional-grade, responsive quantitative equity analysis web platform designed for quants, portfolio managers, and individual investors. It provides real-time market data streaming from **NSE India (National Stock Exchange)** and **US Markets (NASDAQ / NYSE)**, Peter Lynch **Growth-At-A-Reasonable-Price (GARP)** valuation models, future earnings projections, 2D sensitivity stress matrices, technical momentum indicators, financial NLP sentiment analysis, and a real-time GARP radar screener.

---

## 🌟 Key Features

### 1. 🔍 Universal Omnibar Search & Fuzzy Resolution
- **Search Any Stock**: Search any company listed on **NSE India (`.NS` / `.BO`)** or **US Exchanges (NASDAQ / NYSE)** by company name, ticker symbol, or keywords (e.g., `Tata Power`, `Reliance`, `Apple`, `Nvidia`, `TATAPOWER`, `SBIN`, `PLTR`).
- **Typo & Symbol Sanitization**: Automatically handles keyboard typos and accidental punctuation (e.g. `Tata p[ower` cleans directly to `TATAPOWER.NS`).
- **Instant Autocomplete & Direct Enter Resolution**: Hitting <kbd>Enter</kbd> or clicking the search icon instantly resolves company names to valid exchange tickers and loads live streaming quotes.

### 2. 📈 Peter Lynch GARP & Valuation Models
- **PEG Ratio Analysis**: Real-time PEG calculation ($\text{Forward P/E} \div \text{Annual EPS Growth Rate}$). Highlights undervalued stocks with $\text{PEG} < 1.0$ (Peter Lynch margin-of-safety benchmark).
- **Peter Lynch Fair Value**: Dynamically calculated using forward EPS and projected growth rate.
- **Projected Compounded Annual Return (CAGR)**: Models total return over 1 to 5 years based on earnings compounding and multiple expansion/contraction.

### 3. 🎯 3-Scenario Stress Test & 2D Sensitivity Matrix
- **Scenario Analysis**:
  - **Bear Case**: -30% EPS growth haircut + 20% P/E multiple contraction.
  - **Base Case**: Consensus EPS trajectory with market exit P/E.
  - **Bull Case**: +25% growth acceleration + 15% multiple expansion.
- **2D Sensitivity Matrix**: Interactive heatmapped matrix modeling target stock returns across terminal P/E multiples (15x to 45x) versus annual growth rates (10% to 40%).

### 4. 📊 Technical Momentum & Candlestick Charts
- **1-Year Daily Price Series**: Chart.js powered interactive daily chart with volume bars.
- **Moving Averages**: Live 50-day and 200-day Simple Moving Averages (SMAs) with Golden Cross / Death Cross indicator tags.
- **14-Day RSI (Relative Strength Index)**: Wilder's smoothed momentum oscillator indicating Overbought (>70) and Oversold (<30) regimes.
- **Dynamic Support & Resistance**: Rolling 30-day pivot bounds.

### 5. 📰 Financial News Feed & NLP Sentiment Scoring
- **Real-Time News Stream**: Curated breaking financial news headlines fetched via Yahoo Finance API.
- **Chronological Sorting**: News entries sorted descending by publish timestamp.
- **Quantitative NLP Sentiment Scoring**: Financial lexicon NLP classifier scoring headlines as Bullish, Neutral, or Bearish (-1.0 to +1.0).

### 6. 📡 Real-Time GARP Radar Screener
- Live screener table tracking all universe stocks.
- Filter by exchange: **All**, **NSE India 🇮🇳**, or **US Equities 🇺🇸**.
- Quick toggle for $\text{PEG} < 1.0$ GARP opportunities.
- Real-time sortable by Date, PEG, Expected CAGR, and Fair Value Upside.

### 7. 🎛️ Custom Valuation Sandbox (+ Custom Model)
- Modal dialog allowing quants to model any custom ticker or private company by adjusting EPS growth rates, target P/E ratios, and holding horizons.

### 8. 🌓 Institutional Dark / Light Mode & Ticker Tape
- High-contrast institutional dark theme with glassmorphism cards and vibrant data visualizations.
- Streaming top market indices ticker tape: **NIFTY 50**, **SENSEX**, **S&P 500**, and **NASDAQ Composite**.

### 9. 📚 Real-Time Order Book & 10-Year Order History (Last 5 Years & Next 5 Years)
- **10-Year Order History Bar Graph**: Interactive Chart.js grouped bar visualization comparing **Order Book Backlog**, **New Order Inflows**, and **Executed Revenue** across 2020–2024 (Historical) and 2025–2029 (Forward Projections).
- **KPI Metrics**: Total Current Backlog, Book-to-Bill Ratio ($Inflows \div Revenue$), Revenue Visibility (Years of execution locked in), and 5-Year Forward Backlog CAGR.
- **10-Year Order Book Ledger Table**: Full multi-column data table with status badges and YoY growth rates.
- **Real-Time Level 2 Market Depth (DOM)**: Live depth ladder displaying top bids, top asks, bid-ask spread, and order flow imbalance ratio.
- **Commercial Contract Segments**: Revenue backlog breakdown across key business units and high-growth verticals.

---

## 📐 Mathematical & Quantitative Formulas

| Metric | Formula | Interpretation |
| :--- | :--- | :--- |
| **Forward P/E** | $P/E_{\text{forward}} = \frac{P_{\text{current}}}{EPS_{\text{forward}}}$ | Valuation multiple relative to next year's earnings. |
| **PEG Ratio** | $PEG = \frac{P/E_{\text{forward}}}{g_{\text{EPS}}}$ | Values below 1.0 indicate growth is undervalued. |
| **Peter Lynch Fair Value** | $V_{\text{Lynch}} = EPS_{\text{forward}} \times \min(g_{\text{EPS}}, 25)$ | Classic fair value rule of thumb for growth equities. |
| **Target Price (Year $N$)** | $P_{\text{target}} = EPS_{\text{base}} \times (1 + g)^N \times P/E_{\text{exit}}$ | Terminal equity valuation at horizon year $N$. |
| **Projected CAGR** | $\text{CAGR} = \left(\frac{P_{\text{target}}}{P_{\text{current}}}\right)^{1/N} - 1$ | Annualized expected return from current price. |
| **Book-to-Bill Ratio** | $\text{Book-to-Bill} = \frac{\text{New Order Inflows}}{\text{Executed Revenue}}$ | Values $> 1.0\times$ indicate expanding order backlog and pipeline. |
| **Revenue Visibility** | $\text{Visibility (Yrs)} = \frac{\text{Current Order Backlog}}{\text{Annual Revenue Execution}}$ | Number of forward years of revenue secured by existing contracts. |
| **14-Day RSI** | $RSI = 100 - \frac{100}{1 + RS}$ where $RS = \frac{\overline{Gain}_{14}}{\overline{Loss}_{14}}$ | Wilder's smoothed relative strength index. |

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+ Modules), Vanilla CSS Design System.
- **Build Tool & Dev Server**: [Vite](https://vitejs.dev/) with native ES module hot reloading.
- **Charts & Visualizations**: [Chart.js](https://www.chartjs.org/) (Line, Bar, Moving Averages, RSI).
- **Icons**: [Lucide Icons](https://lucide.dev/).
- **Backend Proxy**: Vite middleware proxy forwarding requests to Yahoo Finance Query APIs (`/v8/finance/chart` and `/v1/finance/search`) with User-Agent headers, CORS handling, and input sanitization.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` (v9.0.0 or higher)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/amitgupta2005/AntiGravity.git
   cd AntiGravity
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5173` to access the terminal.

### Production Build
To create an optimized production bundle:
```bash
npm run build
```
The output will be generated in the `dist/` directory.

To preview the production build locally:
```bash
npm run preview
```

---

## 📁 Project Directory Structure

```
AntiGravity/
├── index.html                     # Application shell and semantic markup
├── package.json                   # Dependencies and npm scripts
├── vite.config.js                 # Vite configuration & Yahoo Finance API proxy
├── .gitignore                     # Git ignore rules for node_modules and builds
├── README.md                      # Platform documentation
└── src/
    ├── main.js                    # Application orchestrator, omnibar search, state manager
    ├── style.css                  # Institutional CSS theme, tokens, animations, layout
    ├── components/
    │   ├── charts.js              # Chart.js technical & fundamental charts (SMA, RSI, EPS)
    │   ├── screener.js            # GARP Radar screener table with multi-criteria sorting
    │   ├── news.js                # Financial news renderer with NLP sentiment tags
    │   └── customStockModal.js    # Custom stock simulation modal dialog
    ├── data/
    │   └── stocks.js              # Curated initial universe (NSE India & US Bluechips)
    ├── quant/
    │   └── engine.js              # Quantitative formulas (PEG, Lynch Fair Value, Scenarios, CAGR)
    └── services/
        └── yahooFinance.js        # Live market data fetcher, ticker resolver, search autocomplete
```

---

## 🌍 Supported Exchanges

- **NSE (National Stock Exchange of India)**: Suffix `.NS` (e.g. `TATAPOWER.NS`, `RELIANCE.NS`, `TCS.NS`, `SBIN.NS`). Currency displayed in INR (`₹`).
- **BSE (Bombay Stock Exchange)**: Suffix `.BO` (e.g. `TATAPOWER.BO`).
- **NASDAQ (United States)**: (e.g. `NVDA`, `AAPL`, `MSFT`, `AMZN`, `GOOGL`, `TSLA`). Currency displayed in USD (`$`).
- **NYSE (New York Stock Exchange)**: (e.g. `PLTR`, `BABA`, `OKLO`).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
