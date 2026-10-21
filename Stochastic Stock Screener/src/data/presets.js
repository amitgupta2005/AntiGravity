/**
 * Curated Preset Universes for Stochastic Screener
 * Includes Indian Nifty 50, Nifty Next 50, US S&P 500 Leaders, and Sector Baskets.
 */

export const PRESET_UNIVERSES = {
  nifty50: {
    id: 'nifty-50',
    name: 'NIFTY 50 (NSE India Bluechips)',
    market: 'NSE',
    currencySymbol: '₹',
    stocks: [
      { ticker: 'RELIANCE.NS', name: 'Reliance Industries Ltd', sector: 'Energy & Telecom' },
      { ticker: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT Services' },
      { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', sector: 'Banking' },
      { ticker: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd', sector: 'Telecom' },
      { ticker: 'ICICIBANK.NS', name: 'ICICI Bank Ltd', sector: 'Banking' },
      { ticker: 'INFY.NS', name: 'Infosys Ltd', sector: 'IT Services' },
      { ticker: 'ITC.NS', name: 'ITC Ltd', sector: 'FMCG' },
      { ticker: 'SBIN.NS', name: 'State Bank of India', sector: 'Banking' },
      { ticker: 'LT.NS', name: 'Larsen & Toubro Ltd', sector: 'Infrastructure' },
      { ticker: 'HINDUNILVR.NS', name: 'Hindustan Unilever Ltd', sector: 'FMCG' },
      { ticker: 'TATAMOTORS.NS', name: 'Tata Motors Ltd', sector: 'Automotive' },
      { ticker: 'AXISBANK.NS', name: 'Axis Bank Ltd', sector: 'Banking' },
      { ticker: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', sector: 'Banking' },
      { ticker: 'BAJFINANCE.NS', name: 'Bajaj Finance Ltd', sector: 'Financial Services' },
      { ticker: 'MARUTI.NS', name: 'Maruti Suzuki India Ltd', sector: 'Automotive' },
      { ticker: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical Ind', sector: 'Pharma' },
      { ticker: 'M&M.NS', name: 'Mahindra & Mahindra Ltd', sector: 'Automotive' },
      { ticker: 'TITAN.NS', name: 'Titan Company Ltd', sector: 'Consumer Discretionary' },
      { ticker: 'NTPC.NS', name: 'NTPC Ltd', sector: 'Power & Utilities' },
      { ticker: 'POWERGRID.NS', name: 'Power Grid Corp of India', sector: 'Utilities' },
      { ticker: 'ADANIENT.NS', name: 'Adani Enterprises Ltd', sector: 'Commodities' },
      { ticker: 'ADANIPORTS.NS', name: 'Adani Ports & SEZ', sector: 'Infrastructure' },
      { ticker: 'ULTRACEMCO.NS', name: 'UltraTech Cement Ltd', sector: 'Cement' },
      { ticker: 'ASIANPAINT.NS', name: 'Asian Paints Ltd', sector: 'Paints & Consumer' },
      { ticker: 'COALINDIA.NS', name: 'Coal India Ltd', sector: 'Mining & Energy' },
      { ticker: 'TATASTEEL.NS', name: 'Tata Steel Ltd', sector: 'Metals & Mining' },
      { ticker: 'BAJAJFINSV.NS', name: 'Bajaj Finserv Ltd', sector: 'Financial Services' },
      { ticker: 'ONGC.NS', name: 'Oil & Natural Gas Corp', sector: 'Oil & Gas' },
      { ticker: 'HCLTECH.NS', name: 'HCL Technologies Ltd', sector: 'IT Services' },
      { ticker: 'WIPRO.NS', name: 'Wipro Ltd', sector: 'IT Services' },
      { ticker: 'DIVISLAB.NS', name: 'Divi\'s Laboratories Ltd', sector: 'Pharma' },
      { ticker: 'DRREDDY.NS', name: 'Dr. Reddy\'s Laboratories', sector: 'Pharma' },
      { ticker: 'CIPLA.NS', name: 'Cipla Ltd', sector: 'Pharma' },
      { ticker: 'GRASIM.NS', name: 'Grasim Industries Ltd', sector: 'Chemicals' },
      { ticker: 'JSWSTEEL.NS', name: 'JSW Steel Ltd', sector: 'Metals' },
      { ticker: 'INDUSINDBK.NS', name: 'IndusInd Bank Ltd', sector: 'Banking' },
      { ticker: 'HINDALCO.NS', name: 'Hindalco Industries Ltd', sector: 'Metals' },
      { ticker: 'EICHERMOT.NS', name: 'Eicher Motors Ltd', sector: 'Automotive' },
      { ticker: 'TECHM.NS', name: 'Tech Mahindra Ltd', sector: 'IT Services' },
      { ticker: 'NESTLEIND.NS', name: 'Nestle India Ltd', sector: 'FMCG' },
      { ticker: 'APOLLOHOSP.NS', name: 'Apollo Hospitals Enterprise', sector: 'Healthcare' },
      { ticker: 'HEROMOTOCO.NS', name: 'Hero MotoCorp Ltd', sector: 'Automotive' },
      { ticker: 'BRITANNIA.NS', name: 'Britannia Industries Ltd', sector: 'FMCG' },
      { ticker: 'BEL.NS', name: 'Bharat Electronics Ltd', sector: 'Defense' },
      { ticker: 'TRENT.NS', name: 'Trent Ltd', sector: 'Retail' },
      { ticker: 'BPCL.NS', name: 'Bharat Petroleum Corp', sector: 'Oil & Gas' },
      { ticker: 'TATACONSUM.NS', name: 'Tata Consumer Products', sector: 'FMCG' },
      { ticker: 'SHRIRAMFIN.NS', name: 'Shriram Finance Ltd', sector: 'Financial Services' },
      { ticker: 'SBILIFE.NS', name: 'SBI Life Insurance Co', sector: 'Insurance' },
      { ticker: 'HDFCLIFE.NS', name: 'HDFC Life Insurance Co', sector: 'Insurance' }
    ]
  },

  niftyNext50: {
    id: 'nifty-next-50',
    name: 'NIFTY Next 50 (NSE Growth & Momentum)',
    market: 'NSE',
    currencySymbol: '₹',
    stocks: [
      { ticker: 'HAL.NS', name: 'Hindustan Aeronautics Ltd', sector: 'Defense & Aerospace' },
      { ticker: 'VBL.NS', name: 'Varun Beverages Ltd', sector: 'Consumer' },
      { ticker: 'ZOMATO.NS', name: 'Zomato Ltd', sector: 'Internet & Consumer' },
      { ticker: 'JIOFIN.NS', name: 'Jio Financial Services Ltd', sector: 'Financial Services' },
      { ticker: 'VEDL.NS', name: 'Vedanta Ltd', sector: 'Metals' },
      { ticker: 'PFC.NS', name: 'Power Finance Corporation', sector: 'Financial Services' },
      { ticker: 'RECLTD.NS', name: 'REC Limited', sector: 'Financial Services' },
      { ticker: 'IRFC.NS', name: 'Indian Railway Finance Corp', sector: 'Railways & Infrastructure' },
      { ticker: 'CHOLAFIN.NS', name: 'Cholamandalam Inv & Fin', sector: 'Financial Services' },
      { ticker: 'DLF.NS', name: 'DLF Limited', sector: 'Real Estate' },
      { ticker: 'GODREJCP.NS', name: 'Godrej Consumer Products', sector: 'FMCG' },
      { ticker: 'PIDILITIND.NS', name: 'Pidilite Industries Ltd', sector: 'Chemicals' },
      { ticker: 'SIEMENS.NS', name: 'Siemens Ltd', sector: 'Capital Goods' },
      { ticker: 'ABB.NS', name: 'ABB India Ltd', sector: 'Capital Goods' },
      { ticker: 'TVSMOTOR.NS', name: 'TVS Motor Company Ltd', sector: 'Automotive' },
      { ticker: 'POLYCAB.NS', name: 'Polycab India Ltd', sector: 'Industrial Manufacturing' },
      { ticker: 'DIXON.NS', name: 'Dixon Technologies Ltd', sector: 'Electronics Manufacturing' },
      { ticker: 'CUMMINSIND.NS', name: 'Cummins India Ltd', sector: 'Industrial Engineering' },
      { ticker: 'PERSISTENT.NS', name: 'Persistent Systems Ltd', sector: 'IT Services' },
      { ticker: 'COFORGE.NS', name: 'Coforge Ltd', sector: 'IT Services' },
      { ticker: 'SUZLON.NS', name: 'Suzlon Energy Ltd', sector: 'Clean Energy & Wind' },
      { ticker: 'BHEL.NS', name: 'Bharat Heavy Electricals', sector: 'Capital Goods' }
    ]
  },

  usMegaTech: {
    id: 'us-mega-tech',
    name: 'US Tech Giants & S&P 500 Leaders',
    market: 'US',
    currencySymbol: '$',
    stocks: [
      { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Semiconductors & AI' },
      { ticker: 'AAPL', name: 'Apple Inc', sector: 'Consumer Tech' },
      { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Cloud & AI' },
      { ticker: 'GOOGL', name: 'Alphabet Inc', sector: 'Search & Cloud' },
      { ticker: 'AMZN', name: 'Amazon.com Inc', sector: 'E-Commerce & AWS' },
      { ticker: 'META', name: 'Meta Platforms Inc', sector: 'Social Media & AI' },
      { ticker: 'TSLA', name: 'Tesla Inc', sector: 'Electric Vehicles' },
      { ticker: 'AVGO', name: 'Broadcom Inc', sector: 'Semiconductors' },
      { ticker: 'TSM', name: 'Taiwan Semiconductor Mfg', sector: 'Foundry & Chips' },
      { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'Semiconductors' },
      { ticker: 'ASML', name: 'ASML Holding NV', sector: 'Semiconductor Lithography' },
      { ticker: 'QCOM', name: 'Qualcomm Inc', sector: 'Mobile & Wireless Chips' },
      { ticker: 'PLTR', name: 'Palantir Technologies', sector: 'AI & Enterprise Software' },
      { ticker: 'NFLX', name: 'Netflix Inc', sector: 'Digital Streaming' },
      { ticker: 'CRM', name: 'Salesforce Inc', sector: 'Enterprise Cloud' },
      { ticker: 'ADBE', name: 'Adobe Inc', sector: 'Creative Software' },
      { ticker: 'ORCL', name: 'Oracle Corporation', sector: 'Database & Cloud' },
      { ticker: 'INTC', name: 'Intel Corporation', sector: 'Semiconductors' },
      { ticker: 'MU', name: 'Micron Technology', sector: 'Memory & Storage' },
      { ticker: 'ARM', name: 'Arm Holdings plc', sector: 'IP Architecture' }
    ]
  },

  etfs: {
    id: 'benchmark-etfs',
    name: 'Benchmark Indices & Leading ETFs',
    market: 'MIXED',
    currencySymbol: '$',
    stocks: [
      { ticker: '^NSEI', name: 'NIFTY 50 Benchmark Index', sector: 'Indian Benchmark' },
      { ticker: '^NSEBANK', name: 'Nifty Bank Banking Index', sector: 'Indian Financials' },
      { ticker: '^GSPC', name: 'S&P 500 Large-Cap Index', sector: 'US Large-Cap' },
      { ticker: '^IXIC', name: 'NASDAQ Composite Tech Index', sector: 'US Technology' },
      { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'US Broad Market' },
      { ticker: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', sector: 'US Tech Leaders' },
      { ticker: 'SMH', name: 'VanEck Semiconductor ETF', sector: 'Global Chips' },
      { ticker: 'NIFTYBEES.NS', name: 'Nippon India Nifty BeES ETF', sector: 'Nifty 50 Tracker' },
      { ticker: 'BANKBEES.NS', name: 'Nippon India Bank BeES ETF', sector: 'Nifty Bank Tracker' }
    ]
  }
};

/**
 * Retrieve array of stocks for given universe key
 */
export function getUniverseList(key = 'nifty50') {
  const normKey = key === 'NIFTY_50' ? 'nifty50' :
                  key === 'NIFTY_NEXT_50' ? 'niftyNext50' :
                  key === 'US_MEGA_TECH' ? 'usMegaTech' :
                  key === 'BENCHMARK_ETFS' ? 'etfs' : key;

  return PRESET_UNIVERSES[normKey]?.stocks || PRESET_UNIVERSES.nifty50.stocks;
}
