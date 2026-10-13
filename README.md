# AntiGravity — ApexQuant Terminal Repository

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![JavaScript](https://img.shields.io/badge/ES6+-Vanilla%20JS-F7DF1E.svg?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Exchanges](https://img.shields.io/badge/Exchanges-NSE%20India%20%7C%20NASDAQ%20%7C%20NYSE-10B981.svg)](#supported-exchanges)
[![Data Feed](https://img.shields.io/badge/Live%20Data-Yahoo%20Finance%20Stream-00F2FE.svg)](#market-data-architecture)

This repository contains the source code for **ApexQuant Terminal**, an institutional-grade quantitative stock market analysis and valuation engine with real-time feeds from **NSE India (National Stock Exchange)** and **US Markets (NASDAQ / NYSE)**.

The complete application source code is organized under the [`ApexQuant Terminal/`](./ApexQuant%20Terminal/) folder.

---

## 📁 Repository Structure

```
AntiGravity/
├── .gitignore
├── README.md                          # Root repository documentation
└── ApexQuant Terminal/                # Application source code & package
    ├── index.html                     # Application shell and semantic markup
    ├── package.json                   # Dependencies and npm scripts
    ├── vite.config.js                 # Vite configuration & Yahoo Finance API proxy
    ├── README.md                      # Detailed technical documentation
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

## 🚀 Quick Start

To run the terminal locally:

1. **Navigate to the application folder:**
   ```bash
   cd "ApexQuant Terminal"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

4. **Access the terminal:**
   Open [http://localhost:5173](http://localhost:5173) in your browser.

5. **Build for production:**
   ```bash
   npm run build
   ```

---

## 🌟 Key Capabilities

- **Universal Omnibar Search**: Search any **NSE India** or **US listed stock** by name or ticker (e.g. `Tata Power`, `Reliance`, `Apple`, `Nvidia`, `TATAPOWER`, `NVDA`, `PLTR`), with automatic typo cleaning and direct `<Enter>` resolution.
- **Peter Lynch GARP Valuation**: Real-time PEG ratio ($P/E \div g_{\text{EPS}}$) and Peter Lynch fair value calculations.
- **3-Scenario Stress Test Matrix**: Bear (-30% growth), Base (consensus), and Bull (+25% growth) return projections.
- **2D Sensitivity Table**: Interactive terminal P/E vs annual EPS growth heatmapped matrix.
- **Interactive Technical Analysis Charts**: 1-Year daily candlesticks, 50-day & 200-day SMAs (Golden Cross / Death Cross), and 14-day RSI with overbought/oversold boundaries.
- **Breaking News Stream & NLP Sentiment**: Real-time news sorted chronologically with natural language processing sentiment scores.
- **Real-Time GARP Radar Screener**: Filterable by exchange with multi-criteria real-time sorting.
- **Simulate Any Custom Model**: Dedicated modal sandbox to model private or custom tickers.

For in-depth mathematical formulas and detailed documentation, see [`ApexQuant Terminal/README.md`](./ApexQuant%20Terminal/README.md).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
