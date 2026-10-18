# Intraday Stock Picker 📈⚡

An institutional-grade **Intraday Technical Screener & Stock Picker Terminal** powered by real-time 1-minute data from Yahoo Finance.

Built specifically for active intraday traders to automatically identify high-probability momentum setups, calculate dynamic volatility-adjusted Stop Loss & Target prices, and provide comprehensive chart analysis rationales.

---

## 🌟 Key Highlights & Features

### 1. 🔍 High-Probability Intraday Screener
- **Institutional Scoring Engine (-100 to +100)**: Evaluates trend structure, volume confirmation, oscillator momentum, and breakout dynamics into a normalized 0–100 Intraday Conviction Score.
- **Automated Trade Categorization**:
  - `STRONG BUY` / `BUY` (Long momentum)
  - `NEUTRAL / CONSOLIDATION` (Range-bound)
  - `SELL` / `STRONG SELL` (Short momentum)
- **Playbook Setup Classification & Quick Filters**:
  - *Day-High Momentum Breakout*
  - *15-Min Opening Range Breakout (ORB High / Low)*
  - *Bullish VWAP Reclaim*
  - *EMA 9/21 Trend Continuation Bounce*
  - *High RVOL Volume Spikes (>1.5x - 3.0x)*
- **Preconfigured Market Baskets**:
  - 🇮🇳 **NSE Nifty 50 Momentum**: Top liquid Nifty leaders
  - 🏦 **NSE Bank Nifty Leaders**: High-beta banking stocks (`HDFCBANK.NS`, `ICICIBANK.NS`, `SBIN.NS`, `BANKBARODA.NS`, `AXISBANK.NS`, etc.)
  - 💻 **NSE Nifty IT Leaders**: Tech giants (`TCS.NS`, `INFY.NS`, `HCLTECH.NS`, `WIPRO.NS`, `TECHM.NS`, `LTIM.NS`)
  - 🇺🇸 **US Magnificent 7**: `NVDA`, `TSLA`, `AAPL`, `MSFT`, `AMZN`, `META`, `GOOGL`
  - 🇺🇸 **US High-Beta Movers**: `AMD`, `PLTR`, `COIN`, `NFLX`, `SMCI`, `ARM`, `MARA`
  - ⚡ **Custom Watchlist**: Real-time scan of any custom list of global tickers.

### 2. 📊 Interactive Candlestick Chart with Pattern Detection
- **High-Performance 1-Minute Live Candlesticks** via TradingView's Lightweight Charts engine.
- **Automated Candlestick Pattern Recognition & Visual Markers**:
  - 🟢 **Bullish Engulfing** & 🔨 **Hammer Reversal**: Visual icons below candles at key support/VWAP.
  - 🔴 **Bearish Engulfing** & ☄️ **Shooting Star**: Visual icons above candles at resistance.
  - ⚡ **Institutional Volume Breakout Bars**: Arrow markers tagged with the exact RVOL multiplier (e.g. `BREAKOUT (2.3x)`).
- **Overlay Indicators**:
  - **VWAP (Volume Weighted Average Price)** with daily session reset & standard deviation bands.
  - **EMA Ribbon**: 9 EMA (Fast trigger), 21 EMA (Trend base), 50 EMA (Structural trend).
  - **Volume & 20-period Volume Moving Average**: Color-coded volume bars.
  - **RSI (14)** Sub-chart with 70 Overbought, 50 Midline, and 30 Oversold guides.
- **Visual Trade Price Lines Plotted Directly on the Chart**:
  - 🛑 **Stop Loss (Red dashed line)** with price & percentage risk
  - 🎯 **Target 1 (Green dashed line)** at 1:1.5 Risk-Reward ratio
  - 🚀 **Target 2 (Cyan dashed line)** at 1:2.5 Risk-Reward ratio
  - 📍 **Entry Price (Amber dotted line)**
  - Dynamic crosshairs & floating legend displaying real-time candle metrics.

### 3. 🎯 Multi-Timeframe (MTF) Alignment Matrix
- Computes trend confluence across **1-Minute (Trigger)**, **5-Minute (Tactical)**, and **15-Minute (Macro)** timeframes.
- Institutional Confluence Rating:
  - ⭐⭐⭐ **3/3 High Conviction**: Full alignment across all 3 timeframes (maximum probability setup).
  - ⭐⭐ **2/3 Good Confluence**: Directional alignment with pullback entry opportunity.
  - ⚠️ **1/3 Low Confluence**: Mixed/choppy price action.

### 4. ▶ Bar-by-Bar Session Replay Simulator
- Built-in session backtesting player: step forward or stream past sessions bar-by-bar (1x, 3x, 5x speed) to review exactly how setups and breakouts evolved during market hours.

### 5. 🔔 Audio Alerts & 📋 One-Click Trade Plan Export
- Synthesized Web Audio alert chime whenever high-conviction breakout signals trigger.
- One-click **Copy Setup** button formats the entire trade plan for instant sharing to trading journals or messaging apps.

### 3. 🎯 Day Stop Loss & Target Engine
- **Volatility-Adjusted Risk Rules**:
  - Computes 14-period 1-minute **Average True Range (ATR)**.
  - Anchors Stop Loss structurally behind the lowest low of recent 10 candles and VWAP buffer.
  - Ensures intraday risk is realistic (0.3% to 1.5% max risk per trade).
- **Multi-Target Scaling**:
  - **Target 1**: 1:1.5 Risk-Reward (Scalp / 50% partial profit booking level).
  - **Target 2**: 1:2.5 Risk-Reward (Main Day Target / Day High test).
  - **Target 3**: 1:3.5 Risk-Reward (Trend runner).
  - Explicit trailing rules: "Book 50% at Target 1, trail Stop Loss to Cost/Entry, ride remaining to Target 2."

### 4. 🧠 6-Pillar Technical Chart Analysis Rationale
Provides clear institutional commentary explaining *why* the stock was chosen:
1. **Trend & VWAP Structure**: Distance from VWAP, slope, and EMA ribbon alignment.
2. **Institutional Volume Flow**: Relative Volume (RVOL) multiplier and volume surge confirmation.
3. **Price Action & Range**: 15-Minute Opening Range (ORB) and Day High/Low proximity.
4. **Momentum Oscillators**: RSI sweetspot (55–72) evaluation without overextension.
5. **Volatility & Stop Loss Rule**: Precise ATR calculation and structural invalidation level.
6. **Target Projections**: Mathematical risk multiple targets and key resistance levels.

### 5. 🧮 Intraday Position Sizing Calculator
- Live interactive calculator: Enter trading capital and max risk percentage (e.g. 1%), and the terminal instantly calculates the exact number of shares to trade, max capital at risk, and potential gains.

---

## 🚀 Quick Start Guide

### 1. Launch the Application
Run the startup script:
```bash
./start.sh
```
Or with uvicorn:
```bash
.venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Access the Web Terminal
Open your browser and navigate to:
```
http://localhost:8000
```

---

## 🏛️ Technical Architecture

### 1. High-Level System Architecture

The following diagram illustrates the high-level system boundary, showing how user interactions in the browser communicate through the FastAPI application gateway to the quant analysis pipeline and upstream market data feeds:

```mermaid
flowchart TD
    subgraph Client["Presentation Layer (Browser Client)"]
        UI["Modern 3-Pane Trading UI<br/>(Dark/Light Themes, Mobile-Ready)"]
        TVC["TradingView Lightweight Charts<br/>(1-Min Live Candlesticks & Overlays)"]
        Replay["Session Replay Simulator<br/>(Bar-by-Bar Step & Stream Playback)"]
        Audio["Web Audio API Synthesizer<br/>(Zero-Asset Breakout Sound Chimes)"]
        PosCalc["Position Sizing Calculator<br/>(Capital Risk & Trade Management)"]
    end

    subgraph Gateway["Backend Application Gateway (FastAPI / Uvicorn)"]
        Router["FastAPI REST Router<br/>(/api/scan, /api/chart, /api/market-status)"]
        SessionClock["Exchange Session Monitor<br/>(NSE 09:15-15:30 IST / US 09:30-16:00 EST)"]
        StaticServer["Static Asset Server<br/>(HTML5, CSS3, ES6 JavaScript)"]
    end

    subgraph Quant["Quantitative & Data Processing Engine"]
        DataFetcher["Parallel Data Fetcher<br/>(ThreadPoolExecutor & 15s TTL Cache)"]
        IndicatorPipeline["Indicator Math Pipeline<br/>(VWAP + Bands, EMA 9/21/50, RSI, ATR, RVOL)"]
        PatternRecognizer["Pattern & Volume Detector<br/>(Engulfing, Hammers, Shooting Stars, RVOL Spikes)"]
        MTFConfluence["Multi-Timeframe Alignment<br/>(1m Trigger, 5m Tactical, 15m Macro)"]
        RiskEngine["Structural Risk & Target Synthesizer<br/>(ATR Swing Stop Loss, Target 1/2/3)"]
        ScoreEngine["Institutional Conviction Scoring<br/>(0 to 100 Scale & 6-Pillar Rationale)"]
    end

    subgraph Provider["External Market Data Infrastructure"]
        YahooFinance["Yahoo Finance API<br/>(Real-Time 1m, 5m, 15m OHLCV Feeds)"]
    end

    UI -->|Async HTTP Fetch or 10s Polling| Router
    Router -->|JSON Response Payloads| UI
    Router -->|Check Market Hours| SessionClock
    StaticServer -.->|Delivers Static Files| UI
    
    Router -->|Dispatch Batch Screener| DataFetcher
    Router -->|Request Ticker Analysis| DataFetcher
    
    DataFetcher -->|Parallel Requests| YahooFinance
    YahooFinance -->|Raw OHLCV Time-Series| DataFetcher
    
    DataFetcher -->|Clean DataFrames| IndicatorPipeline
    IndicatorPipeline -->|Indicators & Overlays| PatternRecognizer
    PatternRecognizer -->|Detected Setups| MTFConfluence
    MTFConfluence -->|Confluence Rating| RiskEngine
    RiskEngine -->|Trade Parameters| ScoreEngine
    ScoreEngine -->|Complete Technical Payload| Router

    ScoreEngine -.->|Trigger Alert on High Score| Audio
    IndicatorPipeline -.->|Candle & Indicator Data| TVC
    RiskEngine -.->|SL & Target Lines| TVC
    UI -.->|Risk Inputs| PosCalc
    Replay -.->|Stepped Bars| TVC
```

---

### 2. Low-Level Component Architecture

The detailed component diagram below maps out internal class modules, functions, state variables, and directional data pathways between the frontend controllers and backend calculation pipelines:

```mermaid
flowchart TD
    subgraph UI_Panes["1. UI Presentation Layer (index.html)"]
        Radar_View["Market Radar Pane<br/>- Momentum Ticker Cards<br/>- Conviction Gauges: 0 to 100<br/>- Setup Badges: ORB, Breakout, VWAP<br/>- RVOL Spikes: 1.5x to 3.0x"]
        Chart_View["Chart Canvas Viewport<br/>- TradingView Candlestick Series<br/>- VWAP Line & SD Bands<br/>- EMA Ribbon: 9, 21, 50<br/>- Horizontal SL & Target Price Lines<br/>- Visual Pattern Markers Layer<br/>- RSI 14 Sub-Chart & Volume Bars"]
        Blueprint_View["Trade Blueprint Pane<br/>- Entry & Risk/Reward Table<br/>- 6-Pillar Technical Rationale Cards<br/>- MTF Confluence Matrix: 1m/5m/15m<br/>- Capital & Risk Sizing Calculator<br/>- One-Click Clipboard Exporter"]
    end

    subgraph Client_Logic["2. Client Controller Logic (static/app.js)"]
        State_Mgr["App State Manager<br/>- currentMarketBasket<br/>- currentTicker<br/>- currentTimeframe<br/>- activeTheme: dark or light"]
        Poll_Worker["Auto-Refresh Daemon<br/>- 10s Timer Poller<br/>- Document Visibility Watcher"]
        Chart_Ctrl["Lightweight Charts Controller<br/>- initChart and series handlers<br/>- setMarkers for patterns<br/>- plotPriceLines for SL and Targets"]
        Replay_Ctrl["Session Replay Controller<br/>- Playback State: 1x, 3x, 5x<br/>- Step Forward / Step Backward<br/>- Slice Bar Feed"]
        Audio_Ctrl["Web Audio Synthesizer<br/>- AudioContext Oscillator<br/>- Dynamic Gain Chime Envelope"]
    end

    subgraph API_Layer["3. FastAPI Backend Gateway (app.py)"]
        EP_Scan["GET /api/scan<br/>- Ingests market parameter<br/>- Executes parallel screening<br/>- Returns sorted rankings"]
        EP_Chart["GET /api/chart/{ticker}<br/>- Ingests ticker & timeframe<br/>- Returns full OHLCV & indicators"]
        EP_Market["GET /api/market-status<br/>- Checks NSE & US market clocks<br/>- Returns session state & countdown"]
        EP_Custom["GET /api/custom-scan<br/>- Ingests custom user tickers<br/>- Parallel analysis & ranking"]
    end

    subgraph Fetcher_Layer["4. Data Acquisition Layer (data_fetcher.py)"]
        Mem_Cache["In-Memory Thread-Safe Cache<br/>- 15s TTL Per Ticker / Interval<br/>- Eliminates redundant API calls"]
        Thread_Pool["ThreadPoolExecutor<br/>- max_workers 8 Parallel Pool<br/>- Concurrent ticker downloader"]
        Data_Sanitizer["Data Sanitizer & Normalizer<br/>- Timezone conversion to exchange local<br/>- Truncate to regular trading hours<br/>- Fill missing ticks & drop NaNs"]
        Market_Clock["Market Session Validator<br/>- Asia/Kolkata: 09:15-15:30 IST<br/>- America/New_York: 09:30-16:00 EST<br/>- Weekend & Holiday filters"]
    end

    subgraph Math_Layer["5. Technical Indicator Engine (analysis_engine.py)"]
        Calc_VWAP["VWAP & SD Bands<br/>- Typical Price: H plus L plus C over 3<br/>- Cum Price x Vol over Cum Vol<br/>- Upper & Lower SD Bands: 1x, 2x"]
        Calc_EMA["EMA Ribbon Pipeline<br/>- EMA 9: Fast trigger Alpha 2/10<br/>- EMA 21: Trend baseline Alpha 2/22<br/>- EMA 50: Macro trend Alpha 2/51"]
        Calc_RSI["RSI 14 Oscillator<br/>- Wilder Smoothed Gains/Losses<br/>- Overbought 70 / Oversold 30"]
        Calc_ATR["ATR 14 Volatility<br/>- TR: Max H-L, abs H-Cp, abs L-Cp<br/>- 14-period Wilder smoothing"]
        Calc_RVOL["Relative Volume RVOL<br/>- 20-period Volume SMA<br/>- Ratio: Current Volume / Vol SMA"]
        Calc_ORB["15-Min Opening Range<br/>- Session High/Low of first 15 bars<br/>- Breakout validation threshold"]
    end

    subgraph Signals_Layer["6. Patterns, Risk & Rationale Engine (analysis_engine.py)"]
        Detect_Patterns["Candlestick Pattern Detector<br/>- Bullish & Bearish Engulfing<br/>- Hammer & Inverted Hammer<br/>- Shooting Star Reversal<br/>- High-Volume Expansion Bar"]
        MTF_Engine["Multi-Timeframe Alignment<br/>- 1-Min Trigger Trend Alignment<br/>- 5-Min Tactical Resample & Trend<br/>- 15-Min Macro Directional Bias<br/>- Confluence Rating: 1/3, 2/3, 3/3"]
        Risk_Engine["Structural Risk & Target Model<br/>- Stop Loss: Swing Low - 0.5 x ATR<br/>- Target 1: 1:1.5 RR Partial Scalp<br/>- Target 2: 1:2.5 RR Day Target<br/>- Target 3: 1:3.5 RR Runner<br/>- Dynamic Trailing Stop Rule"]
        Conviction_Engine["Institutional Scoring & Rationale<br/>- Conviction Score: -100 to +100<br/>- 6-Pillar Qualitative Breakdown<br/>- Actionable Trade Plan Synthesis"]
    end

    Poll_Worker -->|10s Polling Event| State_Mgr
    State_Mgr -->|Query Screener| EP_Scan
    Radar_View -->|User Clicks Ticker| State_Mgr
    State_Mgr -->|Query Full Analysis| EP_Chart
    State_Mgr -->|Query Exchange Clock| EP_Market
    
    EP_Scan -->|Check Cache or Fetch Batch| Mem_Cache
    EP_Chart -->|Check Cache or Fetch Ticker| Mem_Cache
    EP_Custom -->|Check Cache or Fetch Custom| Mem_Cache
    EP_Market -->|Check Session Clock| Market_Clock
    
    Mem_Cache -->|Cache Miss| Thread_Pool
    Thread_Pool -->|Download OHLCV| Data_Sanitizer
    Data_Sanitizer -->|Normalized DataFrames| Mem_Cache
    
    Mem_Cache -->|Clean DataFrame| Calc_VWAP
    Calc_VWAP --> Calc_EMA
    Calc_EMA --> Calc_RSI
    Calc_RSI --> Calc_ATR
    Calc_ATR --> Calc_RVOL
    Calc_RVOL --> Calc_ORB
    
    Calc_ORB --> Detect_Patterns
    Detect_Patterns --> MTF_Engine
    MTF_Engine --> Risk_Engine
    Risk_Engine --> Conviction_Engine
    
    Conviction_Engine -->|Compiled JSON Response| EP_Scan
    Conviction_Engine -->|Compiled JSON Response| EP_Chart
    
    EP_Scan -->|Radar Items & Scores| Radar_View
    EP_Chart -->|Candles & Indicators| Chart_Ctrl
    EP_Chart -->|Trade Setup & Rationale| Blueprint_View
    
    Chart_Ctrl -->|Render Series & Price Lines| Chart_View
    Chart_Ctrl -->|Plot Icons & Flags| Chart_View
    Replay_Ctrl -->|Push Stepped Bars| Chart_Ctrl
    Conviction_Engine -.->|Trigger Alert When Score 75 or Higher| Audio_Ctrl
    Audio_Ctrl -.->|Play Sound Chime| Radar_View
```

---

### 3. End-to-End Execution Sequence Flow

The following sequence diagram walks through the chronological lifecycle of a live scan and chart analysis query:

```mermaid
sequenceDiagram
    autonumber
    actor Trader as "Intraday Trader"
    participant Browser as "Client Web App (app.js)"
    participant API as "FastAPI Gateway (app.py)"
    participant Fetcher as "Data Fetcher (data_fetcher.py)"
    participant Cache as "Memory Cache (TTL: 15s)"
    participant Quant as "Analysis Engine (analysis_engine.py)"
    participant Yahoo as "Yahoo Finance API"

    Trader->>Browser: Selects Market Basket e.g. NSE Bank Nifty
    Browser->>API: GET /api/scan?market=NSE_BANK_NIFTY
    API->>Fetcher: batch_fetch_intraday(tickers, interval=1m)
    
    loop For each ticker in basket (Parallel Workers)
        Fetcher->>Cache: Check cached clean DataFrame
        alt Cache Miss or Expired
            Fetcher->>Yahoo: Download 1m Session Candles
            Yahoo-->>Fetcher: Raw OHLCV Time-Series
            Fetcher->>Fetcher: Sanitize Timestamps & Session Boundaries
            Fetcher->>Cache: Store in TTL Cache (15s)
        else Cache Hit
            Cache-->>Fetcher: Return Cached DataFrame
        end
        Fetcher->>Quant: analyze_intraday_ticker(df, ticker)
        Quant->>Quant: Compute VWAP, EMAs, RSI, ATR, RVOL, ORB
        Quant->>Quant: Detect Patterns (Engulfing, Hammer, Shooting Star)
        Quant->>Quant: Calculate Stop Loss, T1, T2, T3 & Conviction Score
        Quant-->>Fetcher: Return Ticker Analysis Summary
    end

    Fetcher-->>API: Aggregate Basket Ranking List
    API-->>Browser: 200 OK + JSON Radar List
    Browser->>Browser: Populate Market Radar Cards & Playbook Badges

    Trader->>Browser: Clicks specific ticker card (e.g. HDFCBANK.NS)
    Browser->>API: GET /api/chart/HDFCBANK.NS?timeframe=1m
    API->>Fetcher: fetch_intraday_data(HDFCBANK.NS, 1m)
    Fetcher-->>API: Normalized OHLCV DataFrame
    API->>Quant: analyze_intraday_ticker(df, HDFCBANK.NS)
    Quant->>Quant: Compute Multi-Timeframe Matrix (1m, 5m, 15m)
    Quant->>Quant: Synthesize 6-Pillar Analysis Commentary
    Quant-->>API: Full Payload (Candles, Indicators, Markers, Targets, MTF)
    API-->>Browser: 200 OK + Comprehensive Chart Payload

    Browser->>Browser: Update TradingView Lightweight Charts Candlesticks
    Browser->>Browser: Overlay VWAP Bands, EMA 9/21/50, and Price Lines (SL/T1/T2)
    Browser->>Browser: Place Candlestick & Volume Breakout Markers
    Browser->>Browser: Render 6-Pillar Trade Blueprint & MTF Stars
    opt Conviction Score 75 or higher
        Browser->>Trader: Synthesize Web Audio Breakout Chime
    end
    Browser-->>Trader: Visual Analysis Complete & Interactive Ready
```

---

## 🛠 File & Directory Organization

```
Intraday Stock Picker/
├── app.py                   # FastAPI backend with REST endpoints & market session monitors
├── analysis_engine.py       # Intraday indicator math (VWAP, EMA, RSI, ATR, RVOL, SL & Targets)
├── data_fetcher.py          # Parallel Yahoo Finance 1-min data scraper & memory cache
├── start.sh                 # One-click startup shell script
├── requirements.txt         # Python package dependencies
├── .gitignore               # Python and environment exclusion rules
└── static/
    ├── index.html           # Modern 3-pane institutional trading terminal UI
    ├── style.css            # Dark/Light responsive stylesheet with custom scrollbars
    ├── app.js               # Client controller, charting logic & interactive calculator
    └── lightweight-charts.js# TradingView Lightweight Charts library (v4.2.1)
```

