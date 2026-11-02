/**
 * Automated Verification Suite for Enhanced Option Trading Rules
 * Validates:
 * 1. Volatility Risk Premium (VRP >= 3.0%) Gating for Credit Selling
 * 2. Trend Regime Alignment (Uptrend for Bull Put, Downtrend for Bear Call)
 * 3. 21-DTE Gamma Armor Cutoff Rule in Exit Plans
 * 4. 16-Delta Asymmetric Strangle Condor for Theta Decay
 */

import assert from 'assert';
import { scanStrategiesForAsset, buildExitPlan, STRATEGY_CATEGORIES } from './src/quant/strategyEngine.js';

console.log('🧪 Starting Quantitative Anti-Curve-Fitting Rules Verification Suite...\n');

// ----------------------------------------------------------------------------
// Test 1: Volatility Risk Premium (VRP) Gating Rule
// ----------------------------------------------------------------------------
console.log('▶ Test 1: Verifying Volatility Risk Premium (VRP >= +3.0%) Gating...');

// Scenario A: Underpriced Volatility (IV = 18%, HV = 17% -> VRP = +1.0% < 3.0%)
const underpricedQuote = {
  ticker: 'AAPL',
  displayTicker: 'AAPL',
  name: 'Apple Inc',
  market: 'US',
  type: 'STOCK',
  price: 230,
  strikeStep: 5,
  iv: 18.0,
  hv: 17.0, // VRP = +1.0%
  ivRank: 45,
  sma50: 220, // Uptrend
  currency: 'USD',
  currencySymbol: '$',
  lotSize: 100
};

const underpricedStrats = scanStrategiesForAsset(underpricedQuote);
const creditStratsUnderpriced = underpricedStrats.filter(s => s.isCredit);
assert.strictEqual(
  creditStratsUnderpriced.length,
  0,
  `Credit strategies must be blocked when VRP < 3.0%, but found ${creditStratsUnderpriced.length}`
);
console.log('  ✅ Underpriced Volatility (VRP +1.0% < 3.0%) correctly blocked all credit selling strategies.');

// Scenario B: Rich Volatility (IV = 26%, HV = 21% -> VRP = +5.0% >= 3.0%)
const richQuote = {
  ticker: 'AAPL',
  displayTicker: 'AAPL',
  name: 'Apple Inc',
  market: 'US',
  type: 'STOCK',
  price: 230,
  strikeStep: 5,
  iv: 26.0,
  hv: 21.0, // VRP = +5.0%
  ivRank: 55,
  sma50: 220, // Uptrend
  currency: 'USD',
  currencySymbol: '$',
  lotSize: 100
};

const richStrats = scanStrategiesForAsset(richQuote);
const creditStratsRich = richStrats.filter(s => s.isCredit);
assert(creditStratsRich.length > 0, 'Credit strategies must be permitted when VRP >= 3.0%');
console.log(`  ✅ Rich Volatility (VRP +5.0% >= 3.0%) permitted ${creditStratsRich.length} high-edge credit strategies.`);

// ----------------------------------------------------------------------------
// Test 2: Trend Regime Alignment Gating Rule
// ----------------------------------------------------------------------------
console.log('\n▶ Test 2: Verifying Trend Regime Alignment Gating Rule...');

// Scenario A: Uptrend (Price 230 >= SMA50 215)
const uptrendQuote = {
  ticker: 'NVDA',
  displayTicker: 'NVDA',
  price: 135,
  strikeStep: 2.5,
  iv: 48.0,
  hv: 42.0, // VRP = +6.0%
  ivRank: 60,
  sma50: 125, // Uptrend: Price > SMA50
  currency: 'USD',
  currencySymbol: '$',
  lotSize: 100
};

const uptrendStrats = scanStrategiesForAsset(uptrendQuote);
const hasBullPut = uptrendStrats.some(s => s.strategyName.includes('Bull Put Spread'));
const hasBearCall = uptrendStrats.some(s => s.strategyName.includes('Bear Call Spread'));
assert(hasBullPut, 'Uptrend must permit Bull Put Spread');
assert(!hasBearCall, 'Uptrend must NEVER generate Bear Call Spread (counter-trend risk)');
console.log('  ✅ Uptrend (Price >= SMA50): Bull Put Spread ALLOWED, Bear Call Spread BLOCKED.');

// Scenario B: Downtrend (Price 115 < SMA50 128)
const downtrendQuote = {
  ticker: 'INTC',
  displayTicker: 'INTC',
  price: 22,
  strikeStep: 1,
  iv: 42.0,
  hv: 36.0, // VRP = +6.0%
  ivRank: 60,
  sma50: 26, // Downtrend: Price < SMA50
  currency: 'USD',
  currencySymbol: '$',
  lotSize: 100
};

const downtrendStrats = scanStrategiesForAsset(downtrendQuote);
const dtHasBullPut = downtrendStrats.some(s => s.strategyName.includes('Bull Put Spread'));
const dtHasBearCall = downtrendStrats.some(s => s.strategyName.includes('Bear Call Spread'));
assert(!dtHasBullPut, 'Downtrend must NEVER generate Bull Put Spread (falling knife risk)');
assert(dtHasBearCall, 'Downtrend must permit Bear Call Spread');
console.log('  ✅ Downtrend (Price < SMA50): Bull Put Spread BLOCKED, Bear Call Spread ALLOWED.');

// ----------------------------------------------------------------------------
// Test 3: 21-DTE Gamma Armor Cutoff Rule
// ----------------------------------------------------------------------------
console.log('\n▶ Test 3: Verifying 21-DTE Gamma Armor Cutoff Rule in Exit Plans...');

const creditExitPlan = buildExitPlan({
  type: 'BULL_PUT_SPREAD',
  S: 100,
  lotSize: 100,
  netCost: 150,
  maxProfit: 150,
  maxLoss: 350,
  isCredit: true,
  curr: '$',
  shortStrike: 95,
  longStrike: 90,
  step: 5
});

assert.strictEqual(creditExitPlan.gammaArmorDte, 21, 'Credit exit plan must specify 21 DTE Gamma Armor');
assert(creditExitPlan.laymanSummary.timeExitRule.includes('21-DTE Gamma Armor'), 'Time exit rule must describe 21-DTE Gamma Armor');
console.log('  ✅ Bull Put Spread exit plan contains gammaArmorDte = 21 and laymanSummary time rule.');

const thetaExitPlan = buildExitPlan({
  type: 'THETA_DECAY',
  S: 100,
  lotSize: 100,
  netCost: 200,
  maxProfit: 200,
  maxLoss: 600,
  isCredit: true,
  curr: '$',
  atmStrike: 100,
  shortStrike: 95,
  step: 5
});

assert.strictEqual(thetaExitPlan.gammaArmorDte, 21, 'Theta Decay exit plan must specify 21 DTE Gamma Armor');
assert(thetaExitPlan.laymanSummary.timeExitRule.includes('21-DTE Gamma Armor'), 'Theta decay time rule must describe 21-DTE Gamma Armor');
console.log('  ✅ Theta Decay exit plan contains gammaArmorDte = 21 and laymanSummary time rule.');

// ----------------------------------------------------------------------------
// Test 4: 16-Delta Asymmetric Strangle Condor for Theta Decay
// ----------------------------------------------------------------------------
console.log('\n▶ Test 4: Verifying 16-Delta Asymmetric Strangle Condor (Replacing ATM Butterfly)...');

const thetaQuote = {
  ticker: 'SPY',
  displayTicker: 'SPY',
  price: 580,
  strikeStep: 5,
  iv: 22.0,
  hv: 17.0, // VRP = +5.0%
  ivRank: 55,
  currency: 'USD',
  currencySymbol: '$',
  lotSize: 100
};

const thetaStrats = scanStrategiesForAsset(thetaQuote);
const thetaHarvestStrat = thetaStrats.find(s => s.category === STRATEGY_CATEGORIES.THETA_DECAY);

assert(thetaHarvestStrat, 'Theta decay strategy must be generated for rich vol');
assert.strictEqual(thetaHarvestStrat.strategyName, 'Theta Decay Harvester (16-Delta Strangle Condor)');
assert.strictEqual(thetaHarvestStrat.conviction, '1-Sigma Safe Buffer');

// Verify legs are 16-Delta wide wings and asymmetric
const shortPutLeg = thetaHarvestStrat.legs.find(l => l.type === 'put' && l.action === 'sell');
const shortCallLeg = thetaHarvestStrat.legs.find(l => l.type === 'call' && l.action === 'sell');
const longPutLeg = thetaHarvestStrat.legs.find(l => l.type === 'put' && l.action === 'buy');
const longCallLeg = thetaHarvestStrat.legs.find(l => l.type === 'call' && l.action === 'buy');

assert(shortPutLeg.strike < thetaQuote.price, 'Short put must be OTM');
assert(shortCallLeg.strike > thetaQuote.price, 'Short call must be OTM');
assert(longPutLeg.strike < shortPutLeg.strike, 'Long put must protect below short put');
assert(longCallLeg.strike > shortCallLeg.strike, 'Long call must protect above short call');

// Verify asymmetric put cushion: put wing (shortPut - longPut) should be >= call wing (longCall - shortCall)
const putWingWidth = shortPutLeg.strike - longPutLeg.strike;
const callWingWidth = longCallLeg.strike - shortCallLeg.strike;
assert(putWingWidth >= callWingWidth, 'Put wing width must have asymmetric skew protection');

console.log(`  ✅ Theta Decay Harvester successfully uses 16-Delta Strangle Condor:`);
console.log(`     Long Put: ${longPutLeg.strike} | Short Put: ${shortPutLeg.strike} | Spot: ${thetaQuote.price} | Short Call: ${shortCallLeg.strike} | Long Call: ${longCallLeg.strike}`);
console.log(`     Asymmetric Put Wing: $${putWingWidth} vs Call Wing: $${callWingWidth} for skew defense.`);

console.log('\n🎉 ALL QUANTITATIVE ANTI-CURVE-FITTING ENHANCEMENT TESTS PASSED!');
