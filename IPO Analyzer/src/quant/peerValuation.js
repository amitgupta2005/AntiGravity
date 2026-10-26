/**
 * Peer Valuation & Multi-factor Comp Module
 * Calculates peer benchmarks, medians, and relative valuation discounts/premiums.
 */

export function calculatePeerBenchmarks(peers = [], targetValuation = {}) {
  if (!peers || peers.length === 0) {
    return {
      peerCount: 0,
      medianPE: null,
      medianPB: null,
      medianEvEbitda: null,
      medianPatMargin: null,
      peDiscountPct: 0,
      evDiscountPct: 0,
      status: 'NO_PEERS',
      statusLabel: 'No Listed Peers Available'
    };
  }

  const validPEs = peers.map(p => p.pe).filter(v => typeof v === 'number' && v > 0);
  const validPBs = peers.map(p => p.pb).filter(v => typeof v === 'number' && v > 0);
  const validEvEbitda = peers.map(p => p.evEbitda).filter(v => typeof v === 'number' && v > 0);
  const validMargins = peers.map(p => p.patMargin).filter(v => typeof v === 'number');

  const medianPE = computeMedian(validPEs);
  const medianPB = computeMedian(validPBs);
  const medianEvEbitda = computeMedian(validEvEbitda);
  const medianPatMargin = computeMedian(validMargins);

  const targetPE = targetValuation.peRatio;
  const targetEvEbitda = targetValuation.evEbitda;

  let peDiscountPct = 0;
  if (medianPE && typeof targetPE === 'number' && targetPE > 0) {
    // Positive means target is cheaper (discount to peers)
    // Negative means target is more expensive (premium to peers)
    peDiscountPct = Number((((medianPE - targetPE) / medianPE) * 100).toFixed(1));
  }

  let evDiscountPct = 0;
  if (medianEvEbitda && typeof targetEvEbitda === 'number' && targetEvEbitda > 0) {
    evDiscountPct = Number((((medianEvEbitda - targetEvEbitda) / medianEvEbitda) * 100).toFixed(1));
  }

  let status = 'FAIR';
  let statusLabel = 'Fairly Valued vs Peers';

  if (peDiscountPct >= 20 || evDiscountPct >= 20) {
    status = 'DISCOUNT';
    statusLabel = `Attractive Discount (~${Math.max(peDiscountPct, evDiscountPct)}% vs Peers)`;
  } else if (peDiscountPct <= -25 || evDiscountPct <= -25) {
    status = 'EXPENSIVE';
    statusLabel = `Steep Premium (~${Math.abs(Math.min(peDiscountPct, evDiscountPct))}% above Peers)`;
  } else if (peDiscountPct < -5 || peDiscountPct > 5) {
    status = 'PRICED_TO_PERFECTION';
    statusLabel = 'Priced to Perfection (In-line with Industry Leaders)';
  }

  return {
    peerCount: peers.length,
    medianPE: medianPE ? Number(medianPE.toFixed(1)) : null,
    medianPB: medianPB ? Number(medianPB.toFixed(1)) : null,
    medianEvEbitda: medianEvEbitda ? Number(medianEvEbitda.toFixed(1)) : null,
    medianPatMargin: medianPatMargin ? Number(medianPatMargin.toFixed(1)) : null,
    peDiscountPct,
    evDiscountPct,
    status,
    statusLabel
  };
}

function computeMedian(arr) {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
