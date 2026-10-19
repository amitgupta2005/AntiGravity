# Option Trading Picker 🎯

> **Institutional Quantitative Derivatives & Strategy Scanner for USA and Indian Stock Markets**  
> Real-Time Options Greeks, Dynamic 3-Way Option Chain, Payoff Diagram Visualizer, and Multi-Leg Strategy Builder.

---

## 📌 Executive Summary

**Option Trading Picker** is a professional-grade quantitative derivatives analytics and strategy scanning platform engineered for equities and benchmark indices across **Wall Street (USA)** and **Dalal Street (India)**. 

The application utilizes the **Black-Scholes-Merton** mathematical pricing model to continuously evaluate volatility skews, analyze Greeks ($\Delta, \Gamma, \Theta, \nu$), estimate Probability of Profit (POP %), calculate Max Pain pinning targets, and scan for optimal Call and Put option trade setups under varying market regimes.

---

## 🌟 Key Functional Pillars

### 1. Dual-Market & Dual-Asset Coverage
* **USA Benchmark Indices**: S&P 500 (`SPX`), Nasdaq 100 (`QQQ`), Dow Jones Industrial Average (`DIA`), Russell 2000 (`IWM`), CBOE Volatility Index (`VIX`).
* **USA High-Liquidity Equities**: `NVDA`, `AAPL`, `TSLA`, `MSFT`, `AMZN`, `META`, `GOOGL`, `AMD`, `COIN`, `PLTR`.
* **India Benchmark Indices (NSE / BSE)**: `NIFTY 50`, `BANKNIFTY`, `FINNIFTY`, `SENSEX`.
* **India High-Volume F&O Equities**: `RELIANCE`, `HDFCBANK`, `TATAMOTORS`, `ICICIBANK`, `INFY`, `TCS`, `SBIN`, `BHARTIARTL`, `LT`, `ITC`, `BAJFINANCE`, `TATAPOWER`.

### 2. Multi-Regime Strategy Scanner
Automatically classifies market regimes (directional momentum, high/low IV, support/resistance, range-bound consolidation) and suggests optimal multi-leg option structures:
* **Bullish Momentum**: Long Call (Breakout), Bull Call Spread (Debit), Bull Put Spread (Credit), Cash-Secured Put.
* **Bearish Momentum**: Long Put (Breakdown), Bear Put Spread (Debit), Bear Call Spread (Credit).
* **Delta-Neutral & Income**: Iron Condor (Consolidation harvest), Iron Butterfly (Pinning strike), Covered Call (Buy-Write).
* **Volatility Breakouts**: Long Straddle & Long Strangle (Compression squeeze).

### 3. Interactive Strategy Payoff Curve
* **Dual-Curve Payoff Visualizer**: Powered by `Chart.js`, dynamically plots **Expiration P&L** (solid curve with shaded emerald/rose profit & loss zones) alongside **T+0 P&L Today** (neon dashed curve using live Black-Scholes pricing).
* **Risk & Probability Metrics**: Immediate calculation of Breakeven points, Max Profit, Max Loss, Risk/Reward ratio, and Probability of Profit (POP %).

### 4. Institutional 3-Way Option Chain
* Classic institutional trading desk format: **Calls | Strike Price Ladder | Puts**.
* Comprehensive metrics per strike: **Delta ($\Delta$)**, **IV %**, **Open Interest (OI) Heatmap bars**, **Volume**, **Bid**, **Ask**, and **LTP**.
* Visual highlights for **ATM (At-The-Money)** and **Max Pain Pin** strikes.
* **One-Click Leg Insertion**: Direct click on any Bid or Ask price instantly imports that leg into the Strategy Builder.

### 5. Custom Multi-Leg Strategy Builder & Simulator
* Construct custom 1 to 4 legged option structures with customized Actions (`BUY` / `SELL`), Types (`CALL` / `PUT`), Strikes, Expirations, Contracts, and Premiums.
* Aggregates Net Debit/Credit, Total Margin, Net Portfolio Greeks, and plots directly to the interactive Payoff Visualizer.

### 6. Market Pulse & Max Pain Radar
* Real-time trading session status monitoring for **Wall Street (NYSE/NASDAQ)** and **Dalal Street (NSE/BSE)**.
* Benchmark index cards with Put-Call Ratio (PCR), IV Rank, and Max Pain strikes.
* **Elevated IV Rank Leaderboard** (Top candidates for Premium Sellers).
* **Low IV Rank Leaderboard** (Top candidates for Option Buyers).

---

## 🏛️ High-Level Technical Architecture

The following diagram illustrates the high-level tier breakdown of the **Option Trading Picker** platform, spanning from external market data providers down to the client presentation interface:

```mermaid
graph TD
    subgraph Market_Layer["External Market & Data Layer"]
        M1["Yahoo Finance Query API"]
        M2["Wall Street Feeds (NYSE / NASDAQ)"]
        M3["Dalal Street Feeds (NSE / BSE)"]
    end

    subgraph Ingestion_Layer["Data Ingestion & Feed Service"]
        F1["marketDataFeed.js (Live Quotes Service)"]
        F2["stockUniverse.js (Asset Catalog & Multipliers)"]
        F3["Continuous Market Simulation Tick Daemon"]
    end

    subgraph Quant_Layer["Quantitative & Pricing Engine"]
        Q1["blackScholes.js (B-S-M Pricing & Greeks Engine)"]
        Q2["strategyEngine.js (Scanner & Regime Classifier)"]
        Q3["payoffCalculator.js (Multi-Leg Payoff & POP Engine)"]
    end

    subgraph State_Layer["Application Controller & State Store"]
        S1["main.js (Central State Controller)"]
        S2["Active Filter State & Search Omnibar"]
        S3["Lucide Icon Engine & Toast Notifications"]
    end

    subgraph Presentation_Layer["Client Presentation Layer (Vite + Vanilla CSS)"]
        P1["Strategy Scanner Grid (scannerView.js)"]
        P2["Interactive Payoff Diagram (payoffChart.js)"]
        P3["Institutional 3-Way Option Chain (optionChainView.js)"]
        P4["Custom Strategy Builder (strategyBuilder.js)"]
        P5["Market Pulse & Max Pain (marketOverview.js)"]
    end

    M1 --> F1
    M2 --> F1
    M3 --> F1
    F2 --> F1
    F3 --> F1

    F1 --> S1
    S1 --> Q1
    S1 --> Q2
    S1 --> Q3

    Q1 --> P2
    Q1 --> P3
    Q2 --> P1
    Q3 --> P2
    Q3 --> P4

    S2 --> P1
    S1 --> P5
```

---

## 🔍 Low-Level Technical Architecture & Calculation Pipeline

The low-level technical diagram outlines the internal data pipeline, component dependencies, and mathematical processing cycles:

```mermaid
sequenceDiagram
    autonumber
    actor Trader as "Options Trader"
    participant UI as "App Header & Tabs UI"
    participant Controller as "main.js (Controller)"
    participant Feed as "marketDataFeed.js"
    participant BS as "blackScholes.js (Quant Engine)"
    participant Engine as "strategyEngine.js"
    participant Payoff as "payoffCalculator.js"
    participant ChartUI as "payoffChart.js (Chart.js)"
    participant ChainUI as "optionChainView.js"

    Trader->>UI: Selects Asset / Enters Search Query (e.g. NVDA or NIFTY 50)
    UI->>Controller: Dispatches asset selection / filter event
    Controller->>Feed: fetchLiveQuote(asset)
    Feed-->>Controller: Returns Spot Price, Day Change, IV, PCR, Max Pain
    
    rect rgb(20, 28, 45)
        note over Controller, Engine: Quantitative Strategy Scanning Cycle
        Controller->>Engine: scanStrategiesForAsset(quote)
        loop Across Expirations & Regimes
            Engine->>BS: calculateGreeks(type, S, K, T, r, sigma)
            BS-->>Engine: Delta, Gamma, Theta, Vega, Intrinsic, Extrinsic
            Engine->>BS: calculatePOP(S, breakeven, T, sigma, isBullish)
            BS-->>Engine: Probability of Profit (POP %)
            Engine->>Payoff: calculatePayoffProfile(legs, S, lotSize, dte, sigma, r)
            Payoff-->>Engine: Expiry P&L, T+0 Curve, Breakevens, Max Profit/Loss
        end
        Engine-->>Controller: Ranked Strategy Cards (Bullish, Bearish, Neutral, Vol)
    end

    Controller->>UI: Renders Strategy Scanner Grid (scannerView.js)

    opt Trader clicks "Analyze Payoff Curve"
        Trader->>UI: Click "Analyze Payoff Curve"
        UI->>Controller: switchTab("tab-analyzer")
        Controller->>Payoff: calculatePayoffProfile(strat.legs, S, lotSize, dte, sigma, r)
        Payoff-->>ChartUI: pricePoints, expiryPnL, currentPnL, breakevens
        ChartUI->>UI: Renders interactive Chart.js canvas with profit/loss zones
    end

    opt Trader clicks "Option Chain"
        Trader->>UI: Click "Live Option Chain"
        UI->>Controller: switchTab("tab-chain")
        Controller->>Feed: generateOptionChain(quote, selectedDte)
        Feed->>BS: Computes skew-adjusted Greeks across 25 strikes
        Feed-->>ChainUI: Formatted Call & Put matrices with OI heatmaps
        ChainUI->>UI: Renders 3-way Option Chain table
    end
```

---

## 🧮 Mathematical Engine & Formulas

### 1. Black-Scholes-Merton Pricing Formula
For European and American style options:

$$d_1 = \frac{\ln(S / K) + \left(r + \frac{\sigma^2}{2}\right)T}{\sigma \sqrt{T}}$$

$$d_2 = d_1 - \sigma \sqrt{T}$$

* **Call Price ($C$)**:
  $$C = S \cdot N(d_1) - K e^{-rT} N(d_2)$$
* **Put Price ($P$)**:
  $$P = K e^{-rT} N(-d_2) - S N(-d_1)$$

Where:
* $S$ = Current Underlying Spot Price
* $K$ = Strike Price
* $T$ = Time to Expiration in Years ($\text{DTE} / 365$)
* $r$ = Risk-free Interest Rate ($4.5\%$ for US, $6.5\%$ for India)
* $\sigma$ = Implied Volatility (annualized)
* $N(x)$ = Standard Normal Cumulative Distribution Function (evaluated via Hart / Abramowitz-Stegun polynomial approximation with precision $< 10^{-7}$).

### 2. Option Greeks Suite
* **Delta ($\Delta$)**: Rate of change of option price with respect to underlying spot price:
  $$\Delta_{\text{Call}} = N(d_1), \quad \Delta_{\text{Put}} = N(d_1) - 1$$
* **Gamma ($\Gamma$)**: Second derivative of option price with respect to underlying price:
  $$\Gamma = \frac{N'(d_1)}{S \sigma \sqrt{T}}$$
* **Theta ($\Theta$)**: Daily decay in currency:
  $$\Theta_{\text{Call}} = \frac{1}{365} \left( -\frac{S N'(d_1) \sigma}{2\sqrt{T}} - r K e^{-rT} N(d_2) \right)$$
  $$\Theta_{\text{Put}} = \frac{1}{365} \left( -\frac{S N'(d_1) \sigma}{2\sqrt{T}} + r K e^{-rT} N(-d_2) \right)$$
* **Vega ($\nu$)**: Sensitivity per $1\%$ change in volatility:
  $$\nu = \frac{S \sqrt{T} N'(d_1)}{100}$$

### 3. Probability of Profit (POP %)
Computed using the log-normal distribution of underlying price reaching breakeven at expiration:

$$Z = \frac{\ln(\text{Breakeven} / S) - \left(r - \frac{\sigma^2}{2}\right)T}{\sigma \sqrt{T}}$$

$$\text{POP}_{\text{Bullish}} = \left[1 - N(Z)\right] \times 100\%, \quad \text{POP}_{\text{Bearish}} = N(Z) \times 100\%$$

---

## 📁 Project Directory Structure

```
Option Trading Picker/
├── index.html                  # Main HTML Shell, navigation tabs, and modular panels
├── vite.config.js              # Vite server configuration (runs on port 5174)
├── package.json                # Project dependencies (chart.js, lucide)
├── README.md                   # Technical documentation & architecture diagrams
└── src/
    ├── style.css               # Comprehensive financial terminal design system & theme variables
    ├── main.js                 # Central state manager, event listeners, and live ticker daemon
    ├── quant/
    │   ├── blackScholes.js     # High-precision Black-Scholes analytical pricing & Greeks
    │   ├── strategyEngine.js   # Multi-regime strategy scanner & classifier
    │   └── payoffCalculator.js # Payoff profile, zero crossings, risk/reward, and T+0 curves
    ├── data/
    │   ├── stockUniverse.js    # Curated universe of US & Indian stocks/indices & lot sizes
    │   └── marketDataFeed.js   # Live quotes ingestor, dynamic option chain, and tick simulator
    └── components/
        ├── scannerView.js      # Strategy Scanner cards renderer & multi-criteria filter
        ├── payoffChart.js      # Chart.js interactive payoff diagram visualizer
        ├── optionChainView.js  # Institutional 3-way Option Chain table with OI heatmap
        ├── strategyBuilder.js  # Interactive custom combo builder & preset templates
        ├── marketOverview.js   # Macro session status, index cards, & IV Rank leaderboards
        └── toast.js            # Smooth animated notification utility
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.0.0 or higher)
* **npm** (v9.0.0 or higher)

### Installation
```bash
# Navigate to the project directory
cd "Option Trading Picker"

# Install dependencies (Vite, Chart.js, Lucide Icons)
npm install
```

### Running Locally (Development Mode)
```bash
npm run dev
```
Open **[http://localhost:5174/](http://localhost:5174/)** in your browser.

### Production Build
```bash
npm run build
```
Creates an optimized production bundle inside the `dist/` directory.

---

## 🔒 Security & Data Integrity
* **Client-Side Analytical Processing**: All Greek calculations, payoff simulations, and Black-Scholes computations run entirely in the browser using high-precision JavaScript arithmetic.
* **Resilient Market Simulation**: In the event of network disruption or CORS restrictions on external quote endpoints, the embedded simulation tick generator guarantees continuous, non-breaking platform availability.
