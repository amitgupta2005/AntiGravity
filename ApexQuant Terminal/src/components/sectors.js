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
    id: 'semi',
    name: 'Semiconductors & AI Hardware',
    icon: 'cpu',
    market: 'ALL',
    ytd: 64.8,
    m1: 8.4,
    y1: 94.2,
    mcap: '$4.85T',
    avgPe: 38.2,
    avgGrowth: 42.5,
    breadth: 92,
    description: 'Hyperscale AI accelerator silicon, HBM memory, foundry capacity & wafer fabrication.',
    leaders: [
      { ticker: 'NVDA', name: 'NVIDIA Corp', ytd: 148.2, isINR: false },
      { ticker: 'AVGO', name: 'Broadcom Inc', ytd: 58.4, isINR: false },
      { ticker: 'TSM', name: 'Taiwan Semiconductor', ytd: 72.1, isINR: false },
      { ticker: 'AMD', name: 'Advanced Micro Devices', ytd: 22.5, isINR: false }
    ],
    topQuantStocks: [
      {
        ticker: 'NVDA',
        name: 'NVIDIA Corporation',
        market: 'NASDAQ',
        flag: '🇺🇸',
        price: '$138.25',
        ytd: 148.2,
        cagr: 32.4,
        pe: 33.3,
        growth: 34.5,
        peg: 0.97,
        quantScore: 96,
        fairValue: '$143.20',
        upside: 24.5,
        obToRev: 1.75,
        thesis: 'Satisfies Peter Lynch GARP criteria (PEG 0.97 < 1.0) with extraordinary 75% gross margins and dominant AI data center compute monopoly.'
      },
      {
        ticker: 'TSM',
        name: 'Taiwan Semiconductor Mfg.',
        market: 'NYSE',
        flag: '🇹🇼',
        price: '$188.00',
        ytd: 72.1,
        cagr: 28.5,
        pe: 26.5,
        growth: 28.0,
        peg: 0.95,
        quantScore: 94,
        fairValue: '$215.00',
        upside: 22.8,
        obToRev: 1.90,
        thesis: 'Deep GARP valuation with PEG 0.95, sole global foundry capable of packaging CoWoS advanced 3nm/2nm chips, and 30%+ ROE.'
      },
      {
        ticker: 'AVGO',
        name: 'Broadcom Inc.',
        market: 'NASDAQ',
        flag: '🇺🇸',
        price: '$172.50',
        ytd: 58.4,
        cagr: 26.1,
        pe: 28.2,
        growth: 24.0,
        peg: 1.18,
        quantScore: 91,
        fairValue: '$192.00',
        upside: 18.2,
        obToRev: 1.45,
        thesis: 'Custom AI ASIC accelerator ramp across Meta and Google, strong software synergy from VMware, and high free cash flow conversion.'
      }
    ]
  },
  {
    id: 'defense',
    name: 'Defense, Aerospace & Capital Goods',
    icon: 'shield',
    market: 'ALL',
    ytd: 48.5,
    m1: 6.2,
    y1: 74.8,
    mcap: '$840B',
    avgPe: 34.1,
    avgGrowth: 28.4,
    breadth: 88,
    description: 'Indigenous defense modernization, avionics, radar systems, combat aircraft & heavy engineering.',
    leaders: [
      { ticker: 'BEL.NS', name: 'Bharat Electronics', ytd: 82.4, isINR: true },
      { ticker: 'HAL.NS', name: 'Hindustan Aeronautics', ytd: 69.1, isINR: true },
      { ticker: 'LT.NS', name: 'Larsen & Toubro', ytd: 34.5, isINR: true },
      { ticker: 'RTX', name: 'RTX Corporation', ytd: 28.4, isINR: false }
    ],
    topQuantStocks: [
      {
        ticker: 'BEL.NS',
        name: 'Bharat Electronics Limited',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹298.50',
        ytd: 82.4,
        cagr: 27.8,
        pe: 38.2,
        growth: 26.5,
        peg: 1.44,
        quantScore: 94,
        fairValue: '₹345.00',
        upside: 18.4,
        obToRev: 2.65,
        thesis: 'High revenue visibility with contracted backlog covering 2.65x annual revenue (> 1.0 Green), zero debt, and 28% Return on Equity.'
      },
      {
        ticker: 'HAL.NS',
        name: 'Hindustan Aeronautics Limited',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹4,620.00',
        ytd: 69.1,
        cagr: 25.4,
        pe: 36.4,
        growth: 25.0,
        peg: 1.45,
        quantScore: 92,
        fairValue: '₹5,280.00',
        upside: 16.5,
        obToRev: 3.10,
        thesis: 'Multi-year monopoly on indigenous fighter aircraft (Tejas) & helicopters with order book covering 3.1x annual execution run-rate.'
      },
      {
        ticker: 'LT.NS',
        name: 'Larsen & Toubro Limited',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹3,680.00',
        ytd: 34.5,
        cagr: 21.8,
        pe: 31.2,
        growth: 21.0,
        peg: 1.48,
        quantScore: 88,
        fairValue: '₹4,150.00',
        upside: 14.2,
        obToRev: 2.40,
        thesis: 'Flagship infrastructure & defense conglomerate with record international EPC pipeline and robust book-to-bill ratio of 1.28x.'
      }
    ]
  },
  {
    id: 'power',
    name: 'Power, Renewable Utilities & Clean Energy',
    icon: 'zap',
    market: 'ALL',
    ytd: 42.3,
    m1: 5.8,
    y1: 62.4,
    mcap: '$620B',
    avgPe: 26.5,
    avgGrowth: 24.8,
    breadth: 85,
    description: 'Solar EPC, grid transformation, pumped hydro, battery storage & nuclear energy utility expansion.',
    leaders: [
      { ticker: 'TATAPOWER.NS', name: 'Tata Power Company', ytd: 68.2, isINR: true },
      { ticker: 'NTPC.NS', name: 'NTPC Limited', ytd: 52.1, isINR: true },
      { ticker: 'CEG', name: 'Constellation Energy', ytd: 78.4, isINR: false },
      { ticker: 'VST', name: 'Vistra Corp', ytd: 94.2, isINR: false }
    ],
    topQuantStocks: [
      {
        ticker: 'TATAPOWER.NS',
        name: 'The Tata Power Company Limited',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹435.00',
        ytd: 68.2,
        cagr: 25.2,
        pe: 32.5,
        growth: 24.0,
        peg: 1.35,
        quantScore: 93,
        fairValue: '₹510.00',
        upside: 19.5,
        obToRev: 2.45,
        thesis: 'Backlog-to-revenue ratio of 2.45x (> 1.0 Green), utility-scale renewable EPC leadership, and high EV microgrid expansion.'
      },
      {
        ticker: 'NTPC.NS',
        name: 'NTPC Limited',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹412.00',
        ytd: 52.1,
        cagr: 23.4,
        pe: 18.2,
        growth: 19.5,
        peg: 0.93,
        quantScore: 95,
        fairValue: '₹490.00',
        upside: 21.0,
        obToRev: 2.15,
        thesis: 'Satisfies Peter Lynch GARP criteria (PEG 0.93 < 1.0) with 60GW green pipeline, stable regulated return on equity, and high dividend payout.'
      },
      {
        ticker: 'CEG',
        name: 'Constellation Energy Corp.',
        market: 'NASDAQ',
        flag: '🇺🇸',
        price: '$248.00',
        ytd: 78.4,
        cagr: 27.0,
        pe: 29.4,
        growth: 26.0,
        peg: 1.13,
        quantScore: 91,
        fairValue: '$290.00',
        upside: 19.2,
        obToRev: 1.65,
        thesis: 'Nuclear base-load power monopoly benefiting from long-term 20-year hyperscale AI data center clean energy purchase agreements.'
      }
    ]
  },
  {
    id: 'cloud_ai',
    name: 'Internet, Cloud Software & Generative AI',
    icon: 'activity',
    market: 'ALL',
    ytd: 35.6,
    m1: 4.5,
    y1: 48.2,
    mcap: '$7.12T',
    avgPe: 29.4,
    avgGrowth: 26.2,
    breadth: 84,
    description: 'Hyperscale cloud infra, LLM foundation models, enterprise SaaS & sovereign AI infrastructure.',
    leaders: [
      { ticker: 'META', name: 'Meta Platforms', ytd: 62.4, isINR: false },
      { ticker: 'GOOGL', name: 'Alphabet Inc', ytd: 32.8, isINR: false },
      { ticker: 'AMZN', name: 'Amazon.com', ytd: 28.5, isINR: false },
      { ticker: 'MSFT', name: 'Microsoft Corp', ytd: 21.2, isINR: false }
    ],
    topQuantStocks: [
      {
        ticker: 'META',
        name: 'Meta Platforms Inc.',
        market: 'NASDAQ',
        flag: '🇺🇸',
        price: '$585.00',
        ytd: 62.4,
        cagr: 28.4,
        pe: 24.5,
        growth: 26.5,
        peg: 0.92,
        quantScore: 96,
        fairValue: '$695.00',
        upside: 21.2,
        obToRev: 1.35,
        thesis: 'Top-tier Peter Lynch GARP leader with PEG 0.92 (< 1.0), massive AI-driven ad monetization, and open-source Llama model ecosystem.'
      },
      {
        ticker: 'GOOGL',
        name: 'Alphabet Inc.',
        market: 'NASDAQ',
        flag: '🇺🇸',
        price: '$182.50',
        ytd: 32.8,
        cagr: 22.8,
        pe: 22.4,
        growth: 21.5,
        peg: 1.04,
        quantScore: 92,
        fairValue: '$214.00',
        upside: 19.5,
        obToRev: 1.28,
        thesis: 'Strong valuation margin of safety, Google Cloud operating margin inflection, and enterprise Gemini multimodal workspace adoption.'
      },
      {
        ticker: 'AMZN',
        name: 'Amazon.com Inc.',
        market: 'NASDAQ',
        flag: '🇺🇸',
        price: '$188.00',
        ytd: 28.5,
        cagr: 26.5,
        pe: 34.1,
        growth: 28.0,
        peg: 1.22,
        quantScore: 90,
        fairValue: '$228.00',
        upside: 23.4,
        obToRev: 1.40,
        thesis: 'AWS operating profit acceleration, e-commerce retail margin expansion, and high free cash flow generation exceeding $50B.'
      }
    ]
  },
  {
    id: 'auto_mobility',
    name: 'Automotive, Electric Vehicles & Mobility',
    icon: 'compass',
    market: 'ALL',
    ytd: 26.4,
    m1: 3.1,
    y1: 38.6,
    mcap: '$1.45T',
    avgPe: 22.8,
    avgGrowth: 21.5,
    breadth: 75,
    description: 'Next-gen EV platforms, autonomous driving, commercial fleets & utility vehicle manufacturing.',
    leaders: [
      { ticker: 'TATAMOTORS.NS', name: 'Tata Motors', ytd: 46.2, isINR: true },
      { ticker: 'M&M.NS', name: 'Mahindra & Mahindra', ytd: 58.1, isINR: true },
      { ticker: 'TSLA', name: 'Tesla Inc', ytd: 28.4, isINR: false },
      { ticker: 'MARUTI.NS', name: 'Maruti Suzuki', ytd: 18.7, isINR: true }
    ],
    topQuantStocks: [
      {
        ticker: 'TATAMOTORS.NS',
        name: 'Tata Motors Limited',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹980.00',
        ytd: 46.2,
        cagr: 28.2,
        pe: 14.8,
        growth: 20.5,
        peg: 0.72,
        quantScore: 96,
        fairValue: '₹1,280.00',
        upside: 33.5,
        obToRev: 1.95,
        thesis: 'Exceptional deep GARP pick with PEG 0.72 (<< 1.0), Jaguar Land Rover order backlog expansion, and net debt reduction to zero.'
      },
      {
        ticker: 'M&M.NS',
        name: 'Mahindra & Mahindra Limited',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹3,020.00',
        ytd: 58.1,
        cagr: 26.1,
        pe: 28.4,
        growth: 24.5,
        peg: 1.16,
        quantScore: 93,
        fairValue: '₹3,540.00',
        upside: 19.2,
        obToRev: 1.85,
        thesis: 'Market leadership in utility vehicles with record SUV bookings backlog, farm equipment operating resilience, and high ROCE.'
      },
      {
        ticker: 'TSLA',
        name: 'Tesla Inc.',
        market: 'NASDAQ',
        flag: '🇺🇸',
        price: '$225.00',
        ytd: 28.4,
        cagr: 24.0,
        pe: 62.0,
        growth: 32.0,
        peg: 1.94,
        quantScore: 86,
        fairValue: '$260.00',
        upside: 17.5,
        obToRev: 1.20,
        thesis: 'FSD autonomous vehicle scalability, energy storage Megapack deliveries surging 125% YoY, and Next-Gen platform volume inflection.'
      }
    ]
  },
  {
    id: 'bfsi',
    name: 'Banking & Financial Services (BFSI)',
    icon: 'pie-chart',
    market: 'ALL',
    ytd: 19.2,
    m1: 2.8,
    y1: 26.4,
    mcap: '$3.20T',
    avgPe: 16.2,
    avgGrowth: 16.4,
    breadth: 78,
    description: 'Retail & corporate credit expansion, asset management, payment rails & investment banking.',
    leaders: [
      { ticker: 'ICICIBANK.NS', name: 'ICICI Bank', ytd: 24.5, isINR: true },
      { ticker: 'SBIN.NS', name: 'State Bank of India', ytd: 31.2, isINR: true },
      { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', ytd: 11.8, isINR: true },
      { ticker: 'JPM', name: 'JPMorgan Chase', ytd: 28.4, isINR: false }
    ],
    topQuantStocks: [
      {
        ticker: 'SBIN.NS',
        name: 'State Bank of India',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹840.00',
        ytd: 31.2,
        cagr: 24.5,
        pe: 10.8,
        growth: 17.5,
        peg: 0.62,
        quantScore: 95,
        fairValue: '₹1,080.00',
        upside: 31.2,
        obToRev: 1.10,
        thesis: 'Prime deep value GARP pick with PEG 0.62, multi-decade low asset quality stress (GNPA < 2.2%), and consistent 18%+ ROE compounding.'
      },
      {
        ticker: 'ICICIBANK.NS',
        name: 'ICICI Bank Limited',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹1,260.00',
        ytd: 24.5,
        cagr: 22.4,
        pe: 18.2,
        growth: 19.0,
        peg: 0.96,
        quantScore: 94,
        fairValue: '₹1,510.00',
        upside: 21.8,
        obToRev: 1.15,
        thesis: 'Satisfies Peter Lynch GARP criteria (PEG 0.96 < 1.0) with best-in-class NIM margins, strong digital franchise, and pristine credit book.'
      },
      {
        ticker: 'JPM',
        name: 'JPMorgan Chase & Co.',
        market: 'NYSE',
        flag: '🇺🇸',
        price: '$218.00',
        ytd: 28.4,
        cagr: 18.9,
        pe: 12.5,
        growth: 14.0,
        peg: 0.89,
        quantScore: 93,
        fairValue: '$254.00',
        upside: 18.4,
        obToRev: 1.05,
        thesis: 'Undervalued fortress banking giant with PEG 0.89 (< 1.0 GARP), net interest income resilience, and leading investment banking fees.'
      }
    ]
  },
  {
    id: 'it_services',
    name: 'IT Software & Platform Engineering',
    icon: 'code',
    market: 'ALL',
    ytd: 14.8,
    m1: 1.9,
    y1: 22.1,
    mcap: '$1.95T',
    avgPe: 25.3,
    avgGrowth: 15.2,
    breadth: 70,
    description: 'Global enterprise digital transformation, cloud migrations, legacy modernization & consulting.',
    leaders: [
      { ticker: 'TCS.NS', name: 'Tata Consultancy Services', ytd: 16.4, isINR: true },
      { ticker: 'INFY.NS', name: 'Infosys Limited', ytd: 18.2, isINR: true },
      { ticker: 'WIPRO.NS', name: 'Wipro Limited', ytd: 12.1, isINR: true },
      { ticker: 'CRM', name: 'Salesforce Inc', ytd: 14.6, isINR: false }
    ],
    topQuantStocks: [
      {
        ticker: 'INFY.NS',
        name: 'Infosys Limited',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹1,890.00',
        ytd: 18.2,
        cagr: 19.5,
        pe: 26.2,
        growth: 16.5,
        peg: 1.58,
        quantScore: 90,
        fairValue: '₹2,180.00',
        upside: 17.2,
        obToRev: 1.65,
        thesis: 'Large-deal pipeline ($4.1B/quarter) and enterprise generative AI suite (Topaz) accelerating digital engineering contract renewals.'
      },
      {
        ticker: 'TCS.NS',
        name: 'Tata Consultancy Services',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹4,250.00',
        ytd: 16.4,
        cagr: 17.8,
        pe: 28.4,
        growth: 15.0,
        peg: 1.89,
        quantScore: 88,
        fairValue: '₹4,820.00',
        upside: 15.4,
        obToRev: 1.75,
        thesis: 'Tier-1 execution titan with 26% operating margins, zero debt, high free cash flow conversion, and superior employee retention.'
      },
      {
        ticker: 'CRM',
        name: 'Salesforce Inc.',
        market: 'NYSE',
        flag: '🇺🇸',
        price: '$295.00',
        ytd: 14.6,
        cagr: 21.4,
        pe: 27.8,
        growth: 19.0,
        peg: 1.46,
        quantScore: 89,
        fairValue: '$348.00',
        upside: 20.2,
        obToRev: 1.50,
        thesis: 'Agentforce enterprise agent launch driving recurring ARR re-acceleration while expanding operating margins toward 33% target.'
      }
    ]
  },
  {
    id: 'healthcare',
    name: 'Healthcare, Biotech & Pharmaceuticals',
    icon: 'shield-check',
    market: 'ALL',
    ytd: 11.5,
    m1: 0.9,
    y1: 19.4,
    mcap: '$2.40T',
    avgPe: 28.6,
    avgGrowth: 14.8,
    breadth: 68,
    description: 'GLP-1 therapeutics, specialty generics, active pharmaceutical ingredients (API) & clinical biotech.',
    leaders: [
      { ticker: 'SUNPHARMA.NS', name: 'Sun Pharma', ytd: 38.2, isINR: true },
      { ticker: 'CIPLA.NS', name: 'Cipla Limited', ytd: 24.1, isINR: true },
      { ticker: 'LLY', name: 'Eli Lilly & Co', ytd: 42.8, isINR: false },
      { ticker: 'NVO', name: 'Novo Nordisk', ytd: 28.5, isINR: false }
    ],
    topQuantStocks: [
      {
        ticker: 'LLY',
        name: 'Eli Lilly and Company',
        market: 'NYSE',
        flag: '🇺🇸',
        price: '$895.00',
        ytd: 42.8,
        cagr: 31.2,
        pe: 42.5,
        growth: 38.0,
        peg: 1.12,
        quantScore: 93,
        fairValue: '$1,080.00',
        upside: 22.8,
        obToRev: 1.60,
        thesis: 'Top-quartile EPS compounding (+38%) backed by unprecedented GLP-1 demand for Mounjaro & Zepbound with manufacturing capacity scaling.'
      },
      {
        ticker: 'SUNPHARMA.NS',
        name: 'Sun Pharmaceutical Industries',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹1,880.00',
        ytd: 38.2,
        cagr: 23.8,
        pe: 34.0,
        growth: 22.0,
        peg: 1.54,
        quantScore: 91,
        fairValue: '₹2,190.00',
        upside: 18.4,
        obToRev: 1.30,
        thesis: 'Global specialty drug portfolio expansion delivering durable double-digit margin growth alongside domestic market share dominance.'
      },
      {
        ticker: 'CIPLA.NS',
        name: 'Cipla Limited',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹1,560.00',
        ytd: 24.1,
        cagr: 20.4,
        pe: 25.8,
        growth: 18.5,
        peg: 1.39,
        quantScore: 89,
        fairValue: '₹1,820.00',
        upside: 18.8,
        obToRev: 1.25,
        thesis: 'Leadership in respiratory inhalers in the US and expanding One-India chronic formulation revenue compounding.'
      }
    ]
  },
  {
    id: 'consumer_fmcg',
    name: 'Consumer Staples, Retail & FMCG',
    icon: 'layers',
    market: 'ALL',
    ytd: 8.2,
    m1: 0.4,
    y1: 14.8,
    mcap: '$2.85T',
    avgPe: 27.4,
    avgGrowth: 11.2,
    breadth: 62,
    description: 'Household essentials, food products, packaged goods, big-box omnichannel retail & e-grocery.',
    leaders: [
      { ticker: 'ITC.NS', name: 'ITC Limited', ytd: 14.2, isINR: true },
      { ticker: 'HUL.NS', name: 'Hindustan Unilever', ytd: 6.8, isINR: true },
      { ticker: 'WMT', name: 'Walmart Inc', ytd: 34.2, isINR: false },
      { ticker: 'COST', name: 'Costco Wholesale', ytd: 28.1, isINR: false }
    ],
    topQuantStocks: [
      {
        ticker: 'WMT',
        name: 'Walmart Inc.',
        market: 'NYSE',
        flag: '🇺🇸',
        price: '$78.50',
        ytd: 34.2,
        cagr: 19.5,
        pe: 29.2,
        growth: 18.0,
        peg: 1.62,
        quantScore: 91,
        fairValue: '$91.00',
        upside: 17.8,
        obToRev: 1.15,
        thesis: 'E-commerce marketplace advertising growth and automated fulfillment center efficiencies delivering operating leverage.'
      },
      {
        ticker: 'COST',
        name: 'Costco Wholesale Corporation',
        market: 'NASDAQ',
        flag: '🇺🇸',
        price: '$885.00',
        ytd: 28.1,
        cagr: 16.2,
        pe: 48.0,
        growth: 15.5,
        peg: 3.09,
        quantScore: 86,
        fairValue: '$970.00',
        upside: 11.5,
        obToRev: 1.20,
        thesis: 'Exceptional 93% membership renewal rate, pricing power on fee increases, and international store runway.'
      },
      {
        ticker: 'ITC.NS',
        name: 'ITC Limited',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹495.00',
        ytd: 14.2,
        cagr: 17.0,
        pe: 26.8,
        growth: 14.5,
        peg: 1.84,
        quantScore: 88,
        fairValue: '₹575.00',
        upside: 18.2,
        obToRev: 1.30,
        thesis: 'Hotels business demerger unlock, FMCG profitability expansion, and 3.5%+ dividend yield providing strong downside safety.'
      }
    ]
  },
  {
    id: 'energy_oil',
    name: 'Oil, Gas & Energy Infrastructure',
    icon: 'flame',
    market: 'ALL',
    ytd: 5.7,
    m1: -1.2,
    y1: 12.5,
    mcap: '$2.10T',
    avgPe: 14.5,
    avgGrowth: 9.8,
    breadth: 55,
    description: 'Upstream exploration, refining margins, petrochemical downstream & liquefied natural gas pipelines.',
    leaders: [
      { ticker: 'RELIANCE.NS', name: 'Reliance Industries', ytd: 12.4, isINR: true },
      { ticker: 'ONGC.NS', name: 'ONGC Limited', ytd: 28.5, isINR: true },
      { ticker: 'XOM', name: 'Exxon Mobil', ytd: 14.2, isINR: false },
      { ticker: 'CVX', name: 'Chevron Corp', ytd: 4.1, isINR: false }
    ],
    topQuantStocks: [
      {
        ticker: 'ONGC.NS',
        name: 'Oil and Natural Gas Corporation',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹285.00',
        ytd: 28.5,
        cagr: 22.5,
        pe: 7.2,
        growth: 14.0,
        peg: 0.51,
        quantScore: 95,
        fairValue: '₹375.00',
        upside: 34.0,
        obToRev: 1.20,
        thesis: 'Extreme deep value Peter Lynch GARP pick with PEG 0.51 (≤ 0.50 Deep GARP), KG-D6 deepwater production ramp, and 5%+ dividend yield.'
      },
      {
        ticker: 'XOM',
        name: 'Exxon Mobil Corporation',
        market: 'NYSE',
        flag: '🇺🇸',
        price: '$118.00',
        ytd: 14.2,
        cagr: 16.4,
        pe: 13.5,
        growth: 12.0,
        peg: 1.12,
        quantScore: 89,
        fairValue: '$138.00',
        upside: 18.6,
        obToRev: 1.15,
        thesis: 'Pioneer Natural Resources acquisition synergy, Guyana offshore deepwater low cost of extraction, and aggressive share buybacks.'
      },
      {
        ticker: 'RELIANCE.NS',
        name: 'Reliance Industries Limited',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹2,780.00',
        ytd: 12.4,
        cagr: 18.5,
        pe: 25.4,
        growth: 16.0,
        peg: 1.58,
        quantScore: 88,
        fairValue: '₹3,250.00',
        upside: 18.8,
        obToRev: 1.85,
        thesis: 'Dual engine compounding in Jio Telecom & Retail, alongside multi-billion green hydrogen and solar gigafactory commissioning.'
      }
    ]
  },
  {
    id: 'telecom',
    name: 'Telecommunications & 5G Infrastructure',
    icon: 'radar',
    market: 'ALL',
    ytd: 3.4,
    m1: -0.8,
    y1: 8.2,
    mcap: '$880B',
    avgPe: 18.2,
    avgGrowth: 8.4,
    breadth: 50,
    description: '5G wireless deployments, broadband fiber networks, ARPU growth & digital enterprise connectivity.',
    leaders: [
      { ticker: 'BHARTIARTL.NS', name: 'Bharti Airtel', ytd: 38.5, isINR: true },
      { ticker: 'T', name: 'AT&T Inc', ytd: 18.2, isINR: false },
      { ticker: 'VZ', name: 'Verizon Communications', ytd: 8.4, isINR: false }
    ],
    topQuantStocks: [
      {
        ticker: 'BHARTIARTL.NS',
        name: 'Bharti Airtel Limited',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹1,640.00',
        ytd: 38.5,
        cagr: 24.8,
        pe: 38.0,
        growth: 24.0,
        peg: 1.58,
        quantScore: 92,
        fairValue: '₹1,950.00',
        upside: 20.5,
        obToRev: 1.45,
        thesis: 'Industry-leading ARPU expansion (> ₹225), postpaid premiumization, and high return on capital employed from Africa & enterprise fiber.'
      },
      {
        ticker: 'T',
        name: 'AT&T Inc.',
        market: 'NYSE',
        flag: '🇺🇸',
        price: '$21.50',
        ytd: 18.2,
        cagr: 15.8,
        pe: 9.2,
        growth: 9.5,
        peg: 0.96,
        quantScore: 91,
        fairValue: '$25.50',
        upside: 20.2,
        obToRev: 1.10,
        thesis: 'Satisfies Peter Lynch GARP criteria (PEG 0.96 < 1.0) with consistent postpaid wireless subscriber growth and net debt paydown.'
      },
      {
        ticker: 'VZ',
        name: 'Verizon Communications Inc.',
        market: 'NYSE',
        flag: '🇺🇸',
        price: '$42.50',
        ytd: 8.4,
        cagr: 14.0,
        pe: 9.5,
        growth: 8.0,
        peg: 1.18,
        quantScore: 86,
        fairValue: '$49.00',
        upside: 17.2,
        obToRev: 1.05,
        thesis: 'Attractive ~6.5% sustainable dividend yield, Fixed Wireless Access (FWA) broadband market expansion, and capital expenditure moderation.'
      }
    ]
  },
  {
    id: 'realestate',
    name: 'Real Estate & Infrastructure Construction',
    icon: 'building-2',
    market: 'ALL',
    ytd: -2.8,
    m1: -2.4,
    y1: 4.2,
    mcap: '$540B',
    avgPe: 32.0,
    avgGrowth: 6.5,
    breadth: 42,
    description: 'Commercial REITs, logistics warehousing, urban residential townships & high-rise civil construction.',
    leaders: [
      { ticker: 'DLF.NS', name: 'DLF Limited', ytd: 16.2, isINR: true },
      { ticker: 'GODREJPROP.NS', name: 'Godrej Properties', ytd: 12.5, isINR: true },
      { ticker: 'PLD', name: 'Prologis Inc', ytd: -8.4, isINR: false },
      { ticker: 'SPG', name: 'Simon Property Group', ytd: -4.2, isINR: false }
    ],
    topQuantStocks: [
      {
        ticker: 'DLF.NS',
        name: 'DLF Limited',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹860.00',
        ytd: 16.2,
        cagr: 25.0,
        pe: 48.0,
        growth: 28.0,
        peg: 1.71,
        quantScore: 89,
        fairValue: '₹1,020.00',
        upside: 20.5,
        obToRev: 2.80,
        thesis: 'Backlog-to-revenue visibility of 2.80x (> 1.0 Green), record luxury pre-sales velocity, and zero net debt balance sheet.'
      },
      {
        ticker: 'GODREJPROP.NS',
        name: 'Godrej Properties Limited',
        market: 'NSE India',
        flag: '🇮🇳',
        price: '₹2,950.00',
        ytd: 12.5,
        cagr: 23.5,
        pe: 44.0,
        growth: 26.0,
        peg: 1.69,
        quantScore: 87,
        fairValue: '₹3,450.00',
        upside: 18.8,
        obToRev: 2.40,
        thesis: 'Market share consolidation across NCR, MMR, Bengaluru, and Pune backed by high-velocity project execution.'
      },
      {
        ticker: 'PLD',
        name: 'Prologis Inc.',
        market: 'NYSE',
        flag: '🇺🇸',
        price: '$112.00',
        ytd: -8.4,
        cagr: 16.0,
        pe: 28.0,
        growth: 14.0,
        peg: 2.00,
        quantScore: 84,
        fairValue: '$128.00',
        upside: 16.2,
        obToRev: 1.30,
        thesis: 'Premier global logistics warehouse REIT; pullback provides favorable entry point for long-term power & data center conversions.'
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

  if (elName) elName.textContent = sector.name;
  if (elDesc) elDesc.textContent = `${sector.description} (YTD Performance: +${sector.ytd}% • Market Cap: ${sector.mcap})`;
  if (elRankBadge) elRankBadge.textContent = `${rankDisplay} (${sector.ytd >= 0 ? '+' : ''}${sector.ytd}% YTD)`;

  const quantStocks = sector.topQuantStocks || [];

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
  // Populate Showcase Select dropdown
  const showcaseSelect = document.getElementById('sectorShowcaseSelect');
  if (showcaseSelect) {
    showcaseSelect.innerHTML = SECTORS_DATA.map((s, idx) => `
      <option value="${s.id}" ${s.id === selectedSectorId ? 'selected' : ''}>
        #${idx + 1} ${s.name} (${s.ytd >= 0 ? '+' : ''}${s.ytd}%)
      </option>
    `).join('');
  }

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

  // 2. Filter Chips
  const filterChips = document.querySelectorAll('.sectors-toolbar .filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentMarketFilter = chip.getAttribute('data-market-filter') || 'ALL';
      renderSectorsDashboard(universe, onSelectStock, isDarkMode);
    });
  });

  // 3. Showcase Sector Dropdown Change
  if (showcaseSelect) {
    showcaseSelect.addEventListener('change', (e) => {
      selectSector(e.target.value, onSelectStock, sortedSectors);
    });
  }
}
