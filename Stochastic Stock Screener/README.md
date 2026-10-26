# Stochastic Stock Screener (4, 3, 3) — Closing Basis

A professional quantitative stock screening platform built under the **AntiGravity** ecosystem to analyze equities on a strict **closing basis** using the **Stochastic Oscillator with input values 4, 3, 3**. Features dedicated screening for stocks below the **oversold threshold of 20**, automated **Quantitative Entry and Exit Strategy Blueprints**, multi-format exports (`.xlsx`, `.xls`, `.csv`), and high-resolution chart screenshots bundled into automated ZIP archives.

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

3. **Quantitative Entry & Exit Strategy Blueprint**:
   - Automatically formulates an institutional trading blueprint for every identified oversold stock:
     - **Buy Entry Zone**: Calculated buy bracket between current close and 4-period lowest close as %K turns upward.
     - **Stop Loss (Risk Floor)**: Hard stop placed beneath technical support / swing low with safety buffer (typically 1.5% - 2.5% risk).
     - **Target 1 (Mid-Band %K=50 Exit)**: Conservative profit-taking level (+2.5% to +4.5%) to liquidate 50% position and advance stop loss to breakeven.
     - **Target 2 (Overbought %K>80 Exit)**: Swing expansion target (+5.0% to +10.0%) to exit remaining position upon reaching the 80 overbought exhaustion threshold.
     - **Risk-to-Reward Ratio (R:R)**: Favorable reward-to-risk typically ranging from `1 : 2.0` to `1 : 3.5`.
     - **Tactical Execution Playbook**: Step-by-step 5-phase rules for trade entry, position scaling, trailing stops, and invalidation.
   - Visible directly in the **Screener Table**, **Deep-Dive Modal**, **Exported Spreadsheets**, and rendered on the **Chart Screenshots**!

4. **Multi-Format Exporting (`.xlsx`, `.xls`, `.csv`) & Chart Screenshots**:
   - **Modern Excel (`.xlsx`)**: Full OpenXML formatted spreadsheet with column widths, percentages, entry/exit levels, and tactical playbooks.
   - **Legacy Excel 97-2004 (`.xls`)**: Native BIFF8 binary format for legacy Excel compatibility.
   - **Comma-Separated Values (`.csv`)**: Clean flat file format for downstream analytical pipelines.
   - **High-Res Chart Screenshots Archive (`.zip`)**:
     - Automatically generates 1080x720 publication-ready PNG chart screenshots for every screened or oversold stock with an integrated Strategy Blueprint strip.
     - Dual sub-charts: Closing Price history + Stochastic Oscillator (4,3,3) sub-chart with shaded oversold zone, %K cyan line, %D amber line, and quantitative signal stamps.
     - Bundles `.xlsx`, `.xls`, `.csv` plus all generated PNG chart screenshots into an organized `.zip` archive.
   - **Single Stock Screenshot Download**: Instant PNG chart screenshot download directly from table rows or the deep-dive chart modal.

5. **Dynamic Real-Time Live Stock Prices & Streaming Feed**:
   - Continuous streaming live market quote synchronization directly via the Yahoo Finance proxy middleware.
   - **Zero-Delay Instant Startup**: Populates instant baseline benchmark dataset within 5ms of page load so the screen is never blank.
   - **Progressive Stream Updates**: Stocks update dynamically row-by-row with animated green/red flash indicators as live quotes arrive.
   - **30-Second Auto-Refresh Engine**: Integrated countdown polling timer with one-click pause/resume toggle (`Auto: 30s`) and live pulsating radar status indicator.

6. **Feature Switching Between Dark & Light Mode**:
   - Full theme switcher (`Dark Mode` ⇄ `Light Mode`) accessible prominently in the top header.
   - High-contrast, meticulously tailored color palette for both modes (crisp whites, slate borders, vivid cyan/amber accents).
   - Theme preference persists across page reloads via `localStorage`.
   - Dual chart rendering and chart screenshots automatically adapt to the active theme.

7. **Curated Out-of-the-Box Universes**:
   - 🇮🇳 **India Equities**:
     - **NIFTY 50** (NSE India Bluechips)
     - **NIFTY Next 50** (NSE Large-Mid Growth & Momentum)
     - **NIFTY Midcap 100 Leaders** (High-beta growth leaders: Dixon, Polycab, Persistent, Coforge, Trent, etc.)
     - **NIFTY Smallcap Breakouts** (Momentum breakouts: RVNL, Ircon, Hudco, CDSL, BSE, Angel One, Kaynes, etc.)
   - 🇺🇸 **USA Equities**:
     - **US Mega Tech & S&P 500 Leaders** (NVDA, AAPL, MSFT, GOOGL, AMZN, META, TSLA, etc.)
     - **US Midcap Growth & Breakouts (S&P 400)** (PLTR, COIN, SMCI, CRWD, NET, DKNG, APP, AXON, etc.)
     - **US Smallcap High-Beta & Breakouts (Russell 2000)** (IREN, CIFR, CLSK, IONQ, SOUND, ACHR, ASTS, RKLB, etc.)
   - 🌐 **Global Equities**:
     - **Global Mid & Small Cap Innovators** (ASML, TSM, ARM, BABA, JD, PDD, SE, MELI, GRAB, NU, SPOT, SHOP, etc.)
   - 📊 **Exchange Traded Funds (ETFs)**:
     - **All Leading ETFs** (Multi-market blend: SPY, QQQ, IWM, SMH, Nifty BeES, Bank BeES, Gold BeES, ACWI, INDA, etc.)
     - **India ETFs** (NIFTYBEES, BANKBEES, JUNIORBEES, MID150BEES, GOLDBEES, SILVERBEES, ITBEES, AUTOBEES, CPSEETF, etc.)
     - **USA Core & Sector ETFs** (SPY, QQQ, IWM, DIA, SMH, XLF, XLE, XLK, XLV, XLI, XLY, XLP, ARKK, VOO, VTI, SCHD, TLT, GLD)
     - **Global & Emerging Market ETFs** (ACWI, VT, VEA, VWO, EEM, INDA, EWJ, FXI, MCHI, VGK, EWT, EWZ, EFA, IEMG)

8. **Deep-Dive Stock Inspector & Dual Chart Modal**:
   - Closing price history chart with volume context.
   - Stochastic oscillator sub-chart plotting `%K (Cyan)`, `%D (Amber)`, and overbought/oversold boundaries.
   - **Quantitative Entry & Exit Strategy Blueprint card** with 4 level boxes and tactical playbook.
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
├── test_screener.js            # Automated 7-test suite for quant engine, strategies, exports, & zip
└── src/
    ├── main.js                 # Main application state orchestrator
    ├── style.css               # Modern dark/light fintech theme & design system
    ├── components/
    │   ├── kpiBar.js           # Quantitative summary metric cards
    │   ├── screenerTable.js    # Filterable & sortable table with visual gauges & strategy cards
    │   ├── chartModal.js       # Price chart + Stochastic sub-chart + Strategy Blueprint + breakdown
    │   └── uploadModal.js      # Drag-and-drop XLSX/CSV parser with preview
    ├── data/
    │   └── presets.js          # Built-in Nifty 50, Nifty Next 50, US Tech, & ETFs
    ├── quant/
    │   └── stochastic.js       # Close-only Stochastic (4,3,3) engine & Entry/Exit Strategy formula
    └── services/
        ├── chartRenderer.js    # Canvas-based high-res PNG chart screenshot generator with strategy overlay
        ├── fileParser.js       # SheetJS parser for custom XLSX/CSV files
        ├── marketData.js       # Live candle fetcher & batch queue
        └── exporter.js         # Multi-format exporter (.xlsx, .xls, .csv, and .zip with charts & strategy report)
```
