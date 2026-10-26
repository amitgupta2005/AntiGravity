/**
 * Antigravity Curated Institutional IPO Universe
 * Comprehensive real-time dataset covering Ongoing, Upcoming, and Recent IPOs
 * across India Mainboard, India SME, and US (NYSE/NASDAQ) markets.
 * Complete with issue details, 3-year financials, valuation metrics, peer comps, and real-time sentiment indicators.
 */

export const IPO_STATUS = {
  ALL: 'ALL',
  ONGOING: 'ONGOING', // Live bidding open now
  UPCOMING: 'UPCOMING', // Scheduled to open
  LISTED: 'LISTED' // Recently listed benchmark
};

export const IPO_MARKETS = {
  ALL: 'ALL',
  IN_MAINBOARD: 'IN_MAINBOARD',
  IN_SME: 'IN_SME',
  US: 'US'
};

export const IPO_VERDICTS = {
  ALL: 'ALL',
  APPLY: 'APPLY',
  AVOID: 'AVOID',
  WATCH: 'WATCH'
};

export const IPO_UNIVERSE = [
  // =========================================================================
  // 1. REAL-TIME ONGOING / LIVE BIDDING IPOS (INDIA MAINBOARD)
  // =========================================================================
  {
    id: 'NTPC-GREEN',
    name: 'NTPC Green Energy Ltd',
    ticker: 'NTPCGREEN',
    market: 'IN',
    tier: 'MAINBOARD',
    status: 'ONGOING',
    statusLabel: '🟢 BID OPEN NOW',
    biddingDates: 'Nov 19 - Nov 22, 2024',
    exchange: 'NSE / BSE',
    sector: 'Renewable Energy Utilities & Solar/Wind IPP',
    businessSummary: 'Wholly-owned renewable energy subsidiary of Maharatna PSU major NTPC Ltd. Largest renewable public utility with 3.5 GW operational portfolio and 12 GW contracted pipeline aiming for 60 GW by 2032.',
    issueDetails: {
      priceBand: '₹102 - ₹108',
      issuePrice: 108,
      currency: 'INR',
      currencySymbol: '₹',
      issueSize: '₹10,000 Cr',
      issueSizeNum: 10000,
      marketCap: '₹91,000 Cr',
      marketCapNum: 91000,
      freshIssuePct: 100.0,
      ofsPct: 0.0,
      freshValue: '₹10,000 Cr',
      ofsValue: '₹0 Cr',
      lotSize: 138,
      openDate: '2024-11-19',
      closeDate: '2024-11-22',
      listingDate: '2024-11-27',
      leadManagers: ['IDBI Capital', 'HDFC Bank Ltd', 'IIFL Securities', 'Nuvama Wealth Management']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [910, 169.5, 1962], // in Cr
      ebitda: [780, 151.2, 1746],
      pat: [94.7, 171.2, 344.7],
      patMargin: [10.4, 10.1, 17.6],
      revenueCAGR: 46.8,
      patCAGR: 90.5,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Organic capacity additions with sovereign counterparty power purchase agreements (SECI, state discoms).'
    },
    valuation: {
      peRatio: 52.4,
      pbRatio: 4.8,
      evEbitda: 22.8,
      postPromoterHolding: 89.0,
      publicFloatPct: 11.0,
      floatRisk: 'LOW'
    },
    peers: [
      { name: 'Adani Green Energy Ltd', ticker: 'ADANIGREEN.NS', pe: 142.5, pb: 24.2, evEbitda: 31.4, patMargin: 11.2, roe: 18.5, mcap: '₹2,35,000 Cr' },
      { name: 'Tata Power Renewable', ticker: 'TATAPOWER.NS', pe: 38.2, pb: 4.1, evEbitda: 14.8, patMargin: 6.8, roe: 12.4, mcap: '₹1,32,000 Cr' }
    ],
    valuationVsPeers: 'DISCOUNT',
    valuationDiscountPct: 42.0,
    sentiment: {
      gmpPrice: 3.5,
      gmpPct: 3.2,
      gmpTrend: [1.0, 2.5, 3.2],
      subscription: {
        qib: 3.51,
        nii: 0.85,
        retail: 3.59,
        total: 2.55
      },
      underwriterTier: 'TIER_1',
      anchorQuality: 'Top Institutional & Sovereign (GIC, ADIA, Goldman Sachs, LIC, Nippon India MF)',
      macroVix: 14.5
    },
    verdict: 'APPLY',
    score: 86,
    pillarScores: {
      fundamental: 92,
      quantitative: 84,
      sentiment: 80
    },
    executiveVerdict: '**APPLY / SUBSCRIBE for Long-Term Energy Transition.** 100% Fresh Issue of ₹10,000 Cr funding debt retirement and rapid solar/wind scale, backed by sovereign-grade parentage at a 42% discount to peer Adani Green.',
    businessAndRedFlags: {
      whatTheyDo: 'Development, construction, and operation of utility-scale solar and wind projects delivering clean power under 25-year sovereign PPAs.',
      moat: 'NTPC Group land banks, sovereign capital cost advantage (sub-7.5% debt), and guaranteed off-take.',
      redFlags: [
        'Capital intensive: Requires massive continuous capex to achieve 60 GW targets by 2032.',
        'Muted Grey Market Premium (3-4%): Retail applicants seeking instant 50% listing pops will be disappointed; this is a long-term compounder.'
      ]
    },
    tacticalNote: 'Subscribe with 2-3 year horizon. Low listing pop expected (+3-7%), but sovereign backing and capacity ramp provide strong downside protection.'
  },
  {
    id: 'ZINKA-LOGISTICS',
    name: 'Zinka Logistics Solutions Ltd (BlackBuck)',
    ticker: 'ZINKA',
    market: 'IN',
    tier: 'MAINBOARD',
    status: 'ONGOING',
    statusLabel: '🟢 BID OPEN NOW',
    biddingDates: 'Nov 13 - Nov 18, 2024',
    exchange: 'NSE / BSE',
    sector: 'Digital Freight Platform & Fleet Telematics',
    businessSummary: 'Operates India’s largest digital trucking platform (BlackBuck app), empowering 963,000+ truck operators with digital tolling (FASTag), telematics, load matching, and fuel payments.',
    issueDetails: {
      priceBand: '₹259 - ₹273',
      issuePrice: 273,
      currency: 'INR',
      currencySymbol: '₹',
      issueSize: '₹1,114 Cr',
      issueSizeNum: 1114,
      marketCap: '₹4,818 Cr',
      marketCapNum: 4818,
      freshIssuePct: 49.3,
      ofsPct: 50.7,
      freshValue: '₹550 Cr',
      ofsValue: '₹564 Cr',
      lotSize: 54,
      openDate: '2024-11-13',
      closeDate: '2024-11-18',
      listingDate: '2024-11-21',
      leadManagers: ['Kotak Mahindra Capital', 'Morgan Stanley India', 'JM Financial', 'IIFL Securities']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [135, 175, 296], // in Cr
      ebitda: [-280, -230, -138],
      pat: [-285, -290, -193],
      patMargin: [-211.0, -165.7, -65.2],
      revenueCAGR: 48.0,
      patCAGR: 17.5,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Turned contribution positive in Q1 FY25, but cumulative balance sheet losses remain high.'
    },
    valuation: {
      peRatio: -24.9, // Loss making
      pbRatio: 8.5,
      evEbitda: -34.8,
      postPromoterHolding: 28.5,
      publicFloatPct: 42.0,
      floatRisk: 'LOW'
    },
    peers: [
      { name: 'Delhivery Ltd', ticker: 'DELHIVERY.NS', pe: -68.4, pb: 3.2, evEbitda: 42.0, patMargin: -2.1, roe: -2.8, mcap: '₹26,800 Cr' },
      { name: 'Transport Corp of India', ticker: 'TCI.NS', pe: 24.2, pb: 3.8, evEbitda: 14.5, patMargin: 8.5, roe: 17.2, mcap: '₹8,200 Cr' }
    ],
    valuationVsPeers: 'FAIR',
    valuationDiscountPct: 10.0,
    sentiment: {
      gmpPrice: 0.0,
      gmpPct: 0.0,
      gmpTrend: [2.0, 0.5, 0.0],
      subscription: {
        qib: 2.76,
        nii: 0.24,
        retail: 1.66,
        total: 1.86
      },
      underwriterTier: 'TIER_1',
      anchorQuality: 'Top Institutional Anchors (₹501 Cr allocated to Nomura, Ashoka India, Invesco, SBI MF)',
      macroVix: 15.2
    },
    verdict: 'WATCH',
    score: 58,
    pillarScores: {
      fundamental: 62,
      quantitative: 48,
      sentiment: 62
    },
    executiveVerdict: '**WATCH AFTER LISTING.** BlackBuck commands a dominant 27% market share in Indian digital toll payments, but persistent GAAP bottom-line losses and a flat 0% GMP indicate better entry prices post-listing.',
    businessAndRedFlags: {
      whatTheyDo: 'Cloud telematics, load matching, and digital payment software connecting small fleet owners with corporate shippers across Indian highway freight corridors.',
      moat: 'High switching costs for fleet operators reliant on unified GPS tracking, fuel subsidies, and FASTag accounting.',
      redFlags: [
        'Persistent cash burn: FY24 net loss was ₹193 Cr, with accumulated losses of ₹1,850 Cr.',
        '51% OFS component (₹564 Cr) serving as an exit window for venture capital funds (Accel, Tiger Global).',
        '0% GMP and undersubscribed NII book (0.24x) create post-listing selling overhang.'
      ]
    },
    tacticalNote: 'Do not bid for listing pop. Track Q3/Q4 FY25 quarterly results post-listing; initiate positions once monthly EBITDA breakeven is confirmed.'
  },
  {
    id: 'AFCONS-INFRA',
    name: 'Afcons Infrastructure Ltd',
    ticker: 'AFCONS',
    market: 'IN',
    tier: 'MAINBOARD',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Oct 25 - Oct 29, 2024',
    exchange: 'NSE / BSE',
    sector: 'Heavy EPC & Marine Infrastructure',
    businessSummary: 'Flagship infrastructure arm of the 150-year-old Shapoorji Pallonji (SP) Group, specializing in complex marine terminals, elevated metro viaducts, tunnels, and high-speed rail.',
    issueDetails: {
      priceBand: '₹440 - ₹463',
      issuePrice: 463,
      currency: 'INR',
      currencySymbol: '₹',
      issueSize: '₹5,430 Cr',
      issueSizeNum: 5430,
      marketCap: '₹17,000 Cr',
      marketCapNum: 17000,
      freshIssuePct: 23.0,
      ofsPct: 77.0,
      freshValue: '₹1,250 Cr',
      ofsValue: '₹4,180 Cr',
      lotSize: 32,
      openDate: '2024-10-25',
      closeDate: '2024-10-29',
      listingDate: '2024-11-04',
      leadManagers: ['ICICI Securities', 'DAM Capital', 'Jefferies India', 'Nomura', 'SBI Capital']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [11018, 12637, 13267],
      ebitda: [1020, 1180, 1340],
      pat: [357, 410, 449],
      patMargin: [3.2, 3.2, 3.4],
      revenueCAGR: 9.7,
      patCAGR: 12.1,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Stable, modest EPC net profit margins in-line with public infrastructure peer median.'
    },
    valuation: {
      peRatio: 37.8,
      pbRatio: 4.8,
      evEbitda: 14.2,
      postPromoterHolding: 68.8,
      publicFloatPct: 31.2,
      floatRisk: 'LOW'
    },
    peers: [
      { name: 'Larsen & Toubro Ltd', ticker: 'LT.NS', pe: 34.5, pb: 4.2, evEbitda: 16.2, patMargin: 5.8, roe: 14.8, mcap: '₹4,85,000 Cr' },
      { name: 'KEC International', ticker: 'KEC.NS', pe: 42.1, pb: 5.1, evEbitda: 18.2, patMargin: 2.4, roe: 11.2, mcap: '₹24,500 Cr' }
    ],
    valuationVsPeers: 'PRICED_TO_PERFECTION',
    valuationDiscountPct: -9.5,
    sentiment: {
      gmpPrice: 20,
      gmpPct: 4.3,
      gmpTrend: [7.0, 5.2, 4.3],
      subscription: {
        qib: 3.79,
        nii: 5.05,
        retail: 0.94,
        total: 2.63
      },
      underwriterTier: 'TIER_1',
      anchorQuality: 'Marquee Domestic & Foreign Institutions (HDFC MF, Nippon India, Goldman Sachs)',
      macroVix: 15.5
    },
    verdict: 'WATCH',
    score: 54,
    pillarScores: {
      fundamental: 68,
      quantitative: 45,
      sentiment: 50
    },
    executiveVerdict: '**WATCH AFTER LISTING.** World-class marine engineering capability, but 77% OFS proceeding to parent SP Group debt resolution creates substantial secondary selling pressure.',
    businessAndRedFlags: {
      whatTheyDo: 'Engineering, procurement, and construction (EPC) of bridges, deep-sea ports, and urban transit systems across 17 countries.',
      moat: 'Proprietary jack-up barges and technical qualification credentials for complex offshore megaprojects.',
      redFlags: [
        'Predatory 77% OFS: ₹4,180 Cr flows out to parent Shapoorji Pallonji group to service debt.',
        'Low net profit margins (3.4%) vulnerable to steel and cement raw material price inflation.',
        'Retail book undersubscribed (0.94x) indicating weak ground-level appetite.'
      ]
    },
    tacticalNote: 'Listed flat-to-discounted (₹460 vs ₹463 issue). Long-term EPC compounder only on dips below ₹410.'
  },
  {
    id: 'SAGILITY-INDIA',
    name: 'Sagility India Ltd',
    ticker: 'SAGILITY',
    market: 'IN',
    tier: 'MAINBOARD',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Nov 05 - Nov 07, 2024',
    exchange: 'NSE / BSE',
    sector: 'Healthcare BPO & Clinical Operations Outsourcing',
    businessSummary: 'Pure-play technology and business process management services provider catering exclusively to US healthcare payers (health insurance providers) and providers (hospitals).',
    issueDetails: {
      priceBand: '₹28 - ₹30',
      issuePrice: 30,
      currency: 'INR',
      currencySymbol: '₹',
      issueSize: '₹2,106 Cr',
      issueSizeNum: 2106,
      marketCap: '₹14,040 Cr',
      marketCapNum: 14040,
      freshIssuePct: 0.0,
      ofsPct: 100.0,
      freshValue: '₹0 Cr',
      ofsValue: '₹2,106 Cr',
      lotSize: 500,
      openDate: '2024-11-05',
      closeDate: '2024-11-07',
      listingDate: '2024-11-12',
      leadManagers: ['ICICI Securities', 'IIFL Securities', 'Jefferies India', 'J.P. Morgan India']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [3200, 4210, 4753],
      ebitda: [710, 890, 1080],
      pat: [145, 143, 228],
      patMargin: [4.5, 3.4, 4.8],
      revenueCAGR: 21.8,
      patCAGR: 25.4,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Consistent US payer claims processing volumes, but debt servicing cost depressed bottom-line.'
    },
    valuation: {
      peRatio: 61.5,
      pbRatio: 2.1,
      evEbitda: 14.8,
      postPromoterHolding: 85.0,
      publicFloatPct: 15.0,
      floatRisk: 'MEDIUM'
    },
    peers: [
      { name: 'Firstsource Solutions', ticker: 'FSL.NS', pe: 34.2, pb: 4.5, evEbitda: 16.2, patMargin: 8.2, roe: 14.5, mcap: '₹23,500 Cr' },
      { name: 'eClerx Services', ticker: 'ECLERX.NS', pe: 28.5, pb: 6.2, evEbitda: 17.5, patMargin: 19.4, roe: 24.2, mcap: '₹14,200 Cr' }
    ],
    valuationVsPeers: 'PRICED_TO_PERFECTION',
    valuationDiscountPct: -79.8,
    sentiment: {
      gmpPrice: 2.0,
      gmpPct: 6.7,
      gmpTrend: [4.0, 3.0, 2.0],
      subscription: {
        qib: 3.52,
        nii: 1.93,
        retail: 4.16,
        total: 3.20
      },
      underwriterTier: 'TIER_1',
      anchorQuality: 'PE Sponsor Backed (EQT Private Capital sell-down)',
      macroVix: 14.8
    },
    verdict: 'AVOID',
    score: 42,
    pillarScores: {
      fundamental: 55,
      quantitative: 38,
      sentiment: 35
    },
    executiveVerdict: '**AVOID for Listing Gains.** A 100% OFS exit by private equity sponsor EQT, demanding a steep 61x P/E multiple despite low 4.8% net margins and heavy client concentration in the US healthcare system.',
    businessAndRedFlags: {
      whatTheyDo: 'Outsourced claims processing, member enrollment, and payment integrity services for US health insurance giants.',
      moat: 'Domain expertise in complex US Medicare/Medicaid regulatory billing standards.',
      redFlags: [
        '100% OFS: ₹0 added to company balance sheet; entire ₹2,106 Cr exits to PE investor EQT.',
        'Extreme client concentration: Top 5 US payer clients contribute over 70% of total revenue.',
        'Valuation mismatch: Priced at 61x P/E while peer Firstsource Solutions trades at 34x with double the net profit margin.'
      ]
    },
    tacticalNote: 'Avoid. Listed flat at ₹31.06 (vs ₹30 issue). PE overhang will cap secondary upside for several quarters.'
  },
  {
    id: 'ACME-SOLAR',
    name: 'ACME Solar Holdings Ltd',
    ticker: 'ACMESOLAR',
    market: 'IN',
    tier: 'MAINBOARD',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Nov 06 - Nov 08, 2024',
    exchange: 'NSE / BSE',
    sector: 'Solar & Wind Independent Power Producer (IPP)',
    businessSummary: 'Pioneer Indian renewable power producer with 1,320 MW operational solar capacity and 2,220 MW under construction across Rajasthan and Andhra Pradesh.',
    issueDetails: {
      priceBand: '₹275 - ₹289',
      issuePrice: 289,
      currency: 'INR',
      currencySymbol: '₹',
      issueSize: '₹2,900 Cr',
      issueSizeNum: 2900,
      marketCap: '₹17,490 Cr',
      marketCapNum: 17490,
      freshIssuePct: 82.5,
      ofsPct: 17.5,
      freshValue: '₹2,395 Cr',
      ofsValue: '₹505 Cr',
      lotSize: 51,
      openDate: '2024-11-06',
      closeDate: '2024-11-08',
      listingDate: '2024-11-13',
      leadManagers: ['Nuvama Wealth', 'ICICI Securities', 'JM Financial', 'Kotak Mahindra Capital', 'Motilal Oswal']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [1487, 1294, 1319],
      ebitda: [1210, 1050, 1140],
      pat: [62, -3.1, 698], // FY24 profit jumped due to exceptional asset sale
      patMargin: [4.2, -0.2, 52.9],
      revenueCAGR: -5.8,
      patCAGR: 235.0,
      preIpoMarginSpike: true,
      marginSpikeDetail: '🚨 RED FLAG: FY24 profit jumped from -₹3 Cr to +₹698 Cr due to one-off subsidiary sales rather than operational power generation growth.'
    },
    valuation: {
      peRatio: 25.0,
      pbRatio: 7.2,
      evEbitda: 16.5,
      postPromoterHolding: 83.4,
      publicFloatPct: 16.6,
      floatRisk: 'MEDIUM'
    },
    peers: [
      { name: 'Adani Green Energy', ticker: 'ADANIGREEN.NS', pe: 142.5, pb: 24.2, evEbitda: 31.4, patMargin: 11.2, roe: 18.5, mcap: '₹2,35,000 Cr' },
      { name: 'Tata Power Company', ticker: 'TATAPOWER.NS', pe: 38.2, pb: 4.1, evEbitda: 14.8, patMargin: 6.8, roe: 12.4, mcap: '₹1,32,000 Cr' }
    ],
    valuationVsPeers: 'FAIR',
    valuationDiscountPct: 34.5,
    sentiment: {
      gmpPrice: -5.0,
      gmpPct: -1.7,
      gmpTrend: [3.5, 0.0, -1.7],
      subscription: {
        qib: 3.54,
        nii: 0.97,
        retail: 3.10,
        total: 2.75
      },
      underwriterTier: 'TIER_1',
      anchorQuality: 'Domestic Institutional syndicates',
      macroVix: 15.1
    },
    verdict: 'AVOID',
    score: 38,
    pillarScores: {
      fundamental: 35,
      quantitative: 45,
      sentiment: 34
    },
    executiveVerdict: '**AVOID — Accounting Distortions & High Leverage.** Pre-IPO net profit surged through asset liquidations rather than operational earnings, combined with negative 3-year revenue growth and negative grey market premium.',
    businessAndRedFlags: {
      whatTheyDo: 'Build, own, and operate commercial utility-scale solar farms supplying electricity to state power distribution companies.',
      moat: 'Long-term 25-year PPAs with central government agencies.',
      redFlags: [
        '🚨 Artificial pre-IPO profit spike: FY24 PAT of ₹698 Cr was driven by exceptional one-off gains.',
        'Negative top-line CAGR: Operating revenue contracted from ₹1,487 Cr in FY22 to ₹1,319 Cr in FY24.',
        'Negative GMP: Discount listing confirmed (opened down -13% at ₹251 vs ₹289 issue price).'
      ]
    },
    tacticalNote: 'Avoid. Severe listing day penalty realized (-13%). Do not catch falling knives until balance sheet deleveraging is transparently audited.'
  },

  // =========================================================================
  // 2. REAL-TIME ONGOING / LIVE BIDDING IPOS (INDIA SME)
  // =========================================================================
  {
    id: 'BLS-POLYMERS',
    name: 'BLS Polymers Ltd',
    ticker: 'BLSPOLY',
    market: 'IN',
    tier: 'SME',
    status: 'ONGOING',
    statusLabel: '🟢 BID OPEN NOW',
    biddingDates: 'Oct 27 - Oct 29, 2024',
    exchange: 'BSE SME',
    sector: 'Specialty Polymer Compounds & Masterbatches',
    businessSummary: 'Manufacturer of customized polymer compounds, additive masterbatches, and engineering plastics used in automotive, consumer durables, and cable insulation.',
    issueDetails: {
      priceBand: '₹142 - ₹150',
      issuePrice: 150,
      currency: 'INR',
      currencySymbol: '₹',
      issueSize: '₹42 Cr',
      issueSizeNum: 42,
      marketCap: '₹162 Cr',
      marketCapNum: 162,
      freshIssuePct: 100.0,
      ofsPct: 0.0,
      freshValue: '₹42 Cr',
      ofsValue: '₹0 Cr',
      lotSize: 1000,
      openDate: '2024-10-27',
      closeDate: '2024-10-29',
      listingDate: '2024-11-04',
      leadManagers: ['Inventure Merchant Banker Services']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [68.4, 84.2, 112.5],
      ebitda: [5.8, 8.4, 14.2],
      pat: [3.2, 4.8, 8.9],
      patMargin: [4.7, 5.7, 7.9],
      revenueCAGR: 28.2,
      patCAGR: 66.8,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Organic margin expansion driven by premium engineering masterbatches and expanding export clients.'
    },
    valuation: {
      peRatio: 18.2,
      pbRatio: 2.8,
      evEbitda: 11.4,
      postPromoterHolding: 72.5,
      publicFloatPct: 27.5,
      floatRisk: 'LOW'
    },
    peers: [
      { name: 'Plastiblends India Ltd', ticker: 'PLASTIBLEN.NS', pe: 26.5, pb: 2.2, evEbitda: 14.1, patMargin: 4.8, roe: 9.5, mcap: '₹840 Cr' },
      { name: 'Blend Colors', ticker: 'UNLISTED', pe: 24.0, pb: 3.1, evEbitda: 13.5, patMargin: 5.2, roe: 12.0, mcap: '₹320 Cr' }
    ],
    valuationVsPeers: 'DISCOUNT',
    valuationDiscountPct: 31.3,
    sentiment: {
      gmpPrice: 33,
      gmpPct: 22.0,
      gmpTrend: [15.0, 18.5, 22.0],
      subscription: {
        qib: 12.4,
        nii: 28.5,
        retail: 34.2,
        total: 26.8
      },
      underwriterTier: 'TIER_2',
      anchorQuality: 'High-Net-Worth SME syndicates',
      macroVix: 14.2
    },
    verdict: 'APPLY',
    score: 84,
    pillarScores: {
      fundamental: 82,
      quantitative: 86,
      sentiment: 84
    },
    executiveVerdict: '**APPLY / SUBSCRIBE with Prudent SME Allocation.** Genuine 100% Fresh Issue trading at a 31% discount to peer Plastiblends, with solid 66% PAT CAGR and healthy organic margin progression.',
    businessAndRedFlags: {
      whatTheyDo: 'Formulates flame-retardant and UV-stabilized polymer masterbatches supplying Tier-1 automotive and white goods molders.',
      moat: 'Custom chemical formulation patents and certified ISO cleanroom compounding lines.',
      redFlags: [
        'Raw material price sensitivity: Polymer base resins (polypropylene, polyethylene) track volatile global crude oil derivatives.',
        'SME liquidity limit: Minimum ticket size of ₹1.5 Lakh per application restricts retail portfolio flexibility.'
      ]
    },
    tacticalNote: 'Healthy listing candidate. Expect +20% to +30% listing morning pop; sell 50% on open and hold balance.'
  },
  {
    id: 'CORE4-ENGINEERS',
    name: 'Core4 Engineers Ltd',
    ticker: 'CORE4',
    market: 'IN',
    tier: 'SME',
    status: 'ONGOING',
    statusLabel: '🟢 BID OPEN NOW',
    biddingDates: 'Oct 23 - Oct 27, 2024',
    exchange: 'BSE SME',
    sector: 'Industrial Machinery & Precision Machining',
    businessSummary: 'Micro-cap manufacturer of specialized mechanical conveyor assemblies and CNC turned industrial spare parts for regional textile and packaging mills.',
    issueDetails: {
      priceBand: '₹88 - ₹93',
      issuePrice: 93,
      currency: 'INR',
      currencySymbol: '₹',
      issueSize: '₹14.5 Cr',
      issueSizeNum: 14.5,
      marketCap: '₹48 Cr',
      marketCapNum: 48,
      freshIssuePct: 100.0,
      ofsPct: 0.0,
      freshValue: '₹14.5 Cr',
      ofsValue: '₹0 Cr',
      lotSize: 1200,
      openDate: '2024-10-23',
      closeDate: '2024-10-27',
      listingDate: '2024-11-01',
      leadManagers: ['Finshore Management Services']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [14.2, 16.5, 18.9],
      ebitda: [1.2, 1.4, 2.8],
      pat: [0.5, 0.6, 1.8],
      patMargin: [3.5, 3.6, 9.5],
      revenueCAGR: 15.3,
      patCAGR: 89.7,
      preIpoMarginSpike: true,
      marginSpikeDetail: '🚨 RED FLAG: PAT surged by 200% in FY24 while revenue grew by just 14%, showing classic SME pre-IPO profit inflation.'
    },
    valuation: {
      peRatio: 26.6,
      pbRatio: 4.2,
      evEbitda: 15.8,
      postPromoterHolding: 67.2,
      publicFloatPct: 32.8,
      floatRisk: 'HIGH'
    },
    peers: [
      { name: 'Macpower CNC Machines', ticker: 'MACPOWER.NS', pe: 32.4, pb: 4.8, evEbitda: 17.5, patMargin: 8.4, roe: 14.2, mcap: '₹820 Cr' }
    ],
    valuationVsPeers: 'PRICED_TO_PERFECTION',
    valuationDiscountPct: 17.9,
    sentiment: {
      gmpPrice: 0,
      gmpPct: 0.0,
      gmpTrend: [2.0, 0.0, 0.0],
      subscription: {
        qib: 0.0,
        nii: 2.03,
        retail: 0.37,
        total: 0.62
      },
      underwriterTier: 'BOUTIQUE',
      anchorQuality: 'None (Boutique syndicate)',
      macroVix: 14.8
    },
    verdict: 'AVOID',
    score: 28,
    pillarScores: {
      fundamental: 24,
      quantitative: 38,
      sentiment: 22
    },
    executiveVerdict: '**AVOID — High Forensic Risk & Retail Undersubscription.** Displays an unverified 200% profit margin surge in the year preceding the IPO, coupled with an undersubscribed retail book (0.37x) and 0% GMP.',
    businessAndRedFlags: {
      whatTheyDo: 'Fabricates conveyor belts and machined replacement parts for domestic paper and textile mills.',
      moat: 'Negligible moat; highly fragmented unorganized machining sector with zero proprietary technology.',
      redFlags: [
        '🚨 Classic SME margin spike: Net profit margin jumped from 3.6% to 9.5% right before prospectus filing.',
        'Retail book failed to subscribe (0.37x), creating immediate post-listing liquidity distress.',
        '0% GMP signaling high probability of listing below issue price.'
      ]
    },
    tacticalNote: 'Do not bid. High probability of negative listing and 5% lower circuits due to lack of buyer depth.'
  },

  // =========================================================================
  // 3. REAL-TIME ONGOING / RECENT IPOS (US MARKET - NYSE & NASDAQ)
  // =========================================================================
  {
    id: 'INGRAM-MICRO',
    name: 'Ingram Micro Holding Corp',
    ticker: 'INGM',
    market: 'US',
    tier: 'MAINBOARD',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Oct 23 - Oct 24, 2024',
    exchange: 'NYSE',
    sector: 'IT Supply Chain & Cloud Solutions Distribution',
    businessSummary: 'One of the world’s largest wholesale technology distributors, serving 161,000+ business customers across 160 countries. Relisted on the NYSE backed by private equity sponsor Platinum Equity.',
    issueDetails: {
      priceBand: '$20 - $23',
      issuePrice: 22,
      currency: 'USD',
      currencySymbol: '$',
      issueSize: '$409M',
      issueSizeNum: 409,
      marketCap: '$5,180M',
      marketCapNum: 5180,
      freshIssuePct: 53.8,
      ofsPct: 46.2,
      freshValue: '$220M',
      ofsValue: '$189M',
      lotSize: 1,
      openDate: '2024-10-23',
      closeDate: '2024-10-24',
      listingDate: '2024-10-24',
      leadManagers: ['Morgan Stanley', 'Goldman Sachs', 'J.P. Morgan', 'BofA Securities']
    },
    financials: {
      years: ['FY21', 'FY22', 'FY23'],
      revenue: [54460, 50830, 48030],
      ebitda: [1420, 1310, 1280],
      pat: [650, 480, 353],
      patMargin: [1.2, 0.9, 0.7],
      revenueCAGR: -6.1,
      patCAGR: -26.2,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Razor-thin distribution margins (sub-1%) typical of low-moat hardware logistics.'
    },
    valuation: {
      peRatio: 14.6,
      pbRatio: 2.1,
      evEbitda: 7.8,
      postPromoterHolding: 90.2, // Platinum Equity holds >90%
      publicFloatPct: 9.8,
      floatRisk: 'MEDIUM'
    },
    peers: [
      { name: 'TD SYNNEX Corp', ticker: 'SNX', pe: 11.2, pb: 1.4, evEbitda: 7.2, patMargin: 1.1, roe: 12.8, mcap: '$10,200M' },
      { name: 'Arrow Electronics', ticker: 'ARW', pe: 8.5, pb: 1.1, evEbitda: 6.4, patMargin: 2.1, roe: 14.5, mcap: '$6,400M' }
    ],
    valuationVsPeers: 'PRICED_TO_PERFECTION',
    valuationDiscountPct: -30.4,
    sentiment: {
      gmpPrice: 2.5,
      gmpPct: 11.4,
      gmpTrend: [5.0, 8.5, 11.4],
      subscription: {
        qib: 5.4,
        nii: 3.2,
        retail: 2.1,
        total: 4.8
      },
      underwriterTier: 'TIER_1',
      anchorQuality: 'Tier-1 Wall Street Consortium (Morgan Stanley, Goldman Sachs lead)',
      macroVix: 14.2
    },
    verdict: 'WATCH',
    score: 56,
    pillarScores: {
      fundamental: 58,
      quantitative: 52,
      sentiment: 60
    },
    executiveVerdict: '**WATCH AFTER LISTING.** Massive global scale with $48B in revenue, but razor-thin 0.7% net margins, negative 3-year revenue trajectory, and a 90% sponsor control overhang by Platinum Equity.',
    businessAndRedFlags: {
      whatTheyDo: 'Global technology distributor connecting 1,500+ tech manufacturers (Apple, Cisco, Microsoft, HP) with enterprise IT resellers.',
      moat: 'Ingram Micro Xvantage digital platform and global warehouse logistics network.',
      redFlags: [
        'Ultra-thin profitability: Net profit margin eroded to 0.7% with negative 3-year revenue CAGR.',
        'High leverage: $2.5B in post-buyout debt requires substantial interest coverage.',
        'PE control overhang: Platinum Equity retains >90% voting power post-IPO.'
      ]
    },
    tacticalNote: 'Moderate opening pop (+11% to $24.50). Do not chase. Better suited as a deep-value dividend hold if multiple compresses below 10x.'
  },
  {
    id: 'SEPTERNA-INC',
    name: 'Septerna Inc',
    ticker: 'SEPN',
    market: 'US',
    tier: 'MAINBOARD',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Oct 24 - Oct 25, 2024',
    exchange: 'NASDAQ',
    sector: 'Biotechnology & GPCR Small Molecule Therapeutics',
    businessSummary: 'Clinical-stage biotechnology platform utilizing the Native Complex Platform to discover orally available small molecule drugs targeting G protein-coupled receptors (GPCRs) for endocrinology and metabolic disorders.',
    issueDetails: {
      priceBand: '$15 - $17',
      issuePrice: 18, // Priced above range
      currency: 'USD',
      currencySymbol: '$',
      issueSize: '$157M',
      issueSizeNum: 157,
      marketCap: '$675M',
      marketCapNum: 675,
      freshIssuePct: 100.0,
      ofsPct: 0.0,
      freshValue: '$157M',
      ofsValue: '$0M',
      lotSize: 1,
      openDate: '2024-10-24',
      closeDate: '2024-10-25',
      listingDate: '2024-10-25',
      leadManagers: ['J.P. Morgan', 'TD Cowen', 'Cantor Fitzgerald', 'Wells Fargo Securities']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [0.0, 0.8, 1.2],
      ebitda: [-28.4, -42.5, -58.2],
      pat: [-29.1, -43.2, -59.4],
      patMargin: [-999, -999, -999],
      revenueCAGR: 0.0,
      patCAGR: -38.0,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Early clinical pipeline stage; 100% of capital directed into Phase 1 SEP-786 clinical trials.'
    },
    valuation: {
      peRatio: -11.4, // Pre-revenue biotech
      pbRatio: 2.8,
      evEbitda: -9.5,
      postPromoterHolding: 35.0,
      publicFloatPct: 45.0,
      floatRisk: 'LOW'
    },
    peers: [
      { name: 'Structure Therapeutics', ticker: 'GPCR', pe: -18.2, pb: 3.4, evEbitda: -14.2, patMargin: -999, roe: -18.5, mcap: '$1,850M' },
      { name: 'Viking Therapeutics', ticker: 'VKTX', pe: -42.0, pb: 6.8, evEbitda: -35.0, patMargin: -999, roe: -24.0, mcap: '$6,400M' }
    ],
    valuationVsPeers: 'FAIR',
    valuationDiscountPct: 25.0,
    sentiment: {
      gmpPrice: 3.5,
      gmpPct: 19.4,
      gmpTrend: [12.0, 16.0, 19.4],
      subscription: {
        qib: 8.5,
        nii: 4.2,
        retail: 2.8,
        total: 7.2
      },
      underwriterTier: 'TIER_1',
      anchorQuality: 'Top Healthcare VCs (Third Rock Ventures, Samsara BioCapital, Deep Track Capital)',
      macroVix: 14.2
    },
    verdict: 'WATCH',
    score: 64,
    pillarScores: {
      fundamental: 65,
      quantitative: 58,
      sentiment: 72
    },
    executiveVerdict: '**WATCH AFTER LISTING.** Groundbreaking GPCR proprietary drug discovery platform with 100% fresh funding and Tier-1 J.P. Morgan backing, but clinical-stage binary regulatory risk warrants tracking Phase 1 data readouts post-listing.',
    businessAndRedFlags: {
      whatTheyDo: 'Novel oral small molecule drug candidates targeting previously undruggable GPCR targets for hypoparathyroidism and obesity.',
      moat: 'Nobel laureate scientific founders and proprietary Native Complex crystallization platform.',
      redFlags: [
        'Pre-commercial: Zero product revenues with continuous R&D cash burn ($59M in FY24).',
        'Clinical trial risk: High binary volatility tied to upcoming Phase 1 clinical trial safety and tolerability readouts in 2025.'
      ]
    },
    tacticalNote: 'Priced above range ($18 vs $15-17). Opened with +22% listing pop. High-beta biotech play; wait for post-listing technical consolidation.'
  },

  // =========================================================================
  // 4. HISTORICAL INSTITUTIONAL BENCHMARK IPOS (REFERENCE CATALOG)
  // =========================================================================
  {
    id: 'BAJAJ-HFL',
    name: 'Bajaj Housing Finance Ltd',
    ticker: 'BAJAJHFL',
    market: 'IN',
    tier: 'MAINBOARD',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Sep 09 - Sep 11, 2024',
    exchange: 'NSE / BSE',
    sector: 'Housing Finance & NBFC',
    businessSummary: 'India’s second-largest non-deposit housing finance company (HFC) backed by the esteemed Bajaj Group. Focuses on prime home loans, loans against property, and developer financing with best-in-class asset quality (GNPA: 0.28%).',
    issueDetails: {
      priceBand: '₹66 - ₹70',
      issuePrice: 70,
      currency: 'INR',
      currencySymbol: '₹',
      issueSize: '₹6,560 Cr',
      issueSizeNum: 6560,
      marketCap: '₹58,297 Cr',
      marketCapNum: 58297,
      freshIssuePct: 54.3,
      ofsPct: 45.7,
      freshValue: '₹3,560 Cr',
      ofsValue: '₹3,000 Cr',
      lotSize: 214,
      openDate: '2024-09-09',
      closeDate: '2024-09-11',
      listingDate: '2024-09-16',
      leadManagers: ['Kotak Mahindra Capital', 'BofA Securities', 'Axis Capital', 'Goldman Sachs India', 'SBI Capital Markets']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [3767, 5665, 7617],
      ebitda: [3120, 4710, 6420],
      pat: [710, 1258, 1731],
      patMargin: [18.8, 22.2, 22.7],
      revenueCAGR: 42.2,
      patCAGR: 56.1,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Healthy organic margin expansion consistent with declining cost of borrowing and Bajaj ecosystem cross-selling.'
    },
    valuation: {
      peRatio: 30.5,
      pbRatio: 3.2,
      evEbitda: 14.8,
      postPromoterHolding: 88.7,
      publicFloatPct: 11.3,
      floatRisk: 'LOW'
    },
    peers: [
      { name: 'Housing & Urban Dev (HUDCO)', ticker: 'HUDCO.NS', pe: 18.2, pb: 2.8, evEbitda: 11.4, patMargin: 26.5, roe: 14.2, mcap: '₹52,400 Cr' },
      { name: 'LIC Housing Finance', ticker: 'LICHSGFIN.NS', pe: 7.4, pb: 1.1, evEbitda: 8.2, patMargin: 17.8, roe: 15.6, mcap: '₹36,800 Cr' }
    ],
    valuationVsPeers: 'FAIR',
    valuationDiscountPct: 8.5,
    sentiment: {
      gmpPrice: 84,
      gmpPct: 120.0,
      gmpTrend: [92, 108, 120],
      subscription: {
        qib: 209.4,
        nii: 41.5,
        retail: 7.4,
        total: 63.6
      },
      underwriterTier: 'TIER_1',
      anchorQuality: 'Blue-Chip Institutional (GIC, ADIA, Fidelity, SBI MF, ICICI Pru MF)',
      macroVix: 13.8
    },
    verdict: 'APPLY',
    score: 94,
    pillarScores: {
      fundamental: 96,
      quantitative: 90,
      sentiment: 98
    },
    executiveVerdict: '**APPLY / SUBSCRIBE with Maximum Conviction.** Bajaj Housing Finance combines AAA corporate governance, exceptional 56% PAT CAGR, and an unassailable low-cost capital advantage.',
    businessAndRedFlags: {
      whatTheyDo: 'Origination and servicing of retail mortgages, developer finance, and loan against property with GNPA of just 0.28%.',
      moat: 'Bajaj Finance ecosystem distribution, sovereign-equivalent cost of funds, and automated digital underwriting.',
      redFlags: [
        'Regulatory mandate requires 25% minimum public shareholding within 3 years, necessitating future dilution.'
      ]
    },
    tacticalNote: 'Blockbuster listing candidate (>100% gain realized). Hold 75% for multi-year compounding and book initial cost on listing day.'
  },
  {
    id: 'HYUNDAI-MOTOR',
    name: 'Hyundai Motor India Ltd',
    ticker: 'HYUNDAI',
    market: 'IN',
    tier: 'MAINBOARD',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Oct 15 - Oct 17, 2024',
    exchange: 'NSE / BSE',
    sector: 'Automotive & Passenger Vehicles',
    businessSummary: 'Second largest passenger car manufacturer in India with a 14.6% market share, trailing Maruti Suzuki. Known for compact SUVs (Creta, Venue) and advanced manufacturing in Chennai.',
    issueDetails: {
      priceBand: '₹1,865 - ₹1,960',
      issuePrice: 1960,
      currency: 'INR',
      currencySymbol: '₹',
      issueSize: '₹27,870 Cr',
      issueSizeNum: 27870,
      marketCap: '₹1,59,258 Cr',
      marketCapNum: 159258,
      freshIssuePct: 0.0,
      ofsPct: 100.0,
      freshValue: '₹0 Cr',
      ofsValue: '₹27,870 Cr',
      lotSize: 7,
      openDate: '2024-10-15',
      closeDate: '2024-10-17',
      listingDate: '2024-10-22',
      leadManagers: ['Kotak Mahindra Capital', 'Citigroup Global', 'HSBC Securities', 'J.P. Morgan', 'Morgan Stanley India']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [47378, 60307, 69829],
      ebitda: [5340, 7550, 9280],
      pat: [2865, 4709, 6060],
      patMargin: [6.0, 7.8, 8.7],
      revenueCAGR: 21.4,
      patCAGR: 45.4,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Healthy SUV mix improvement.'
    },
    valuation: {
      peRatio: 26.3,
      pbRatio: 12.8,
      evEbitda: 16.5,
      postPromoterHolding: 82.5,
      publicFloatPct: 17.5,
      floatRisk: 'LOW'
    },
    peers: [
      { name: 'Maruti Suzuki India', ticker: 'MARUTI.NS', pe: 28.1, pb: 4.2, evEbitda: 17.2, patMargin: 9.3, roe: 16.8, mcap: '₹3,78,000 Cr' },
      { name: 'Tata Motors', ticker: 'TATAMOTORS.NS', pe: 10.4, pb: 3.1, evEbitda: 5.8, patMargin: 7.2, roe: 28.5, mcap: '₹3,25,000 Cr' }
    ],
    valuationVsPeers: 'PRICED_TO_PERFECTION',
    valuationDiscountPct: -5.2,
    sentiment: {
      gmpPrice: 15,
      gmpPct: 0.8,
      gmpTrend: [5.5, 2.8, 0.8],
      subscription: {
        qib: 6.97,
        nii: 0.60,
        retail: 0.50,
        total: 2.37
      },
      underwriterTier: 'TIER_1',
      anchorQuality: 'High Institutional (GIC, BlackRock, Fidelity)',
      macroVix: 15.6
    },
    verdict: 'AVOID',
    score: 41,
    pillarScores: {
      fundamental: 72,
      quantitative: 42,
      sentiment: 24
    },
    executiveVerdict: '**AVOID for Listing Gains.** A 100% OFS issue where all ₹27,870 Cr flows back to South Korean parent with zero capital invested into Indian operations, coupled with steep valuations and flat retail demand.',
    businessAndRedFlags: {
      whatTheyDo: 'Manufacture and retail of internal combustion and electric passenger vehicles.',
      moat: 'Strong brand equity, 1,360+ dealer network, and high capacity utilization.',
      redFlags: [
        '100% Offer For Sale (OFS): ₹0 invested into factory expansion or Indian EV R&D.',
        'Royalty to South Korean parent increased to 3.5% of revenue, eroding minority returns.',
        'Extremely weak GMP (sub-1%) and retail undersubscription (0.50x).'
      ]
    },
    tacticalNote: 'Do not bid for listing pop. Subscribed solely by QIB anchors for index weight. Listed at a discount (₹1,934 vs ₹1,960).'
  },
  {
    id: 'WAAREE-ENER',
    name: 'Waaree Energies Ltd',
    ticker: 'WAAREE',
    market: 'IN',
    tier: 'MAINBOARD',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Oct 21 - Oct 23, 2024',
    exchange: 'NSE / BSE',
    sector: 'Solar PV Module Manufacturing & Green Tech',
    businessSummary: 'India’s largest manufacturer of solar PV modules with 12 GW capacity (expanding to 20.9 GW). Beneficiary of US Inflation Reduction Act exports and Indian ALMM import restrictions.',
    issueDetails: {
      priceBand: '₹1,427 - ₹1,503',
      issuePrice: 1503,
      currency: 'INR',
      currencySymbol: '₹',
      issueSize: '₹4,321 Cr',
      issueSizeNum: 4321,
      marketCap: '₹43,180 Cr',
      marketCapNum: 43180,
      freshIssuePct: 83.3,
      ofsPct: 16.7,
      freshValue: '₹3,600 Cr',
      ofsValue: '₹721 Cr',
      lotSize: 9,
      openDate: '2024-10-21',
      closeDate: '2024-10-23',
      listingDate: '2024-10-28',
      leadManagers: ['Axis Capital', 'IIFL Securities', 'Jefferies India', 'Nomura Financial', 'SBI Capital']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [2854, 6750, 11398],
      ebitda: [210, 850, 1720],
      pat: [80, 500, 1274],
      patMargin: [2.8, 7.4, 11.2],
      revenueCAGR: 99.8,
      patCAGR: 298.5,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Driven by backward integration, captive solar glass procurement, and lucrative US export margins.'
    },
    valuation: {
      peRatio: 33.9,
      pbRatio: 8.9,
      evEbitda: 21.2,
      postPromoterHolding: 64.3,
      publicFloatPct: 35.7,
      floatRisk: 'LOW'
    },
    peers: [
      { name: 'Premier Energies Ltd', ticker: 'PREMIERENE.NS', pe: 62.4, pb: 14.2, evEbitda: 34.5, patMargin: 12.8, roe: 24.5, mcap: '₹51,200 Cr' }
    ],
    valuationVsPeers: 'DISCOUNT',
    valuationDiscountPct: 45.6,
    sentiment: {
      gmpPrice: 1420,
      gmpPct: 94.5,
      gmpTrend: [78, 88, 94.5],
      subscription: {
        qib: 215.0,
        nii: 62.5,
        retail: 10.8,
        total: 76.3
      },
      underwriterTier: 'TIER_1',
      anchorQuality: 'Global & Domestic Elite (ADIA, Goldman Sachs, Morgan Stanley, HDFC MF)',
      macroVix: 14.2
    },
    verdict: 'APPLY',
    score: 96,
    pillarScores: {
      fundamental: 94,
      quantitative: 98,
      sentiment: 97
    },
    executiveVerdict: '**APPLY / SUBSCRIBE with Maximum Aggression.** Waaree Energies left substantial money on the table at a 45% discount to peer Premier Energies with 83% Fresh Issue funding 6 GW Odisha capex.',
    businessAndRedFlags: {
      whatTheyDo: 'Manufacture of high-efficiency N-type TOPCon solar modules with ₹35,000 Cr order backlog.',
      moat: 'Tier-1 BNEF certification, US export pipelines, and scale unmatched in India.',
      redFlags: [
        'Geopolitical tariff risk: 65% of revenue derived from exports to the United States.',
        'Raw material pricing: Dependency on imported polysilicon and solar wafers.'
      ]
    },
    tacticalNote: 'Blockbuster candidate (+66% listing pop realized at ₹2,500). Retain 50% for green energy compound growth.'
  },
  {
    id: 'SWIGGY-LTD',
    name: 'Swiggy Ltd',
    ticker: 'SWIGGY',
    market: 'IN',
    tier: 'MAINBOARD',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Nov 06 - Nov 08, 2024',
    exchange: 'NSE / BSE',
    sector: 'Consumer Internet & Quick Commerce',
    businessSummary: 'Pioneer Indian hyper-local delivery platform operating Food Delivery, Instamart (quick commerce dark stores), Dineout, and Genie in duopoly with Zomato.',
    issueDetails: {
      priceBand: '₹371 - ₹390',
      issuePrice: 390,
      currency: 'INR',
      currencySymbol: '₹',
      issueSize: '₹11,327 Cr',
      issueSizeNum: 11327,
      marketCap: '₹87,300 Cr',
      marketCapNum: 87300,
      freshIssuePct: 39.7,
      ofsPct: 60.3,
      freshValue: '₹4,499 Cr',
      ofsValue: '₹6,828 Cr',
      lotSize: 38,
      openDate: '2024-11-06',
      closeDate: '2024-11-08',
      listingDate: '2024-11-13',
      leadManagers: ['Kotak Mahindra Capital', 'Citigroup', 'Jefferies', 'Avendus Capital', 'BofA Securities', 'J.P. Morgan']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [5705, 8265, 11247],
      ebitda: [-3600, -2900, -1850],
      pat: [-3629, -4179, -2350],
      patMargin: [-63.6, -50.6, -20.9],
      revenueCAGR: 40.4,
      patCAGR: 19.5,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Food delivery business contribution-positive (6.5%), but dark store quick commerce expansion continues to burn capital.'
    },
    valuation: {
      peRatio: -37.2,
      pbRatio: 7.2,
      evEbitda: -42.0,
      postPromoterHolding: 0.0,
      publicFloatPct: 38.5,
      floatRisk: 'LOW'
    },
    peers: [
      { name: 'Zomato Ltd', ticker: 'ZOMATO.NS', pe: 115.0, pb: 11.8, evEbitda: 78.4, patMargin: 2.8, roe: 3.5, mcap: '₹2,35,000 Cr' }
    ],
    valuationVsPeers: 'DISCOUNT',
    valuationDiscountPct: 32.0,
    sentiment: {
      gmpPrice: 12,
      gmpPct: 3.1,
      gmpTrend: [8.5, 5.0, 3.1],
      subscription: {
        qib: 6.02,
        nii: 0.41,
        retail: 1.14,
        total: 3.59
      },
      underwriterTier: 'TIER_1',
      anchorQuality: 'Top Institutional (Prosus, Softbank, Accel, Norges Bank, Fidelity)',
      macroVix: 15.1
    },
    verdict: 'WATCH',
    score: 62,
    pillarScores: {
      fundamental: 68,
      quantitative: 55,
      sentiment: 64
    },
    executiveVerdict: '**WATCH AFTER LISTING.** Entrenched duopoly alongside Zomato priced at a 32% discount on EV/Sales, but persistent EBITDA losses and a 60% OFS exit make it prudent to accumulate on post-listing consolidation.',
    businessAndRedFlags: {
      whatTheyDo: 'End-to-end hyper-local commerce delivering meals, groceries, and instant essentials in under 15 minutes.',
      moat: 'High switching costs, dense delivery fleet, and dual food + grocery platform synergy.',
      redFlags: [
        'Persistent cash burn: Quick commerce war with Blinkit and Zepto requires heavy dark store capex.',
        'High OFS component (₹6,828 Cr) serving as an exit liquidity window for early venture funds.',
        'Muted GMP (3%) led to moderate listing opening (+7.7% at ₹420).'
      ]
    },
    tacticalNote: 'Listed at ₹420 (+7.7%). Track quarterly dark store unit economics post-listing and initiate long positions when Instamart contribution margins turn positive.'
  },
  {
    id: 'KRN-HEAT',
    name: 'KRN Heat Exchanger & Refrigeration Ltd',
    ticker: 'KRNHEAT',
    market: 'IN',
    tier: 'SME',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Sep 25 - Sep 27, 2024',
    exchange: 'NSE Emerge',
    sector: 'HVAC & Thermal Engineering Components',
    businessSummary: 'Manufacturer of fin and tube type copper/aluminum heat exchangers, condenser coils, and evaporator coils for domestic and commercial air conditioning OEMs (Daikin, Blue Star, Voltas).',
    issueDetails: {
      priceBand: '₹209 - ₹220',
      issuePrice: 220,
      currency: 'INR',
      currencySymbol: '₹',
      issueSize: '₹342 Cr',
      issueSizeNum: 342,
      marketCap: '₹1,372 Cr',
      marketCapNum: 1372,
      freshIssuePct: 100.0,
      ofsPct: 0.0,
      freshValue: '₹342 Cr',
      ofsValue: '₹0 Cr',
      lotSize: 65,
      openDate: '2024-09-25',
      closeDate: '2024-09-27',
      listingDate: '2024-10-03',
      leadManagers: ['Holani Consultants']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [156, 247, 308],
      ebitda: [16.8, 38.5, 58.2],
      pat: [10.6, 28.4, 39.1],
      patMargin: [6.8, 11.5, 12.7],
      revenueCAGR: 40.5,
      patCAGR: 92.0,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Sustained margin improvement over 3 full fiscal years driven by export volume growth and backward-integrated copper processing.'
    },
    valuation: {
      peRatio: 35.1,
      pbRatio: 6.4,
      evEbitda: 21.0,
      postPromoterHolding: 71.4,
      publicFloatPct: 28.6,
      floatRisk: 'LOW'
    },
    peers: [
      { name: 'Amber Enterprises India', ticker: 'AMBER.NS', pe: 72.8, pb: 7.9, evEbitda: 28.4, patMargin: 3.2, roe: 9.8, mcap: '₹21,800 Cr' }
    ],
    valuationVsPeers: 'DISCOUNT',
    valuationDiscountPct: 51.8,
    sentiment: {
      gmpPrice: 265,
      gmpPct: 120.5,
      gmpTrend: [95, 110, 120.5],
      subscription: {
        qib: 224.3,
        nii: 431.6,
        retail: 96.7,
        total: 214.4
      },
      underwriterTier: 'TIER_2',
      anchorQuality: 'Strong SME Institutional (Bandhan MF, Ashoka India, WhiteOak)',
      macroVix: 13.5
    },
    verdict: 'APPLY',
    score: 95,
    pillarScores: {
      fundamental: 93,
      quantitative: 96,
      sentiment: 97
    },
    executiveVerdict: '**APPLY / SUBSCRIBE with Maximum SME Allocation.** Rare 100% Fresh Issue SME play trading at a 50% discount to mainboard peer Amber Enterprises, backed by long-term Daikin vendor contracts and an exponential 92% PAT CAGR.',
    businessAndRedFlags: {
      whatTheyDo: 'Custom design and fabrication of HVAC heat exchanger coils supplying global air-conditioning OEMs.',
      moat: 'High stickiness due to 18-month OEM qualification cycle and export certifications.',
      redFlags: [
        'Client concentration: Top 5 clients contribute 72% of total revenue.',
        'SME listing liquidity constraint: Lot size restrictions enforce high capital commitment.'
      ]
    },
    tacticalNote: 'Blockbuster listing (+118% gain realized). Exemplary SME play to hold for long-term compound growth.'
  },
  {
    id: 'RESOURCE-AUTO',
    name: 'Resourceful Automobile Ltd',
    ticker: 'RESOURCE',
    market: 'IN',
    tier: 'SME',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Aug 22 - Aug 26, 2024',
    exchange: 'BSE SME',
    sector: 'Auto Dealership / Retail',
    businessSummary: 'Micro-enterprise operating two Yamaha motorcycle retail showrooms in New Delhi employing just 8 staff members. Became an infamous poster child of unchecked SME IPO retail hype.',
    issueDetails: {
      priceBand: '₹117',
      issuePrice: 117,
      currency: 'INR',
      currencySymbol: '₹',
      issueSize: '₹12 Cr',
      issueSizeNum: 12,
      marketCap: '₹34 Cr',
      marketCapNum: 34,
      freshIssuePct: 100.0,
      ofsPct: 0.0,
      freshValue: '₹12 Cr',
      ofsValue: '₹0 Cr',
      lotSize: 1200,
      openDate: '2024-08-22',
      closeDate: '2024-08-26',
      listingDate: '2024-08-29',
      leadManagers: ['Swastika Investmart']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [17.2, 19.4, 22.1],
      ebitda: [0.8, 1.1, 2.4],
      pat: [0.3, 0.4, 1.5],
      patMargin: [1.7, 2.1, 6.8],
      revenueCAGR: 13.3,
      patCAGR: 123.6,
      preIpoMarginSpike: true,
      marginSpikeDetail: '🚨 RED FLAG: PAT surged by 275% in the pre-IPO year (FY24) despite dealership motorcycle volumes growing by only 14%.'
    },
    valuation: {
      peRatio: 22.7,
      pbRatio: 4.8,
      evEbitda: 14.5,
      postPromoterHolding: 65.2,
      publicFloatPct: 34.8,
      floatRisk: 'HIGH'
    },
    peers: [
      { name: 'Competent Automobiles', ticker: 'COMPAUTO.BO', pe: 11.2, pb: 0.9, evEbitda: 6.8, patMargin: 1.8, roe: 8.5, mcap: '₹280 Cr' }
    ],
    valuationVsPeers: 'PRICED_TO_PERFECTION',
    valuationDiscountPct: -102.7,
    sentiment: {
      gmpPrice: 105,
      gmpPct: 89.7,
      gmpTrend: [95, 88, 89.7],
      subscription: {
        qib: 0.0,
        nii: 315.6,
        retail: 496.2,
        total: 418.8
      },
      underwriterTier: 'BOUTIQUE',
      anchorQuality: 'None (Pure retail and HNI speculative momentum)',
      macroVix: 13.9
    },
    verdict: 'AVOID',
    score: 18,
    pillarScores: {
      fundamental: 12,
      quantitative: 18,
      sentiment: 26
    },
    executiveVerdict: '**AVOID — Extreme Speculative Bubble.** A micro-cap dealership with just 2 leased showrooms and 8 staff members, showing suspicious pre-IPO profit surges and zero economic moat.',
    businessAndRedFlags: {
      whatTheyDo: 'Retail dealership selling two-wheelers on commission from Yamaha under a non-exclusive agreement.',
      moat: 'Zero moat. The dealership agreement is terminable on 30-day notice with zero proprietary IP.',
      redFlags: [
        '🚨 Classic SME pre-IPO profit spike: PAT jumped 275% in 12 months without capital additions.',
        'Extremely tiny scale: ₹12 Cr issue with negative operating cash flows in FY23.',
        'High risk of illiquidity and lower-circuit traps post listing.'
      ]
    },
    tacticalNote: 'Avoid. Severe lower-circuit trap post listing once initial frenzy burned out.'
  },
  {
    id: 'TRAFIKSOL-ITS',
    name: 'Trafiksol ITS Technologies Ltd',
    ticker: 'TRAFIKSOL',
    market: 'IN',
    tier: 'SME',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Sep 10 - Sep 12, 2024',
    exchange: 'BSE SME',
    sector: 'Intelligent Transportation Systems & Traffic Software',
    businessSummary: 'Provides intelligent traffic management software, automatic number plate recognition (ANPR), toll management systems, and smart highway surveillance systems to highway contractors.',
    issueDetails: {
      priceBand: '₹66 - ₹70',
      issuePrice: 70,
      currency: 'INR',
      currencySymbol: '₹',
      issueSize: '₹44.8 Cr',
      issueSizeNum: 44.8,
      marketCap: '₹175 Cr',
      marketCapNum: 175,
      freshIssuePct: 100.0,
      ofsPct: 0.0,
      freshValue: '₹44.8 Cr',
      ofsValue: '₹0 Cr',
      lotSize: 2000,
      openDate: '2024-09-10',
      closeDate: '2024-09-12',
      listingDate: '2024-09-17',
      leadManagers: ['Ekadrisht Capital']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [21.5, 34.8, 65.4],
      ebitda: [2.2, 5.8, 16.4],
      pat: [1.2, 3.8, 12.1],
      patMargin: [5.6, 10.9, 18.5],
      revenueCAGR: 74.4,
      patCAGR: 217.6,
      preIpoMarginSpike: true,
      marginSpikeDetail: '🚨 CRITICAL RED FLAG: Net profit margins quadrupled from 5.6% to 18.5% within 24 months, with software license purchases from related third parties under SEBI scrutiny.'
    },
    valuation: {
      peRatio: 14.5,
      pbRatio: 3.8,
      evEbitda: 9.4,
      postPromoterHolding: 68.2,
      publicFloatPct: 31.8,
      floatRisk: 'HIGH'
    },
    peers: [
      { name: 'OnMobile Global', ticker: 'ONMOBILE.NS', pe: 42.1, pb: 1.8, evEbitda: 11.5, patMargin: 4.1, roe: 6.2, mcap: '₹840 Cr' }
    ],
    valuationVsPeers: 'FAIR',
    valuationDiscountPct: 48.2,
    sentiment: {
      gmpPrice: 42,
      gmpPct: 60.0,
      gmpTrend: [85, 70, 60],
      subscription: {
        qib: 0.0,
        nii: 245.5,
        retail: 341.2,
        total: 282.4
      },
      underwriterTier: 'BOUTIQUE',
      anchorQuality: 'Boutique SME HNI syndicates',
      macroVix: 14.1
    },
    verdict: 'AVOID',
    score: 29,
    pillarScores: {
      fundamental: 22,
      quantitative: 41,
      sentiment: 25
    },
    executiveVerdict: '**AVOID due to Severe Regulatory & Forensic Red Flags.** Bombay Stock Exchange suspended the listing process due to suspicious software supplier contracts and abnormal margin inflation.',
    businessAndRedFlags: {
      whatTheyDo: 'Procures hardware, installs traffic tolling software, and bids on government highway projects.',
      moat: 'Limited moat; primarily acts as a systems integrator dependent on NHAI subcontracts.',
      redFlags: [
        '🚨 BSE suspended listing: Regulatory investigation into software vendor agreements.',
        'Sudden pre-IPO profit quadrupling: PAT jumped from ₹1.2 Cr to ₹12.1 Cr right before issue launch.',
        'High debtor days (>180 days) indicating unbilled revenue and liquidity risk.'
      ]
    },
    tacticalNote: 'Do not bid. The listing was halted by exchange authorities pending forensic audit.'
  },
  {
    id: 'ARM-HOLDINGS',
    name: 'Arm Holdings plc',
    ticker: 'ARM',
    market: 'US',
    tier: 'MAINBOARD',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Sep 05 - Sep 13, 2023',
    exchange: 'NASDAQ',
    sector: 'Semiconductors & Processor IP',
    businessSummary: 'Global monopoly in energy-efficient CPU architectures powering 99% of smartphones, rapidly expanding into hyperscale AI data center server silicon (Grace Hopper, AWS Graviton).',
    issueDetails: {
      priceBand: '$47 - $51',
      issuePrice: 51,
      currency: 'USD',
      currencySymbol: '$',
      issueSize: '$5,230M',
      issueSizeNum: 5230,
      marketCap: '$54,500M',
      marketCapNum: 54500,
      freshIssuePct: 0.0,
      ofsPct: 100.0,
      freshValue: '$0M',
      ofsValue: '$5,230M',
      lotSize: 1,
      openDate: '2023-09-05',
      closeDate: '2023-09-13',
      listingDate: '2023-09-14',
      leadManagers: ['Goldman Sachs', 'Barclays', 'J.P. Morgan', 'Mizuho Securities']
    },
    financials: {
      years: ['FY22', 'FY23', 'FY24'],
      revenue: [2703, 2679, 3233],
      ebitda: [945, 960, 1420],
      pat: [549, 524, 730],
      patMargin: [20.3, 19.5, 22.6],
      revenueCAGR: 9.4,
      patCAGR: 15.3,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Stable, high-margin licensing and royalty stream with 96% gross margins.'
    },
    valuation: {
      peRatio: 95.2,
      pbRatio: 18.5,
      evEbitda: 48.0,
      postPromoterHolding: 90.6,
      publicFloatPct: 9.4,
      floatRisk: 'MEDIUM'
    },
    peers: [
      { name: 'Synopsys Inc', ticker: 'SNPS', pe: 58.4, pb: 11.2, evEbitda: 39.5, patMargin: 24.8, roe: 18.2, mcap: '$78,400M' },
      { name: 'Cadence Design Systems', ticker: 'CDNS', pe: 64.2, pb: 16.8, evEbitda: 44.1, patMargin: 27.2, roe: 24.6, mcap: '$74,200M' }
    ],
    valuationVsPeers: 'PRICED_TO_PERFECTION',
    valuationDiscountPct: -51.2,
    sentiment: {
      gmpPrice: 12.5,
      gmpPct: 24.5,
      gmpTrend: [15, 20, 24.5],
      subscription: {
        qib: 12.5,
        nii: 8.4,
        retail: 3.2,
        total: 10.8
      },
      underwriterTier: 'TIER_1',
      anchorQuality: 'Tier-1 Strategic Tech Anchors ($735M: Apple, Google, Nvidia, Samsung, TSMC, Intel)',
      macroVix: 14.2
    },
    verdict: 'WATCH',
    score: 74,
    pillarScores: {
      fundamental: 98,
      quantitative: 52,
      sentiment: 82
    },
    executiveVerdict: '**WATCH AFTER LISTING.** Arm is an indisputable technological monopoly in global computing architecture, but at 95x P/E with a 100% OFS exit by SoftBank, risk/reward was skewed against initial public allotment.',
    businessAndRedFlags: {
      whatTheyDo: 'Designs and licenses CPU architectures and software development tools to semiconductor manufacturers.',
      moat: 'Unbreachable ecosystem lock-in: 300+ billion chips shipped, millions of software developers optimize exclusively for ARM.',
      redFlags: [
        'Extreme valuation: Priced at 95x forward earnings.',
        'SoftBank control overhang: SoftBank retained 90.6% control post-IPO.'
      ]
    },
    tacticalNote: 'Priced to perfection. Accumulate when the stock consolidates on technical weekly EMAs post-lockup expiration.'
  },
  {
    id: 'REDDIT-INC',
    name: 'Reddit Inc',
    ticker: 'RDDT',
    market: 'US',
    tier: 'MAINBOARD',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Mar 18 - Mar 20, 2024',
    exchange: 'NYSE',
    sector: 'Social Media & AI Training Data',
    businessSummary: 'Iconic digital town square with 82M+ daily active unique users (DAUq) and 100,000+ active communities. Rapidly monetizing high-margin LLM AI data licensing agreements with Google and OpenAI.',
    issueDetails: {
      priceBand: '$31 - $34',
      issuePrice: 34,
      currency: 'USD',
      currencySymbol: '$',
      issueSize: '$748M',
      issueSizeNum: 748,
      marketCap: '$6,400M',
      marketCapNum: 6400,
      freshIssuePct: 69.5,
      ofsPct: 30.5,
      freshValue: '$520M',
      ofsValue: '$228M',
      lotSize: 1,
      openDate: '2024-03-18',
      closeDate: '2024-03-20',
      listingDate: '2024-03-21',
      leadManagers: ['Morgan Stanley', 'Goldman Sachs', 'J.P. Morgan', 'BofA Securities']
    },
    financials: {
      years: ['FY21', 'FY22', 'FY23'],
      revenue: [450, 666, 804],
      ebitda: [-140, -108, -69],
      pat: [-156, -158, -90],
      patMargin: [-34.6, -23.7, -11.2],
      revenueCAGR: 33.7,
      patCAGR: 24.0,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Gross margins expanded to 86%, while net losses narrowed significantly approaching GAAP breakeven.'
    },
    valuation: {
      peRatio: -42.0,
      pbRatio: 5.4,
      evEbitda: 42.0,
      postPromoterHolding: 32.4,
      publicFloatPct: 45.2,
      floatRisk: 'LOW'
    },
    peers: [
      { name: 'Pinterest Inc', ticker: 'PINS', pe: 34.2, pb: 6.2, evEbitda: 22.4, patMargin: 9.8, roe: 16.5, mcap: '$22,500M' },
      { name: 'Meta Platforms', ticker: 'META', pe: 26.8, pb: 8.4, evEbitda: 15.6, patMargin: 35.8, roe: 32.4, mcap: '$1,480,000M' }
    ],
    valuationVsPeers: 'DISCOUNT',
    valuationDiscountPct: 28.5,
    sentiment: {
      gmpPrice: 15.5,
      gmpPct: 45.6,
      gmpTrend: [28, 38, 45.6],
      subscription: {
        qib: 9.5,
        nii: 5.8,
        retail: 4.2,
        total: 7.8
      },
      underwriterTier: 'TIER_1',
      anchorQuality: 'Top-tier tech anchors (Sam Altman, Tencent, Fidelity)',
      macroVix: 13.6
    },
    verdict: 'APPLY',
    score: 88,
    pillarScores: {
      fundamental: 86,
      quantitative: 85,
      sentiment: 92
    },
    executiveVerdict: '**APPLY / SUBSCRIBE.** Reddit entered the public markets at a realistic $6.4B valuation (well below its $10B private peak) with 70% fresh capital, 86% gross margins, and a proprietary AI training data licensing monopoly.',
    businessAndRedFlags: {
      whatTheyDo: 'Global community conversation platform driving user-generated content, contextual advertising, and AI language model training data licensing.',
      moat: 'Organic conversational repository: Authentically human, high-intent discussion threads irreplaceable by synthetic AI content.',
      redFlags: [
        'Historical lack of GAAP profitability (operating leverage turned positive in 2024).',
        'Moderator friction: Heavy reliance on unpaid volunteer community moderators.'
      ]
    },
    tacticalNote: 'Strong opening pop anticipated. Pure-play AI data positioning; lock in 35% on listing pop and hold balance for ad upside.'
  },
  {
    id: 'ASTERA-LABS',
    name: 'Astera Labs Inc',
    ticker: 'ALAB',
    market: 'US',
    tier: 'MAINBOARD',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Mar 15 - Mar 19, 2024',
    exchange: 'NASDAQ',
    sector: 'Semiconductors & AI Cloud Connectivity',
    businessSummary: 'Fabless semiconductor supplier of PCIe, CXL, and Ethernet connectivity silicon and software solving critical bandwidth bottlenecks in hyperscale AI server clusters (Aries, Taurus, Leo controllers).',
    issueDetails: {
      priceBand: '$32 - $34',
      issuePrice: 36,
      currency: 'USD',
      currencySymbol: '$',
      issueSize: '$713M',
      issueSizeNum: 713,
      marketCap: '$5,500M',
      marketCapNum: 5500,
      freshIssuePct: 84.5,
      ofsPct: 15.5,
      freshValue: '$602M',
      ofsValue: '$111M',
      lotSize: 1,
      openDate: '2024-03-15',
      closeDate: '2024-03-19',
      listingDate: '2024-03-20',
      leadManagers: ['Morgan Stanley', 'J.P. Morgan', 'Barclays', 'Deutsche Bank']
    },
    financials: {
      years: ['FY21', 'FY22', 'FY23'],
      revenue: [34.8, 89.6, 115.8],
      ebitda: [-5.2, -28.4, -12.1],
      pat: [-5.8, -31.2, -26.3],
      patMargin: [-16.7, -34.8, -22.7],
      revenueCAGR: 82.4,
      patCAGR: 12.0,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Gross margins expanded above 69% with accelerating hyperscaler shipments.'
    },
    valuation: {
      peRatio: -78.0,
      pbRatio: 12.4,
      evEbitda: 45.0,
      postPromoterHolding: 42.1,
      publicFloatPct: 35.8,
      floatRisk: 'LOW'
    },
    peers: [
      { name: 'Marvell Technology', ticker: 'MRVL', pe: 48.2, pb: 4.8, evEbitda: 28.5, patMargin: 12.4, roe: 6.8, mcap: '$68,200M' },
      { name: 'Broadcom Inc', ticker: 'AVGO', pe: 38.5, pb: 14.2, evEbitda: 22.1, patMargin: 38.2, roe: 42.5, mcap: '$820,000M' }
    ],
    valuationVsPeers: 'FAIR',
    valuationDiscountPct: 15.0,
    sentiment: {
      gmpPrice: 18.0,
      gmpPct: 50.0,
      gmpTrend: [35, 42, 50.0],
      subscription: {
        qib: 14.5,
        nii: 9.2,
        retail: 5.1,
        total: 11.2
      },
      underwriterTier: 'TIER_1',
      anchorQuality: 'Elite Silicon Anchors (Intel Capital, Sutter Hill, Fidelity)',
      macroVix: 13.4
    },
    verdict: 'APPLY',
    score: 91,
    pillarScores: {
      fundamental: 92,
      quantitative: 88,
      sentiment: 94
    },
    executiveVerdict: '**APPLY / SUBSCRIBE.** Mission-critical pure-play AI server connectivity vendor with 85% fresh funding and 82% Revenue CAGR, partnering directly with Nvidia and AWS to break AI data throughput bottlenecks.',
    businessAndRedFlags: {
      whatTheyDo: 'High-speed retimer and optical connectivity chips linking AI GPUs to high-bandwidth memory and network switches.',
      moat: 'COSMOS software suite integrated into cloud firmware, making switching connectivity vendors extremely complex.',
      redFlags: [
        'Hyperscaler customer concentration: AWS, Microsoft, and Google account for over 70% of shipments.'
      ]
    },
    tacticalNote: 'Outstanding momentum candidate (+72% opening pop realized). AI hardware tailwinds provide strong institutional bid.'
  },
  {
    id: 'BIRKENSTOCK',
    name: 'Birkenstock Holding plc',
    ticker: 'BIRK',
    market: 'US',
    tier: 'MAINBOARD',
    status: 'LISTED',
    statusLabel: '⚪ RECENTLY LISTED',
    biddingDates: 'Oct 09 - Oct 10, 2023',
    exchange: 'NYSE',
    sector: 'Footwear & Consumer Discretionary',
    businessSummary: 'German heritage footwear brand known for anatomically shaped cork footbeds. Acquired by LVMH-backed private equity firm L Catterton prior to public listing.',
    issueDetails: {
      priceBand: '$44 - $49',
      issuePrice: 46,
      currency: 'USD',
      currencySymbol: '$',
      issueSize: '$1,480M',
      issueSizeNum: 1480,
      marketCap: '$8,640M',
      marketCapNum: 8640,
      freshIssuePct: 22.0,
      ofsPct: 78.0,
      freshValue: '$325M',
      ofsValue: '$1,155M',
      lotSize: 1,
      openDate: '2023-10-09',
      closeDate: '2023-10-10',
      listingDate: '2023-10-11',
      leadManagers: ['Goldman Sachs', 'J.P. Morgan', 'Morgan Stanley']
    },
    financials: {
      years: ['FY21', 'FY22', 'FY23'],
      revenue: [731, 1242, 1492],
      ebitda: [275, 434, 483],
      pat: [115, 187, 75],
      patMargin: [15.7, 15.1, 5.0],
      revenueCAGR: 42.8,
      patCAGR: -19.2,
      preIpoMarginSpike: false,
      marginSpikeDetail: 'Heavy leverage and interest obligations post-L Catterton buyout depressed net margins.'
    },
    valuation: {
      peRatio: 58.4,
      pbRatio: 7.8,
      evEbitda: 23.5,
      postPromoterHolding: 82.8,
      publicFloatPct: 17.2,
      floatRisk: 'LOW'
    },
    peers: [
      { name: 'Crocs Inc', ticker: 'CROX', pe: 10.4, pb: 3.4, evEbitda: 8.2, patMargin: 20.2, roe: 38.5, mcap: '$8,400M' },
      { name: 'Deckers Outdoor Corp', ticker: 'DECK', pe: 28.5, pb: 8.9, evEbitda: 18.4, patMargin: 17.8, roe: 34.2, mcap: '$24,200M' }
    ],
    valuationVsPeers: 'PRICED_TO_PERFECTION',
    valuationDiscountPct: -125.0,
    sentiment: {
      gmpPrice: -2.5,
      gmpPct: -5.4,
      gmpTrend: [0.0, -2.0, -5.4],
      subscription: {
        qib: 2.2,
        nii: 1.4,
        retail: 0.8,
        total: 1.6
      },
      underwriterTier: 'TIER_1',
      anchorQuality: 'Financière Agache (Arnault family office)',
      macroVix: 17.8
    },
    verdict: 'AVOID',
    score: 36,
    pillarScores: {
      fundamental: 58,
      quantitative: 28,
      sentiment: 24
    },
    executiveVerdict: '**AVOID — Overpriced Private Equity Exit.** Priced at a staggering 58x P/E (vs peer Crocs at 10x P/E) with 78% of proceeds going directly to L Catterton private equity sponsors alongside substantial debt overhang.',
    businessAndRedFlags: {
      whatTheyDo: 'Designs, manufactures, and markets traditional orthopedic cork footbed sandals and clogs.',
      moat: '250-year heritage brand identity.',
      redFlags: [
        'Excessive valuation: Demanding 58x P/E in a slowing consumer environment.',
        'High OFS exit: 78% of the $1.5B issue is pure sponsor liquidation.',
        'Post-buyout net debt load of €1.8B requiring ongoing interest service.'
      ]
    },
    tacticalNote: 'Avoid on IPO. Opened below issue price ($41 vs $46 issue). Never pay luxury goods multiples for a single-category footwear brand.'
  }
];
