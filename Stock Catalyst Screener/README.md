# Stock Catalyst & Earnings Screener 🎯

> **Automated AI-Driven Stock Recommendation Web Application for Breaking News & Quarterly Results**  
> Identifies asymmetric trade opportunities across **Indian (NSE/BSE)** and **US (NYSE/NASDAQ)** markets for **Immediate Next-Day Intraday Moves (+2% to +6%)** and **Short-Term Delivery Breakouts (+10% to +50% Return)**.

---

## 📌 Executive Summary

**Stock Catalyst Screener** is an institutional quantitative and AI-driven equity research platform designed to monitor breaking financial news, regulatory circulars, and quarterly earnings disclosures.

The application pairs real-time price discovery via `yfinance` with the **Google Gemini API** (via LangChain / `google-genai`) to evaluate the conviction and magnitude of market catalysts. For every identified setup, the system algorithmically generates institutional execution parameters including **Entry Price**, tight **Stop Loss**, tiered **Target Prices**, and favorable **Risk:Reward ratios**.

All recommendations are presented in an institutional, high-density **Tabular Screener UI** with column sorting, live market status, and interactive deep-dive drawers.

---

## 🌟 Key Features

### 1. Dual-Market Coverage (Dalal Street & Wall Street)
* **🇮🇳 Indian Equities (NSE/BSE)**: Top Nifty 50, Bank Nifty, and high-beta midcaps (`RELIANCE`, `TCS`, `HDFCBANK`, `TATAMOTORS`, `INFY`, `DIXON`, `HAL`, `BEL`, `TRENT`, `SUZLON`, `POLYCAB`, `BSE`, `CDSL`, etc.).
* **🇺🇸 US Equities (NYSE/NASDAQ)**: Mega-cap tech, AI infrastructure, and high-beta growth momentum (`NVDA`, `AAPL`, `MSFT`, `TSLA`, `AMD`, `PLTR`, `SMCI`, `COIN`, `CRWD`, `LLY`, `AMZN`, `GOOGL`, `META`, etc.).

### 2. Multi-Horizon Recommendation Engine
* **⚡ Next-Day Intraday Momentum (+2% to +6% Target)**:
  - Tight risk invalidation stop loss (1.2% to 1.6%).
  - Fast Opening Range Breakout (ORB) entry buffer.
  - Favorable Risk:Reward ratio ($\ge 1 : 2.0$).
* **🚀 Short-Term Delivery / Swing (+10% to +50% Expected Return)**:
  - Captures Post-Earnings Announcement Drift (PEAD) and structural re-ratings over 1 to 4 weeks.
  - Asymmetric reward scaling (+12% to +48%) anchored to swing supports.
  - High asymmetric Risk:Reward ratio ($1 : 3.0$ to $1 : 7.5$).

### 3. Gemini AI Catalyst & Heuristic Analysis
* **Strict Pydantic JSON Output**: Evaluates news impact, earnings beats/misses, forward guidance revisions, and order wins into structured models.
* **Resilient Heuristic Fallback**: Includes a deterministic quantitative rule engine that runs seamlessly even without an external API token or during network limits.

### 4. Institutional Tabular Screener UI (Vite + React)
* **High-Density Table View**:
  - Columns: **Ticker**, **Market (India/US)**, **Direction (Buy/Sell)**, **Timeframe (Intraday/Short-term)**, **Reason**, **Current Price (LTP)**, **Entry Price**, **Stop Loss Price**, **Target Price**, **Risk:Reward**, and **AI Conviction Score**.
* **Interactive Column Sorting**: Click-to-sort on all numeric and alphabetical headers (Ascending/Descending toggle, sort indicator icons, `aria-sort`).
* **Multi-Criteria Filter Toolbar**: Quick toggles for Market (`All`, `India`, `US`), Timeframe (`All`, `Intraday`, `Short-term`), Direction (`All`, `BUY`, `SELL`), and real-time Search Omnibar.
* **Deep-Dive Catalyst Modal**: View verbatim news headlines, publishing sources, quarterly financial scorecards (Revenue, PAT, Margins), and a 1-click **"Copy Trade Plan"** button.
* **On-Demand Ticker Analyzer**: Modal enabling instant AI catalyst analysis on any user-entered stock ticker.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Data_Layer["Real-Time Market & News Data Layer"]
        D1["yfinance API (Live Spot, RVOL, 52W High/Low via Yahoo Finance v8)"]
        D2["Live Breaking News RSS (Google News Financial & Exchange Feeds)"]
        D3["Quarterly Financial & Earnings Calendars"]
    end

    subgraph Unified_App["Unified In-UI Platform (Vite + React on :5177)"]
        U1["server/apiRouter.js (In-UI Backend API: /api/scan, /api/analyze, /api/markets)"]
        U2["catalystEngine.js (Live Exchange Feed Verifier & Catalyst Analyzer)"]
        U3["trade_engine (Intraday 2-6% & Short-Term 10-50% Target Math)"]
        U4["High-Density Tabular UI (Click-to-Sort, Multi-Horizon Filters)"]
        U5["On-Demand Custom Ticker Analyzer Modal"]
    end

    D1 --> U1
    D2 --> U1
    D3 --> U1
    U1 --> U2
    U2 --> U3
    U3 --> U4
    U3 --> U5
```

---

## 📁 Project Directory Structure

```
Stock Catalyst Screener/
├── .env.example                     # Sample API keys (GEMINI_API_KEY, PORT)
├── .gitignore                       # Git ignore rules for node_modules, dist, __pycache__
├── README.md                        # Project documentation and architecture guide
├── start.sh                         # Unified 1-Click launcher for http://localhost:5177
├── backend/                         # Optional Python FastAPI service (if running standalone)
│   ├── app.py                       # FastAPI REST API endpoints (/api/catalysts, /api/markets, /api/scan)
│   ├── ai_analyzer.py               # Gemini AI prompt engine & quantitative heuristic fallback
│   ├── data_ingestion.py            # Real-time exchange feed and news parser
│   ├── trade_engine.py              # Quantitative Entry, Stop Loss, Target, and R:R calculator
│   ├── stock_universe.py            # Curated catalog for Indian (NSE) and US (NYSE/NASDAQ) stocks
│   ├── requirements.txt             # Python dependencies
│   └── test_backend.py              # Automated unit tests for trade math, schemas, and stock universe
└── frontend/                        # Unified In-UI Web Application
    ├── package.json                 # React 18, Vite 6, and Lucide-react dependencies
    ├── vite.config.js               # Vite configuration with embedded in-UI API middleware
    ├── index.html                   # HTML shell with Google Fonts (Inter, Outfit, JetBrains Mono)
    ├── server/                      # In-UI Backend API Engine
    │   └── apiRouter.js             # Endpoints for /api/scan, /api/analyze, /api/markets, /api/trending
    └── src/
        ├── App.jsx                  # Main application state and live scan coordinator
        ├── main.jsx                 # React DOM mount point
        ├── style.css                # Institutional Bloomberg-style dark design system
        ├── services/
        │   └── catalystEngine.js    # Client-side API caller & resilient fallback engine
        └── components/
            ├── Header.jsx           # App branding, live market chips, and custom ticker button
            ├── DisclaimerBanner.jsx # Mandatory regulatory non-advisory compliance banner
            ├── SummaryCards.jsx     # Top KPI overview cards
            ├── FilterToolbar.jsx    # Market, timeframe, direction, and search omnibar
            ├── CatalystTable.jsx    # High-density sortable tabular screener
            ├── CatalystModal.jsx    # Deep-dive drawer with news verbatim & "Copy Plan"
            └── TickerAnalyzerModal.jsx # On-demand custom ticker analysis modal
```

---

## 🚀 Getting Started

### 1-Click Launch (Recommended)
Run the unified platform launcher script:
```bash
cd "Stock Catalyst Screener"
./start.sh
```
Or directly with npm:
```bash
cd "Stock Catalyst Screener/frontend"
npm run dev
```

Open **[http://localhost:5177/](http://localhost:5177/)** in your browser.

> **Zero Extra Server Required**: All exchange market feeds, news ingestion, AI catalyst scoring, and trade calculations run directly inside the unified UI platform on port `5177`. No separate backend server process is required!

---

## 🔑 Environment Configuration

Create a `.env` file in the project root or `backend/` directory by copying `.env.example`:
```bash
cp .env.example .env
```
Populate with your optional API keys:
```env
# Optional: Google Gemini API Key for LLM processing
GEMINI_API_KEY=your_actual_key_here

# Backend Port
BACKEND_PORT=8001
```
> **Note**: Even without a `GEMINI_API_KEY`, the application automatically uses its built-in quantitative heuristic engine, guaranteeing 100% operational functionality out of the box!

---

## 🔒 Regulatory & Financial Disclaimer
This application is strictly for **educational, analytical, and research purposes**. All trade setups, price targets, stop losses, and directional biases are generated by algorithms and artificial intelligence. This platform is **not a registered SEBI, SEC, or FINRA financial advisory firm**. Users should always perform their own due diligence and consult a certified financial advisor before committing capital to financial markets.
