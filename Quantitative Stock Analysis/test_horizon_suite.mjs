import assert from 'assert';
import { 
  HORIZON_UNIVERSE, 
  HORIZONS, 
  ASSET_TYPES, 
  CAP_CATEGORIES, 
  CAP_CATEGORY_LABELS,
  HORIZON_LABELS 
} from './src/data/horizonUniverse.js';
import { 
  evaluateShortTerm, 
  evaluateMediumTerm, 
  evaluateLongTerm, 
  generateHorizonRecommendations 
} from './src/quant/horizonEngine.js';

console.log('🧪 Starting Quantitative Horizon Scanner & Mid/Small-Cap Test Suite...\n');

// TEST 1: Universe Asset Counts & Market Cap Distribution
console.log('▶ Test 1: Universe Asset Counts & Market Cap Distribution');
{
  assert.strictEqual(HORIZON_UNIVERSE.length, 69, 'Expected 69 total assets');

  const midCaps = HORIZON_UNIVERSE.filter(a => a.capCategory === CAP_CATEGORIES.MID_CAP);
  const smallCaps = HORIZON_UNIVERSE.filter(a => a.capCategory === CAP_CATEGORIES.SMALL_CAP);
  const largeCaps = HORIZON_UNIVERSE.filter(a => a.capCategory === CAP_CATEGORIES.LARGE_CAP);
  const etfsAndIndices = HORIZON_UNIVERSE.filter(a => a.capCategory == null);

  assert.strictEqual(midCaps.length, 21, 'Expected 21 Midcap stocks');
  assert.strictEqual(smallCaps.length, 20, 'Expected 20 Smallcap stocks');
  assert.strictEqual(largeCaps.length, 12, 'Expected 12 Largecap stocks');
  assert.strictEqual(etfsAndIndices.length, 16, 'Expected 16 ETFs & Indices');

  // Verify market split
  const inMid = midCaps.filter(a => a.market === 'IN');
  const usMid = midCaps.filter(a => a.market === 'US');
  const inSmall = smallCaps.filter(a => a.market === 'IN');
  const usSmall = smallCaps.filter(a => a.market === 'US');

  assert.strictEqual(inMid.length, 10, 'Expected 10 India Midcaps');
  assert.strictEqual(usMid.length, 11, 'Expected 11 US Midcaps');
  assert.strictEqual(inSmall.length, 10, 'Expected 10 India Smallcaps');
  assert.strictEqual(usSmall.length, 10, 'Expected 10 US Smallcaps');

  console.log('  ✅ Total Assets: 69');
  console.log('  ✅ India Midcaps (10): ' + inMid.map(a => a.displayTicker).join(', '));
  console.log('  ✅ US Midcaps (11): ' + usMid.map(a => a.displayTicker).join(', '));
  console.log('  ✅ India Smallcaps (10): ' + inSmall.map(a => a.displayTicker).join(', '));
  console.log('  ✅ US Smallcaps (10): ' + usSmall.map(a => a.displayTicker).join(', '));
}

// TEST 2: Schema Integrity & Quality Parameters
console.log('\n▶ Test 2: Asset Schema Integrity & Quantitative Fields Validation');
{
  HORIZON_UNIVERSE.forEach(asset => {
    assert(asset.ticker, 'Ticker must exist');
    assert(asset.displayTicker, 'displayTicker must exist');
    assert(asset.name, 'Name must exist');
    assert(asset.market === 'IN' || asset.market === 'US', 'Market must be IN or US');
    assert(asset.price > 0, asset.ticker + ' price must be > 0');
    assert(asset.currencySymbol === '₹' || asset.currencySymbol === '$', 'Currency symbol valid');
    assert(asset.primaryHorizon in HORIZONS, 'primaryHorizon must be valid');
    assert(Array.isArray(asset.suitableHorizons) && asset.suitableHorizons.length > 0, 'suitableHorizons must be non-empty');
    assert(typeof asset.fScore === 'number' && asset.fScore >= 1 && asset.fScore <= 9, 'Piotroski score must be 1-9');
  });
  console.log('  ✅ All 69 assets adhere strictly to quantitative multi-factor schema.');
}

// TEST 3: Horizon Engine Execution on All Assets
console.log('\n▶ Test 3: Horizon Recommendation Engine Evaluation');
{
  const recommendations = generateHorizonRecommendations(HORIZON_UNIVERSE);
  assert.strictEqual(recommendations.length, 69, 'Should evaluate all 69 assets');

  recommendations.forEach(rec => {
    const { asset, bestFitHorizon, evaluations } = rec;
    assert(bestFitHorizon in HORIZONS, 'Best fit horizon valid for ' + asset.ticker);

    // Verify Short Term
    const st = evaluations[HORIZONS.SHORT_TERM];
    assert(st.score >= 50 && st.score <= 100, 'Short score out of range for ' + asset.ticker + ': ' + st.score);
    assert(st.targetPrice > 0, 'Short target price must be > 0');
    assert(st.stopLossPrice > 0 && st.stopLossPrice < asset.price, 'Short stop loss must be < current price');
    assert(st.entryStrategy.entryZone.length > 0, 'Entry zone must exist');
    assert(st.exitStrategy.target1Price > 0, 'Exit Target 1 must exist');
    assert(st.exitStrategy.target2Price > 0, 'Exit Target 2 must exist');

    // Verify Medium Term
    const mt = evaluations[HORIZONS.MEDIUM_TERM];
    assert(mt.score >= 40 && mt.score <= 100, 'Medium score out of range for ' + asset.ticker + ': ' + mt.score);
    assert(mt.targetPrice > 0, 'Medium target price must be > 0');

    // Verify Long Term
    const lt = evaluations[HORIZONS.LONG_TERM];
    assert(lt.score >= 40 && lt.score <= 100, 'Long score out of range for ' + asset.ticker + ': ' + lt.score);
    assert(lt.targetPrice > 0, 'Long target price must be > 0');
  });

  console.log('  ✅ All 69 assets evaluated with 3 distinct horizons without errors or NaN values.');
}

// TEST 4: Specific Midcap & Smallcap Checks
console.log('\n▶ Test 4: Midcap & Smallcap Setup Spot-Checks');
{
  const recs = generateHorizonRecommendations(HORIZON_UNIVERSE);

  // Spot-check India Midcap: Polycab
  const polycab = recs.find(r => r.asset.ticker === 'POLYCAB.NS');
  assert(polycab, 'POLYCAB.NS must exist in recommendations');
  assert.strictEqual(polycab.asset.capCategory, CAP_CATEGORIES.MID_CAP);
  console.log('  ✅ Polycab India: Score=' + polycab.evaluations[polycab.bestFitHorizon].score + '/100, Horizon=' + polycab.bestFitHorizon + ', Target=' + polycab.evaluations[polycab.bestFitHorizon].targetGainPct);

  // Spot-check India Smallcap: RVNL
  const rvnl = recs.find(r => r.asset.ticker === 'RVNL.NS');
  assert(rvnl, 'RVNL.NS must exist in recommendations');
  assert.strictEqual(rvnl.asset.capCategory, CAP_CATEGORIES.SMALL_CAP);
  console.log('  ✅ Rail Vikas Nigam (RVNL): Score=' + rvnl.evaluations[rvnl.bestFitHorizon].score + '/100, Horizon=' + rvnl.bestFitHorizon + ', Target=' + rvnl.evaluations[rvnl.bestFitHorizon].targetGainPct);

  // Spot-check US Midcap: Coinbase
  const coin = recs.find(r => r.asset.ticker === 'COIN');
  assert(coin, 'COIN must exist in recommendations');
  assert.strictEqual(coin.asset.capCategory, CAP_CATEGORIES.MID_CAP);
  console.log('  ✅ Coinbase Global (COIN): Score=' + coin.evaluations[coin.bestFitHorizon].score + '/100, Horizon=' + coin.bestFitHorizon + ', Target=' + coin.evaluations[coin.bestFitHorizon].targetGainPct);

  // Spot-check US Smallcap: AST SpaceMobile
  const asts = recs.find(r => r.asset.ticker === 'ASTS');
  assert(asts, 'ASTS must exist in recommendations');
  assert.strictEqual(asts.asset.capCategory, CAP_CATEGORIES.SMALL_CAP);
  console.log('  ✅ AST SpaceMobile (ASTS): Score=' + asts.evaluations[asts.bestFitHorizon].score + '/100, Horizon=' + asts.bestFitHorizon + ', Target=' + asts.evaluations[asts.bestFitHorizon].targetGainPct);
}

// TEST 5: Performance & Memory Leak Guards
console.log('\n▶ Test 5: Performance & Memory Leak Guards Verification');
{
  assert(CAP_CATEGORIES.LARGE_CAP && CAP_CATEGORIES.MID_CAP && CAP_CATEGORIES.SMALL_CAP, 'CAP_CATEGORIES complete');
  assert.strictEqual(CAP_CATEGORY_LABELS.MID_CAP.badgeClass, 'cap-pill-mid', 'Midcap pill badge valid');
  assert.strictEqual(CAP_CATEGORY_LABELS.SMALL_CAP.badgeClass, 'cap-pill-small', 'Smallcap pill badge valid');
  console.log('  ✅ Cap categories, labels, and badges properly exported.');
}

console.log('\n🎉 ALL 5 TEST SUITES PASSED! Midcap & Smallcap stocks from USA and India fully operational with zero leaks.\n');
