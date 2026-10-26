/**
 * Curated Preset Universes for Stochastic Screener
 * Includes Indian Largecaps, Midcaps, Smallcaps, US Mega Tech, Midcaps, Smallcaps,
 * Global Mid/Small Caps, and Sector & Benchmark ETFs from USA, Global, and India.
 */

export const PRESET_UNIVERSES = {
  // ==========================================
  // 🇮🇳 INDIA EQUITIES
  // ==========================================

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
    name: 'NIFTY Next 50 (NSE Large-Mid Growth)',
    market: 'NSE',
    currencySymbol: '₹',
    stocks: [
      { ticker: 'HAL.NS', name: 'Hindustan Aeronautics Ltd', sector: 'Defense & Aerospace' },
      { ticker: 'VBL.NS', name: 'Varun Beverages Ltd', sector: 'Consumer & Beverages' },
      { ticker: 'ZOMATO.NS', name: 'Zomato Ltd', sector: 'Internet & Food Delivery' },
      { ticker: 'JIOFIN.NS', name: 'Jio Financial Services Ltd', sector: 'Financial Services' },
      { ticker: 'VEDL.NS', name: 'Vedanta Ltd', sector: 'Metals & Mining' },
      { ticker: 'PFC.NS', name: 'Power Finance Corporation', sector: 'Financial Services' },
      { ticker: 'RECLTD.NS', name: 'REC Limited', sector: 'Financial Services' },
      { ticker: 'IRFC.NS', name: 'Indian Railway Finance Corp', sector: 'Railways & Infrastructure' },
      { ticker: 'CHOLAFIN.NS', name: 'Cholamandalam Inv & Fin', sector: 'Financial Services' },
      { ticker: 'DLF.NS', name: 'DLF Limited', sector: 'Real Estate' },
      { ticker: 'GODREJCP.NS', name: 'Godrej Consumer Products', sector: 'FMCG' },
      { ticker: 'PIDILITIND.NS', name: 'Pidilite Industries Ltd', sector: 'Chemicals' },
      { ticker: 'SIEMENS.NS', name: 'Siemens Ltd', sector: 'Capital Goods' },
      { ticker: 'ABB.NS', name: 'ABB India Ltd', sector: 'Capital Goods & Robotics' },
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

  indiaMidcap: {
    id: 'india-midcap',
    name: 'India NIFTY Midcap 100 Leaders',
    market: 'NSE',
    currencySymbol: '₹',
    stocks: [
      { ticker: 'DIXON.NS', name: 'Dixon Technologies', sector: 'Electronics Manufacturing' },
      { ticker: 'POLYCAB.NS', name: 'Polycab India Ltd', sector: 'Electrical Cables & Equipment' },
      { ticker: 'PERSISTENT.NS', name: 'Persistent Systems', sector: 'IT Services & AI' },
      { ticker: 'COFORGE.NS', name: 'Coforge Ltd', sector: 'IT Solutions & Cloud' },
      { ticker: 'TRENT.NS', name: 'Trent Ltd', sector: 'Consumer & Retail' },
      { ticker: 'VOLTAS.NS', name: 'Voltas Ltd', sector: 'Consumer Electricals & HVAC' },
      { ticker: 'ASTRAL.NS', name: 'Astral Ltd', sector: 'Building Materials & Piping' },
      { ticker: 'FEDERALBNK.NS', name: 'Federal Bank Ltd', sector: 'Banking' },
      { ticker: 'IDFCFIRSTB.NS', name: 'IDFC First Bank Ltd', sector: 'Banking' },
      { ticker: 'ASHOKLEY.NS', name: 'Ashok Leyland Ltd', sector: 'Commercial Vehicles' },
      { ticker: 'CUMMINSIND.NS', name: 'Cummins India Ltd', sector: 'Industrial Engines & Power' },
      { ticker: 'BHARATFORG.NS', name: 'Bharat Forge Ltd', sector: 'Automotive & Defense Forging' },
      { ticker: 'JUBLFOOD.NS', name: 'Jubilant FoodWorks', sector: 'Food & Quick Service' },
      { ticker: 'MAXHEALTH.NS', name: 'Max Healthcare Institute', sector: 'Hospitals & Healthcare' },
      { ticker: 'ABCAPITAL.NS', name: 'Aditya Birla Capital', sector: 'Financial Services' },
      { ticker: 'PAGEIND.NS', name: 'Page Industries Ltd', sector: 'Apparel & Innerwear' },
      { ticker: 'AUROPHARMA.NS', name: 'Aurobindo Pharma Ltd', sector: 'Pharmaceuticals' },
      { ticker: 'LUPIN.NS', name: 'Lupin Ltd', sector: 'Pharmaceuticals & Generics' },
      { ticker: 'BALKRISIND.NS', name: 'Balkrishna Industries', sector: 'Tyres & Off-Highway' },
      { ticker: 'DEEPAKNTR.NS', name: 'Deepak Nitrite Ltd', sector: 'Specialty Chemicals' },
      { ticker: 'TATACOMM.NS', name: 'Tata Communications Ltd', sector: 'Telecom & Enterprise Cloud' },
      { ticker: 'MOTHERSON.NS', name: 'Samvardhana Motherson Int', sector: 'Automotive Components' },
      { ticker: 'ESCORTS.NS', name: 'Escorts Kubota Ltd', sector: 'Agri Machinery & Tractors' },
      { ticker: 'OBEROIRLTY.NS', name: 'Oberoi Realty Ltd', sector: 'Premium Real Estate' },
      { ticker: 'MPHASIS.NS', name: 'Mphasis Ltd', sector: 'IT & Cloud Architecture' },
      { ticker: 'SUZLON.NS', name: 'Suzlon Energy Ltd', sector: 'Clean Tech & Wind Energy' }
    ]
  },

  indiaSmallcap: {
    id: 'india-smallcap',
    name: 'India NIFTY Smallcap Breakouts & Momentum',
    market: 'NSE',
    currencySymbol: '₹',
    stocks: [
      { ticker: 'RVNL.NS', name: 'Rail Vikas Nigam Ltd', sector: 'Railways Infrastructure' },
      { ticker: 'IRCON.NS', name: 'Ircon International Ltd', sector: 'Railways & Highways' },
      { ticker: 'HUDCO.NS', name: 'Housing & Urban Dev Corp', sector: 'Housing Finance & Infra' },
      { ticker: 'NBCC.NS', name: 'NBCC (India) Ltd', sector: 'Civil Construction & PMC' },
      { ticker: 'CDSL.NS', name: 'Central Depository Services', sector: 'Capital Markets & Depository' },
      { ticker: 'BSE.NS', name: 'BSE Ltd', sector: 'Stock Exchange & Trading' },
      { ticker: 'ANGELONE.NS', name: 'Angel One Ltd', sector: 'Fintech & Digital Broking' },
      { ticker: 'KAYNES.NS', name: 'Kaynes Technology India', sector: 'Electronic Systems & IoT' },
      { ticker: 'BSOFT.NS', name: 'Birlasoft Ltd', sector: 'Enterprise IT Services' },
      { ticker: 'RBLBANK.NS', name: 'RBL Bank Ltd', sector: 'Banking' },
      { ticker: 'MANAPPURAM.NS', name: 'Manappuram Finance', sector: 'Gold Loans & NBFC' },
      { ticker: 'RADICO.NS', name: 'Radico Khaitan Ltd', sector: 'Distilleries & Spirits' },
      { ticker: 'CENTURYPLY.NS', name: 'Century Plyboards Ltd', sector: 'Building Materials' },
      { ticker: 'CASTROLIND.NS', name: 'Castrol India Ltd', sector: 'Automotive Lubricants' },
      { ticker: 'HFCL.NS', name: 'HFCL Ltd', sector: 'Optical Fiber & 5G Telecom' },
      { ticker: 'EXIDEIND.NS', name: 'Exide Industries Ltd', sector: 'Batteries & EV Storage' },
      { ticker: 'CYIENT.NS', name: 'Cyient Ltd', sector: 'Engineering & Technology' },
      { ticker: 'CEATLTD.NS', name: 'CEAT Ltd', sector: 'Tyres & Rubber' },
      { ticker: 'TATAELXSI.NS', name: 'Tata Elxsi Ltd', sector: 'Design & Software Solutions' },
      { ticker: 'SONACOMS.NS', name: 'Sona BLW Precision Forgings', sector: 'EV Powertrain Components' },
      { ticker: 'KIMS.NS', name: 'Krishna Institute of Med Sci', sector: 'Healthcare & Hospitals' },
      { ticker: 'MEDANTA.NS', name: 'Global Health Ltd (Medanta)', sector: 'Multi-Specialty Hospitals' },
      { ticker: 'JBCHEPHARM.NS', name: 'J.B. Chemicals & Pharma', sector: 'Formulations & Generics' },
      { ticker: 'ELECON.NS', name: 'Elecon Engineering Co', sector: 'Industrial Material Handling' },
      { ticker: 'PNBHOUSING.NS', name: 'PNB Housing Finance', sector: 'Affordable Housing Finance' }
    ]
  },

  // ==========================================
  // 🇺🇸 USA EQUITIES
  // ==========================================

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

  usMidcap: {
    id: 'us-midcap',
    name: 'US Midcap Growth & Breakouts (S&P 400)',
    market: 'US',
    currencySymbol: '$',
    stocks: [
      { ticker: 'PLTR', name: 'Palantir Technologies', sector: 'Enterprise AI Software' },
      { ticker: 'COIN', name: 'Coinbase Global Inc', sector: 'Crypto & Digital Assets' },
      { ticker: 'SMCI', name: 'Super Micro Computer Inc', sector: 'AI Server Infrastructure' },
      { ticker: 'CRWD', name: 'CrowdStrike Holdings', sector: 'Cybersecurity Cloud' },
      { ticker: 'NET', name: 'Cloudflare Inc', sector: 'Edge Computing & Security' },
      { ticker: 'DKNG', name: 'DraftKings Inc', sector: 'Digital Gaming & Sports' },
      { ticker: 'APP', name: 'AppLovin Corporation', sector: 'AdTech & AI Software' },
      { ticker: 'AXON', name: 'Axon Enterprise Inc', sector: 'Public Safety & Defense Tech' },
      { ticker: 'DECK', name: 'Deckers Outdoor Corp', sector: 'Footwear & Consumer Brands' },
      { ticker: 'CELH', name: 'Celsius Holdings Inc', sector: 'Energy & Functional Beverages' },
      { ticker: 'DASH', name: 'DoorDash Inc', sector: 'Logistics & On-Demand Delivery' },
      { ticker: 'MDB', name: 'MongoDB Inc', sector: 'Modern Database Platform' },
      { ticker: 'TTD', name: 'The Trade Desk Inc', sector: 'Programmatic Advertising' },
      { ticker: 'TOST', name: 'Toast Inc', sector: 'Restaurant Cloud Fintech' },
      { ticker: 'DUOL', name: 'Duolingo Inc', sector: 'Digital Learning & Mobile' },
      { ticker: 'HOOD', name: 'Robinhood Markets Inc', sector: 'Fintech Brokerage' },
      { ticker: 'RBLX', name: 'Roblox Corporation', sector: 'Immersive Gaming & 3D' },
      { ticker: 'SOFI', name: 'SoFi Technologies Inc', sector: 'Digital Financial Platform' },
      { ticker: 'SYM', name: 'Symbotic Inc', sector: 'Supply Chain AI Automation' },
      { ticker: 'ANET', name: 'Arista Networks Inc', sector: 'Cloud Networking Systems' },
      { ticker: 'FSLR', name: 'First Solar Inc', sector: 'Solar PV Modules & Clean Tech' },
      { ticker: 'ELF', name: 'e.l.f. Beauty Inc', sector: 'Cosmetics & Personal Care' },
      { ticker: 'ON', name: 'ON Semiconductor Corp', sector: 'Automotive & Power Chips' },
      { ticker: 'MPWR', name: 'Monolithic Power Systems', sector: 'High-Performance Power ICs' },
      { ticker: 'GTLB', name: 'GitLab Inc', sector: 'DevSecOps Software Platform' }
    ]
  },

  usSmallcap: {
    id: 'us-smallcap',
    name: 'US Smallcap High-Beta & Breakouts (Russell 2000)',
    market: 'US',
    currencySymbol: '$',
    stocks: [
      { ticker: 'IREN', name: 'Iris Energy Ltd', sector: 'Next-Gen Data Centers & HPC' },
      { ticker: 'CIFR', name: 'Cipher Mining Inc', sector: 'HPC & Compute Infrastructure' },
      { ticker: 'CLSK', name: 'CleanSpark Inc', sector: 'Data Center Energy & Mining' },
      { ticker: 'IONQ', name: 'IonQ Inc', sector: 'Quantum Computing Hardware' },
      { ticker: 'RGTI', name: 'Rigetti Computing Inc', sector: 'Quantum Computing Systems' },
      { ticker: 'SOUND', name: 'SoundHound AI Inc', sector: 'Voice AI & Conversational Tech' },
      { ticker: 'SERV', name: 'Serve Robotics Inc', sector: 'Autonomous Delivery Robots' },
      { ticker: 'BBAI', name: 'BigBear.ai Holdings', sector: 'AI Analytics & Decision Support' },
      { ticker: 'ACHR', name: 'Archer Aviation Inc', sector: 'eVTOL Urban Air Mobility' },
      { ticker: 'JOBY', name: 'Joby Aviation Inc', sector: 'eVTOL Electric Aircraft' },
      { ticker: 'ASTS', name: 'AST SpaceMobile Inc', sector: 'Space-Based Cellular Broadband' },
      { ticker: 'LUNR', name: 'Intuitive Machines Inc', sector: 'Lunar Exploration & Space Tech' },
      { ticker: 'RKLB', name: 'Rocket Lab USA Inc', sector: 'Orbital Launch & Space Systems' },
      { ticker: 'OPEN', name: 'Opendoor Technologies', sector: 'Digital Residential Real Estate' },
      { ticker: 'STEM', name: 'Stem Inc', sector: 'AI Energy Storage Solutions' },
      { ticker: 'ROOT', name: 'Root Inc', sector: 'AI Telematics Insurance' },
      { ticker: 'UPST', name: 'Upstart Holdings Inc', sector: 'AI Credit Decisioning Platform' },
      { ticker: 'ENVX', name: 'Enovix Corporation', sector: 'Advanced Silicon-Anode Batteries' },
      { ticker: 'MARA', name: 'MARA Holdings Inc', sector: 'Digital Asset Compute & Energy' },
      { ticker: 'RIOT', name: 'Riot Platforms Inc', sector: 'Digital Infrastructure & Power' },
      { ticker: 'VKTX', name: 'Viking Therapeutics', sector: 'Metabolic & Biopharma Drugs' },
      { ticker: 'RXRX', name: 'Recursion Pharmaceuticals', sector: 'AI-Enabled Drug Discovery' },
      { ticker: 'HIMS', name: 'Hims & Hers Health Inc', sector: 'Telehealth & Digital Wellness' },
      { ticker: 'SOUN', name: 'SoundThinking Inc', sector: 'Public Safety Sensing & Acoustic' }
    ]
  },

  // ==========================================
  // 🌐 GLOBAL EQUITIES
  // ==========================================

  globalMidSmall: {
    id: 'global-mid-small',
    name: 'Global Mid & Small Cap Innovators',
    market: 'GLOBAL',
    currencySymbol: '$',
    stocks: [
      { ticker: 'ASML', name: 'ASML Holding NV (Netherlands)', sector: 'Semiconductor Lithography' },
      { ticker: 'TSM', name: 'Taiwan Semiconductor (Taiwan)', sector: 'Advanced Semiconductor Foundry' },
      { ticker: 'ARM', name: 'Arm Holdings plc (UK)', sector: 'Semiconductor Architecture' },
      { ticker: 'BABA', name: 'Alibaba Group (China)', sector: 'E-Commerce & Cloud Computing' },
      { ticker: 'JD', name: 'JD.com Inc (China)', sector: 'Supply Chain & E-Commerce' },
      { ticker: 'PDD', name: 'PDD Holdings Inc (China)', sector: 'Global E-Commerce (Temu)' },
      { ticker: 'SE', name: 'Sea Limited (Singapore)', sector: 'Shopee & Southeast Asia Tech' },
      { ticker: 'MELI', name: 'MercadoLibre Inc (Latin America)', sector: 'E-Commerce & Mercado Pago' },
      { ticker: 'GRAB', name: 'Grab Holdings Ltd (Southeast Asia)', sector: 'Mobility & Delivery SuperApp' },
      { ticker: 'NU', name: 'Nu Holdings Ltd (Brazil)', sector: 'Digital Banking & Nubank' },
      { ticker: 'SPOT', name: 'Spotify Technology SA (Sweden)', sector: 'Digital Music & Audio Media' },
      { ticker: 'SHOP', name: 'Shopify Inc (Canada)', sector: 'Multi-Channel E-Commerce' },
      { ticker: 'SNOW', name: 'Snowflake Inc (Global)', sector: 'Data Cloud & Enterprise Analytics' },
      { ticker: 'BEKE', name: 'KE Holdings Inc (China)', sector: 'Digital Housing & Real Estate' },
      { ticker: 'LI', name: 'Li Auto Inc (China)', sector: 'Smart Electric Vehicles' },
      { ticker: 'NIO', name: 'NIO Inc (China)', sector: 'Smart EV & Battery Swapping' },
      { ticker: 'XPEV', name: 'XPeng Inc (China)', sector: 'Smart EV & Autonomous Tech' },
      { ticker: 'CPNG', name: 'Coupang Inc (South Korea)', sector: 'Fast Delivery & E-Commerce' },
      { ticker: 'INFY', name: 'Infosys Ltd ADR (India/Global)', sector: 'Digital Transformation & Cloud' },
      { ticker: 'SAP', name: 'SAP SE (Germany)', sector: 'Enterprise Resource Planning' },
      { ticker: 'NVO', name: 'Novo Nordisk A/S (Denmark)', sector: 'Pharmaceuticals & GLP-1 Care' },
      { ticker: 'AZN', name: 'AstraZeneca PLC (UK)', sector: 'Biopharma & Oncology Solutions' }
    ]
  },

  // ==========================================
  // 📊 EXCHANGE TRADED FUNDS (ETFs)
  // ==========================================

  etfs: {
    id: 'benchmark-etfs',
    name: 'All Leading ETFs (US, Global & India)',
    market: 'MIXED',
    currencySymbol: '$',
    stocks: [
      { ticker: '^NSEI', name: 'NIFTY 50 Benchmark Index', sector: 'Indian Benchmark' },
      { ticker: '^NSEBANK', name: 'Nifty Bank Index', sector: 'Indian Financials' },
      { ticker: '^GSPC', name: 'S&P 500 Large-Cap Index', sector: 'US Large-Cap' },
      { ticker: '^IXIC', name: 'NASDAQ Composite Tech Index', sector: 'US Technology' },
      { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'US Broad Market' },
      { ticker: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', sector: 'US Tech Leaders' },
      { ticker: 'IWM', name: 'iShares Russell 2000 ETF', sector: 'US Small-Cap Benchmark' },
      { ticker: 'SMH', name: 'VanEck Semiconductor ETF', sector: 'Global Chips' },
      { ticker: 'NIFTYBEES.NS', name: 'Nippon India Nifty BeES ETF', sector: 'Nifty 50 Tracker' },
      { ticker: 'BANKBEES.NS', name: 'Nippon India Bank BeES ETF', sector: 'Nifty Bank Tracker' },
      { ticker: 'MID150BEES.NS', name: 'Nippon India Midcap 150 ETF', sector: 'Nifty Midcap Tracker' },
      { ticker: 'GOLDBEES.NS', name: 'Nippon India Gold BeES ETF', sector: 'Physical Gold Tracker' },
      { ticker: 'ACWI', name: 'iShares MSCI ACWI Global ETF', sector: 'Global All-Country World' },
      { ticker: 'INDA', name: 'iShares MSCI India ETF', sector: 'India Equity USD Tracker' },
      { ticker: 'EEM', name: 'iShares MSCI Emerging Markets', sector: 'Emerging Market Leaders' },
      { ticker: 'ARKK', name: 'ARK Innovation ETF', sector: 'Disruptive Innovation Tech' }
    ]
  },

  indiaETFs: {
    id: 'india-etfs',
    name: 'India ETFs (Nifty, Bank, Gold & Midcap)',
    market: 'NSE',
    currencySymbol: '₹',
    stocks: [
      { ticker: 'NIFTYBEES.NS', name: 'Nippon India Nifty 50 BeES ETF', sector: 'Nifty 50 Large-Cap' },
      { ticker: 'BANKBEES.NS', name: 'Nippon India Bank BeES ETF', sector: 'Nifty Banking Sector' },
      { ticker: 'JUNIORBEES.NS', name: 'Nippon India Nifty Next 50 ETF', sector: 'Nifty Next 50 Growth' },
      { ticker: 'MID150BEES.NS', name: 'Nippon India Nifty Midcap 150 ETF', sector: 'Nifty Midcap 150' },
      { ticker: 'GOLDBEES.NS', name: 'Nippon India Gold BeES ETF', sector: 'Physical Gold Commodity' },
      { ticker: 'SILVERBEES.NS', name: 'Nippon India Silver BeES ETF', sector: 'Physical Silver Commodity' },
      { ticker: 'ITBEES.NS', name: 'Nippon India Nifty IT ETF', sector: 'Information Technology' },
      { ticker: 'AUTOBEES.NS', name: 'Nippon India Nifty Auto ETF', sector: 'Automobile & Transport' },
      { ticker: 'PHARMABEES.NS', name: 'Nippon India Nifty Pharma ETF', sector: 'Pharmaceuticals & Health' },
      { ticker: 'CPSEETF.NS', name: 'CPSE ETF (PSU Index)', sector: 'Central Public Sector Ent.' },
      { ticker: 'MON100.NS', name: 'Motilal Oswal Nasdaq 100 ETF', sector: 'US Tech in INR' },
      { ticker: 'MAFANG.NS', name: 'Mirae Asset NYSE FANG+ ETF', sector: 'US Mega-Cap Tech in INR' },
      { ticker: 'LIQUIDBEES.NS', name: 'Nippon India Liquid BeES ETF', sector: 'Money Market & Cash' }
    ]
  },

  usETFs: {
    id: 'us-etfs',
    name: 'USA Core Indices & Sector SPDR ETFs',
    market: 'US',
    currencySymbol: '$',
    stocks: [
      { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'US Large-Cap Core' },
      { ticker: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', sector: 'US Tech Leaders' },
      { ticker: 'IWM', name: 'iShares Russell 2000 ETF', sector: 'US Small-Cap Benchmark' },
      { ticker: 'DIA', name: 'SPDR Dow Jones Industrial ETF', sector: 'US Bluechip 30' },
      { ticker: 'SMH', name: 'VanEck Semiconductor ETF', sector: 'Global Chips & Equipment' },
      { ticker: 'XLF', name: 'Financial Select Sector SPDR', sector: 'Financials & Banking' },
      { ticker: 'XLE', name: 'Energy Select Sector SPDR Fund', sector: 'Energy & Oil/Gas' },
      { ticker: 'XLK', name: 'Technology Select Sector SPDR', sector: 'Technology & Software' },
      { ticker: 'XLV', name: 'Health Care Select Sector SPDR', sector: 'Healthcare & Pharma' },
      { ticker: 'XLI', name: 'Industrial Select Sector SPDR', sector: 'Industrials & Defense' },
      { ticker: 'XLY', name: 'Consumer Discretionary SPDR', sector: 'Consumer Discretionary' },
      { ticker: 'XLP', name: 'Consumer Staples Select Sector SPDR', sector: 'Consumer Staples & Food' },
      { ticker: 'ARKK', name: 'ARK Innovation ETF', sector: 'Disruptive Innovation' },
      { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', sector: 'US Broad Market' },
      { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', sector: 'US Total Equity Market' },
      { ticker: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', sector: 'High-Dividend Value' },
      { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', sector: 'Long-Term US Treasuries' },
      { ticker: 'GLD', name: 'SPDR Gold Shares Trust', sector: 'Physical Gold Bullion' }
    ]
  },

  globalETFs: {
    id: 'global-etfs',
    name: 'Global & Emerging Market Benchmark ETFs',
    market: 'GLOBAL',
    currencySymbol: '$',
    stocks: [
      { ticker: 'ACWI', name: 'iShares MSCI ACWI ETF', sector: 'All Country World Index' },
      { ticker: 'VT', name: 'Vanguard Total World Stock ETF', sector: 'Global Total Stock Market' },
      { ticker: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', sector: 'Developed Ex-US Equities' },
      { ticker: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', sector: 'Emerging Market Equities' },
      { ticker: 'EEM', name: 'iShares MSCI Emerging Markets ETF', sector: 'Emerging Market Bluechips' },
      { ticker: 'INDA', name: 'iShares MSCI India ETF', sector: 'India Equity USD Benchmark' },
      { ticker: 'EWJ', name: 'iShares MSCI Japan ETF', sector: 'Japan Equities' },
      { ticker: 'FXI', name: 'iShares China Large-Cap ETF', sector: 'China 50 Large-Cap' },
      { ticker: 'MCHI', name: 'iShares MSCI China ETF', sector: 'Broad China Equities' },
      { ticker: 'VGK', name: 'Vanguard FTSE Europe ETF', sector: 'European Equities' },
      { ticker: 'EWT', name: 'iShares MSCI Taiwan ETF', sector: 'Taiwan Equities & Tech' },
      { ticker: 'EWZ', name: 'iShares MSCI Brazil ETF', sector: 'Brazil Equities' },
      { ticker: 'EFA', name: 'iShares MSCI EAFE ETF', sector: 'Europe, Australasia & Far East' },
      { ticker: 'IEMG', name: 'iShares Core MSCI Emerging Markets', sector: 'Core Emerging Markets' }
    ]
  }
};

/**
 * Retrieve array of stocks for given universe key
 */
export function getUniverseList(key = 'nifty50') {
  if (!key) return PRESET_UNIVERSES.nifty50.stocks;

  // Normalization for backward compatibility and various conventions
  const keyMap = {
    'NIFTY_50': 'nifty50',
    'NIFTY_NEXT_50': 'niftyNext50',
    'US_MEGA_TECH': 'usMegaTech',
    'BENCHMARK_ETFS': 'etfs',
    'INDIA_MIDCAP': 'indiaMidcap',
    'INDIA_SMALLCAP': 'indiaSmallcap',
    'US_MIDCAP': 'usMidcap',
    'US_SMALLCAP': 'usSmallcap',
    'GLOBAL_MID_SMALL': 'globalMidSmall',
    'INDIA_ETFS': 'indiaETFs',
    'US_ETFS': 'usETFs',
    'GLOBAL_ETFS': 'globalETFs'
  };

  const normKey = keyMap[key] || key;
  return PRESET_UNIVERSES[normKey]?.stocks || PRESET_UNIVERSES.nifty50.stocks;
}
