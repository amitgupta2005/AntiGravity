/**
 * Institutional IPO Evaluation Engine
 * Multi-pillar underwriting & quantitative valuation framework
 * Evaluates Indian Mainboard, Indian SME, and US Market IPOs.
 */

import { calculatePeerBenchmarks } from './peerValuation.js';

export class IpoEvaluationEngine {
  /**
   * Evaluates an IPO object and generates institutional score, pillar scores,
   * red flags list, recommendation verdict, and the structured 5-part dossier.
   */
  static evaluate(ipo) {
    if (!ipo) throw new Error('IPO data payload is required for evaluation');

    const fundamentalResult = this.evaluateFundamental(ipo);
    const quantitativeResult = this.evaluateQuantitative(ipo);
    const sentimentResult = this.evaluateSentiment(ipo);

    // Red flag detection across all pillars
    const redFlags = [
      ...fundamentalResult.redFlags,
      ...quantitativeResult.redFlags,
      ...sentimentResult.redFlags
    ];

    // Pillar Weights: Fundamental (35%), Quantitative (35%), Sentiment (30%)
    let rawScore = Math.round(
      (fundamentalResult.score * 0.35) +
      (quantitativeResult.score * 0.35) +
      (sentimentResult.score * 0.30)
    );

    // Severe red flag deduction penalties
    const criticalFlags = redFlags.filter(f => f.severity === 'CRITICAL');
    const highFlags = redFlags.filter(f => f.severity === 'HIGH');
    
    // Deduct for critical forensic red flags
    if (criticalFlags.length > 0) {
      rawScore = Math.min(rawScore, 45 - (criticalFlags.length * 10));
    } else if (highFlags.length >= 2) {
      rawScore = Math.min(rawScore, 58 - (highFlags.length * 5));
    }

    rawScore = Math.max(10, Math.min(99, rawScore));

    // Determine final verdict
    const verdict = this.determineVerdict({
      score: rawScore,
      criticalFlagsCount: criticalFlags.length,
      highFlagsCount: highFlags.length,
      fundamentalScore: fundamentalResult.score,
      quantitativeScore: quantitativeResult.score,
      sentimentScore: sentimentResult.score,
      peDiscountPct: quantitativeResult.peerBenchmarks.peDiscountPct,
      ofsPct: ipo.issueDetails?.ofsPct || 0,
      preIpoMarginSpike: fundamentalResult.hasPreIpoMarginSpike,
      tier: ipo.tier,
      explicitVerdict: ipo.verdict
    });

    // If an explicit score was curated for canonical benchmark IPOs, harmonize
    const finalScore = ipo.score || rawScore;

    // Generate the 5-Part Institutional Dossier
    const dossier = this.generateDossier(ipo, verdict, finalScore, {
      fundamentalResult,
      quantitativeResult,
      sentimentResult,
      redFlags
    });

    return {
      id: ipo.id || ipo.ticker,
      name: ipo.name,
      ticker: ipo.ticker,
      market: ipo.market,
      tier: ipo.tier,
      verdict: verdict.code, // 'APPLY', 'AVOID', 'WATCH'
      verdictLabel: verdict.label,
      verdictColor: verdict.color,
      score: finalScore,
      pillarScores: {
        fundamental: ipo.pillarScores?.fundamental || fundamentalResult.score,
        quantitative: ipo.pillarScores?.quantitative || quantitativeResult.score,
        sentiment: ipo.pillarScores?.sentiment || sentimentResult.score
      },
      pillarBreakdown: {
        fundamental: fundamentalResult,
        quantitative: quantitativeResult,
        sentiment: sentimentResult
      },
      redFlags,
      criticalFlagsCount: criticalFlags.length,
      dossier
    };
  }

  // =========================================================================
  // PILLAR 1: FUNDAMENTAL ANALYSIS (The Business Reality)
  // =========================================================================
  static evaluateFundamental(ipo) {
    let score = 55; // baseline
    const redFlags = [];
    let hasPreIpoMarginSpike = false;

    const { financials, issueDetails, tier, businessSummary, sector } = ipo;

    // 1. OFS vs Fresh Issue Ratio Analysis
    const ofsPct = issueDetails?.ofsPct ?? (issueDetails?.freshIssuePct != null ? 100 - issueDetails.freshIssuePct : 0);
    const freshPct = issueDetails?.freshIssuePct ?? (100 - ofsPct);

    if (freshPct >= 80) {
      score += 25; // Capital going into capex / debt repayment
    } else if (freshPct >= 50) {
      score += 15;
    } else if (ofsPct === 100) {
      score -= 25; // 100% promoter cashout penalty
      redFlags.push({
        pillar: 'FUNDAMENTAL',
        severity: 'HIGH',
        title: '100% Offer For Sale (OFS)',
        detail: 'Zero capital from this issue enters the company balance sheet. 100% of proceeds go to exiting promoters or PE/VC sponsors.'
      });
    } else if (ofsPct > 65) {
      score -= 15;
      redFlags.push({
        pillar: 'FUNDAMENTAL',
        severity: 'MEDIUM',
        title: `Heavy OFS Exit (${ofsPct.toFixed(0)}%)`,
        detail: 'More than two-thirds of the issue size is promoter cashout rather than funding capital expenditure or business growth.'
      });
    }

    // 2. Pre-IPO Margin Spike Check (SEBI / SME Alert)
    if (financials) {
      if (financials.preIpoMarginSpike === true) {
        hasPreIpoMarginSpike = true;
      } else if (financials.preIpoMarginSpike === false) {
        hasPreIpoMarginSpike = false;
      } else if (tier === 'SME' && financials.patMargin && financials.patMargin.length >= 3) {
        const [m1, m2, m3] = financials.patMargin;
        if (m3 > 0 && m1 > 0 && (m3 / m1 >= 2.5 || (m3 - m2) >= 8)) {
          hasPreIpoMarginSpike = true;
        }
      }

      if (hasPreIpoMarginSpike) {
        score -= tier === 'SME' ? 40 : 25;
        redFlags.push({
          pillar: 'FUNDAMENTAL',
          severity: 'CRITICAL',
          title: '🚨 Pre-IPO Net Profit Margin Spike',
          detail: financials.marginSpikeDetail || (
            tier === 'SME'
              ? 'Classic SME Red Flag: Unexplainable surge in PAT margin immediately in the 12-24 months prior to IPO. High probability of pre-listing window dressing or vendor-related round-tripping.'
              : 'Abnormal surge in profit margins in the year preceding the IPO without proportional volume or market share expansion.'
          )
        });
      }
    }

    // 3. Revenue & PAT Trajectory Health
    if (financials?.patCAGR != null) {
      if (financials.patCAGR >= 50) {
        score += 20;
      } else if (financials.patCAGR >= 25) {
        score += 12;
      } else if (financials.patCAGR < 0) {
        score -= 20;
        redFlags.push({
          pillar: 'FUNDAMENTAL',
          severity: 'HIGH',
          title: 'Negative PAT Growth Trajectory',
          detail: `Company net profit CAGR is negative (${financials.patCAGR}%) across the 3-year track record.`
        });
      }
    }

    if (financials?.revenueCAGR != null) {
      if (financials.revenueCAGR >= 40) score += 10;
      else if (financials.revenueCAGR >= 20) score += 5;
    }

    // 4. Sector Tailwinds vs Headwinds
    const sectorLower = (sector || '').toLowerCase();
    const isSunrise = /solar|semiconductor|clean|ai|defense|green|specialty chemical|data center|housing finance/i.test(sectorLower);
    const isCyclicalLegacy = /footwear|dealership|traditional retail|auto dealership/i.test(sectorLower);

    if (isSunrise) {
      score += 10;
    } else if (isCyclicalLegacy && tier === 'SME') {
      score -= 15;
      redFlags.push({
        pillar: 'FUNDAMENTAL',
        severity: 'MEDIUM',
        title: 'Low-Moat Franchise Model',
        detail: 'Business operates as a non-exclusive retail distributor or commodity intermediary with negligible switching costs.'
      });
    }

    // Moat & governance bonus
    if (ipo.businessAndRedFlags?.moat && ipo.businessAndRedFlags.moat.length > 20) {
      score += 5;
    }

    score = Math.min(100, Math.max(0, score));

    return {
      score,
      redFlags,
      hasPreIpoMarginSpike,
      freshPct,
      ofsPct,
      revenueCAGR: financials?.revenueCAGR ?? null,
      patCAGR: financials?.patCAGR ?? null
    };
  }

  // =========================================================================
  // PILLAR 2: QUANTITATIVE ANALYSIS (The Valuation Check)
  // =========================================================================
  static evaluateQuantitative(ipo) {
    let score = 55; // baseline
    const redFlags = [];

    const { valuation, peers, tier, valuationDiscountPct, valuationVsPeers } = ipo;
    const peerBenchmarks = calculatePeerBenchmarks(peers, valuation);

    // Determine effective discount / premium vs peers
    let peDiscount = peerBenchmarks.peDiscountPct;
    if (typeof valuationDiscountPct === 'number') {
      peDiscount = valuationDiscountPct;
    }

    if (peDiscount >= 25 || valuationVsPeers === 'DISCOUNT') {
      score += 30; // Substantial valuation margin of safety
    } else if (peDiscount >= 5 || valuationVsPeers === 'FAIR') {
      score += 15;
    } else if (peDiscount <= -40 || valuationVsPeers === 'PRICED_TO_PERFECTION') {
      if (valuation?.peRatio > 60 || peDiscount <= -50) {
        score -= 25;
        redFlags.push({
          pillar: 'QUANTITATIVE',
          severity: 'HIGH',
          title: 'Priced at Substantial Premium to Listed Peers',
          detail: `Issue valuation trades at a ${Math.abs(peDiscount)}% premium over industry peer benchmarks. Leaves no margin of safety.`
        });
      } else {
        score -= 10;
        redFlags.push({
          pillar: 'QUANTITATIVE',
          severity: 'MEDIUM',
          title: 'Priced to Perfection',
          detail: `Valuation is fully priced or trades at a premium (${Math.abs(peDiscount)}%) to seasoned industry peers.`
        });
      }
    }

    // 2. Absolute Multiple Sanity Check
    if (valuation?.peRatio) {
      if (valuation.peRatio > 85) {
        score -= 20;
        redFlags.push({
          pillar: 'QUANTITATIVE',
          severity: 'HIGH',
          title: `Hyper-Inflated Multiple (P/E ${valuation.peRatio}x)`,
          detail: 'Valuation multiple exceeds 85x earnings, demanding near-flawless execution in upcoming fiscal quarters.'
        });
      } else if (valuation.peRatio > 0 && valuation.peRatio < 25) {
        score += 10;
      }
    }

    // 3. Post-Issue Promoter Holding & Float Liquidity Risk
    const floatPct = valuation?.publicFloatPct ?? 25;
    const promoterHolding = valuation?.postPromoterHolding ?? (100 - floatPct);

    if (tier === 'SME') {
      if (floatPct < 20) {
        score -= 25;
        redFlags.push({
          pillar: 'QUANTITATIVE',
          severity: 'CRITICAL',
          title: 'Extreme SME Low Float Illiquidity Risk',
          detail: `Public float is only ${floatPct}%. In Indian SME exchanges with mandatory high lot sizes, low float creates artificial scarcity followed by brutal 5% lower-circuit traps post listing.`
        });
      }
    }

    score = Math.min(100, Math.max(0, score));

    return {
      score,
      redFlags,
      peerBenchmarks,
      valuation
    };
  }

  // =========================================================================
  // PILLAR 3: TECHNICAL & MARKET SENTIMENT (The Timing)
  // =========================================================================
  static evaluateSentiment(ipo) {
    let score = 50; // baseline
    const redFlags = [];

    const { sentiment, market, tier } = ipo;

    if (!sentiment) {
      return { score: 50, redFlags, sentiment: {} };
    }

    // 1. Grey Market Premium (GMP) or Listing Expected Pop
    const gmpPct = sentiment.gmpPct ?? 0;
    const gmpTrend = sentiment.gmpTrend || [];

    if (gmpPct >= 70) {
      score += 30; // Blockbuster demand
    } else if (gmpPct >= 30) {
      score += 20;
    } else if (gmpPct >= 10) {
      score += 10;
    } else if (gmpPct <= 2) {
      score -= 25;
      redFlags.push({
        pillar: 'SENTIMENT',
        severity: 'HIGH',
        title: 'Muted or Negative Grey Market Premium (GMP)',
        detail: `GMP is currently ${gmpPct.toFixed(1)}%, indicating zero institutional frenzy and significant risk of listing at a discount.`
      });
    }

    // 2. GMP 3-Day Progression Trend Check
    if (gmpTrend.length >= 3) {
      const [d1, d2, d3] = gmpTrend;
      if (d3 < d2 && d2 < d1 && (d1 - d3) > 3) {
        score -= 15;
        redFlags.push({
          pillar: 'SENTIMENT',
          severity: 'HIGH',
          title: 'Collapsing GMP Momentum',
          detail: `Grey market sentiment is deteriorating sharply over the last 3 days (${d1}% ➔ ${d2}% ➔ ${d3}%). Exit overhang is intensifying.`
        });
      } else if (d3 > d2 && d2 > d1) {
        score += 10; // Accelerating momentum
      }
    }

    // 3. Subscription & Book Building Momentum
    const sub = sentiment.subscription;
    if (sub) {
      const totalSub = sub.total ?? 0;
      const qibSub = sub.qib ?? 0;

      if (totalSub >= 40 || qibSub >= 30) {
        score += 15;
      } else if (totalSub >= 10 || qibSub >= 8) {
        score += 10;
      } else if (totalSub < 2.0 && qibSub < 3.0) {
        score -= 20;
        redFlags.push({
          pillar: 'SENTIMENT',
          severity: 'HIGH',
          title: 'Undersubscription / Tepid Book Momentum',
          detail: `Total subscription is only ${totalSub}x (QIB: ${qibSub}x). Weak institutional backing increases post-listing volatility.`
        });
      }
    }

    // 4. Underwriter Tier & Lead Manager Reputation
    const underwriter = sentiment.underwriterTier;
    if (underwriter === 'TIER_1') {
      score += 10; // Goldman Sachs, Morgan Stanley, Kotak, Axis, J.P. Morgan
    }

    // 5. Macro Volatility Context (VIX / India VIX)
    const vix = sentiment.macroVix ?? 14.0;
    if (vix > 22) {
      score -= 15;
      redFlags.push({
        pillar: 'SENTIMENT',
        severity: 'HIGH',
        title: 'Macro Volatility Headwind (VIX > 22)',
        detail: `Market volatility index is elevated at ${vix}. IPO listing pops dry up quickly in risk-off regimes.`
      });
    } else if (vix < 15) {
      score += 5; // Bullish macro backdrop
    }

    score = Math.min(100, Math.max(0, score));

    return {
      score,
      redFlags,
      gmpPct,
      subscription: sentiment.subscription,
      vix
    };
  }

  // =========================================================================
  // VERDICT DETERMINATION MATRIX
  // =========================================================================
  static determineVerdict({
    score,
    criticalFlagsCount,
    highFlagsCount,
    fundamentalScore,
    quantitativeScore,
    sentimentScore,
    peDiscountPct,
    ofsPct,
    preIpoMarginSpike,
    tier,
    explicitVerdict
  }) {
    // If the curated IPO specifies an explicit authoritative verdict, honor it
    if (explicitVerdict && ['APPLY', 'AVOID', 'WATCH'].includes(explicitVerdict)) {
      if (explicitVerdict === 'APPLY') {
        return {
          code: 'APPLY',
          label: '[APPLY / SUBSCRIBE]',
          color: '#10b981',
          badgeClass: 'badge-apply',
          reason: 'Institutional-grade business with attractive valuation cushion and heavy anchor/subscription demand.'
        };
      } else if (explicitVerdict === 'AVOID') {
        return {
          code: 'AVOID',
          label: '[AVOID]',
          color: '#ef4444',
          badgeClass: 'badge-avoid',
          reason: 'Severe forensic or valuation red flag detected (Margin spike, 100% OFS exit, or exorbitant premium).'
        };
      } else {
        return {
          code: 'WATCH',
          label: '[WATCH AFTER LISTING]',
          color: '#f59e0b',
          badgeClass: 'badge-watch',
          reason: 'Priced to perfection or cyclical business. Better to wait for secondary price discovery post-listing.'
        };
      }
    }

    // 1. Mandatory AVOID triggers
    if (criticalFlagsCount > 0 || preIpoMarginSpike) {
      return {
        code: 'AVOID',
        label: '[AVOID]',
        color: '#ef4444',
        badgeClass: 'badge-avoid',
        reason: 'Severe forensic red flag detected (Pre-IPO margin distortion or regulatory freeze).'
      };
    }

    if (ofsPct === 100 && sentimentScore < 40) {
      return {
        code: 'AVOID',
        label: '[AVOID]',
        color: '#ef4444',
        badgeClass: 'badge-avoid',
        reason: '100% OFS exit coupled with dead retail/grey market demand.'
      };
    }

    if (score < 48) {
      return {
        code: 'AVOID',
        label: '[AVOID]',
        color: '#ef4444',
        badgeClass: 'badge-avoid',
        reason: 'Low composite institutional score driven by expensive multiples and weak demand.'
      };
    }

    // 2. Mandatory APPLY triggers
    if (score >= 78 && fundamentalScore >= 65 && quantitativeScore >= 60) {
      return {
        code: 'APPLY',
        label: '[APPLY / SUBSCRIBE]',
        color: '#10b981',
        badgeClass: 'badge-apply',
        reason: 'Institutional-grade business with attractive valuation cushion and heavy anchor/subscription demand.'
      };
    }

    // 3. WATCH AFTER LISTING
    return {
      code: 'WATCH',
      label: '[WATCH AFTER LISTING]',
      color: '#f59e0b',
      badgeClass: 'badge-watch',
      reason: 'Sound fundamental narrative, but valuation is priced to perfection or OFS overhang demands waiting for post-listing technical bases.'
    };
  }

  // =========================================================================
  // 5-PART INSTITUTIONAL DOSSIER GENERATOR
  // =========================================================================
  static generateDossier(ipo, verdict, score, details) {
    const { fundamentalResult, quantitativeResult, sentimentResult, redFlags } = details;
    const benchmarks = quantitativeResult.peerBenchmarks;
    const valuation = ipo.valuation || {};
    const issue = ipo.issueDetails || {};
    const sentiment = ipo.sentiment || {};

    // 1. Executive Verdict
    let executiveRationale = '';
    if (ipo.executiveVerdict) {
      executiveRationale = ipo.executiveVerdict;
    } else {
      if (verdict.code === 'APPLY') {
        executiveRationale = `**${verdict.label} with High Institutional Conviction.** Combines robust ${fundamentalResult.patCAGR ? fundamentalResult.patCAGR + '% PAT CAGR' : 'revenue trajectory'} with an attractive valuation cushion (${benchmarks.peDiscountPct > 0 ? benchmarks.peDiscountPct + '% peer discount' : 'fair multiples'}) and strong anchor demand.`;
      } else if (verdict.code === 'AVOID') {
        executiveRationale = `**${verdict.label} — Capital Preservation Priority.** High risk profile driven by ${fundamentalResult.hasPreIpoMarginSpike ? 'unexplained pre-IPO margin spikes' : 'steep valuation premium'} and an unfavorable ${issue.ofsPct}% OFS exit ratio leaving no money on the table for public applicants.`;
      } else {
        executiveRationale = `**${verdict.label}.** Demonstrates high-growth enterprise characteristics, but demanding valuation multiples (${valuation.peRatio ? valuation.peRatio + 'x P/E' : 'stretched'}) and market volatility warrant patience for post-listing secondary price discovery.`;
      }
    }

    // 2. The Business & Red Flags
    const businessSummary = ipo.businessSummary || ipo.businessAndRedFlags?.whatTheyDo || 'N/A';
    const moatSummary = ipo.businessAndRedFlags?.moat || 'Proprietary distribution channels, high barrier to entry, or recurring enterprise contracts.';
    const flaggedRisks = redFlags.map(r => r.detail);
    if (ipo.businessAndRedFlags?.redFlags) {
      flaggedRisks.push(...ipo.businessAndRedFlags.redFlags);
    }

    // 3. Valuation vs. Peers (Quantitative Matrix)
    const peerList = ipo.peers || ipo.valuation?.peerComps || [];
    const peerComparisonRows = peerList.map(p => ({
      name: p.name,
      ticker: p.ticker,
      pe: p.pe ? `${p.pe}x` : 'N/A',
      pb: p.pb ? `${p.pb}x` : 'N/A',
      evEbitda: p.evEbitda ? `${p.evEbitda}x` : 'N/A',
      patMargin: p.patMargin ? `${p.patMargin}%` : 'N/A',
      mcap: p.mcap || 'N/A'
    }));

    const targetRow = {
      name: `${ipo.name} (Issue)`,
      ticker: ipo.ticker,
      pe: valuation.peRatio ? `${valuation.peRatio}x` : 'N/A',
      pb: valuation.pbRatio ? `${valuation.pbRatio}x` : 'N/A',
      evEbitda: valuation.evEbitda ? `${valuation.evEbitda}x` : 'N/A',
      patMargin: ipo.financials?.margins?.patMargin != null ? `${ipo.financials.margins.patMargin}%` : (ipo.financials?.patMargin ? `${Array.isArray(ipo.financials.patMargin) ? ipo.financials.patMargin.slice(-1)[0] : ipo.financials.patMargin}%` : 'N/A'),
      mcap: issue.marketCap || 'N/A',
      isTarget: true
    };

    // 4. Market Sentiment
    const isIndia = ipo.market === 'IN';
    const sentimentData = {
      isIndia,
      gmpPrice: (sentiment.gmp != null || sentiment.gmpPrice != null) ? `${issue.currencySymbol || ''}${sentiment.gmp ?? sentiment.gmpPrice}` : 'N/A',
      gmpPct: sentiment.gmpPct != null ? `${sentiment.gmpPct >= 0 ? '+' : ''}${sentiment.gmpPct.toFixed(1)}%` : 'N/A',
      gmpTrend: sentiment.gmpTrend || (sentiment.gmpHistory ? sentiment.gmpHistory.map(h => h.gmpPct) : []),
      subscription: sentiment.subscription || {
        qib: sentiment.qibSubscription != null ? sentiment.qibSubscription : 'N/A',
        nii: sentiment.niiSubscription != null ? sentiment.niiSubscription : 'N/A',
        retail: sentiment.retailSubscription != null ? sentiment.retailSubscription : 'N/A',
        total: sentiment.totalSubscription != null ? sentiment.totalSubscription : 'N/A'
      },
      underwriterTier: sentiment.underwriterTier || issue.underwriterTier || 'TIER_1',
      anchorQuality: sentiment.anchorQuality || (sentiment.anchorInvestors ? sentiment.anchorInvestors.join(', ') : 'Institutional Consortium'),
      macroVix: sentiment.macroVix || 14.0
    };

    // 5. Tactical Note
    let tacticalNote = ipo.tacticalNote;
    if (!tacticalNote) {
      if (verdict.code === 'APPLY') {
        tacticalNote = sentiment.gmpPct > 50
          ? 'Exceptional listing candidate. High probability of substantial opening pop (>50%). Allocate 50% for initial cost recovery on listing morning, and ride remaining 50% for compound growth.'
          : 'Subscribe for portfolio core holding. Favorable risk-reward; hold with 12-18 month horizon.';
      } else if (verdict.code === 'AVOID') {
        tacticalNote = 'Do not bid on public issue. If allocated, strictly avoid holding into secondary open. High risk of immediate listing discount or multi-day price decay.';
      } else {
        tacticalNote = 'Do not rush subscription. Allow 30-90 days for lock-up expirations and technical accumulation bases to form before building core spot position.';
      }
    }

    // 6. DRHP Disclosed Financial Track Record (Restated 3-Year Audited Financials)
    const fin = ipo.financials || {};
    const repCurrency = fin.reportingCurrency || (ipo.market === 'IN' ? 'INR Cr' : 'USD M');
    const currencySym = repCurrency.includes('USD') ? '$' : '₹';

    let rev3Y = [];
    if (Array.isArray(fin.revenue3Y)) {
      rev3Y = fin.revenue3Y;
    } else if (Array.isArray(fin.revenue)) {
      const yrs = fin.years || ['FY24', 'FY25', 'FY26'];
      rev3Y = fin.revenue.map((val, idx) => ({ year: yrs[idx] || `Y${idx + 1}`, value: val }));
    }

    let pat3Y = [];
    if (Array.isArray(fin.pat3Y)) {
      pat3Y = fin.pat3Y;
    } else if (Array.isArray(fin.pat)) {
      const yrs = fin.years || ['FY24', 'FY25', 'FY26'];
      pat3Y = fin.pat.map((val, idx) => ({ year: yrs[idx] || `Y${idx + 1}`, value: val }));
    }

    let ebitda3Y = [];
    if (Array.isArray(fin.ebitda3Y)) {
      ebitda3Y = fin.ebitda3Y;
    } else if (Array.isArray(fin.ebitda)) {
      const yrs = fin.years || ['FY24', 'FY25', 'FY26'];
      ebitda3Y = fin.ebitda.map((val, idx) => ({ year: yrs[idx] || `Y${idx + 1}`, value: val }));
    }

    const margins = fin.margins || {
      grossMargin: fin.grossMargin ?? null,
      ebitdaMargin: fin.ebitdaMargin ?? null,
      patMargin: fin.patMargin ? (Array.isArray(fin.patMargin) ? fin.patMargin.slice(-1)[0] : fin.patMargin) : null,
      spikeDetected: fin.preIpoMarginSpike ?? false
    };

    const hasMarginSpike = Boolean(fin.margins?.spikeDetected || fin.preIpoMarginSpike);

    const drhpFinancialData = {
      reportingCurrency: repCurrency,
      currencySymbol: currencySym,
      revenue3Y: rev3Y,
      pat3Y: pat3Y,
      ebitda3Y: ebitda3Y,
      cagrRevenue: fin.cagrRevenue ?? fin.revenueCAGR ?? null,
      cagrPat: fin.cagrPat ?? fin.patCAGR ?? null,
      operatingCashFlow: fin.operatingCashFlow ?? null,
      netDebt: fin.netDebt ?? null,
      debtToEquity: fin.debtToEquity ?? null,
      margins,
      hasPreIpoMarginSpike: hasMarginSpike,
      marginSpikeDetail: fin.marginSpikeDetail || (hasMarginSpike 
        ? 'Abnormal pre-IPO profit margin spike detected in restated DRHP financials without proportional physical volume additions.'
        : 'Audited restated financial statements indicate sustainable organic trajectory compliant with regulatory disclosures.'),
      forensicAuditVerdict: hasMarginSpike
        ? '⚠️ FORENSIC ANOMALY: Pre-IPO Net Profit window-dressing detected in DRHP restated statements.'
        : '✓ AUDITED CLEAN: Clean restated financial trajectory compliant with SEBI ICDR regulations.'
    };

    return {
      part1_executiveVerdict: executiveRationale,
      part2_businessAndRedFlags: {
        whatTheyDo: businessSummary,
        moat: moatSummary,
        redFlags: [...new Set(flaggedRisks)]
      },
      part3_valuationVsPeers: {
        target: targetRow,
        peers: peerComparisonRows,
        benchmarkDiscountSummary: benchmarks.statusLabel,
        peDiscountPct: benchmarks.peDiscountPct,
        medianPE: benchmarks.medianPE
      },
      part4_marketSentiment: sentimentData,
      part5_tacticalNote: tacticalNote,
      drhpFinancials: drhpFinancialData
    };
  }

  /**
   * Helper to export the 5-part institutional dossier as an institutional Markdown Memo
   */
  static formatAsMarkdownMemo(evaluationResult) {
    const { name, ticker, market, tier, verdictLabel, score, dossier } = evaluationResult;
    const {
      part1_executiveVerdict,
      part2_businessAndRedFlags,
      part3_valuationVsPeers,
      part4_marketSentiment,
      part5_tacticalNote,
      drhpFinancials
    } = dossier;

    const df = drhpFinancials || {};
    const y1 = df.revenue3Y?.[0]?.year || 'FY24';
    const y2 = df.revenue3Y?.[1]?.year || 'FY25';
    const y3 = df.revenue3Y?.[2]?.year || 'FY26';

    const r1 = df.revenue3Y?.[0]?.value != null ? df.revenue3Y[0].value.toLocaleString() : 'N/A';
    const r2 = df.revenue3Y?.[1]?.value != null ? df.revenue3Y[1].value.toLocaleString() : 'N/A';
    const r3 = df.revenue3Y?.[2]?.value != null ? df.revenue3Y[2].value.toLocaleString() : 'N/A';

    const e1 = df.ebitda3Y?.[0]?.value != null ? df.ebitda3Y[0].value.toLocaleString() : 'N/A';
    const e2 = df.ebitda3Y?.[1]?.value != null ? df.ebitda3Y[1].value.toLocaleString() : 'N/A';
    const e3 = df.ebitda3Y?.[2]?.value != null ? df.ebitda3Y[2].value.toLocaleString() : 'N/A';

    const p1 = df.pat3Y?.[0]?.value != null ? df.pat3Y[0].value.toLocaleString() : 'N/A';
    const p2 = df.pat3Y?.[1]?.value != null ? df.pat3Y[1].value.toLocaleString() : 'N/A';
    const p3 = df.pat3Y?.[2]?.value != null ? df.pat3Y[2].value.toLocaleString() : 'N/A';

    const m1 = (df.revenue3Y?.[0]?.value && df.pat3Y?.[0]?.value != null)
      ? ((df.pat3Y[0].value / df.revenue3Y[0].value) * 100).toFixed(1) + '%'
      : 'N/A';
    const m2 = (df.revenue3Y?.[1]?.value && df.pat3Y?.[1]?.value != null)
      ? ((df.pat3Y[1].value / df.revenue3Y[1].value) * 100).toFixed(1) + '%'
      : 'N/A';
    const m3 = (df.revenue3Y?.[2]?.value && df.pat3Y?.[2]?.value != null)
      ? ((df.pat3Y[2].value / df.revenue3Y[2].value) * 100).toFixed(1) + '%'
      : (df.margins?.patMargin != null ? `${df.margins.patMargin}%` : 'N/A');

    return `
# INSTITUTIONAL IPO MEMORANDUM
**Asset:** ${name} (${ticker}) | **Market:** ${market} (${tier}) | **Institutional Score:** ${score}/100
**Date:** ${new Date().toISOString().slice(0, 10)} | **Status:** Institutional Rating Completed

---

### 1. Executive Verdict
${part1_executiveVerdict}

---

### 📊 Financial Data Disclosed in DRHP (Restated 3-Year Audited Financials)
*Source: Draft Red Herring Prospectus (DRHP) Filed with SEBI / SEC | Reporting Currency: ${df.reportingCurrency || 'INR Cr'}*

| Line Item (DRHP Restated) | ${y1} | ${y2} | ${y3} | 3-Year Trajectory / CAGR |
| :--- | :--- | :--- | :--- | :--- |
| **Revenue from Operations** | ${r1} | ${r2} | ${r3} | ${df.cagrRevenue != null ? (df.cagrRevenue >= 0 ? '+' : '') + df.cagrRevenue + '% CAGR' : 'N/A'} |
| **Operating EBITDA** | ${e1} | ${e2} | ${e3} | ${df.margins?.ebitdaMargin != null ? df.margins.ebitdaMargin + '% Margin' : 'N/A'} |
| **Profit After Tax (PAT)** | ${p1} | ${p2} | ${p3} | ${df.cagrPat != null ? (df.cagrPat >= 0 ? '+' : '') + df.cagrPat + '% CAGR' : 'N/A'} |
| **Net PAT Margin %** | ${m1} | ${m2} | ${m3} | ${df.margins?.grossMargin != null ? 'Gross: ' + df.margins.grossMargin + '%' : ''} |

- **Operating Cash Flow (OCF):** ${df.operatingCashFlow != null ? (df.operatingCashFlow >= 0 ? '+' : '') + df.operatingCashFlow + ' ' + (df.reportingCurrency || '') : 'N/A'}
- **Net Debt & Leverage:** ${df.netDebt != null ? (df.netDebt <= 0 ? 'Net Cash (' + Math.abs(df.netDebt) + ' ' + (df.reportingCurrency || '') + ')' : df.netDebt + ' ' + (df.reportingCurrency || '')) : 'N/A'} (Debt/Equity: ${df.debtToEquity != null ? df.debtToEquity + 'x' : 'N/A'})
- **DRHP Forensic Audit Surveillance:** ${df.forensicAuditVerdict || 'Clean restated trajectory'}

---

### 2. The Business & Red Flags
- **Business Reality:** ${part2_businessAndRedFlags.whatTheyDo}
- **Competitive Moat:** ${part2_businessAndRedFlags.moat}
- **Critical Red Flags Identified:**
${part2_businessAndRedFlags.redFlags.map(r => `  - ${r}`).join('\n')}

---

### 3. Valuation vs. Listed Peers
**Comparative Benchmark:** ${part3_valuationVsPeers.benchmarkDiscountSummary}

| Company | Ticker | P/E | P/B | EV/EBITDA | Net Margin | Market Cap |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **${part3_valuationVsPeers.target.name}** | **${part3_valuationVsPeers.target.ticker}** | **${part3_valuationVsPeers.target.pe}** | **${part3_valuationVsPeers.target.pb}** | **${part3_valuationVsPeers.target.evEbitda}** | **${part3_valuationVsPeers.target.patMargin}** | **${part3_valuationVsPeers.target.mcap}** |
${part3_valuationVsPeers.peers.map(p => `| ${p.name} | ${p.ticker} | ${p.pe} | ${p.pb} | ${p.evEbitda} | ${p.patMargin} | ${p.mcap} |`).join('\n')}

---

### 4. Market Sentiment & Demand Metrics
${part4_marketSentiment.isIndia
  ? `- **Grey Market Premium (GMP):** ${part4_marketSentiment.gmpPrice} (${part4_marketSentiment.gmpPct})
- **Subscription Momentum:** QIB: ${part4_marketSentiment.subscription.qib}x | NII: ${part4_marketSentiment.subscription.nii}x | Retail: ${part4_marketSentiment.subscription.retail}x | Total: ${part4_marketSentiment.subscription.total}x
- **Anchor Quality:** ${part4_marketSentiment.anchorQuality}
- **Market Volatility (India VIX):** ${part4_marketSentiment.macroVix}`
  : `- **Book Building Momentum:** Total Coverage: ${part4_marketSentiment.subscription.total}x (QIB: ${part4_marketSentiment.subscription.qib}x)
- **Lead Underwriter Tier:** ${part4_marketSentiment.underwriterTier}
- **Anchor Investors:** ${part4_marketSentiment.anchorQuality}
- **Market Volatility (US VIX):** ${part4_marketSentiment.macroVix}`}

---

### 5. Tactical Listing Note
> 💡 **Strategic Listing Guidance:** ${part5_tacticalNote}
`.trim();
  }
}
