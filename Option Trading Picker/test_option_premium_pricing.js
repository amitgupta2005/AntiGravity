/**
 * Automated Verification Suite for Option Premium Entry, Target, and Stoploss Pricing
 * Tests specific Indian Market & general option mechanics:
 * e.g., 100 Shares of X @ ₹2.00 Entry Premium -> Target: ₹3.10 (+55%), Stoploss: ₹1.20 (-40%)
 */

import assert from 'assert';
import { buildExitPlan, scanStrategiesForAsset } from './src/quant/strategyEngine.js';

console.log('🧪 Starting Option Premium Entry, Target, & Stoploss Verification Suite...\n');

// ----------------------------------------------------------------------------
// Test 1: User's Exact Specification: 100 Shares of X @ 2.00 Premium (Long Call)
// ----------------------------------------------------------------------------
console.log('▶ Test 1: Verifying User Exact Example: 100 Shares of X @ ₹2.00 Entry Premium...');

const userCallExitPlan = buildExitPlan({
  type: 'LONG_CALL',
  S: 100,
  lotSize: 100,
  netCost: 200, // 100 shares * ₹2.00
  maxProfit: 'Unlimited',
  maxLoss: 200,
  isCredit: false,
  curr: '₹',
  premium: 2.00,
  step: 5
});

assert.strictEqual(userCallExitPlan.entryPremium, 2.00, 'Entry Premium must equal ₹2.00');
assert.strictEqual(userCallExitPlan.targetBooking.targetPremium, 3.10, 'Target Premium must equal ₹3.10 (+55%)');
assert.strictEqual(userCallExitPlan.targetBooking.profitPerShare, 1.10, 'Target profit per share must equal ₹1.10');
assert.strictEqual(userCallExitPlan.targetBooking.profitPerLot, 110.00, 'Target profit for 100 shares must equal ₹110.00');

assert.strictEqual(userCallExitPlan.stopLoss.stopLossPremium, 1.20, 'Stoploss Premium must equal ₹1.20 (-40%)');
assert.strictEqual(userCallExitPlan.stopLoss.lossPerShare, 0.80, 'Stoploss loss per share must equal ₹0.80');
assert.strictEqual(userCallExitPlan.stopLoss.lossPerLot, 80.00, 'Stoploss max loss for 100 shares must equal ₹80.00');

console.log('  ✅ 100 Shares @ ₹2.00 Long Call verified:');
console.log(`     Entry Premium: ₹${userCallExitPlan.entryPremium}`);
console.log(`     Target Premium: ₹${userCallExitPlan.targetBooking.targetPremium} (+₹${userCallExitPlan.targetBooking.profitPerShare}/share -> +₹${userCallExitPlan.targetBooking.profitPerLot}/lot)`);
console.log(`     Stoploss Premium: ₹${userCallExitPlan.stopLoss.stopLossPremium} (-₹${userCallExitPlan.stopLoss.lossPerShare}/share -> -₹${userCallExitPlan.stopLoss.lossPerLot}/lot)`);

// ----------------------------------------------------------------------------
// Test 2: User's Specification: 100 Shares of X @ 2.00 Premium (Long Put)
// ----------------------------------------------------------------------------
console.log('\n▶ Test 2: Verifying Long Put @ ₹2.00 Entry Premium for 100 Shares...');

const userPutExitPlan = buildExitPlan({
  type: 'LONG_PUT',
  S: 100,
  lotSize: 100,
  netCost: 200,
  maxProfit: 9800,
  maxLoss: 200,
  isCredit: false,
  curr: '₹',
  premium: 2.00,
  step: 5
});

assert.strictEqual(userPutExitPlan.entryPremium, 2.00);
assert.strictEqual(userPutExitPlan.targetBooking.targetPremium, 3.10);
assert.strictEqual(userPutExitPlan.targetBooking.profitPerLot, 110.00);
assert.strictEqual(userPutExitPlan.stopLoss.stopLossPremium, 1.20);
assert.strictEqual(userPutExitPlan.stopLoss.lossPerLot, 80.00);
console.log('  ✅ Long Put @ ₹2.00 verified: TP ₹3.10 (+₹110/lot), SL ₹1.20 (-₹80/lot)');

// ----------------------------------------------------------------------------
// Test 3: Indian Stock Real Lot Sizes (e.g., RELIANCE Lot 250, HDFCBANK Lot 550)
// ----------------------------------------------------------------------------
console.log('\n▶ Test 3: Verifying Indian Stock F&O Lot Sizes (Reliance lot 250 @ ₹15.50)...');

const relianceExitPlan = buildExitPlan({
  type: 'LONG_CALL',
  S: 2750,
  lotSize: 250,
  netCost: 15.50 * 250, // 3875
  maxProfit: 'Unlimited',
  maxLoss: 15.50 * 250,
  isCredit: false,
  curr: '₹',
  premium: 15.50,
  step: 20
});

assert.strictEqual(relianceExitPlan.entryPremium, 15.50);
assert.strictEqual(relianceExitPlan.targetBooking.targetPremium, 24.03); // 15.50 * 1.55 = 24.025 -> 24.03
assert.strictEqual(relianceExitPlan.stopLoss.stopLossPremium, 9.30); // 15.50 * 0.60 = 9.30
console.log(`  ✅ Reliance (250 lot) verified: Entry ₹${relianceExitPlan.entryPremium} ➔ TP ₹${relianceExitPlan.targetBooking.targetPremium} | SL ₹${relianceExitPlan.stopLoss.stopLossPremium}`);

// ----------------------------------------------------------------------------
// Test 4: Debit Spreads (Bull Call Spread & Bear Put Spread)
// ----------------------------------------------------------------------------
console.log('\n▶ Test 4: Verifying Debit Spreads (Bull Call Spread)...');

const debitSpreadExitPlan = buildExitPlan({
  type: 'BULL_CALL_SPREAD',
  S: 500,
  lotSize: 100,
  netCost: 200, // net debit ₹2.00/share
  maxProfit: 300, // ₹3.00 max profit/share
  maxLoss: 200,
  isCredit: false,
  curr: '₹',
  upperStrike: 510,
  lowerStrike: 505,
  premium: 2.00,
  step: 5
});

assert.strictEqual(debitSpreadExitPlan.entryPremium, 2.00, 'Entry debit must be ₹2.00');
assert(debitSpreadExitPlan.targetBooking.targetPremium > 2.00, 'Target spread value must expand above entry');
assert(debitSpreadExitPlan.stopLoss.stopLossPremium < 2.00, 'Stop spread value must contract below entry');
console.log(`  ✅ Bull Call Spread verified: Entry ₹${debitSpreadExitPlan.entryPremium} ➔ Target Spread ₹${debitSpreadExitPlan.targetBooking.targetPremium} | Stop Spread ₹${debitSpreadExitPlan.stopLoss.stopLossPremium}`);

// ----------------------------------------------------------------------------
// Test 5: Credit Spreads (Bull Put Spread & Bear Call Spread)
// ----------------------------------------------------------------------------
console.log('\n▶ Test 5: Verifying Credit Spreads (Bull Put Spread)...');

const creditSpreadExitPlan = buildExitPlan({
  type: 'BULL_PUT_SPREAD',
  S: 500,
  lotSize: 100,
  netCost: 200, // net credit ₹2.00/share
  maxProfit: 200,
  maxLoss: 300,
  isCredit: true,
  curr: '₹',
  shortStrike: 495,
  longStrike: 490,
  premium: 2.00,
  step: 5
});

assert.strictEqual(creditSpreadExitPlan.entryPremium, 2.00, 'Entry credit must be ₹2.00');
assert.strictEqual(creditSpreadExitPlan.targetBooking.targetPremium, 1.00, 'Target buyback must be 50% credit = ₹1.00');
assert.strictEqual(creditSpreadExitPlan.stopLoss.stopLossPremium, 5.00, 'Stoploss buyback must be 2.5x credit = ₹5.00');
console.log(`  ✅ Bull Put Spread verified: Entry Credit ₹${creditSpreadExitPlan.entryPremium} ➔ Buyback Target ₹${creditSpreadExitPlan.targetBooking.targetPremium} | Buyback SL ₹${creditSpreadExitPlan.stopLoss.stopLossPremium}`);

// ----------------------------------------------------------------------------
// Test 6: Verify scanStrategiesForAsset propagates all premium fields
// ----------------------------------------------------------------------------
console.log('\n▶ Test 6: Verifying scanStrategiesForAsset attaches premium fields on all strategies...');

const testQuote = {
  ticker: 'RELIANCE.NS',
  displayTicker: 'RELIANCE',
  name: 'Reliance Industries Ltd',
  market: 'IN',
  type: 'STOCK',
  price: 2740,
  strikeStep: 20,
  iv: 22.0,
  hv: 16.0,
  ivRank: 45,
  sma50: 2700,
  currency: 'INR',
  currencySymbol: '₹',
  lotSize: 250
};

const strats = scanStrategiesForAsset(testQuote);
assert(strats.length > 0, 'Should generate strategies for Reliance');

for (const s of strats) {
  assert(s.entryPremium !== undefined && s.entryPremium !== null, `Strategy ${s.strategyName} missing entryPremium`);
  assert(s.targetPremium !== undefined && s.targetPremium !== null, `Strategy ${s.strategyName} missing targetPremium`);
  assert(s.stopLossPremium !== undefined && s.stopLossPremium !== null, `Strategy ${s.strategyName} missing stopLossPremium`);
  assert(s.exitPlan.entryPremium !== undefined, `Strategy ${s.strategyName} exitPlan missing entryPremium`);
  assert(s.exitPlan.targetBooking.targetPremium !== undefined, `Strategy ${s.strategyName} targetBooking missing targetPremium`);
  assert(s.exitPlan.stopLoss.stopLossPremium !== undefined, `Strategy ${s.strategyName} stopLoss missing stopLossPremium`);
}
console.log(`  ✅ Verified ${strats.length} strategies: all successfully contain entryPremium, targetPremium, and stopLossPremium!`);

console.log('\n🎉 ALL OPTION PREMIUM ENTRY, TARGET, AND STOPLOSS TESTS PASSED!');
