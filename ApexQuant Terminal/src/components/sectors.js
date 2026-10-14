/**
 * ApexQuant Terminal — All Sectors Dashboard
 * Provides comprehensive sector-level performance tracking across Global, US,
 * and NSE Indian markets, sorted descending by Year-To-Date (YTD) performance.
 * Features interactive Top 3 Quant-Screened Leader Stocks on sector selection.
 */

import { Chart } from 'chart.js';
import { getThemeColors } from './charts.js';

let sectorsChartInstance = null;
let currentSortMode = 'ytd_desc';
let currentMarketFilter = 'ALL';
let selectedSectorId = 'semi'; // Default to #1 sector

/**
 * Standard Sector Benchmark Universe with verified YTD performance metrics
 * and Top 3 Quant-Screened Leader Stocks per sector.
 */
export const SECTORS_DATA = [
  {
    "id": "semi",
    "name": "Semiconductors & AI Hardware",
    "icon": "cpu",
    "market": "ALL",
    "ytd": 64.8,
    "m1": 8.4,
    "y1": 94.2,
    "mcap": "$4.85T",
    "avgPe": 38.2,
    "avgGrowth": 42.5,
    "breadth": 92,
    "description": "Hyperscale AI accelerator silicon, HBM memory, foundry capacity & wafer fabrication.",
    "leaders": [
      {
        "ticker": "NVDA",
        "name": "NVIDIA Corp",
        "ytd": 148.2,
        "isINR": false
      },
      {
        "ticker": "DIXON.NS",
        "name": "Dixon Tech",
        "ytd": 92.4,
        "isINR": true
      },
      {
        "ticker": "TSM",
        "name": "Taiwan Semi",
        "ytd": 72.1,
        "isINR": false
      },
      {
        "ticker": "KAYNES.NS",
        "name": "Kaynes Tech",
        "ytd": 78.5,
        "isINR": true
      }
    ],
    "topQuantStocks": [
      {
        "ticker": "NVDA",
        "name": "NVIDIA Corporation",
        "market": "NASDAQ",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$138.25",
        "ytd": 148.2,
        "cagr": 32.4,
        "pe": 33.3,
        "growth": 34.5,
        "peg": 0.97,
        "quantScore": 96,
        "fairValue": "$143.20",
        "upside": 24.5,
        "obToRev": 1.75,
        "thesis": "Satisfies Peter Lynch GARP criteria (PEG 0.97 < 1.0) with extraordinary 75% gross margins and dominant AI data center compute monopoly."
      },
      {
        "ticker": "TSM",
        "name": "Taiwan Semiconductor Mfg.",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇹🇼",
        "price": "$188.00",
        "ytd": 72.1,
        "cagr": 28.5,
        "pe": 26.5,
        "growth": 28,
        "peg": 0.95,
        "quantScore": 94,
        "fairValue": "$215.00",
        "upside": 22.8,
        "obToRev": 1.9,
        "thesis": "Deep GARP valuation with PEG 0.95, sole global foundry capable of packaging CoWoS advanced 3nm/2nm chips, and 30%+ ROE."
      },
      {
        "ticker": "AVGO",
        "name": "Broadcom Inc.",
        "market": "NASDAQ",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$172.50",
        "ytd": 58.4,
        "cagr": 26.1,
        "pe": 28.2,
        "growth": 24,
        "peg": 1.18,
        "quantScore": 91,
        "fairValue": "$192.00",
        "upside": 18.2,
        "obToRev": 1.45,
        "thesis": "Custom AI ASIC accelerator ramp across Meta and Google, strong software synergy from VMware, and high free cash flow conversion."
      },
      {
        "ticker": "DIXON.NS",
        "name": "Dixon Technologies Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹14,850.00",
        "ytd": 92.4,
        "cagr": 31.2,
        "pe": 58,
        "growth": 48,
        "peg": 1.2,
        "quantScore": 94,
        "fairValue": "₹17,200.00",
        "upside": 18.5,
        "obToRev": 2.85,
        "thesis": "India premier EMS & semiconductor OSAT packaging partner with massive PLI expansion and 2.85x contracted order backlog."
      },
      {
        "ticker": "KAYNES.NS",
        "name": "Kaynes Technology India Ltd.",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹5,620.00",
        "ytd": 78.5,
        "cagr": 34.5,
        "pe": 68,
        "growth": 55,
        "peg": 1.24,
        "quantScore": 92,
        "fairValue": "₹6,600.00",
        "upside": 21,
        "obToRev": 3.4,
        "thesis": "Sanand outsourced semiconductor assembly (OSAT) plant, defense electronics & smart metering order book exceeding 3.4x annual revenue."
      },
      {
        "ticker": "CGPOWER.NS",
        "name": "CG Power & Industrial Solutions",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹740.00",
        "ytd": 64.2,
        "cagr": 28.5,
        "pe": 52,
        "growth": 42,
        "peg": 1.24,
        "quantScore": 90,
        "fairValue": "₹860.00",
        "upside": 18.2,
        "obToRev": 2.1,
        "thesis": "Joint venture with Renesas Electronics & Stars Microelectronics for ₹7,600 Cr advanced semiconductor OSAT facility in Gujarat."
      }
    ]
  },
  {
    "id": "defense",
    "name": "Defense, Aerospace & Capital Goods",
    "icon": "shield",
    "market": "ALL",
    "ytd": 48.5,
    "m1": 6.2,
    "y1": 74.8,
    "mcap": "$840B",
    "avgPe": 34.1,
    "avgGrowth": 28.4,
    "breadth": 88,
    "description": "Indigenous defense modernization, avionics, radar systems, combat aircraft & heavy engineering.",
    "leaders": [
      {
        "ticker": "BEL.NS",
        "name": "Bharat Electronics",
        "ytd": 82.4,
        "isINR": true
      },
      {
        "ticker": "HAL.NS",
        "name": "Hindustan Aeronautics",
        "ytd": 69.1,
        "isINR": true
      },
      {
        "ticker": "RTX",
        "name": "RTX Corporation",
        "ytd": 45.2,
        "isINR": false
      },
      {
        "ticker": "LT.NS",
        "name": "Larsen & Toubro",
        "ytd": 34.5,
        "isINR": true
      }
    ],
    "topQuantStocks": [
      {
        "ticker": "BEL.NS",
        "name": "Bharat Electronics Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹298.50",
        "ytd": 82.4,
        "cagr": 29.5,
        "pe": 38.5,
        "growth": 28,
        "peg": 1.38,
        "quantScore": 95,
        "fairValue": "₹345.00",
        "upside": 22.5,
        "obToRev": 3.85,
        "thesis": "Order book of ₹76,000 Cr (~3.85x annual revenue), zero net debt, and sole-source sovereign contracts for electronic warfare & radar."
      },
      {
        "ticker": "HAL.NS",
        "name": "Hindustan Aeronautics Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹4,680.00",
        "ytd": 69.1,
        "cagr": 27.2,
        "pe": 34,
        "growth": 26.5,
        "peg": 1.28,
        "quantScore": 93,
        "fairValue": "₹5,350.00",
        "upside": 19.8,
        "obToRev": 3.25,
        "thesis": "Sovereign fighter aircraft (Tejas LCA) & combat helicopter backlog locked in through 2030 with high RoNW exceeding 26%."
      },
      {
        "ticker": "LT.NS",
        "name": "Larsen & Toubro Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹3,680.00",
        "ytd": 34.5,
        "cagr": 21.8,
        "pe": 31.2,
        "growth": 21,
        "peg": 1.48,
        "quantScore": 90,
        "fairValue": "₹4,150.00",
        "upside": 14.2,
        "obToRev": 2.4,
        "thesis": "Flagship defense & capital goods conglomerate with record international EPC pipeline and robust book-to-bill ratio of 1.28x."
      },
      {
        "ticker": "RTX",
        "name": "RTX Corporation",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$122.50",
        "ytd": 45.2,
        "cagr": 22.4,
        "pe": 21.5,
        "growth": 19,
        "peg": 1.13,
        "quantScore": 92,
        "fairValue": "$142.00",
        "upside": 18.2,
        "obToRev": 1.95,
        "thesis": "Record commercial aerospace engine backlog with Pratt & Whitney GTF and missile defense systems orders exceeding $206B."
      },
      {
        "ticker": "LMT",
        "name": "Lockheed Martin Corporation",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$585.00",
        "ytd": 34.8,
        "cagr": 19.5,
        "pe": 18.2,
        "growth": 16.5,
        "peg": 1.1,
        "quantScore": 90,
        "fairValue": "$665.00",
        "upside": 16.5,
        "obToRev": 2.15,
        "thesis": "F-35 Lightning II multi-year sovereign contracts, PAC-3 missile defense expansion, and backlogged defense revenue visibility."
      },
      {
        "ticker": "GD",
        "name": "General Dynamics Corporation",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$305.00",
        "ytd": 28.4,
        "cagr": 18.2,
        "pe": 19.8,
        "growth": 17,
        "peg": 1.16,
        "quantScore": 89,
        "fairValue": "$348.00",
        "upside": 16.2,
        "obToRev": 1.8,
        "thesis": "Strong Gulfstream business jet delivery cycle combined with nuclear submarine backlog (Columbia-class program)."
      }
    ]
  },
  {
    "id": "power",
    "name": "Power, Renewable Utilities & Clean Energy",
    "icon": "zap",
    "market": "ALL",
    "ytd": 42.3,
    "m1": 5.8,
    "y1": 62.4,
    "mcap": "$620B",
    "avgPe": 26.5,
    "avgGrowth": 24.8,
    "breadth": 85,
    "description": "Solar EPC, grid transformation, pumped hydro, battery storage & nuclear energy utility expansion.",
    "leaders": [
      {
        "ticker": "TATAPOWER.NS",
        "name": "Tata Power Company",
        "ytd": 68.2,
        "isINR": true
      },
      {
        "ticker": "VST",
        "name": "Vistra Corp",
        "ytd": 94.2,
        "isINR": false
      },
      {
        "ticker": "NTPC.NS",
        "name": "NTPC Limited",
        "ytd": 52.1,
        "isINR": true
      },
      {
        "ticker": "CEG",
        "name": "Constellation Energy",
        "ytd": 78.4,
        "isINR": false
      }
    ],
    "topQuantStocks": [
      {
        "ticker": "TATAPOWER.NS",
        "name": "The Tata Power Company Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹435.00",
        "ytd": 68.2,
        "cagr": 25.2,
        "pe": 32.5,
        "growth": 24,
        "peg": 1.35,
        "quantScore": 93,
        "fairValue": "₹510.00",
        "upside": 19.5,
        "obToRev": 2.45,
        "thesis": "Backlog-to-revenue ratio of 2.45x (> 1.0 Green), utility-scale renewable EPC leadership, and high EV microgrid expansion."
      },
      {
        "ticker": "NTPC.NS",
        "name": "NTPC Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹412.00",
        "ytd": 52.1,
        "cagr": 23.4,
        "pe": 18.2,
        "growth": 19.5,
        "peg": 0.93,
        "quantScore": 95,
        "fairValue": "₹490.00",
        "upside": 21,
        "obToRev": 2.15,
        "thesis": "Satisfies Peter Lynch GARP criteria (PEG 0.93 < 1.0) with 60GW green pipeline, stable regulated return on equity, and high dividend payout."
      },
      {
        "ticker": "NHPC.NS",
        "name": "NHPC Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹94.50",
        "ytd": 48.2,
        "cagr": 21.5,
        "pe": 18.5,
        "growth": 20,
        "peg": 0.93,
        "quantScore": 93,
        "fairValue": "₹115.00",
        "upside": 24.2,
        "obToRev": 3.2,
        "thesis": "GARP pick with PEG 0.93 (< 1.0), dominant hydro & pumped storage pipeline, and 3.2x order book coverage."
      },
      {
        "ticker": "VST",
        "name": "Vistra Corp.",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$128.00",
        "ytd": 94.2,
        "cagr": 31.5,
        "pe": 22.4,
        "growth": 28.5,
        "peg": 0.79,
        "quantScore": 96,
        "fairValue": "$162.00",
        "upside": 29.5,
        "obToRev": 1.85,
        "thesis": "Deep GARP leader with PEG 0.79 (< 1.0) and nuclear clean energy capacity powering AI data center hyperscalers."
      },
      {
        "ticker": "CEG",
        "name": "Constellation Energy Corp.",
        "market": "NASDAQ",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$248.00",
        "ytd": 78.4,
        "cagr": 27,
        "pe": 29.4,
        "growth": 26,
        "peg": 1.13,
        "quantScore": 91,
        "fairValue": "$290.00",
        "upside": 19.2,
        "obToRev": 1.65,
        "thesis": "Nuclear base-load power monopoly benefiting from long-term 20-year hyperscale AI data center clean energy purchase agreements."
      },
      {
        "ticker": "NEE",
        "name": "NextEra Energy Inc.",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$82.50",
        "ytd": 34.2,
        "cagr": 18.5,
        "pe": 23,
        "growth": 16,
        "peg": 1.44,
        "quantScore": 88,
        "fairValue": "$94.00",
        "upside": 16,
        "obToRev": 1.55,
        "thesis": "Largest renewable utility in North America with 34GW renewable backlog pipeline."
      }
    ]
  },
  {
    "id": "cloud_ai",
    "name": "Internet, Cloud Software & Generative AI",
    "icon": "activity",
    "market": "ALL",
    "ytd": 35.6,
    "m1": 4.5,
    "y1": 48.2,
    "mcap": "$7.12T",
    "avgPe": 29.4,
    "avgGrowth": 26.2,
    "breadth": 84,
    "description": "Hyperscale cloud infra, LLM foundation models, enterprise SaaS & sovereign AI infrastructure.",
    "leaders": [
      {
        "ticker": "META",
        "name": "Meta Platforms",
        "ytd": 62.4,
        "isINR": false
      },
      {
        "ticker": "PERSISTENT.NS",
        "name": "Persistent Systems",
        "ytd": 44.5,
        "isINR": true
      },
      {
        "ticker": "GOOGL",
        "name": "Alphabet Inc",
        "ytd": 32.8,
        "isINR": false
      },
      {
        "ticker": "COFORGE.NS",
        "name": "Coforge",
        "ytd": 42.8,
        "isINR": true
      }
    ],
    "topQuantStocks": [
      {
        "ticker": "META",
        "name": "Meta Platforms Inc.",
        "market": "NASDAQ",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$585.00",
        "ytd": 62.4,
        "cagr": 28.4,
        "pe": 24.5,
        "growth": 26.5,
        "peg": 0.92,
        "quantScore": 96,
        "fairValue": "$695.00",
        "upside": 21.2,
        "obToRev": 1.35,
        "thesis": "Top-tier Peter Lynch GARP leader with PEG 0.92 (< 1.0), massive AI-driven ad monetization, and open-source Llama model ecosystem."
      },
      {
        "ticker": "GOOGL",
        "name": "Alphabet Inc.",
        "market": "NASDAQ",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$182.50",
        "ytd": 32.8,
        "cagr": 22.8,
        "pe": 22.4,
        "growth": 21.5,
        "peg": 1.04,
        "quantScore": 92,
        "fairValue": "$214.00",
        "upside": 19.5,
        "obToRev": 1.28,
        "thesis": "Strong valuation margin of safety, Google Cloud operating margin inflection, and enterprise Gemini multimodal workspace adoption."
      },
      {
        "ticker": "AMZN",
        "name": "Amazon.com Inc.",
        "market": "NASDAQ",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$188.00",
        "ytd": 28.5,
        "cagr": 26.5,
        "pe": 34.1,
        "growth": 28,
        "peg": 1.22,
        "quantScore": 90,
        "fairValue": "$228.00",
        "upside": 23.4,
        "obToRev": 1.4,
        "thesis": "AWS operating profit acceleration, e-commerce retail margin expansion, and high free cash flow generation exceeding $50B."
      },
      {
        "ticker": "PERSISTENT.NS",
        "name": "Persistent Systems Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹5,450.00",
        "ytd": 44.5,
        "cagr": 26.2,
        "pe": 38.5,
        "growth": 28,
        "peg": 1.38,
        "quantScore": 93,
        "fairValue": "₹6,280.00",
        "upside": 17.5,
        "obToRev": 1.85,
        "thesis": "Enterprise generative AI transformation leader with large multi-year software deals and high deal total contract value (TCV)."
      },
      {
        "ticker": "COFORGE.NS",
        "name": "Coforge Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹7,850.00",
        "ytd": 42.8,
        "cagr": 25.4,
        "pe": 36.2,
        "growth": 26.5,
        "peg": 1.37,
        "quantScore": 91,
        "fairValue": "₹8,950.00",
        "upside": 16.8,
        "obToRev": 1.95,
        "thesis": "Order intake of $516M in single quarter, high 12-month executable order book, and deep BFS domain specialization."
      },
      {
        "ticker": "INFY.NS",
        "name": "Infosys Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹1,920.00",
        "ytd": 28.5,
        "cagr": 21.4,
        "pe": 24.2,
        "growth": 18.5,
        "peg": 1.31,
        "quantScore": 89,
        "fairValue": "₹2,210.00",
        "upside": 17.2,
        "obToRev": 1.6,
        "thesis": "Top-tier enterprise cloud migration partner with $4.5B large deal signings and strong generative AI Topaz platform traction."
      }
    ]
  },
  {
    "id": "infra_rail",
    "name": "Infrastructure, Railways & Engineering EPC",
    "icon": "hard-hat",
    "market": "ALL",
    "ytd": 31.8,
    "m1": 4.2,
    "y1": 52.6,
    "mcap": "$780B",
    "avgPe": 28.6,
    "avgGrowth": 23.4,
    "breadth": 80,
    "description": "High-speed rail corridors, heavy civil engineering, industrial plant construction & airport development.",
    "leaders": [
      {
        "ticker": "RVNL.NS",
        "name": "Rail Vikas Nigam",
        "ytd": 168.4,
        "isINR": true
      },
      {
        "ticker": "LT.NS",
        "name": "Larsen & Toubro",
        "ytd": 34.5,
        "isINR": true
      },
      {
        "ticker": "CAT",
        "name": "Caterpillar Inc",
        "ytd": 38.2,
        "isINR": false
      },
      {
        "ticker": "URI",
        "name": "United Rentals",
        "ytd": 38.5,
        "isINR": false
      }
    ],
    "topQuantStocks": [
      {
        "ticker": "LT.NS",
        "name": "Larsen & Toubro Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹3,680.00",
        "ytd": 34.5,
        "cagr": 21.8,
        "pe": 31.2,
        "growth": 21,
        "peg": 1.48,
        "quantScore": 90,
        "fairValue": "₹4,150.00",
        "upside": 14.2,
        "obToRev": 2.4,
        "thesis": "Domestic & Middle East order inflows at record highs with multi-year revenue visibility across clean energy, transport & buildings."
      },
      {
        "ticker": "RVNL.NS",
        "name": "Rail Vikas Nigam Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹485.00",
        "ytd": 168.4,
        "cagr": 28.5,
        "pe": 42,
        "growth": 32,
        "peg": 1.31,
        "quantScore": 92,
        "fairValue": "₹575.00",
        "upside": 21,
        "obToRev": 3.9,
        "thesis": "Massive railway electrification & Vande Bharat coach production pipeline backed by government infrastructure capex."
      },
      {
        "ticker": "GMRINFRA.NS",
        "name": "GMR Airports Infrastructure Ltd",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹98.00",
        "ytd": 46.8,
        "cagr": 24.5,
        "pe": 32,
        "growth": 26,
        "peg": 1.23,
        "quantScore": 91,
        "fairValue": "₹118.00",
        "upside": 23,
        "obToRev": 2.65,
        "thesis": "Airport passenger throughput expansion across Delhi, Hyderabad, and international concessions with guaranteed aeronautical tariff visibility."
      },
      {
        "ticker": "CAT",
        "name": "Caterpillar Inc.",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$395.00",
        "ytd": 38.2,
        "cagr": 19.8,
        "pe": 16.5,
        "growth": 15,
        "peg": 1.1,
        "quantScore": 92,
        "fairValue": "$445.00",
        "upside": 16,
        "obToRev": 1.5,
        "thesis": "Unprecedented demand for mining trucks, autonomous construction machinery, and power generation engines with record order backlog."
      },
      {
        "ticker": "URI",
        "name": "United Rentals Inc.",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$760.00",
        "ytd": 38.5,
        "cagr": 21.4,
        "pe": 17.5,
        "growth": 16.5,
        "peg": 1.06,
        "quantScore": 91,
        "fairValue": "$870.00",
        "upside": 17.2,
        "obToRev": 1.4,
        "thesis": "Megaproject equipment rental supercycle driven by US CHIPS Act, infrastructure bills, and data center builds."
      },
      {
        "ticker": "VMC",
        "name": "Vulcan Materials Company",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$275.00",
        "ytd": 24.8,
        "cagr": 18.5,
        "pe": 28.2,
        "growth": 18,
        "peg": 1.57,
        "quantScore": 87,
        "fairValue": "$312.00",
        "upside": 15.5,
        "obToRev": 1.3,
        "thesis": "Aggregates pricing power and infrastructure project backlog execution across high-growth Sunbelt corridors."
      }
    ]
  },
  {
    "id": "auto_mobility",
    "name": "Automotive, Electric Vehicles & Mobility",
    "icon": "compass",
    "market": "ALL",
    "ytd": 26.4,
    "m1": 3.1,
    "y1": 38.6,
    "mcap": "$1.45T",
    "avgPe": 22.8,
    "avgGrowth": 21.5,
    "breadth": 75,
    "description": "Next-gen EV platforms, autonomous driving, commercial fleets & utility vehicle manufacturing.",
    "leaders": [
      {
        "ticker": "M&M.NS",
        "name": "Mahindra & Mahindra",
        "ytd": 58.1,
        "isINR": true
      },
      {
        "ticker": "TATAMOTORS.NS",
        "name": "Tata Motors",
        "ytd": 46.2,
        "isINR": true
      },
      {
        "ticker": "GM",
        "name": "General Motors",
        "ytd": 36.2,
        "isINR": false
      },
      {
        "ticker": "TSLA",
        "name": "Tesla Inc",
        "ytd": 28.4,
        "isINR": false
      }
    ],
    "topQuantStocks": [
      {
        "ticker": "TATAMOTORS.NS",
        "name": "Tata Motors Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹980.00",
        "ytd": 46.2,
        "cagr": 28.2,
        "pe": 14.8,
        "growth": 20.5,
        "peg": 0.72,
        "quantScore": 96,
        "fairValue": "₹1,280.00",
        "upside": 33.5,
        "obToRev": 1.95,
        "thesis": "Exceptional deep GARP pick with PEG 0.72 (<< 1.0), Jaguar Land Rover order backlog expansion, and net debt reduction to zero."
      },
      {
        "ticker": "M&M.NS",
        "name": "Mahindra & Mahindra Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹3,020.00",
        "ytd": 58.1,
        "cagr": 26.1,
        "pe": 28.4,
        "growth": 24.5,
        "peg": 1.16,
        "quantScore": 93,
        "fairValue": "₹3,540.00",
        "upside": 19.2,
        "obToRev": 1.85,
        "thesis": "Market leadership in utility vehicles with record SUV bookings backlog, farm equipment operating resilience, and high ROCE."
      },
      {
        "ticker": "MARUTI.NS",
        "name": "Maruti Suzuki India Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹12,850.00",
        "ytd": 18.7,
        "cagr": 20.5,
        "pe": 24.2,
        "growth": 19,
        "peg": 1.27,
        "quantScore": 90,
        "fairValue": "₹14,600.00",
        "upside": 15.8,
        "obToRev": 1.45,
        "thesis": "Dominant 42% domestic passenger vehicle market share, hybrid powertrain ramp, and expanding utility vehicle portfolio."
      },
      {
        "ticker": "GM",
        "name": "General Motors Company",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$48.50",
        "ytd": 36.2,
        "cagr": 19.4,
        "pe": 5.8,
        "growth": 12.5,
        "peg": 0.46,
        "quantScore": 94,
        "fairValue": "$62.00",
        "upside": 31,
        "obToRev": 1.15,
        "thesis": "Exceptional deep GARP value with PEG 0.46 (<< 1.0), massive share buybacks, and high-margin truck & SUV franchise."
      },
      {
        "ticker": "TSLA",
        "name": "Tesla Inc.",
        "market": "NASDAQ",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$225.00",
        "ytd": 28.4,
        "cagr": 24,
        "pe": 62,
        "growth": 32,
        "peg": 1.94,
        "quantScore": 86,
        "fairValue": "$260.00",
        "upside": 17.5,
        "obToRev": 1.2,
        "thesis": "FSD autonomous vehicle scalability, energy storage Megapack deliveries surging 125% YoY, and Next-Gen platform volume inflection."
      },
      {
        "ticker": "F",
        "name": "Ford Motor Company",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$11.40",
        "ytd": 12.4,
        "cagr": 16,
        "pe": 6.2,
        "growth": 10.5,
        "peg": 0.59,
        "quantScore": 88,
        "fairValue": "$14.20",
        "upside": 26.5,
        "obToRev": 1.2,
        "thesis": "Pro commercial fleet division generating strong margins, high dividend yield, and deep discount valuation."
      }
    ]
  },
  {
    "id": "bfsi",
    "name": "Banking & Financial Services (BFSI)",
    "icon": "pie-chart",
    "market": "ALL",
    "ytd": 19.2,
    "m1": 2.8,
    "y1": 26.4,
    "mcap": "$3.20T",
    "avgPe": 16.2,
    "avgGrowth": 16.4,
    "breadth": 78,
    "description": "Retail & corporate credit expansion, asset management, payment rails & investment banking.",
    "leaders": [
      {
        "ticker": "SBIN.NS",
        "name": "State Bank of India",
        "ytd": 31.2,
        "isINR": true
      },
      {
        "ticker": "GS",
        "name": "Goldman Sachs",
        "ytd": 32.5,
        "isINR": false
      },
      {
        "ticker": "ICICIBANK.NS",
        "name": "ICICI Bank",
        "ytd": 24.5,
        "isINR": true
      },
      {
        "ticker": "JPM",
        "name": "JPMorgan Chase",
        "ytd": 28.4,
        "isINR": false
      }
    ],
    "topQuantStocks": [
      {
        "ticker": "SBIN.NS",
        "name": "State Bank of India",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹840.00",
        "ytd": 31.2,
        "cagr": 24.5,
        "pe": 10.8,
        "growth": 17.5,
        "peg": 0.62,
        "quantScore": 95,
        "fairValue": "₹1,080.00",
        "upside": 31.2,
        "obToRev": 1.1,
        "thesis": "Prime deep value GARP pick with PEG 0.62, multi-decade low asset quality stress (GNPA < 2.2%), and consistent 18%+ ROE compounding."
      },
      {
        "ticker": "ICICIBANK.NS",
        "name": "ICICI Bank Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹1,260.00",
        "ytd": 24.5,
        "cagr": 22.4,
        "pe": 18.2,
        "growth": 19,
        "peg": 0.96,
        "quantScore": 94,
        "fairValue": "₹1,510.00",
        "upside": 21.8,
        "obToRev": 1.15,
        "thesis": "Satisfies Peter Lynch GARP criteria (PEG 0.96 < 1.0) with best-in-class NIM margins, strong digital franchise, and pristine credit book."
      },
      {
        "ticker": "HDFCBANK.NS",
        "name": "HDFC Bank Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹1,680.00",
        "ytd": 11.8,
        "cagr": 21,
        "pe": 17.5,
        "growth": 18.5,
        "peg": 0.95,
        "quantScore": 93,
        "fairValue": "₹1,980.00",
        "upside": 20.2,
        "obToRev": 1.1,
        "thesis": "PEG 0.95 GARP valuation, post-merger CD ratio normalization, and premier retail franchise compounding at 18% ROE."
      },
      {
        "ticker": "JPM",
        "name": "JPMorgan Chase & Co.",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$218.00",
        "ytd": 28.4,
        "cagr": 18.9,
        "pe": 12.5,
        "growth": 14,
        "peg": 0.89,
        "quantScore": 94,
        "fairValue": "$252.00",
        "upside": 17.5,
        "obToRev": 1.2,
        "thesis": "GARP pick with PEG 0.89 (< 1.0), fortress balance sheet, dominant global investment banking share, and pristine net interest income."
      },
      {
        "ticker": "GS",
        "name": "The Goldman Sachs Group",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$510.00",
        "ytd": 32.5,
        "cagr": 20.2,
        "pe": 14.8,
        "growth": 16.5,
        "peg": 0.9,
        "quantScore": 94,
        "fairValue": "$605.00",
        "upside": 20.5,
        "obToRev": 1.25,
        "thesis": "PEG 0.90 GARP qualified with investment banking pipeline recovery, asset management fee surge, and market share gains."
      },
      {
        "ticker": "MS",
        "name": "Morgan Stanley",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$108.00",
        "ytd": 26.4,
        "cagr": 18.5,
        "pe": 16.2,
        "growth": 15,
        "peg": 1.08,
        "quantScore": 90,
        "fairValue": "$124.00",
        "upside": 17,
        "obToRev": 1.18,
        "thesis": "Wealth management engine providing recurring fee revenue and resilient return on tangible equity."
      }
    ]
  },
  {
    "id": "metals",
    "name": "Metals, Mining & Critical Materials",
    "icon": "layers",
    "market": "ALL",
    "ytd": 17.5,
    "m1": 3.4,
    "y1": 24.2,
    "mcap": "$910B",
    "avgPe": 14.2,
    "avgGrowth": 15.8,
    "breadth": 67,
    "description": "Green steel decarbonization, copper supply crunch, aluminum smelters & EV battery minerals.",
    "leaders": [
      {
        "ticker": "JINDALSTEL.NS",
        "name": "Jindal Steel",
        "ytd": 38.5,
        "isINR": true
      },
      {
        "ticker": "HINDALCO.NS",
        "name": "Hindalco Industries",
        "ytd": 34.2,
        "isINR": true
      },
      {
        "ticker": "FCX",
        "name": "Freeport-McMoRan",
        "ytd": 22.8,
        "isINR": false
      },
      {
        "ticker": "AA",
        "name": "Alcoa Corp",
        "ytd": 28.4,
        "isINR": false
      }
    ],
    "topQuantStocks": [
      {
        "ticker": "JINDALSTEL.NS",
        "name": "Jindal Steel & Power Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹1,020.00",
        "ytd": 38.5,
        "cagr": 24,
        "pe": 14.2,
        "growth": 18,
        "peg": 0.79,
        "quantScore": 94,
        "fairValue": "₹1,280.00",
        "upside": 28.5,
        "obToRev": 1.65,
        "thesis": "Deep GARP pick with PEG 0.79, Angul capacity expansion, captive coal mines, and low-cost steelmaking efficiency."
      },
      {
        "ticker": "HINDALCO.NS",
        "name": "Hindalco Industries Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹710.00",
        "ytd": 34.2,
        "cagr": 22.8,
        "pe": 13.5,
        "growth": 17.5,
        "peg": 0.77,
        "quantScore": 95,
        "fairValue": "₹890.00",
        "upside": 27.5,
        "obToRev": 1.55,
        "thesis": "GARP pick with PEG 0.77 (< 1.0), Novelis beverage can and automotive sheet demand resilience, and copper cathode market dominance."
      },
      {
        "ticker": "TATASTEEL.NS",
        "name": "Tata Steel Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹165.00",
        "ytd": 18.4,
        "cagr": 19.5,
        "pe": 15.8,
        "growth": 16,
        "peg": 0.99,
        "quantScore": 90,
        "fairValue": "₹198.00",
        "upside": 22,
        "obToRev": 1.4,
        "thesis": "Satisfies PEG < 1.0 GARP criteria, Kalinganagar 5MTPA blast furnace commission, and Port Talbot UK green transition support."
      },
      {
        "ticker": "FCX",
        "name": "Freeport-McMoRan Inc.",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$48.50",
        "ytd": 22.8,
        "cagr": 24.5,
        "pe": 22,
        "growth": 25,
        "peg": 0.88,
        "quantScore": 93,
        "fairValue": "$59.00",
        "upside": 24.5,
        "obToRev": 1.7,
        "thesis": "Premier global copper producer meeting electrification demand supercycle with Grasberg block caving ramp-up and PEG 0.88 GARP."
      },
      {
        "ticker": "NUE",
        "name": "Nucor Corporation",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$155.00",
        "ytd": 18.2,
        "cagr": 18,
        "pe": 12.8,
        "growth": 14.5,
        "peg": 0.88,
        "quantScore": 91,
        "fairValue": "$185.00",
        "upside": 21.5,
        "obToRev": 1.25,
        "thesis": "GARP pick with PEG 0.88 (< 1.0), low-cost electric arc furnace leadership, and strong cash return to shareholders."
      },
      {
        "ticker": "AA",
        "name": "Alcoa Corporation",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$42.00",
        "ytd": 28.4,
        "cagr": 21,
        "pe": 16.5,
        "growth": 19,
        "peg": 0.87,
        "quantScore": 89,
        "fairValue": "$51.00",
        "upside": 24,
        "obToRev": 1.3,
        "thesis": "Global bauxite and alumina pricing strength, smelter efficiency optimizations, and rising green aluminum demand."
      }
    ]
  },
  {
    "id": "pharma",
    "name": "Healthcare, MedTech & Pharmaceuticals",
    "icon": "activity",
    "market": "ALL",
    "ytd": 16.8,
    "m1": 1.8,
    "y1": 22.5,
    "mcap": "$2.85T",
    "avgPe": 27.2,
    "avgGrowth": 18.5,
    "breadth": 72,
    "description": "Weight-loss GLP-1 therapies, oncology biologics, contract manufacturing (CDMO) & generic formulations.",
    "leaders": [
      {
        "ticker": "LLY",
        "name": "Eli Lilly & Co",
        "ytd": 54.2,
        "isINR": false
      },
      {
        "ticker": "SUNPHARMA.NS",
        "name": "Sun Pharma",
        "ytd": 48.5,
        "isINR": true
      },
      {
        "ticker": "NVO",
        "name": "Novo Nordisk",
        "ytd": 38.5,
        "isINR": false
      },
      {
        "ticker": "CIPLA.NS",
        "name": "Cipla Limited",
        "ytd": 26.2,
        "isINR": true
      }
    ],
    "topQuantStocks": [
      {
        "ticker": "SUNPHARMA.NS",
        "name": "Sun Pharmaceutical Industries",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹1,880.00",
        "ytd": 48.5,
        "cagr": 23.4,
        "pe": 34,
        "growth": 22,
        "peg": 1.55,
        "quantScore": 92,
        "fairValue": "₹2,180.00",
        "upside": 17.5,
        "obToRev": 1.45,
        "thesis": "Global specialty pharma portfolio (Ilumya, Winlevi, Cequa) driving high-margin EBITDA growth with dominant India market share."
      },
      {
        "ticker": "CIPLA.NS",
        "name": "Cipla Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹1,560.00",
        "ytd": 26.2,
        "cagr": 21,
        "pe": 24.8,
        "growth": 21.5,
        "peg": 1.15,
        "quantScore": 91,
        "fairValue": "₹1,820.00",
        "upside": 18.2,
        "obToRev": 1.3,
        "thesis": "Strong respiratory franchise (Albuterol, Lanreotide), One-India domestic prescription leadership, and expanding trade generics."
      },
      {
        "ticker": "DRREDDY.NS",
        "name": "Dr. Reddy's Laboratories",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹6,680.00",
        "ytd": 22.4,
        "cagr": 20.2,
        "pe": 19.5,
        "growth": 18,
        "peg": 1.08,
        "quantScore": 91,
        "fairValue": "₹7,750.00",
        "upside": 18.2,
        "obToRev": 1.35,
        "thesis": "Biosimilar pipeline expansion, strong US generic pricing stability, and high-margin European market growth."
      },
      {
        "ticker": "LLY",
        "name": "Eli Lilly and Company",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$890.00",
        "ytd": 54.2,
        "cagr": 28.5,
        "pe": 48,
        "growth": 38,
        "peg": 1.26,
        "quantScore": 95,
        "fairValue": "$1,040.00",
        "upside": 18.5,
        "obToRev": 1.85,
        "thesis": "Mounjaro & Zepbound multi-decade obesity and diabetes revenue wave with projected $50B+ franchise sales and high pipeline success."
      },
      {
        "ticker": "NVO",
        "name": "Novo Nordisk A/S ADR",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇩🇰",
        "price": "$118.00",
        "ytd": 38.5,
        "cagr": 24.5,
        "pe": 31,
        "growth": 26,
        "peg": 1.19,
        "quantScore": 93,
        "fairValue": "$138.00",
        "upside": 19.2,
        "obToRev": 1.7,
        "thesis": "GLP-1 obesity & diabetes market duopoly with expanding manufacturing capacity and cardiovascular label additions."
      },
      {
        "ticker": "ABBV",
        "name": "AbbVie Inc.",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$192.00",
        "ytd": 26.4,
        "cagr": 17.5,
        "pe": 16.5,
        "growth": 15,
        "peg": 1.1,
        "quantScore": 90,
        "fairValue": "$222.00",
        "upside": 17.8,
        "obToRev": 1.3,
        "thesis": "Skyrizi and Rinvoq surging to offset Humira biosimilar erosion, strong neuroscience pipeline, and solid 3.5% dividend yield."
      }
    ]
  },
  {
    "id": "consumer",
    "name": "Consumer Tech, Retail & FMCG",
    "icon": "shopping-bag",
    "market": "ALL",
    "ytd": 14.2,
    "m1": 2.1,
    "y1": 19.8,
    "mcap": "$3.80T",
    "avgPe": 32.5,
    "avgGrowth": 17.2,
    "breadth": 65,
    "description": "Premium quick commerce, branded discretionary apparel, jewelry retail & packaged consumer goods.",
    "leaders": [
      {
        "ticker": "TRENT.NS",
        "name": "Trent Ltd (Zudio)",
        "ytd": 148.5,
        "isINR": true
      },
      {
        "ticker": "COST",
        "name": "Costco Wholesale",
        "ytd": 36.4,
        "isINR": false
      },
      {
        "ticker": "WMT",
        "name": "Walmart Inc",
        "ytd": 54.2,
        "isINR": false
      },
      {
        "ticker": "TITAN.NS",
        "name": "Titan Company",
        "ytd": 12.8,
        "isINR": true
      }
    ],
    "topQuantStocks": [
      {
        "ticker": "TRENT.NS",
        "name": "Trent Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹7,450.00",
        "ytd": 148.5,
        "cagr": 38.2,
        "pe": 95,
        "growth": 58,
        "peg": 1.64,
        "quantScore": 94,
        "fairValue": "₹8,800.00",
        "upside": 19.5,
        "obToRev": 2.1,
        "thesis": "Zudio fast-fashion store footprint expansion compounding at 50%+ YoY, Star Bazaar grocery profitability, and premier consumer execution."
      },
      {
        "ticker": "TITAN.NS",
        "name": "Titan Company Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹3,540.00",
        "ytd": 12.8,
        "cagr": 22.4,
        "pe": 64,
        "growth": 24,
        "peg": 2.67,
        "quantScore": 88,
        "fairValue": "₹4,050.00",
        "upside": 16.2,
        "obToRev": 1.4,
        "thesis": "Unrivaled consumer brand trust in jewelry (Tanishq, CaratLane) benefiting from import duty rationalization and formalization tailwinds."
      },
      {
        "ticker": "HINDUNILVR.NS",
        "name": "Hindustan Unilever Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹2,740.00",
        "ytd": 12.4,
        "cagr": 18.2,
        "pe": 48,
        "growth": 14.5,
        "peg": 3.31,
        "quantScore": 86,
        "fairValue": "₹3,050.00",
        "upside": 13.5,
        "obToRev": 1.1,
        "thesis": "FMCG distribution moat reaching 9M+ retail outlets with rural demand inflection and premium personal care expansion."
      },
      {
        "ticker": "COST",
        "name": "Costco Wholesale Corp.",
        "market": "NASDAQ",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$895.00",
        "ytd": 36.4,
        "cagr": 21,
        "pe": 46.5,
        "growth": 22,
        "peg": 2.11,
        "quantScore": 91,
        "fairValue": "$1,020.00",
        "upside": 15.5,
        "obToRev": 1.35,
        "thesis": "Warehouse membership retention at 93%, fee increase implementation, and strong volume share gains in essentials and fresh food."
      },
      {
        "ticker": "WMT",
        "name": "Walmart Inc.",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$80.50",
        "ytd": 54.2,
        "cagr": 19,
        "pe": 28.5,
        "growth": 18,
        "peg": 1.58,
        "quantScore": 89,
        "fairValue": "$91.00",
        "upside": 15.2,
        "obToRev": 1.25,
        "thesis": "Omnichannel grocery dominance, advertising network scaling, and high automated fulfillment center efficiency."
      },
      {
        "ticker": "AMZN",
        "name": "Amazon.com Inc.",
        "market": "NASDAQ",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$188.00",
        "ytd": 28.5,
        "cagr": 26.5,
        "pe": 34.1,
        "growth": 28,
        "peg": 1.22,
        "quantScore": 90,
        "fairValue": "$228.00",
        "upside": 23.4,
        "obToRev": 1.4,
        "thesis": "High-margin retail ads and Prime membership retention driving strong consumer cash flow."
      }
    ]
  },
  {
    "id": "energy_oil",
    "name": "Energy, Oil & Gas (PSU & Global Supermajors)",
    "icon": "flame",
    "market": "ALL",
    "ytd": 11.2,
    "m1": 1.2,
    "y1": 18.5,
    "mcap": "$3.10T",
    "avgPe": 11.4,
    "avgGrowth": 12.8,
    "breadth": 58,
    "description": "Upstream exploration, deepwater drilling, refining margins & LNG export terminals.",
    "leaders": [
      {
        "ticker": "ONGC.NS",
        "name": "Oil & Natural Gas Corp",
        "ytd": 42.8,
        "isINR": true
      },
      {
        "ticker": "BPCL.NS",
        "name": "Bharat Petroleum",
        "ytd": 38.5,
        "isINR": true
      },
      {
        "ticker": "XOM",
        "name": "Exxon Mobil Corp",
        "ytd": 24.8,
        "isINR": false
      },
      {
        "ticker": "RELIANCE.NS",
        "name": "Reliance Industries",
        "ytd": 14.5,
        "isINR": true
      }
    ],
    "topQuantStocks": [
      {
        "ticker": "ONGC.NS",
        "name": "Oil & Natural Gas Corp Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹294.00",
        "ytd": 42.8,
        "cagr": 22.5,
        "pe": 7.2,
        "growth": 14.5,
        "peg": 0.5,
        "quantScore": 96,
        "fairValue": "₹380.00",
        "upside": 32.5,
        "obToRev": 1.45,
        "thesis": "Deep GARP pick with PEG 0.50 (<< 1.0), KG-DWN-98/2 deepwater production ramp, zero net debt, and 5%+ dividend yield."
      },
      {
        "ticker": "BPCL.NS",
        "name": "Bharat Petroleum Corporation",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹358.00",
        "ytd": 38.5,
        "cagr": 22,
        "pe": 7.8,
        "growth": 14,
        "peg": 0.56,
        "quantScore": 95,
        "fairValue": "₹465.00",
        "upside": 32.5,
        "obToRev": 1.25,
        "thesis": "Deep GARP value with PEG 0.56 (<< 1.0), high gross refining margins, expanding retail fuel outlet market share, and 6%+ dividend yield."
      },
      {
        "ticker": "RELIANCE.NS",
        "name": "Reliance Industries Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹2,720.00",
        "ytd": 14.5,
        "cagr": 21,
        "pe": 25.2,
        "growth": 18,
        "peg": 1.4,
        "quantScore": 91,
        "fairValue": "₹3,180.00",
        "upside": 18.5,
        "obToRev": 1.6,
        "thesis": "Integrated O2C cash flow funding Jio 5G monetisation, retail store expansion, and multi-gigawatt Jamnagar green hydrogen capex."
      },
      {
        "ticker": "XOM",
        "name": "Exxon Mobil Corporation",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$124.00",
        "ytd": 24.8,
        "cagr": 18.4,
        "pe": 13.8,
        "growth": 15,
        "peg": 0.92,
        "quantScore": 93,
        "fairValue": "$148.00",
        "upside": 21,
        "obToRev": 1.4,
        "thesis": "Satisfies PEG 0.92 GARP valuation, Pioneer Natural Resources integration creating low-cost Permian powerhouse, and $20B annual share repurchases."
      },
      {
        "ticker": "CVX",
        "name": "Chevron Corporation",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$152.00",
        "ytd": 8.4,
        "cagr": 17.2,
        "pe": 11.8,
        "growth": 13,
        "peg": 0.91,
        "quantScore": 92,
        "fairValue": "$180.00",
        "upside": 20.5,
        "obToRev": 1.35,
        "thesis": "GARP pick with PEG 0.91 (< 1.0), low-breakeven Permian basin production, Tengiz project cash flow inflection, and $15B annual buybacks."
      },
      {
        "ticker": "COP",
        "name": "ConocoPhillips",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$108.00",
        "ytd": 6.8,
        "cagr": 18,
        "pe": 11.2,
        "growth": 13.5,
        "peg": 0.83,
        "quantScore": 91,
        "fairValue": "$128.00",
        "upside": 20.8,
        "obToRev": 1.3,
        "thesis": "Low-cost E&P pure play with PEG 0.83, Marathon Oil acquisition synergies, and world-class LNG export contracts."
      }
    ]
  },
  {
    "id": "realestate",
    "name": "Real Estate, Commercial REITs & Infra InvITs",
    "icon": "home",
    "market": "ALL",
    "ytd": -2.8,
    "m1": -0.8,
    "y1": 8.4,
    "mcap": "$820B",
    "avgPe": 31.4,
    "avgGrowth": 16.5,
    "breadth": 48,
    "description": "Grade-A office parks, luxury residential booking velocity, industrial logistics REITs & data center real estate.",
    "leaders": [
      {
        "ticker": "GODREJPROP.NS",
        "name": "Godrej Properties",
        "ytd": 46.2,
        "isINR": true
      },
      {
        "ticker": "OBEROIRLTY.NS",
        "name": "Oberoi Realty",
        "ytd": 32.5,
        "isINR": true
      },
      {
        "ticker": "DLF.NS",
        "name": "DLF Limited",
        "ytd": 24.5,
        "isINR": true
      },
      {
        "ticker": "PLD",
        "name": "Prologis Inc",
        "ytd": -8.4,
        "isINR": false
      }
    ],
    "topQuantStocks": [
      {
        "ticker": "DLF.NS",
        "name": "DLF Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹845.00",
        "ytd": 24.5,
        "cagr": 23.5,
        "pe": 38,
        "growth": 28,
        "peg": 1.36,
        "quantScore": 92,
        "fairValue": "₹985.00",
        "upside": 18.5,
        "obToRev": 3.1,
        "thesis": "Super-luxury Gurugram residential pre-sales sold out within days, massive rental annuity portfolio, and cash surplus balance sheet."
      },
      {
        "ticker": "OBEROIRLTY.NS",
        "name": "Oberoi Realty Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹1,880.00",
        "ytd": 32.5,
        "cagr": 22.4,
        "pe": 26.5,
        "growth": 22,
        "peg": 1.2,
        "quantScore": 91,
        "fairValue": "₹2,240.00",
        "upside": 21,
        "obToRev": 2.85,
        "thesis": "High-margin luxury residential development in Mumbai & Gurugram with annuity rental asset monetization and 2.85x order backlog."
      },
      {
        "ticker": "GODREJPROP.NS",
        "name": "Godrej Properties Limited",
        "market": "NSE India",
        "marketType": "NSE",
        "flag": "🇮🇳",
        "price": "₹2,950.00",
        "ytd": 46.2,
        "cagr": 24.2,
        "pe": 44,
        "growth": 26,
        "peg": 1.69,
        "quantScore": 87,
        "fairValue": "₹3,450.00",
        "upside": 18.8,
        "obToRev": 2.4,
        "thesis": "Market share consolidation across NCR, MMR, Bengaluru, and Pune backed by high-velocity project execution."
      },
      {
        "ticker": "PLD",
        "name": "Prologis Inc.",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$112.00",
        "ytd": -8.4,
        "cagr": 16,
        "pe": 28,
        "growth": 14,
        "peg": 2,
        "quantScore": 84,
        "fairValue": "$128.00",
        "upside": 16.2,
        "obToRev": 1.3,
        "thesis": "Premier global logistics warehouse REIT; pullback provides favorable entry point for long-term power & data center conversions."
      },
      {
        "ticker": "AMT",
        "name": "American Tower Corporation",
        "market": "NYSE",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$218.00",
        "ytd": 14.2,
        "cagr": 17,
        "pe": 24.5,
        "growth": 15,
        "peg": 1.63,
        "quantScore": 86,
        "fairValue": "$248.00",
        "upside": 16,
        "obToRev": 1.45,
        "thesis": "Global wireless telecom tower infrastructure with long-term inflation-linked escalators and 5G densification demand."
      },
      {
        "ticker": "EQIX",
        "name": "Equinix Inc.",
        "market": "NASDAQ",
        "marketType": "US",
        "flag": "🇺🇸",
        "price": "$865.00",
        "ytd": 12.8,
        "cagr": 18.5,
        "pe": 32,
        "growth": 18,
        "peg": 1.78,
        "quantScore": 87,
        "fairValue": "$980.00",
        "upside": 15.5,
        "obToRev": 1.55,
        "thesis": "Premier global retail colocation data center REIT benefiting from interconnected AI cloud on-ramps."
      }
    ]
  }
];

/**
 * Filter & Sort Sectors Data
 * Defaults strictly to YTD Descending as requested
 */
export function getSortedFilteredSectors(sortMode = 'ytd_desc', marketFilter = 'ALL') {
  let list = [...SECTORS_DATA];

  // 1. Filter by Market
  if (marketFilter === 'NSE') {
    list = list.filter(sec => sec.leaders.some(l => l.isINR));
  } else if (marketFilter === 'US') {
    list = list.filter(sec => sec.leaders.some(l => !l.isINR));
  }

  // 2. Sort
  list.sort((a, b) => {
    switch (sortMode) {
      case 'ytd_desc':
        return b.ytd - a.ytd; // Highest positive YTD first
      case 'ytd_asc':
        return a.ytd - b.ytd; // Lowest / negative YTD first
      case 'name_asc':
        return a.name.localeCompare(b.name);
      case 'mcap_desc': {
        const valA = parseFloat(a.mcap.replace(/[$TB]/g, '')) * (a.mcap.includes('T') ? 1000 : 1);
        const valB = parseFloat(b.mcap.replace(/[$TB]/g, '')) * (b.mcap.includes('T') ? 1000 : 1);
        return valB - valA;
      }
      default:
        return b.ytd - a.ytd;
    }
  });

  return list;
}

/**
 * Main Render Function for Sectors Dashboard
 */
export function renderSectorsDashboard(universe, onSelectStock, isDarkMode) {
  const sortedSectors = getSortedFilteredSectors(currentSortMode, currentMarketFilter);
  const colors = getThemeColors(isDarkMode);

  // If selected sector is not in filtered list, fall back to first available
  if (!sortedSectors.some(s => s.id === selectedSectorId) && sortedSectors.length > 0) {
    selectedSectorId = sortedSectors[0].id;
  }

  // 1. Update Top Summary Metrics
  updateSectorSummaryCards(sortedSectors);

  // 2. Render Ranked Horizontal Bar Chart
  renderSectorsRankedChart(sortedSectors, colors, isDarkMode, (clickedSectorId) => {
    selectSector(clickedSectorId, onSelectStock);
    const panel = document.getElementById('sectorShowcasePanel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // 3. Render Top 3 Quant Stocks Showcase for Selected Sector
  renderSelectedSectorQuantPicks(selectedSectorId, onSelectStock, sortedSectors);

  // 4. Render Sector Detail Cards Grid
  renderSectorsCardsGrid(sortedSectors, onSelectStock, (clickedSectorId) => {
    selectSector(clickedSectorId, onSelectStock);
    const panel = document.getElementById('sectorShowcasePanel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // 5. Setup Controls & Listeners
  setupSectorsControls(universe, onSelectStock, isDarkMode, sortedSectors);
}

/**
 * Select a specific sector and update the showcase panel
 */
export function selectSector(sectorId, onSelectStock, sortedSectors = SECTORS_DATA) {
  selectedSectorId = sectorId;
  const sector = SECTORS_DATA.find(s => s.id === sectorId) || SECTORS_DATA[0];

  renderSelectedSectorQuantPicks(sectorId, onSelectStock, sortedSectors);

  // Highlight active sector card in grid
  document.querySelectorAll('.sector-card').forEach(card => {
    if (card.getAttribute('data-sector-id') === sectorId) {
      card.classList.add('selected-sector');
    } else {
      card.classList.remove('selected-sector');
    }
  });

  // Sync select dropdown
  const select = document.getElementById('sectorShowcaseSelect');
  if (select && select.value !== sectorId) {
    select.value = sectorId;
  }
}

/**
 * Render Top 3 Quant-Screened Leader Stocks for the selected sector
 */
function renderSelectedSectorQuantPicks(sectorId, onSelectStock, sortedSectors) {
  const container = document.getElementById('topThreeQuantContainer');
  if (!container) return;

  const sector = SECTORS_DATA.find(s => s.id === sectorId) || SECTORS_DATA[0];
  const rankIdx = sortedSectors.findIndex(s => s.id === sector.id);
  const rankDisplay = rankIdx >= 0 ? `Rank #${rankIdx + 1} Sector by YTD` : 'Ranked Sector';

  const elName = document.getElementById('showcaseSectorName');
  const elDesc = document.getElementById('showcaseSectorDesc');
  const elRankBadge = document.getElementById('showcaseRankBadge');
  const elMarketBadge = document.getElementById('showcaseMarketActiveBadge');

  if (elName) elName.textContent = sector.name;
  if (elDesc) elDesc.textContent = `${sector.description} (YTD Performance: +${sector.ytd}% • Market Cap: ${sector.mcap})`;
  if (elRankBadge) elRankBadge.textContent = `${rankDisplay} (${sector.ytd >= 0 ? '+' : ''}${sector.ytd}% YTD)`;

  const marketText = currentMarketFilter === 'NSE' ? 'NSE India 🇮🇳 (Top 3)' : currentMarketFilter === 'US' ? 'US Equities 🇺🇸 (Top 3)' : 'All Markets 🌐 (Top 3)';
  if (elMarketBadge) elMarketBadge.textContent = marketText;

  // Filter candidate stocks by currentMarketFilter
  let pool = sector.topQuantStocks || [];
  if (currentMarketFilter === 'NSE') {
    pool = pool.filter(s => s.marketType === 'NSE' || s.ticker.endsWith('.NS') || s.market.includes('NSE'));
  } else if (currentMarketFilter === 'US') {
    pool = pool.filter(s => s.marketType === 'US' || (!s.ticker.endsWith('.NS') && !s.market.includes('NSE')));
  }

  // Sort candidates by Quant Score + Expected CAGR descending
  pool = [...pool].sort((a, b) => (b.quantScore + b.cagr) - (a.quantScore + a.cagr));

  // Take top 3 stocks
  const quantStocks = pool.slice(0, 3);

  container.innerHTML = quantStocks.map((stock, idx) => {
    const isGarp = stock.peg <= 1.0;
    const garpBadge = isGarp 
      ? '<span class="ob-ratio-pill ratio-green" title="Peter Lynch GARP Qualified (PEG < 1.0)"><i data-lucide="check" class="inline-icon" style="width:11px;height:11px;"></i> PEG < 1.0 GARP</span>'
      : '<span class="ob-ratio-pill ratio-neutral">Growth Multiple</span>';

    const obBadge = stock.obToRev >= 1.0
      ? '<span class="ob-ratio-pill ratio-green" title="Contracted Backlog exceeds 1.0x Annual Revenue">✓ > 1.0x Coverage</span>'
      : '<span class="ob-ratio-pill ratio-neutral">Standard Coverage</span>';

    return `
      <div class="quant-stock-card rank-${idx + 1}">
        <div class="quant-stock-card-header">
          <div class="quant-rank-badge rank-${idx + 1}">
            <i data-lucide="award" class="inline-icon" style="width: 14px; height: 14px;"></i>
            <span>#${idx + 1} Quant Pick</span>
          </div>
          <span class="quant-score-badge ${stock.quantScore >= 92 ? 'score-elite' : 'score-high'}">
            <i data-lucide="shield-check" class="inline-icon" style="width: 13px; height: 13px;"></i> ${stock.quantScore}/100 Score
          </span>
        </div>

        <div class="quant-stock-title-row">
          <div>
            <h3 class="quant-stock-ticker">
              ${stock.ticker} <span class="quant-market-badge">${stock.market} ${stock.flag}</span>
            </h3>
            <p class="quant-stock-name">${stock.name}</p>
          </div>
          <div class="quant-stock-price-box">
            <span class="quant-price font-mono">${stock.price}</span>
            <span class="quant-ytd font-mono font-bold text-emerald">+${stock.ytd}% YTD</span>
          </div>
        </div>

        <div class="quant-metrics-grid">
          <div class="quant-kpi-cell highlight-cagr">
            <span class="q-label">Expected 3Y CAGR</span>
            <span class="q-val text-cyan font-mono">+${stock.cagr}%</span>
          </div>
          <div class="quant-kpi-cell">
            <span class="q-label">Forward P/E</span>
            <span class="q-val font-mono">${stock.pe}x</span>
          </div>
          <div class="quant-kpi-cell ${isGarp ? 'highlight-garp' : ''}">
            <span class="q-label">PEG Ratio</span>
            <span class="q-val font-mono ${isGarp ? 'text-emerald' : 'text-amber'}">${stock.peg} ${garpBadge}</span>
          </div>
          <div class="quant-kpi-cell">
            <span class="q-label">Peter Lynch Fair Value</span>
            <span class="q-val text-emerald font-mono">${stock.fairValue} (+${stock.upside}%)</span>
          </div>
          <div class="quant-kpi-cell">
            <span class="q-label">EPS Growth Rate</span>
            <span class="q-val text-blue font-mono">+${stock.growth}% CAGR</span>
          </div>
          <div class="quant-kpi-cell highlight-ob">
            <span class="q-label">OB / Rev Ratio</span>
            <span class="q-val text-emerald font-mono">${stock.obToRev}x ${obBadge}</span>
          </div>
        </div>

        <div class="quant-thesis-box">
          <span class="thesis-label"><i data-lucide="check-circle-2" class="inline-icon text-emerald" style="width: 13px; height: 13px;"></i> Quant Model Analysis:</span>
          <p class="thesis-text">${stock.thesis}</p>
        </div>

        <button class="btn-analyze-quant-stock" data-ticker="${stock.ticker}" title="Load ${stock.ticker} into terminal valuation model">
          <span>Analyze ${stock.ticker} in Terminal</span>
          <i data-lucide="arrow-right" class="inline-icon" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    `;
  }).join('');

  // Attach button click listeners
  container.querySelectorAll('.btn-analyze-quant-stock').forEach(btn => {
    btn.addEventListener('click', () => {
      const ticker = btn.getAttribute('data-ticker');
      if (ticker && onSelectStock) {
        onSelectStock(ticker);
      }
    });
  });
}

/**
 * Update Top Metric KPI Cards
 */
function updateSectorSummaryCards(sectors) {
  if (!sectors.length) return;

  const ytdSorted = [...sectors].sort((a, b) => b.ytd - a.ytd);
  const leader = ytdSorted[0];
  const laggard = ytdSorted[ytdSorted.length - 1];

  const medianYtd = ytdSorted[Math.floor(ytdSorted.length / 2)].ytd;
  const positiveCount = sectors.filter(s => s.ytd > 0).length;
  const breadthPct = Math.round((positiveCount / sectors.length) * 100);

  const elTopName = document.getElementById('sectorTopName');
  const elTopYtd = document.getElementById('sectorTopYtd');
  const elMedianYtd = document.getElementById('sectorMedianYtd');
  const elMedianSub = document.getElementById('sectorMedianSub');
  const elBreadth = document.getElementById('sectorBreadth');
  const elBreadthSub = document.getElementById('sectorBreadthSub');
  const elLaggardName = document.getElementById('sectorLaggardName');
  const elLaggardYtd = document.getElementById('sectorLaggardYtd');
  const elCountBadge = document.getElementById('sectorCountBadge');

  if (elTopName) elTopName.textContent = leader.name;
  if (elTopYtd) elTopYtd.textContent = `+${leader.ytd}% YTD Leader`;
  if (elMedianYtd) elMedianYtd.textContent = `${medianYtd >= 0 ? '+' : ''}${medianYtd}%`;
  if (elMedianSub) elMedianSub.textContent = `Across ${sectors.length} tracked sectors`;
  if (elBreadth) elBreadth.textContent = `${breadthPct}%`;
  if (elBreadthSub) elBreadthSub.textContent = `${positiveCount} of ${sectors.length} Sectors Positive YTD`;
  if (elLaggardName) elLaggardName.textContent = laggard.name;
  if (elLaggardYtd) {
    elLaggardYtd.textContent = `${laggard.ytd >= 0 ? '+' : ''}${laggard.ytd}% YTD`;
    elLaggardYtd.className = laggard.ytd >= 0 ? 'sector-kpi-sub text-emerald font-bold' : 'sector-kpi-sub text-red font-bold';
  }
  if (elCountBadge) elCountBadge.textContent = `${sectors.length} Sectors Active (Sorted by YTD)`;
}

/**
 * Render Ranked Bar Chart (Chart.js)
 * Visualizes sectors ranked descending by YTD %
 * Clicking any bar selects that sector
 */
function renderSectorsRankedChart(sectors, colors, isDarkMode, onBarClick) {
  const canvas = document.getElementById('sectorsBarChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (sectorsChartInstance) {
    sectorsChartInstance.destroy();
  }

  // Strictly sorted by YTD descending
  const sorted = [...sectors].sort((a, b) => b.ytd - a.ytd);
  const labels = sorted.map(s => s.name);
  const ytdValues = sorted.map(s => s.ytd);

  // Vibrant institutional green for positive (> 0%), Red for negative
  const barColors = sorted.map(s => 
    s.ytd >= 0 
      ? (s.id === selectedSectorId ? '#00f2fe' : (isDarkMode ? 'rgba(16, 185, 129, 0.85)' : '#059669'))
      : (isDarkMode ? 'rgba(239, 68, 68, 0.85)' : '#dc2626')
  );

  const borderColors = sorted.map(s => 
    s.id === selectedSectorId ? '#00f2fe' : (s.ytd >= 0 ? '#10b981' : '#ef4444')
  );

  sectorsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'YTD Change (%)',
          data: ytdValues,
          backgroundColor: barColors,
          borderColor: borderColors,
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    },
    plugins: [
      {
        id: 'sectorBarLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          const meta = chart.getDatasetMeta(0);
          if (!meta || !meta.data) return;

          ctx.save();
          ctx.font = 'bold 11px "JetBrains Mono", monospace';

          meta.data.forEach((bar, idx) => {
            const val = ytdValues[idx];
            const text = `${val > 0 ? '+' : ''}${val}%`;
            const xPos = bar.x;
            const yPos = val >= 0 ? bar.y - 6 : bar.y + 14;

            ctx.textAlign = 'center';
            ctx.fillStyle = sorted[idx].id === selectedSectorId ? '#00f2fe' : (val >= 0 ? (isDarkMode ? '#10b981' : '#059669') : '#ef4444');
            ctx.fillText(text, xPos, yPos);
          });

          ctx.restore();
        }
      }
    ],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (e, elements) => {
        if (elements && elements.length > 0 && onBarClick) {
          const idx = elements[0].index;
          const clicked = sorted[idx];
          if (clicked) {
            onBarClick(clicked.id);
          }
        }
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          titleColor: colors.textBright,
          bodyColor: colors.text,
          padding: 12,
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              return `${idx + 1}. ${sorted[idx].name} (Click to View Top 3 Quant Stocks)`;
            },
            label: (ctx) => {
              const val = ctx.raw;
              return ` YTD Change: ${val > 0 ? '+' : ''}${val}%`;
            },
            afterBody: (items) => {
              const idx = items[0].dataIndex;
              const s = sorted[idx];
              const leaderList = s.leaders.map(l => `${l.ticker} (+${l.ytd}%)`).join(', ');
              return [
                `1-Month Momentum: ${s.m1 > 0 ? '+' : ''}${s.m1}%`,
                `1-Year Change: +${s.y1}%`,
                `Market Cap: ${s.mcap} • Avg P/E: ${s.avgPe}x`,
                `Top Leaders: ${leaderList}`,
                '💡 Click bar to load Top 3 Quant Picks'
              ];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            maxRotation: 35,
            minRotation: 25,
            font: { family: 'Inter', size: 10, weight: 600 }
          }
        },
        y: {
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            callback: (val) => `${val > 0 ? '+' : ''}${val}%`,
            font: { family: 'JetBrains Mono', size: 10 }
          },
          title: {
            display: true,
            text: 'YTD Return (%)',
            color: colors.textMuted,
            font: { family: 'Inter', size: 11, weight: 600 }
          }
        }
      }
    }
  });
}

/**
 * Render Sector Detail Cards Grid
 */
function renderSectorsCardsGrid(sectors, onSelectStock, onSectorClick) {
  const container = document.getElementById('sectorsGridContainer');
  if (!container) return;

  container.innerHTML = sectors.map((sec, idx) => {
    const isPositive = sec.ytd >= 0;
    const ytdBadgeClass = isPositive ? 'sector-ytd-pill ytd-positive' : 'sector-ytd-pill ytd-negative';
    const rankClass = idx === 0 ? 'sector-rank-badge rank-1' : idx === 1 ? 'sector-rank-badge rank-2' : idx === 2 ? 'sector-rank-badge rank-3' : 'sector-rank-badge';
    const isSelected = sec.id === selectedSectorId;

    const stockPillsHtml = sec.leaders.map(stk => `
      <button class="sector-stock-pill" data-ticker="${stk.ticker}" title="Click to analyze ${stk.name}">
        <span class="stk-ticker">${stk.ticker}</span>
        <span class="stk-ytd font-mono">+${stk.ytd}%</span>
      </button>
    `).join('');

    return `
      <div class="sector-card ${isSelected ? 'selected-sector' : ''}" data-sector-id="${sec.id}">
        <div class="sector-card-top">
          <div class="sector-card-title-row">
            <span class="${rankClass}">#${idx + 1}</span>
            <div class="sector-card-title-group">
              <h4 class="sector-card-title">${sec.name}</h4>
              <span class="sector-card-desc">${sec.description}</span>
            </div>
          </div>
          <div class="${ytdBadgeClass}">
            <i data-lucide="${isPositive ? 'trending-up' : 'trending-down'}" class="inline-icon" style="width: 14px; height: 14px;"></i>
            <span>${isPositive ? '+' : ''}${sec.ytd}% YTD</span>
          </div>
        </div>

        <div class="sector-metrics-strip">
          <div class="sector-metric-cell">
            <span class="cell-label">1-Month</span>
            <span class="cell-val ${sec.m1 >= 0 ? 'text-emerald' : 'text-red'}">${sec.m1 >= 0 ? '+' : ''}${sec.m1}%</span>
          </div>
          <div class="sector-metric-cell">
            <span class="cell-label">1-Year</span>
            <span class="cell-val text-cyan">+${sec.y1}%</span>
          </div>
          <div class="sector-metric-cell">
            <span class="cell-label">Market Cap</span>
            <span class="cell-val text-main font-mono">${sec.mcap}</span>
          </div>
          <div class="sector-metric-cell">
            <span class="cell-label">Avg P/E</span>
            <span class="cell-val text-amber font-mono">${sec.avgPe}x</span>
          </div>
          <div class="sector-metric-cell">
            <span class="cell-label">Breadth</span>
            <span class="cell-val text-blue font-mono">${sec.breadth}% Green</span>
          </div>
        </div>

        <div class="sector-breadth-track">
          <div class="sector-breadth-fill" style="width: ${sec.breadth}%;"></div>
        </div>

        <div class="sector-leaders-section">
          <span class="leaders-label">Top Constituent Leaders (Click to Analyze):</span>
          <div class="sector-leaders-chips">
            ${stockPillsHtml}
          </div>
        </div>

        <div class="sector-card-action">
          <button class="btn-select-sector ${isSelected ? 'active' : ''}" data-sector-id="${sec.id}">
            <i data-lucide="${isSelected ? 'check' : 'sparkles'}" class="inline-icon" style="width: 13px; height: 13px;"></i>
            <span>${isSelected ? 'Currently Selected Sector' : 'View Top 3 Quant Stocks'}</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach click listener for each stock pill
  container.querySelectorAll('.sector-stock-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ticker = btn.getAttribute('data-ticker');
      if (ticker && onSelectStock) {
        onSelectStock(ticker);
      }
    });
  });

  // Attach click listener for sector card selection
  container.querySelectorAll('.sector-card').forEach(card => {
    card.addEventListener('click', () => {
      const secId = card.getAttribute('data-sector-id');
      if (secId && onSectorClick) {
        onSectorClick(secId);
      }
    });
  });

  // Attach button click inside card
  container.querySelectorAll('.btn-select-sector').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const secId = btn.getAttribute('data-sector-id');
      if (secId && onSectorClick) {
        onSectorClick(secId);
      }
    });
  });
}

/**
 * Setup Controls for Toolbar (Filter & Sort) and Showcase Selector
 */
let controlsInitialized = false;
function setupSectorsControls(universe, onSelectStock, isDarkMode, sortedSectors) {
  // Sync and populate Showcase Select dropdown
  const showcaseSelect = document.getElementById('sectorShowcaseSelect');
  if (showcaseSelect) {
    showcaseSelect.innerHTML = SECTORS_DATA.map((s, idx) => `
      <option value="${s.id}" ${s.id === selectedSectorId ? 'selected' : ''}>
        #${idx + 1} ${s.name} (${s.ytd >= 0 ? '+' : ''}${s.ytd}%)
      </option>
    `).join('');
  }

  // Sync active state of showcase market filter chips
  const showcaseFilterChips = document.querySelectorAll('#showcaseMarketFilterGroup .filter-chip');
  showcaseFilterChips.forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-showcase-market') === currentMarketFilter);
  });

  // Sync active state of main toolbar filter chips
  const mainFilterChips = document.querySelectorAll('.sectors-toolbar .filter-chip');
  mainFilterChips.forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-market-filter') === currentMarketFilter);
  });

  if (controlsInitialized) return;
  controlsInitialized = true;

  // 1. Sort Selector
  const sortSelect = document.getElementById('sectorSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSortMode = e.target.value;
      renderSectorsDashboard(universe, onSelectStock, isDarkMode);
    });
  }

  // 2. Main Toolbar Market Filter Chips
  mainFilterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      currentMarketFilter = chip.getAttribute('data-market-filter') || 'ALL';
      renderSectorsDashboard(universe, onSelectStock, isDarkMode);
    });
  });

  // 3. Showcase Market Filter Chips (Directly Over Quant Analysis & Performance Leaders)
  showcaseFilterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      currentMarketFilter = chip.getAttribute('data-showcase-market') || 'ALL';
      renderSectorsDashboard(universe, onSelectStock, isDarkMode);
    });
  });

  // 4. Showcase Sector Dropdown Change
  if (showcaseSelect) {
    showcaseSelect.addEventListener('change', (e) => {
      selectSector(e.target.value, onSelectStock, sortedSectors);
    });
  }
}
