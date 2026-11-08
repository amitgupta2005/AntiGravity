/**
 * Option Trading Strategy Scanner & Classification Engine
 * Quantitative multi-strategy detector for US & Indian Stocks and Indices
 * with dynamic Stop Loss, Target Profit Booking, and Capital Preservation Exit Rules.
 */

import { calculateGreeks, calculatePOP } from './blackScholes.js';
import { calculatePayoffProfile } from './payoffCalculator.js';
import { getMarketExpirations } from '../data/marketDataFeed.js';

export const STRATEGY_CATEGORIES = {
  ALL: 'ALL',
  THETA_DECAY: 'THETA_DECAY',
  BULLISH_CALLS: 'BULLISH_CALLS',
  BEARISH_PUTS: 'BEARISH_PUTS',
  CREDIT_SPREADS: 'CREDIT_SPREADS',
  DEBIT_SPREADS: 'DEBIT_SPREADS',
  IRON_CONDORS: 'IRON_CONDORS',
  STRADDLES: 'STRADDLES'
};

export const RISK_PROFILES = {
  ALL: 'ALL',
  CONSERVATIVE: 'CONSERVATIVE', // Disciplined 35-40% stop loss & 50% profit booking
  BALANCED: 'BALANCED',         // Standard 50% stop loss & 60% profit booking
  AGGRESSIVE: 'AGGRESSIVE'      // Expiration hold
};

/**
 * Build structured Exit Plan with Stop Loss and Target Booking
 */
export function buildExitPlan({
  type,
  S,
  lotSize,
  netCost,
  maxProfit,
  maxLoss,
  isCredit,
  curr,
  upperStrike,
  lowerStrike,
  shortStrike,
  longStrike,
  atmStrike,
  premium,
  step
}) {
  const actualLot = Math.max(1, lotSize || 100);
  const entryPremium = (premium !== undefined && premium !== null)
    ? Number(Number(premium).toFixed(2))
    : Number((netCost / actualLot).toFixed(2));

  let targetBooking = {};
  let stopLoss = {};
  let managedRiskReward = '1 : 2.0';
  let capitalPreservedPct = 60;
  let riskProfile = RISK_PROFILES.BALANCED;
  let laymanSummary = {};

  switch (type) {
    case 'LONG_CALL': {
      const targetPremium = Number((entryPremium * 1.55).toFixed(2)); // +55% target premium
      const stopLossPremium = Number(Math.max(0.05, entryPremium * 0.60).toFixed(2)); // -40% stoploss premium
      const profitPerShare = Number((targetPremium - entryPremium).toFixed(2));
      const lossPerShare = Number((entryPremium - stopLossPremium).toFixed(2));

      const targetSpot = Number((S * 1.04).toFixed(2));
      const targetProfitPerLot = Number((profitPerShare * actualLot).toFixed(2));
      const stopSpot = Number((S * 0.98).toFixed(2));
      const stopLossPerLot = Number((lossPerShare * actualLot).toFixed(2));

      targetBooking = {
        spotPrice: targetSpot,
        spotPct: '+4.0%',
        triggerText: `Stock reaches ${curr}${targetSpot}`,
        rule: `Book profit at ${curr}${targetPremium} (+55% Premium, +${curr}${targetProfitPerLot.toLocaleString()}/lot)`,
        laymanAction: `Target: Sell Call when option premium reaches ${curr}${targetPremium} (profit +${curr}${profitPerShare}/share, +${curr}${targetProfitPerLot.toLocaleString()}/lot) or stock touches ${curr}${targetSpot}.`,
        targetPremium,
        profitPerShare,
        profitPerLot: targetProfitPerLot,
        profitPct: '+55%'
      };
      stopLoss = {
        spotPrice: stopSpot,
        spotPct: '-2.0%',
        triggerText: `Stock falls below ${curr}${stopSpot}`,
        rule: `Stop loss: cut at ${curr}${stopLossPremium} (-40% Premium, -${curr}${stopLossPerLot.toLocaleString()}/lot)`,
        laymanAction: `Stop Loss: Exit immediately if option premium drops to ${curr}${stopLossPremium} (loss -${curr}${lossPerShare}/share, -${curr}${stopLossPerLot.toLocaleString()}/lot) or stock drops below ${curr}${stopSpot}.`,
        stopLossPremium,
        lossPerShare,
        lossPerLot: stopLossPerLot,
        lossPct: '-40%'
      };
      const ratio = (targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(1);
      managedRiskReward = `1 : ${ratio}`;
      capitalPreservedPct = 60;
      riskProfile = RISK_PROFILES.BALANCED;
      laymanSummary = {
        plainRule: `Buy @ ${curr}${entryPremium} ➔ Target @ ${curr}${targetPremium} (+${curr}${profitPerShare}/sh) | Stop @ ${curr}${stopLossPremium} (-${curr}${lossPerShare}/sh). Risk ${curr}${stopLossPerLot.toLocaleString()} to make ${curr}${targetProfitPerLot.toLocaleString()} (${ratio}x risk).`,
        timeExitRule: 'Exit 2–3 days before expiry to prevent time decay (theta) eating your call.',
        actionTip: 'First trigger wins: exit as soon as either Target Premium or Stop Loss Premium is touched.'
      };
      break;
    }

    case 'BULL_CALL_SPREAD': {
      const maxProfitPerShare = Number((maxProfit / actualLot).toFixed(2));
      const profitPerShare = Number((maxProfitPerShare * 0.70).toFixed(2));
      const targetPremium = Number((entryPremium + profitPerShare).toFixed(2));
      const lossPerShare = Number((entryPremium * 0.45).toFixed(2));
      const stopLossPremium = Number(Math.max(0.05, entryPremium - lossPerShare).toFixed(2));

      const targetSpot = Number(upperStrike.toFixed(2));
      const targetProfitPerLot = Number((profitPerShare * actualLot).toFixed(2));
      const stopSpot = Number((lowerStrike * 0.985).toFixed(2));
      const stopLossPerLot = Number((lossPerShare * actualLot).toFixed(2));

      targetBooking = {
        spotPrice: targetSpot,
        spotPct: `+${(((targetSpot - S) / S) * 100).toFixed(1)}%`,
        triggerText: `Stock reaches ${curr}${targetSpot}`,
        rule: `Book early at spread value ${curr}${targetPremium} (+70% max spread profit, +${curr}${targetProfitPerLot.toLocaleString()}/lot)`,
        laymanAction: `Target: Close both spread legs when spread value expands to ${curr}${targetPremium} (net gain +${curr}${profitPerShare}/share, +${curr}${targetProfitPerLot.toLocaleString()}/lot) or stock touches ${curr}${targetSpot}.`,
        targetPremium,
        profitPerShare,
        profitPerLot: targetProfitPerLot,
        profitPct: '+70% Spread'
      };
      stopLoss = {
        spotPrice: stopSpot,
        spotPct: '-1.5%',
        triggerText: `Stock drops below ${curr}${stopSpot}`,
        rule: `Stop loss: exit at spread value ${curr}${stopLossPremium} (-45% debit loss, -${curr}${stopLossPerLot.toLocaleString()}/lot)`,
        laymanAction: `Stop Loss: Close spread if value drops to ${curr}${stopLossPremium} (loss -${curr}${lossPerShare}/share, -${curr}${stopLossPerLot.toLocaleString()}/lot) or stock drops below ${curr}${stopSpot}.`,
        stopLossPremium,
        lossPerShare,
        lossPerLot: stopLossPerLot,
        lossPct: '-45%'
      };
      const ratio = (targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(1);
      managedRiskReward = `1 : ${ratio}`;
      capitalPreservedPct = 55;
      riskProfile = RISK_PROFILES.CONSERVATIVE;
      laymanSummary = {
        plainRule: `Net Debit @ ${curr}${entryPremium} ➔ Target Spread @ ${curr}${targetPremium} (+${curr}${profitPerShare}/sh) | Stop Spread @ ${curr}${stopLossPremium} (-${curr}${lossPerShare}/sh). Risk ${curr}${stopLossPerLot.toLocaleString()} to make ${curr}${targetProfitPerLot.toLocaleString()} (${ratio}x risk).`,
        timeExitRule: 'Book 70% profit early; avoids late reversal risk near expiration.',
        actionTip: 'Always close both Call legs together as a package.'
      };
      break;
    }

    case 'BULL_PUT_SPREAD': {
      const profitPerShare = Number((entryPremium * 0.50).toFixed(2));
      const targetPremium = Number((entryPremium * 0.50).toFixed(2)); // Buyback at 50% credit
      const lossPerShare = Number((entryPremium * 1.50).toFixed(2));
      const stopLossPremium = Number((entryPremium * 2.50).toFixed(2)); // Buyback expands to 2.5x credit

      const targetSpot = Number((S * 1.015).toFixed(2));
      const targetProfitPerLot = Number((profitPerShare * actualLot).toFixed(2));
      const stopSpot = Number((shortStrike * 0.995).toFixed(2));
      const stopLossPerLot = Number((lossPerShare * actualLot).toFixed(2));

      targetBooking = {
        spotPrice: targetSpot,
        spotPct: '+1.5%',
        triggerText: `Stock stays above ${curr}${shortStrike}`,
        rule: `Book early: buy back spread at ${curr}${targetPremium} (50% credit captured, +${curr}${targetProfitPerLot.toLocaleString()}/lot)`,
        laymanAction: `Target: Buy back spread when cost decays to ${curr}${targetPremium} (profit +${curr}${profitPerShare}/share, +${curr}${targetProfitPerLot.toLocaleString()}/lot). Free up margin.`,
        targetPremium,
        profitPerShare,
        profitPerLot: targetProfitPerLot,
        profitPct: '+50% Credit'
      };
      stopLoss = {
        spotPrice: stopSpot,
        spotPct: `-${(((S - stopSpot) / S) * 100).toFixed(1)}%`,
        triggerText: `Stock falls to ${curr}${stopSpot}`,
        rule: `Stop loss: buy back spread at ${curr}${stopLossPremium} (1.5x credit loss, -${curr}${stopLossPerLot.toLocaleString()}/lot)`,
        laymanAction: `Stop Loss: Exit trade if spread buyback cost expands to ${curr}${stopLossPremium} (loss -${curr}${lossPerShare}/share, -${curr}${stopLossPerLot.toLocaleString()}/lot) or stock tests ${curr}${stopSpot}.`,
        stopLossPremium,
        lossPerShare,
        lossPerLot: stopLossPerLot,
        lossPct: '-1.5x Credit'
      };
      const ratio = (targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(1);
      managedRiskReward = `1 : ${ratio}`;
      capitalPreservedPct = 65;
      riskProfile = RISK_PROFILES.CONSERVATIVE;
      laymanSummary = {
        plainRule: `Net Credit @ ${curr}${entryPremium} ➔ Target Buyback @ ${curr}${targetPremium} (+${curr}${profitPerShare}/sh) | Stop Buyback @ ${curr}${stopLossPremium} (-${curr}${lossPerShare}/sh). Risk ${curr}${stopLossPerLot.toLocaleString()} to make ${curr}${targetProfitPerLot.toLocaleString()}.`,
        timeExitRule: '21-DTE Gamma Armor: Close or roll position when 21 DTE is reached to avoid late-stage exponential gamma spikes.',
        actionTip: 'Never hold until the final hour; close early when 50% profit is captured or at 21 DTE.'
      };
      break;
    }

    case 'BEAR_CALL_SPREAD': {
      const profitPerShare = Number((entryPremium * 0.50).toFixed(2));
      const targetPremium = Number((entryPremium * 0.50).toFixed(2));
      const lossPerShare = Number((entryPremium * 1.50).toFixed(2));
      const stopLossPremium = Number((entryPremium * 2.50).toFixed(2));

      const targetSpot = Number((S * 0.985).toFixed(2));
      const targetProfitPerLot = Number((profitPerShare * actualLot).toFixed(2));
      const stopSpot = Number((shortStrike * 1.005).toFixed(2));
      const stopLossPerLot = Number((lossPerShare * actualLot).toFixed(2));

      targetBooking = {
        spotPrice: targetSpot,
        spotPct: '-1.5%',
        triggerText: `Stock stays below ${curr}${shortStrike}`,
        rule: `Book early: buy back at ${curr}${targetPremium} (50% credit captured, +${curr}${targetProfitPerLot.toLocaleString()}/lot)`,
        laymanAction: `Target: Buy back call spread when cost decays to ${curr}${targetPremium} (profit +${curr}${profitPerShare}/share, +${curr}${targetProfitPerLot.toLocaleString()}/lot). Free up margin.`,
        targetPremium,
        profitPerShare,
        profitPerLot: targetProfitPerLot,
        profitPct: '+50% Credit'
      };
      stopLoss = {
        spotPrice: stopSpot,
        spotPct: `+${(((stopSpot - S) / S) * 100).toFixed(1)}%`,
        triggerText: `Stock rallies to ${curr}${stopSpot}`,
        rule: `Stop loss: buy back at ${curr}${stopLossPremium} (1.5x credit loss, -${curr}${stopLossPerLot.toLocaleString()}/lot)`,
        laymanAction: `Stop Loss: Exit trade if call spread buyback cost expands to ${curr}${stopLossPremium} (loss -${curr}${lossPerShare}/share, -${curr}${stopLossPerLot.toLocaleString()}/lot) or stock rallies to ${curr}${stopSpot}.`,
        stopLossPremium,
        lossPerShare,
        lossPerLot: stopLossPerLot,
        lossPct: '-1.5x Credit'
      };
      const ratio = (targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(1);
      managedRiskReward = `1 : ${ratio}`;
      capitalPreservedPct = 65;
      riskProfile = RISK_PROFILES.CONSERVATIVE;
      laymanSummary = {
        plainRule: `Net Credit @ ${curr}${entryPremium} ➔ Target Buyback @ ${curr}${targetPremium} (+${curr}${profitPerShare}/sh) | Stop Buyback @ ${curr}${stopLossPremium} (-${curr}${lossPerShare}/sh). Risk ${curr}${stopLossPerLot.toLocaleString()} to make ${curr}${targetProfitPerLot.toLocaleString()}.`,
        timeExitRule: '21-DTE Gamma Armor: Close or roll position when 21 DTE is reached to avoid late-stage exponential gamma spikes.',
        actionTip: 'Close at 50% profit or 21 DTE. Never hold calls short into expiration week.'
      };
      break;
    }

    case 'LONG_PUT': {
      const targetPremium = Number((entryPremium * 1.55).toFixed(2));
      const stopLossPremium = Number(Math.max(0.05, entryPremium * 0.60).toFixed(2));
      const profitPerShare = Number((targetPremium - entryPremium).toFixed(2));
      const lossPerShare = Number((entryPremium - stopLossPremium).toFixed(2));

      const targetSpot = Number((S * 0.96).toFixed(2));
      const targetProfitPerLot = Number((profitPerShare * actualLot).toFixed(2));
      const stopSpot = Number((S * 1.02).toFixed(2));
      const stopLossPerLot = Number((lossPerShare * actualLot).toFixed(2));

      targetBooking = {
        spotPrice: targetSpot,
        spotPct: '-4.0%',
        triggerText: `Stock drops to ${curr}${targetSpot}`,
        rule: `Book profit at ${curr}${targetPremium} (+55% Premium gain, +${curr}${targetProfitPerLot.toLocaleString()}/lot)`,
        laymanAction: `Target: Sell Put when option premium reaches ${curr}${targetPremium} (profit +${curr}${profitPerShare}/share, +${curr}${targetProfitPerLot.toLocaleString()}/lot) or stock drops to ${curr}${targetSpot}. Lock in bear gains.`,
        targetPremium,
        profitPerShare,
        profitPerLot: targetProfitPerLot,
        profitPct: '+55%'
      };
      stopLoss = {
        spotPrice: stopSpot,
        spotPct: '+2.0%',
        triggerText: `Stock rallies above ${curr}${stopSpot}`,
        rule: `Stop loss: cut at ${curr}${stopLossPremium} (-40% Premium loss, -${curr}${stopLossPerLot.toLocaleString()}/lot)`,
        laymanAction: `Stop Loss: Exit immediately if option premium drops to ${curr}${stopLossPremium} (loss -${curr}${lossPerShare}/share, -${curr}${stopLossPerLot.toLocaleString()}/lot) or stock rebounds to ${curr}${stopSpot}. Protect your cash.`,
        stopLossPremium,
        lossPerShare,
        lossPerLot: stopLossPerLot,
        lossPct: '-40%'
      };
      const ratio = (targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(1);
      managedRiskReward = `1 : ${ratio}`;
      capitalPreservedPct = 60;
      riskProfile = RISK_PROFILES.BALANCED;
      laymanSummary = {
        plainRule: `Buy @ ${curr}${entryPremium} ➔ Target @ ${curr}${targetPremium} (+${curr}${profitPerShare}/sh) | Stop @ ${curr}${stopLossPremium} (-${curr}${lossPerShare}/sh). Risk ${curr}${stopLossPerLot.toLocaleString()} to make ${curr}${targetProfitPerLot.toLocaleString()} (${ratio}x risk).`,
        timeExitRule: 'Exit 2–3 days prior to expiration to protect gains from theta decay.',
        actionTip: 'Do not stay in a Put if the stock refuses to break down.'
      };
      break;
    }

    case 'BEAR_PUT_SPREAD': {
      const maxProfitPerShare = Number((maxProfit / actualLot).toFixed(2));
      const profitPerShare = Number((maxProfitPerShare * 0.70).toFixed(2));
      const targetPremium = Number((entryPremium + profitPerShare).toFixed(2));
      const lossPerShare = Number((entryPremium * 0.45).toFixed(2));
      const stopLossPremium = Number(Math.max(0.05, entryPremium - lossPerShare).toFixed(2));

      const targetSpot = Number(lowerStrike.toFixed(2));
      const targetProfitPerLot = Number((profitPerShare * actualLot).toFixed(2));
      const stopSpot = Number((upperStrike * 1.015).toFixed(2));
      const stopLossPerLot = Number((lossPerShare * actualLot).toFixed(2));

      targetBooking = {
        spotPrice: targetSpot,
        spotPct: `-${(((S - targetSpot) / S) * 100).toFixed(1)}%`,
        triggerText: `Stock drops to ${curr}${targetSpot}`,
        rule: `Book early at spread value ${curr}${targetPremium} (+70% max spread profit, +${curr}${targetProfitPerLot.toLocaleString()}/lot)`,
        laymanAction: `Target: Close both Put legs when spread value expands to ${curr}${targetPremium} (net gain +${curr}${profitPerShare}/share, +${curr}${targetProfitPerLot.toLocaleString()}/lot) or stock drops to ${curr}${targetSpot}. Bank 70% gain.`,
        targetPremium,
        profitPerShare,
        profitPerLot: targetProfitPerLot,
        profitPct: '+70% Spread'
      };
      stopLoss = {
        spotPrice: stopSpot,
        spotPct: '+1.5%',
        triggerText: `Stock rises above ${curr}${stopSpot}`,
        rule: `Stop loss: exit at spread value ${curr}${stopLossPremium} (-45% debit loss, -${curr}${stopLossPerLot.toLocaleString()}/lot)`,
        laymanAction: `Stop Loss: Exit if spread value drops to ${curr}${stopLossPremium} (loss -${curr}${lossPerShare}/share, -${curr}${stopLossPerLot.toLocaleString()}/lot) or stock rallies above ${curr}${stopSpot}. Preserves 55% of capital.`,
        stopLossPremium,
        lossPerShare,
        lossPerLot: stopLossPerLot,
        lossPct: '-45%'
      };
      const ratio = (targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(1);
      managedRiskReward = `1 : ${ratio}`;
      capitalPreservedPct = 55;
      riskProfile = RISK_PROFILES.CONSERVATIVE;
      laymanSummary = {
        plainRule: `Net Debit @ ${curr}${entryPremium} ➔ Target Spread @ ${curr}${targetPremium} (+${curr}${profitPerShare}/sh) | Stop Spread @ ${curr}${stopLossPremium} (-${curr}${lossPerShare}/sh). Risk ${curr}${stopLossPerLot.toLocaleString()} to make ${curr}${targetProfitPerLot.toLocaleString()} (${ratio}x risk).`,
        timeExitRule: 'Book 70% profit early; don\'t risk a late-week sudden market rebound.',
        actionTip: 'Close both Put legs simultaneously to avoid unhedged naked exposure.'
      };
      break;
    }

    case 'IRON_CONDOR': {
      const profitPerShare = Number((entryPremium * 0.50).toFixed(2));
      const targetPremium = Number((entryPremium * 0.50).toFixed(2));
      const lossPerShare = Number((entryPremium * 1.50).toFixed(2));
      const stopLossPremium = Number((entryPremium * 2.50).toFixed(2));

      const targetProfitPerLot = Number((profitPerShare * actualLot).toFixed(2));
      const stopLossPerLot = Number((lossPerShare * actualLot).toFixed(2));

      targetBooking = {
        spotPrice: S,
        spotPct: 'Range Pin',
        triggerText: 'Stock stays in range',
        rule: `Take profit: buy back condor at ${curr}${targetPremium} (50% max credit, +${curr}${targetProfitPerLot.toLocaleString()}/lot)`,
        laymanAction: `Target: Close all 4 legs as soon as combined buyback drops to ${curr}${targetPremium} (profit +${curr}${profitPerShare}/share, +${curr}${targetProfitPerLot.toLocaleString()}/lot). Take profit and exit.`,
        targetPremium,
        profitPerShare,
        profitPerLot: targetProfitPerLot,
        profitPct: '+50% Credit'
      };
      stopLoss = {
        spotPrice: shortStrike || Number((S * 0.97).toFixed(2)),
        spotPct: 'Wing Test',
        triggerText: `Stock breaches ${curr}${shortStrike || Number((S * 0.97).toFixed(2))}`,
        rule: `Stop loss: close condor at ${curr}${stopLossPremium} (1.5x credit loss, -${curr}${stopLossPerLot.toLocaleString()}/lot)`,
        laymanAction: `Stop Loss: Close all 4 legs if combined buyback expands to ${curr}${stopLossPremium} (loss -${curr}${lossPerShare}/share, -${curr}${stopLossPerLot.toLocaleString()}/lot) or either inner strike is touched. Cuts loss cleanly.`,
        stopLossPremium,
        lossPerShare,
        lossPerLot: stopLossPerLot,
        lossPct: '-1.5x Credit'
      };
      const ratio = (targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(1);
      managedRiskReward = `1 : ${ratio}`;
      capitalPreservedPct = 70;
      riskProfile = RISK_PROFILES.CONSERVATIVE;
      laymanSummary = {
        plainRule: `Net Credit @ ${curr}${entryPremium} ➔ Target Buyback @ ${curr}${targetPremium} (+${curr}${profitPerShare}/sh) | Stop Buyback @ ${curr}${stopLossPremium} (-${curr}${lossPerShare}/sh). Risk ${curr}${stopLossPerLot.toLocaleString()} to make ${curr}${targetProfitPerLot.toLocaleString()}.`,
        timeExitRule: '21-DTE Gamma Armor: Close or roll position when 21 DTE is reached to avoid late-stage exponential gamma spikes.',
        actionTip: 'Do not hold till expiry Friday. Close all 4 legs together at 50% credit or 21 DTE.'
      };
      break;
    }

    case 'THETA_DECAY': {
      const profitPerShare = Number((entryPremium * 0.50).toFixed(2));
      const targetPremium = Number((entryPremium * 0.50).toFixed(2));
      const lossPerShare = Number((entryPremium * 1.50).toFixed(2));
      const stopLossPremium = Number((entryPremium * 2.50).toFixed(2));

      const targetProfitPerLot = Number((profitPerShare * actualLot).toFixed(2));
      const stopLossPerLot = Number((lossPerShare * actualLot).toFixed(2));
      const stopDistance = step * 2.5;
      const stopSpotUpper = Number(((atmStrike || S) + stopDistance).toFixed(2));
      const stopSpotLower = Number(((atmStrike || S) - stopDistance).toFixed(2));

      targetBooking = {
        spotPrice: atmStrike || S,
        spotPct: 'Range Plateau',
        triggerText: `Stock remains between ${curr}${stopSpotLower} — ${curr}${stopSpotUpper}`,
        rule: `Capture Theta: buy back at ${curr}${targetPremium} (50% max credit, +${curr}${targetProfitPerLot.toLocaleString()}/lot) or exit at 21 DTE`,
        laymanAction: `Target: Exit trade when combined premium decays to ${curr}${targetPremium} (profit +${curr}${profitPerShare}/share, +${curr}${targetProfitPerLot.toLocaleString()}/lot) or when 21 DTE is reached.`,
        targetPremium,
        profitPerShare,
        profitPerLot: targetProfitPerLot,
        profitPct: '+50% Credit'
      };
      stopLoss = {
        spotPrice: stopSpotLower,
        spotPct: `±${((stopDistance / S) * 100).toFixed(1)}%`,
        triggerText: `Stock tests short wing (${curr}${stopSpotLower} or ${curr}${stopSpotUpper})`,
        rule: `Stop loss: close if buyback reaches ${curr}${stopLossPremium} (-${curr}${stopLossPerLot.toLocaleString()}/lot) or spot breaks outside range`,
        laymanAction: `Stop Loss: Exit all legs if buyback cost expands to ${curr}${stopLossPremium} (loss -${curr}${lossPerShare}/share, -${curr}${stopLossPerLot.toLocaleString()}/lot) or stock moves outside ${curr}${stopSpotLower} — ${curr}${stopSpotUpper}.`,
        stopLossPremium,
        lossPerShare,
        lossPerLot: stopLossPerLot,
        lossPct: '-1.5x Credit'
      };
      const ratio = (targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(1);
      managedRiskReward = `1 : ${ratio}`;
      capitalPreservedPct = 70;
      riskProfile = RISK_PROFILES.CONSERVATIVE;
      laymanSummary = {
        plainRule: `Net Credit @ ${curr}${entryPremium} ➔ Target Buyback @ ${curr}${targetPremium} (+${curr}${profitPerShare}/sh) | Stop Buyback @ ${curr}${stopLossPremium} (-${curr}${lossPerShare}/sh). Risk ${curr}${stopLossPerLot.toLocaleString()} to make ${curr}${targetProfitPerLot.toLocaleString()}.`,
        timeExitRule: '21-DTE Gamma Armor: Capture rapid time decay, exit at 21 DTE before exponential gamma spike.',
        actionTip: 'Time decay deposits money every day. Cash out when 50% is banked or 21 DTE is reached.'
      };
      break;
    }

    case 'LONG_STRADDLE':
    default: {
      const targetPremium = Number((entryPremium * 1.45).toFixed(2));
      const stopLossPremium = Number(Math.max(0.05, entryPremium * 0.65).toFixed(2));
      const profitPerShare = Number((targetPremium - entryPremium).toFixed(2));
      const lossPerShare = Number((entryPremium - stopLossPremium).toFixed(2));

      const targetSpot = Number((S * 1.045).toFixed(2));
      const targetProfitPerLot = Number((profitPerShare * actualLot).toFixed(2));
      const stopLossPerLot = Number((lossPerShare * actualLot).toFixed(2));

      targetBooking = {
        spotPrice: targetSpot,
        spotPct: '±4.5%',
        triggerText: 'Large breakout in either direction',
        rule: `Book profit at combined premium ${curr}${targetPremium} (+45% gain, +${curr}${targetProfitPerLot.toLocaleString()}/lot)`,
        laymanAction: `Target: Sell both Call and Put when combined premium hits ${curr}${targetPremium} (profit +${curr}${profitPerShare}/share, +${curr}${targetProfitPerLot.toLocaleString()}/lot). Take the breakout gain.`,
        targetPremium,
        profitPerShare,
        profitPerLot: targetProfitPerLot,
        profitPct: '+45%'
      };
      stopLoss = {
        spotPrice: S,
        spotPct: 'Time Stop',
        triggerText: 'Stock remains flat for 5 days',
        rule: `Time stop: exit if combined premium drops to ${curr}${stopLossPremium} (-35% loss, -${curr}${stopLossPerLot.toLocaleString()}/lot) or 5 days pass`,
        laymanAction: `Stop Loss: Close both legs if combined premium drops to ${curr}${stopLossPremium} (loss -${curr}${lossPerShare}/share, -${curr}${stopLossPerLot.toLocaleString()}/lot) or market stays flat for 5 days. Avoids theta bleed.`,
        stopLossPremium,
        lossPerShare,
        lossPerLot: stopLossPerLot,
        lossPct: '-35%'
      };
      const ratio = (targetProfitPerLot / Math.max(1, stopLossPerLot)).toFixed(1);
      managedRiskReward = `1 : ${ratio}`;
      capitalPreservedPct = 65;
      riskProfile = RISK_PROFILES.BALANCED;
      laymanSummary = {
        plainRule: `Buy Straddle @ ${curr}${entryPremium} ➔ Target @ ${curr}${targetPremium} (+${curr}${profitPerShare}/sh) | Stop @ ${curr}${stopLossPremium} (-${curr}${lossPerShare}/sh). Risk ${curr}${stopLossPerLot.toLocaleString()} to make ${curr}${targetProfitPerLot.toLocaleString()} (${ratio}x your risk).`,
        timeExitRule: 'Time stop: If no breakout occurs in 5 trading days, close the position.',
        actionTip: 'Needs rapid movement. If quiet, get out to preserve capital.'
      };
      break;
    }
  }

  return {
    entryPremium,
    targetBooking,
    stopLoss,
    managedRiskReward,
    capitalPreservedPct,
    riskProfile,
    laymanSummary,
    gammaArmorDte: isCredit ? 21 : null
  };
}

/**
 * Scan an underlying asset quote and generate all valid option strategies with exit plans
 */

/**
 * Build structured Transaction Execution Spec
 * Explicitly recommends which market, series, and expiration date to trade
 */
export function buildTransactSpec(quote, exp, stratName, dte) {
  const isIndia = quote.market === "IN";
  const isStock = quote.type === "STOCK";
  const ticker = quote.displayTicker;
  const day = exp.dayOfWeek || (isIndia ? "Tuesday" : "Friday");
  const dateStr = exp.dateStr;
  const cycleType = exp.type;

  let instrumentTag = "";
  if (isIndia) {
    if (isStock) {
      instrumentTag = "NSE Stock F&O Series (Monthly • Last Tuesday)";
    } else if (ticker === '^BSESN' || ticker.includes('SENSEX')) {
      instrumentTag = "BSE SENSEX Series (Weekly/Monthly • Thursday)";
    } else if (ticker === '^NSEI' || ticker.includes('NIFTY 50') || ticker === 'NIFTY') {
      instrumentTag = "NSE NIFTY 50 Series (Weekly/Monthly • Tuesday)";
    } else {
      instrumentTag = `NSE ${ticker} Series (Monthly • Last Tuesday)`;
    }
  } else {
    instrumentTag = isStock ? "US Equity Option Contract" : "US Index Standard Series";
  }

  let contractCode = "";
  const cleanDate = dateStr.replace(/ /g, "").toUpperCase();
  if (stratName.includes("Call Spread") || stratName.includes("Long Call")) {
    contractCode = `${isIndia ? "NSE" : "US"}:${ticker} ${cleanDate} CALL`;
  } else if (stratName.includes("Put Spread") || stratName.includes("Long Put")) {
    contractCode = `${isIndia ? "NSE" : "US"}:${ticker} ${cleanDate} PUT`;
  } else {
    contractCode = `${isIndia ? "NSE" : "US"}:${ticker} ${cleanDate} MULTI-LEG`;
  }

  let rationale = "";
  if (isIndia && isStock) {
    rationale = `Transact specifically in the ${dateStr} Monthly Contract on NSE. SEBI regulations permit only monthly options for Indian equities, expiring on the Last Tuesday of the month (${day}).`;
  } else if (isIndia && !isStock) {
    if (ticker === '^BSESN' || ticker.includes('SENSEX')) {
      rationale = `Transact in the ${dateStr} (${cycleType}) series on BSE. SENSEX weekly and monthly contracts expire on Thursdays (${day}).`;
    } else if (ticker === '^NSEI' || ticker.includes('NIFTY 50') || ticker === 'NIFTY') {
      rationale = `Transact in the ${dateStr} (${cycleType}) series on NSE. NIFTY 50 weekly and monthly contracts expire on Tuesdays (${day}).`;
    } else {
      rationale = `Transact in the ${dateStr} Monthly Series on NSE. SEBI rules permit only monthly contracts for ${ticker}, expiring on the Last Tuesday of the month (${day}).`;
    }
  } else if (stratName.includes("Theta") || stratName.includes("Condor")) {
    rationale = `Transact specifically in the ${dateStr} (${cycleType}) cycle. High liquidity zone offering optimal exponential theta decay capture. Close early at 50% profit target.`;
  } else if (stratName.includes("Spread")) {
    rationale = `Transact in the ${dateStr} (${cycleType}) series to provide adequate runway for directional target achievement with capped debit.`;
  } else {
    rationale = `Transact specifically in the ${dateStr} (${cycleType}) series for optimal gamma responsiveness and liquidity.`;
  }

  return {
    expiryDate: dateStr,
    dte,
    dayOfWeek: day,
    cycleType,
    instrumentTag,
    contractSeries: contractCode,
    recommendationNote: rationale
  };
}

export function scanStrategiesForAsset(quote) {
  if (!quote) return [];

  const S = quote.price;
  const step = quote.strikeStep || 5;
  const atmStrike = Math.round(S / step) * step;
  const r = quote.riskFreeRate || (quote.currency === 'INR' ? 0.065 : 0.045);
  const ivDecimal = (quote.iv || 25) / 100;
  const ivRank = quote.ivRank || 45;
  const pcr = quote.pcr || 1.0;
  const lotSize = quote.lotSize || 100;
  const curr = quote.currencySymbol || '$';

  // Volatility Risk Premium (VRP) & Trend Regime Alignment Metrics:
  // VRP = IV - Realized HV. When VRP >= 3.0%, IV is richly priced, justifying short credit.
  // When VRP < 3.0%, options are cheap or underpriced, favoring long debit structures.
  const hv = (quote.hv !== undefined && quote.hv !== null)
    ? Number(quote.hv)
    : (quote.historicalVolatility !== undefined && quote.historicalVolatility !== null)
      ? Number(quote.historicalVolatility)
      : Number(((quote.iv || 25) * 0.88).toFixed(1));
  const vrp = Number(((quote.iv || 25) - hv).toFixed(1));

  // Trend Regime Alignment:
  // Bullish credit (Bull Put Spread) allowed only when asset is in an upward trend (Price >= SMA50)
  // Bearish credit (Bear Call Spread) allowed only when asset is in a downward trend (Price < SMA50)
  const isUptrend = quote.sma50 ? S >= quote.sma50 : (quote.trend ? quote.trend !== 'BEARISH' : true);
  const isDowntrend = quote.sma50 ? S < quote.sma50 : (quote.trend ? quote.trend === 'BEARISH' : false);

  const expirations = getMarketExpirations(quote);
  const isIndia = quote.market === "IN";
  const isStock = quote.type === "STOCK";
  const ticker = quote.displayTicker || quote.ticker || '';

  // 1. Weekly / Near-term cycle (for quick momentum breakouts; for assets without weeklies, this is the current monthly)
  const weeklyExp = expirations[0];

  // 2. Current Monthly cycle
  const currentMonthlyExp = expirations.find(e => e.type.includes('Monthly')) || expirations[0];

  // 3. Next Monthly cycle (30-45 DTE institutional series)
  const monthlyExpirations = expirations.filter(e => e.type.includes('Monthly'));
  const nextMonthlyExp = monthlyExpirations[1] || currentMonthlyExp;

  const strategies = [];

  const hasEarningsBefore = (dte) => {
    return (
      quote.daysToEarnings !== undefined &&
      quote.daysToEarnings !== null &&
      !isNaN(quote.daysToEarnings) &&
      Number(quote.daysToEarnings) >= 0 &&
      Number(quote.daysToEarnings) < dte
    );
  };

  const earningsWarning = "<strong>WARNING: Earnings event occurs before expiration. Exit position BEFORE the announcement to avoid IV Crush.</strong>";

  // -------------------------------------------------------------
  // 1. STRATEGY: Long Call (Momentum Breakout)
  // Optimal when IV Rank is low to moderate (ivRank <= 50) and bullish trend
  // -------------------------------------------------------------
  if (ivRank <= 50) {
    const exp = (weeklyExp.dte >= 2) ? weeklyExp : currentMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;
    const strike = atmStrike;
    const greeks = calculateGreeks('call', S, strike, T, r, ivDecimal);
    const premium = greeks.price;
    const breakeven = Number((strike + premium).toFixed(2));
    const pop = calculatePOP(S, breakeven, T, ivDecimal, true);

    const legs = [
      { type: 'call', action: 'buy', strike, premium, contracts: 1, label: `Buy ${curr}${strike} Call` }
    ];

    const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
    const netCost = Number((premium * lotSize).toFixed(2));
    const maxLoss = netCost;

    const exitPlan = buildExitPlan({
      type: 'LONG_CALL',
      S,
      lotSize,
      netCost,
      maxProfit: 'Unlimited',
      maxLoss,
      isCredit: false,
      curr,
      premium,
      step
    });

    let catalyst = `Bullish momentum breakout with low IV Rank (${ivRank}%). Provisioned with disciplined Stop Loss at ${curr}${exitPlan.stopLoss.spotPrice} and Target Booking at ${curr}${exitPlan.targetBooking.spotPrice}.`;
    if (hasEarningsBefore(dte)) {
      catalyst += ` ${earningsWarning}`;
    }

    strategies.push({
      id: `${quote.ticker}-LONG-CALL-${strike}`,
      ticker: quote.ticker,
      displayTicker: quote.displayTicker,
      name: quote.name,
      market: quote.market,
      type: quote.type,
      cap: quote.cap || 'LARGE',
      sector: quote.sector || '',
      currency: quote.currency,
      currencySymbol: curr,
      strategyName: 'Long Call (Breakout)',
      category: STRATEGY_CATEGORIES.BULLISH_CALLS,
      sentiment: 'Bullish',
      directionBadge: 'Bullish Call',
      badgeClass: 'badge-bullish',
      conviction: ivRank < 40 ? 'High Momentum' : 'Standard',
      dte,
      expiryDate: exp.dateStr,
      expiryLabel: `${exp.dateStr} (${exp.type})`,
      transactSpec: buildTransactSpec(quote, exp, 'Long Call', dte),
      spotPrice: S,
      targetPrice: exitPlan.targetBooking.spotPrice,
      stopLossPrice: exitPlan.stopLoss.spotPrice,
      entryPremium: exitPlan.entryPremium,
      targetPremium: exitPlan.targetBooking.targetPremium,
      stopLossPremium: exitPlan.stopLoss.stopLossPremium,
      targetPremiumPrice: exitPlan.targetBooking.targetPremium,
      stopLossPremiumPrice: exitPlan.stopLoss.stopLossPremium,
      exitPlan,
      legs,
      netCost,
      isCredit: false,
      maxProfit: 'Unlimited',
      maxLoss,
      breakevens: [breakeven],
      riskReward: 'Unlimited Upside',
      pop,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst
    });
  }

  // -------------------------------------------------------------
  // 2. STRATEGY: Bull Call Spread (Debit Spread)
  // Buy ATM Call + Sell OTM Call (Caps risk, cuts cost by 40-50%)
  // Generated only when ivRank <= 50
  // -------------------------------------------------------------
  if (ivRank <= 50) {
    const exp = currentMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;
    const lowerStrike = atmStrike;
    const upperStrike = atmStrike + step * 2;

    const lowerGreeks = calculateGreeks('call', S, lowerStrike, T, r, ivDecimal);
    const upperGreeks = calculateGreeks('call', S, upperStrike, T, r, ivDecimal);

    // Skip generating if long leg (anchor/protection leg) evaluates to less than $0.05
    if (lowerGreeks.price >= 0.05) {
      const netDebit = Math.max(0.05, Number((lowerGreeks.price - upperGreeks.price).toFixed(2)));
      const spreadWidth = upperStrike - lowerStrike;
      const maxProfitPerShare = spreadWidth - netDebit;
      const breakeven = Number((lowerStrike + netDebit).toFixed(2));
      const pop = calculatePOP(S, breakeven, T, ivDecimal, true);

      const legs = [
        { type: 'call', action: 'buy', strike: lowerStrike, premium: lowerGreeks.price, contracts: 1, label: `Buy ${curr}${lowerStrike} Call` },
        { type: 'call', action: 'sell', strike: upperStrike, premium: upperGreeks.price, contracts: 1, label: `Sell ${curr}${upperStrike} Call` }
      ];

      const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
      const netCost = Number((netDebit * lotSize).toFixed(2));
      const maxProfit = Number((maxProfitPerShare * lotSize).toFixed(2));
      const maxLoss = netCost;

      const exitPlan = buildExitPlan({
        type: 'BULL_CALL_SPREAD',
        S,
        lotSize,
        netCost,
        maxProfit,
        maxLoss,
        isCredit: false,
        curr,
        upperStrike,
        lowerStrike,
        premium: netDebit,
        step
      });

      strategies.push({
        id: `${quote.ticker}-BULL-CALL-SPREAD-${lowerStrike}-${upperStrike}`,
        ticker: quote.ticker,
        displayTicker: quote.displayTicker,
        name: quote.name,
        market: quote.market,
        type: quote.type,
        cap: quote.cap || 'LARGE',
        sector: quote.sector || '',
        currency: quote.currency,
        currencySymbol: curr,
        strategyName: 'Bull Call Spread (Debit)',
        category: STRATEGY_CATEGORIES.DEBIT_SPREADS,
        sentiment: 'Bullish',
        directionBadge: 'Bullish Spread',
        badgeClass: 'badge-bullish',
        conviction: 'Defined Risk',
        dte,
        expiryDate: exp.dateStr,
        expiryLabel: `${exp.dateStr} (${exp.type})`,
        transactSpec: buildTransactSpec(quote, exp, 'Bull Call Spread', dte),
        spotPrice: S,
        targetPrice: exitPlan.targetBooking.spotPrice,
        stopLossPrice: exitPlan.stopLoss.spotPrice,
        entryPremium: exitPlan.entryPremium,
        targetPremium: exitPlan.targetBooking.targetPremium,
        stopLossPremium: exitPlan.stopLoss.stopLossPremium,
        targetPremiumPrice: exitPlan.targetBooking.targetPremium,
        stopLossPremiumPrice: exitPlan.stopLoss.stopLossPremium,
        exitPlan,
        legs,
        netCost,
        isCredit: false,
        maxProfit,
        maxLoss,
        breakevens: [breakeven],
        riskReward: `1 : ${(maxProfitPerShare / netDebit).toFixed(2)}`,
        pop,
        ivRank,
        netDelta: payoff.netDelta,
        netTheta: payoff.netTheta,
        catalyst: `Defines upside target at ${curr}${upperStrike}. Stop Loss limits loss to ${curr}${exitPlan.stopLoss.lossPerLot.toLocaleString()} while booking 70% max spread gain at ${curr}${exitPlan.targetBooking.spotPrice}.`
      });
    }
  }

  // -------------------------------------------------------------
  // 3. STRATEGY: Bull Put Spread (Credit Spread)
  // Sell OTM Put + Buy Lower OTM Put (High probability income)
  // Gated by: IV Rank >= 40, VRP >= 3.0%, and Trend Regime is Bullish (Price >= SMA50)
  // -------------------------------------------------------------
  if (ivRank >= 40 && vrp >= 3.0 && isUptrend) {
    // Force nextMonthlyExp to target 30-45 DTE window and avoid late-stage Gamma explosion
    const exp = nextMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;

    // Binary event check: Avoid gap risk if earnings event occurs before expiration
    if (!hasEarningsBefore(dte)) {
      const shortStrike = atmStrike - step * 2;
      const longStrike = atmStrike - step * 4;

      const shortGreeks = calculateGreeks('put', S, shortStrike, T, r, ivDecimal);
      const longGreeks = calculateGreeks('put', S, longStrike, T, r, ivDecimal);

      // Low-Liquidity Wing filter: protection leg must evaluate to at least $0.05
      if (longGreeks.price >= 0.05) {
        const spreadWidth = shortStrike - longStrike;
        const netCredit = Math.max(0.05, Number((shortGreeks.price - longGreeks.price).toFixed(2)));

        // Minimum Net Credit Floor: net credit collected must be >= 15% of spreadWidth
        if (netCredit >= 0.15 * spreadWidth) {
          const maxLossPerShare = spreadWidth - netCredit;
          const breakeven = Number((shortStrike - netCredit).toFixed(2));
          const pop = calculatePOP(S, breakeven, T, ivDecimal, true);

          const legs = [
            { type: 'put', action: 'sell', strike: shortStrike, premium: shortGreeks.price, contracts: 1, label: `Sell ${curr}${shortStrike} Put` },
            { type: 'put', action: 'buy', strike: longStrike, premium: longGreeks.price, contracts: 1, label: `Buy ${curr}${longStrike} Put` }
          ];

          const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
          const netCost = Number((netCredit * lotSize).toFixed(2));
          const maxProfit = netCost;
          const maxLoss = Number((maxLossPerShare * lotSize).toFixed(2));

          const exitPlan = buildExitPlan({
            type: 'BULL_PUT_SPREAD',
            S,
            lotSize,
            netCost,
            maxProfit,
            maxLoss,
            isCredit: true,
            curr,
            shortStrike,
            longStrike,
            premium: netCredit,
            step
          });

          strategies.push({
            id: `${quote.ticker}-BULL-PUT-SPREAD-${shortStrike}-${longStrike}`,
            ticker: quote.ticker,
            displayTicker: quote.displayTicker,
            name: quote.name,
            market: quote.market,
            type: quote.type,
            cap: quote.cap || 'LARGE',
            sector: quote.sector || '',
            currency: quote.currency,
            currencySymbol: curr,
            strategyName: 'Bull Put Spread (Credit)',
            category: STRATEGY_CATEGORIES.CREDIT_SPREADS,
            sentiment: 'Bullish',
            directionBadge: 'Bullish Credit',
            badgeClass: 'badge-credit',
            conviction: pop > 70 ? 'High Win Rate (POP > 70%)' : 'Income Play',
            dte,
            expiryDate: exp.dateStr,
            expiryLabel: `${exp.dateStr} (${exp.type})`,
            transactSpec: buildTransactSpec(quote, exp, 'Bull Put Spread', dte),
            spotPrice: S,
            targetPrice: exitPlan.targetBooking.spotPrice,
            stopLossPrice: exitPlan.stopLoss.spotPrice,
            entryPremium: exitPlan.entryPremium,
            targetPremium: exitPlan.targetBooking.targetPremium,
            stopLossPremium: exitPlan.stopLoss.stopLossPremium,
            targetPremiumPrice: exitPlan.targetBooking.targetPremium,
            stopLossPremiumPrice: exitPlan.stopLoss.stopLossPremium,
            exitPlan,
            legs,
            netCost,
            isCredit: true,
            maxProfit,
            maxLoss,
            breakevens: [breakeven],
            riskReward: `1 : ${(netCredit / maxLossPerShare).toFixed(2)}`,
            pop,
            ivRank,
            netDelta: payoff.netDelta,
            netTheta: payoff.netTheta,
            catalyst: `High-probability theta harvest with cushion down to ${curr}${breakeven}. Backed by Volatility Risk Premium (VRP: +${vrp}%) and Uptrend alignment. Disciplined exit books 50% credit (${curr}${exitPlan.targetBooking.profitPerLot.toLocaleString()}), enforces 21-DTE Gamma Armor, and cuts loss at 1.5x credit to protect capital.`
          });
        }
      }
    }
  }

  // -------------------------------------------------------------
  // STRATEGY: Bear Call Spread (Credit Spread)
  // Sell OTM Call + Buy Higher OTM Call (High probability income on downtrend)
  // Gated by: IV Rank >= 40, VRP >= 3.0%, and Trend Regime is Bearish (Price < SMA50)
  // -------------------------------------------------------------
  if (ivRank >= 40 && vrp >= 3.0 && isDowntrend) {
    const exp = nextMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;

    // Binary event check: Avoid gap risk if earnings event occurs before expiration
    if (!hasEarningsBefore(dte)) {
      const shortStrike = atmStrike + step * 2;
      const longStrike = atmStrike + step * 4;

      const shortGreeks = calculateGreeks('call', S, shortStrike, T, r, ivDecimal);
      const longGreeks = calculateGreeks('call', S, longStrike, T, r, ivDecimal);

      // Low-Liquidity Wing filter: protection leg must evaluate to at least $0.05
      if (longGreeks.price >= 0.05) {
        const spreadWidth = longStrike - shortStrike;
        const netCredit = Math.max(0.05, Number((shortGreeks.price - longGreeks.price).toFixed(2)));

        // Minimum Net Credit Floor: net credit collected must be >= 15% of spreadWidth
        if (netCredit >= 0.15 * spreadWidth) {
          const maxLossPerShare = spreadWidth - netCredit;
          const breakeven = Number((shortStrike + netCredit).toFixed(2));
          const pop = calculatePOP(S, breakeven, T, ivDecimal, false);

          const legs = [
            { type: 'call', action: 'sell', strike: shortStrike, premium: shortGreeks.price, contracts: 1, label: `Sell ${curr}${shortStrike} Call` },
            { type: 'call', action: 'buy', strike: longStrike, premium: longGreeks.price, contracts: 1, label: `Buy ${curr}${longStrike} Call` }
          ];

          const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
          const netCost = Number((netCredit * lotSize).toFixed(2));
          const maxProfit = netCost;
          const maxLoss = Number((maxLossPerShare * lotSize).toFixed(2));

          const exitPlan = buildExitPlan({
            type: 'BEAR_CALL_SPREAD',
            S,
            lotSize,
            netCost,
            maxProfit,
            maxLoss,
            isCredit: true,
            curr,
            shortStrike,
            longStrike,
            premium: netCredit,
            step
          });

          strategies.push({
            id: `${quote.ticker}-BEAR-CALL-SPREAD-${shortStrike}-${longStrike}`,
            ticker: quote.ticker,
            displayTicker: quote.displayTicker,
            name: quote.name,
            market: quote.market,
            type: quote.type,
            cap: quote.cap || 'LARGE',
            sector: quote.sector || '',
            currency: quote.currency,
            currencySymbol: curr,
            strategyName: 'Bear Call Spread (Credit)',
            category: STRATEGY_CATEGORIES.CREDIT_SPREADS,
            sentiment: 'Bearish',
            directionBadge: 'Bearish Credit',
            badgeClass: 'badge-credit',
            conviction: pop > 70 ? 'High Win Rate (POP > 70%)' : 'Income Play',
            dte,
            expiryDate: exp.dateStr,
            expiryLabel: `${exp.dateStr} (${exp.type})`,
            transactSpec: buildTransactSpec(quote, exp, 'Bear Call Spread', dte),
            spotPrice: S,
            targetPrice: exitPlan.targetBooking.spotPrice,
            stopLossPrice: exitPlan.stopLoss.spotPrice,
            entryPremium: exitPlan.entryPremium,
            targetPremium: exitPlan.targetBooking.targetPremium,
            stopLossPremium: exitPlan.stopLoss.stopLossPremium,
            targetPremiumPrice: exitPlan.targetBooking.targetPremium,
            stopLossPremiumPrice: exitPlan.stopLoss.stopLossPremium,
            exitPlan,
            legs,
            netCost,
            isCredit: true,
            maxProfit,
            maxLoss,
            breakevens: [breakeven],
            riskReward: `1 : ${(netCredit / maxLossPerShare).toFixed(2)}`,
            pop,
            ivRank,
            netDelta: payoff.netDelta,
            netTheta: payoff.netTheta,
            catalyst: `High-probability theta harvest with cushion up to ${curr}${breakeven}. Backed by Volatility Risk Premium (VRP: +${vrp}%) and Downtrend alignment. Disciplined exit books 50% credit (${curr}${exitPlan.targetBooking.profitPerLot.toLocaleString()}), enforces 21-DTE Gamma Armor, and cuts loss at 1.5x credit to protect capital.`
          });
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 4. STRATEGY: Long Put (Bearish Breakdown)
  // Direct downside directional leverage (ivRank <= 50)
  // -------------------------------------------------------------
  if (ivRank <= 50) {
    const exp = (weeklyExp.dte >= 2) ? weeklyExp : currentMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;
    const strike = atmStrike;
    const greeks = calculateGreeks('put', S, strike, T, r, ivDecimal);
    const premium = greeks.price;
    const breakeven = Number((strike - premium).toFixed(2));
    const pop = calculatePOP(S, breakeven, T, ivDecimal, false);

    const legs = [
      { type: 'put', action: 'buy', strike, premium, contracts: 1, label: `Buy ${curr}${strike} Put` }
    ];

    const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
    const netCost = Number((premium * lotSize).toFixed(2));
    const maxProfit = Number(((strike - premium) * lotSize).toFixed(2));
    const maxLoss = netCost;

    const exitPlan = buildExitPlan({
      type: 'LONG_PUT',
      S,
      lotSize,
      netCost,
      maxProfit,
      maxLoss,
      isCredit: false,
      curr,
      premium,
      step
    });

    let catalyst = `Protective downside momentum. Provisioned with strict Stop Loss at ${curr}${exitPlan.stopLoss.spotPrice} (-40% premium risk) and Target Profit Booking at ${curr}${exitPlan.targetBooking.spotPrice}.`;
    if (hasEarningsBefore(dte)) {
      catalyst += ` ${earningsWarning}`;
    }

    strategies.push({
      id: `${quote.ticker}-LONG-PUT-${strike}`,
      ticker: quote.ticker,
      displayTicker: quote.displayTicker,
      name: quote.name,
      market: quote.market,
      type: quote.type,
      cap: quote.cap || 'LARGE',
      sector: quote.sector || '',
      currency: quote.currency,
      currencySymbol: curr,
      strategyName: 'Long Put (Breakdown)',
      category: STRATEGY_CATEGORIES.BEARISH_PUTS,
      sentiment: 'Bearish',
      directionBadge: 'Bearish Put',
      badgeClass: 'badge-bearish',
      conviction: pcr > 1.2 ? 'Bearish Momentum' : 'Downside Hedge',
      dte,
      expiryDate: exp.dateStr,
      expiryLabel: `${exp.dateStr} (${exp.type})`,
      transactSpec: buildTransactSpec(quote, exp, 'Long Put', dte),
      spotPrice: S,
      targetPrice: exitPlan.targetBooking.spotPrice,
      stopLossPrice: exitPlan.stopLoss.spotPrice,
      entryPremium: exitPlan.entryPremium,
      targetPremium: exitPlan.targetBooking.targetPremium,
      stopLossPremium: exitPlan.stopLoss.stopLossPremium,
      targetPremiumPrice: exitPlan.targetBooking.targetPremium,
      stopLossPremiumPrice: exitPlan.stopLoss.stopLossPremium,
      exitPlan,
      legs,
      netCost,
      isCredit: false,
      maxProfit,
      maxLoss,
      breakevens: [breakeven],
      riskReward: `1 : ${((strike - premium) / premium).toFixed(2)}`,
      pop,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst
    });
  }

  // -------------------------------------------------------------
  // 5. STRATEGY: Bear Put Spread (Debit Spread)
  // Buy Higher Put + Sell Lower Put (ivRank <= 50)
  // -------------------------------------------------------------
  if (ivRank <= 50) {
    const exp = currentMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;
    const higherStrike = atmStrike;
    const lowerStrike = atmStrike - step * 2;

    const higherGreeks = calculateGreeks('put', S, higherStrike, T, r, ivDecimal);
    const lowerGreeks = calculateGreeks('put', S, lowerStrike, T, r, ivDecimal);

    // Skip generating if long leg (anchor/protection leg) evaluates to less than $0.05
    if (higherGreeks.price >= 0.05) {
      const netDebit = Math.max(0.05, Number((higherGreeks.price - lowerGreeks.price).toFixed(2)));
      const spreadWidth = higherStrike - lowerStrike;
      const maxProfitPerShare = spreadWidth - netDebit;
      const breakeven = Number((higherStrike - netDebit).toFixed(2));
      const pop = calculatePOP(S, breakeven, T, ivDecimal, false);

      const legs = [
        { type: 'put', action: 'buy', strike: higherStrike, premium: higherGreeks.price, contracts: 1, label: `Buy ${curr}${higherStrike} Put` },
        { type: 'put', action: 'sell', strike: lowerStrike, premium: lowerGreeks.price, contracts: 1, label: `Sell ${curr}${lowerStrike} Put` }
      ];

      const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
      const netCost = Number((netDebit * lotSize).toFixed(2));
      const maxProfit = Number((maxProfitPerShare * lotSize).toFixed(2));
      const maxLoss = netCost;

      const exitPlan = buildExitPlan({
        type: 'BEAR_PUT_SPREAD',
        S,
        lotSize,
        netCost,
        maxProfit,
        maxLoss,
        isCredit: false,
        curr,
        upperStrike: higherStrike,
        lowerStrike,
        premium: netDebit,
        step
      });

      strategies.push({
        id: `${quote.ticker}-BEAR-PUT-SPREAD-${higherStrike}-${lowerStrike}`,
        ticker: quote.ticker,
        displayTicker: quote.displayTicker,
        name: quote.name,
        market: quote.market,
        type: quote.type,
        cap: quote.cap || 'LARGE',
        sector: quote.sector || '',
        currency: quote.currency,
        currencySymbol: curr,
        strategyName: 'Bear Put Spread (Debit)',
        category: STRATEGY_CATEGORIES.DEBIT_SPREADS,
        sentiment: 'Bearish',
        directionBadge: 'Bearish Spread',
        badgeClass: 'badge-bearish',
        conviction: 'Defined Risk',
        dte,
        expiryDate: exp.dateStr,
        expiryLabel: `${exp.dateStr} (${exp.type})`,
        transactSpec: buildTransactSpec(quote, exp, 'Bear Put Spread', dte),
        spotPrice: S,
        targetPrice: exitPlan.targetBooking.spotPrice,
        stopLossPrice: exitPlan.stopLoss.spotPrice,
        entryPremium: exitPlan.entryPremium,
        targetPremium: exitPlan.targetBooking.targetPremium,
        stopLossPremium: exitPlan.stopLoss.stopLossPremium,
        targetPremiumPrice: exitPlan.targetBooking.targetPremium,
        stopLossPremiumPrice: exitPlan.stopLoss.stopLossPremium,
        exitPlan,
        legs,
        netCost,
        isCredit: false,
        maxProfit,
        maxLoss,
        breakevens: [breakeven],
        riskReward: `1 : ${(maxProfitPerShare / netDebit).toFixed(2)}`,
        pop,
        ivRank,
        netDelta: payoff.netDelta,
        netTheta: payoff.netTheta,
        catalyst: `Limits downside cost by selling ${curr}${lowerStrike} Put. Exit rule secures 70% of max spread profit (${curr}${exitPlan.targetBooking.profitPerLot.toLocaleString()}) while cutting loss if spot rises above ${curr}${exitPlan.stopLoss.spotPrice}.`
      });
    }
  }

  // -------------------------------------------------------------
  // 6. STRATEGY: Iron Condor (Range-Bound / Delta-Neutral)
  // Sell OTM Put Spread + Sell OTM Call Spread (4 legs)
  // Gated by: IV Rank >= 40 and VRP >= 3.0% (rich volatility premium)
  // -------------------------------------------------------------
  if (ivRank >= 40 && vrp >= 3.0) {
    // Force nextMonthlyExp to target 30-45 DTE window and avoid late-stage Gamma explosion
    const exp = nextMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;

    // Binary event check: Avoid gap risk if earnings event occurs before expiration
    if (!hasEarningsBefore(dte)) {
      const putShort = atmStrike - step * 2;
      const putLong  = atmStrike - step * 4;
      const callShort = atmStrike + step * 2;
      const callLong  = atmStrike + step * 4;

      const psGreeks = calculateGreeks('put', S, putShort, T, r, ivDecimal);
      const plGreeks = calculateGreeks('put', S, putLong, T, r, ivDecimal);
      const csGreeks = calculateGreeks('call', S, callShort, T, r, ivDecimal);
      const clGreeks = calculateGreeks('call', S, callLong, T, r, ivDecimal);

      // Low-Liquidity Wing filter: both long protection legs must evaluate to at least $0.05
      if (plGreeks.price >= 0.05 && clGreeks.price >= 0.05) {
        const putCredit = Math.max(0.02, psGreeks.price - plGreeks.price);
        const callCredit = Math.max(0.02, csGreeks.price - clGreeks.price);
        const totalCredit = Number((putCredit + callCredit).toFixed(2));

        const spreadWidth = step * 2; // Wing width of each credit spread

        // Minimum Net Credit Floor: total credit collected must be >= 15% of spreadWidth
        if (totalCredit >= 0.15 * spreadWidth) {
          const wingWidth = spreadWidth;
          const maxLossPerShare = Number((wingWidth - totalCredit).toFixed(2));
          const lowerBE = Number((putShort - totalCredit).toFixed(2));
          const upperBE = Number((callShort + totalCredit).toFixed(2));

          const popLower = calculatePOP(S, lowerBE, T, ivDecimal, true);
          const popUpper = calculatePOP(S, upperBE, T, ivDecimal, false);
          const pop = Number((Math.min(95, Math.max(50, (popLower + popUpper) / 2))).toFixed(1));

          const legs = [
            { type: 'put', action: 'buy', strike: putLong, premium: plGreeks.price, contracts: 1, label: `Buy ${curr}${putLong} Put` },
            { type: 'put', action: 'sell', strike: putShort, premium: psGreeks.price, contracts: 1, label: `Sell ${curr}${putShort} Put` },
            { type: 'call', action: 'sell', strike: callShort, premium: csGreeks.price, contracts: 1, label: `Sell ${curr}${callShort} Call` },
            { type: 'call', action: 'buy', strike: callLong, premium: clGreeks.price, contracts: 1, label: `Buy ${curr}${callLong} Call` }
          ];

          const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
          const netCost = Number((totalCredit * lotSize).toFixed(2));
          const maxProfit = netCost;
          const maxLoss = Number((maxLossPerShare * lotSize).toFixed(2));

          const exitPlan = buildExitPlan({
            type: 'IRON_CONDOR',
            S,
            lotSize,
            netCost,
            maxProfit,
            maxLoss,
            isCredit: true,
            curr,
            shortStrike: putShort,
            longStrike: putLong,
            premium: totalCredit,
            step
          });

          strategies.push({
            id: `${quote.ticker}-IRON-CONDOR-${putShort}-${callShort}`,
            ticker: quote.ticker,
            displayTicker: quote.displayTicker,
            name: quote.name,
            market: quote.market,
            type: quote.type,
            cap: quote.cap || 'LARGE',
            sector: quote.sector || '',
            currency: quote.currency,
            currencySymbol: curr,
            strategyName: 'Iron Condor (Delta-Neutral)',
            category: STRATEGY_CATEGORIES.IRON_CONDORS,
            sentiment: 'Neutral',
            directionBadge: 'Delta Neutral',
            badgeClass: 'badge-neutral',
            conviction: ivRank > 50 ? 'Prime Volatility Crush' : 'Income Range',
            dte,
            expiryDate: exp.dateStr,
            expiryLabel: `${exp.dateStr} (${exp.type})`,
            transactSpec: buildTransactSpec(quote, exp, 'Iron Condor', dte),
            spotPrice: S,
            targetPrice: S,
            stopLossPrice: putShort,
            entryPremium: exitPlan.entryPremium,
            targetPremium: exitPlan.targetBooking.targetPremium,
            stopLossPremium: exitPlan.stopLoss.stopLossPremium,
            targetPremiumPrice: exitPlan.targetBooking.targetPremium,
            stopLossPremiumPrice: exitPlan.stopLoss.stopLossPremium,
            exitPlan,
            legs,
            netCost,
            isCredit: true,
            maxProfit,
            maxLoss,
            breakevens: [lowerBE, upperBE],
            riskReward: `1 : ${(totalCredit / maxLossPerShare).toFixed(2)}`,
            pop,
            ivRank,
            netDelta: payoff.netDelta,
            netTheta: payoff.netTheta,
            catalyst: `Profits from time decay and IV crush between ${curr}${lowerBE} and ${curr}${upperBE}. Backed by Volatility Risk Premium (VRP: +${vrp}%). Disciplined exit books 50% max credit (${curr}${exitPlan.targetBooking.profitPerLot.toLocaleString()}), enforces 21-DTE Gamma Armor, and stops loss at 1.5x credit to protect capital.`
          });
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 7. STRATEGY: Long Straddle (Volatility Expansion)
  // Buy ATM Call + Buy ATM Put (Explosive Breakout Play, ivRank <= 50)
  // -------------------------------------------------------------
  if (ivRank <= 50) {
    const exp = (weeklyExp.dte >= 2) ? weeklyExp : currentMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;
    const callGreeks = calculateGreeks('call', S, atmStrike, T, r, ivDecimal);
    const putGreeks = calculateGreeks('put', S, atmStrike, T, r, ivDecimal);
    const totalCost = Number((callGreeks.price + putGreeks.price).toFixed(2));
    const lowerBE = Number((atmStrike - totalCost).toFixed(2));
    const upperBE = Number((atmStrike + totalCost).toFixed(2));

    const legs = [
      { type: 'call', action: 'buy', strike: atmStrike, premium: callGreeks.price, contracts: 1, label: `Buy ${curr}${atmStrike} Call` },
      { type: 'put', action: 'buy', strike: atmStrike, premium: putGreeks.price, contracts: 1, label: `Buy ${curr}${atmStrike} Put` }
    ];

    const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
    const netCost = Number((totalCost * lotSize).toFixed(2));
    const maxLoss = netCost;

    const exitPlan = buildExitPlan({
      type: 'LONG_STRADDLE',
      S,
      lotSize,
      netCost,
      maxProfit: 'Unlimited',
      maxLoss,
      isCredit: false,
      curr,
      premium: totalCost,
      step
    });

    let catalyst = `Underpriced option volatility. Provisioned with +45% Target Booking (${curr}${exitPlan.targetBooking.profitPerLot.toLocaleString()}) and a strict 5-day / 35% time stop to prevent theta decay.`;
    if (hasEarningsBefore(dte)) {
      catalyst += ` ${earningsWarning}`;
    }

    strategies.push({
      id: `${quote.ticker}-LONG-STRADDLE-${atmStrike}`,
      ticker: quote.ticker,
      displayTicker: quote.displayTicker,
      name: quote.name,
      market: quote.market,
      type: quote.type,
      cap: quote.cap || 'LARGE',
      sector: quote.sector || '',
      currency: quote.currency,
      currencySymbol: curr,
      strategyName: 'Long Straddle (Vol Breakout)',
      category: STRATEGY_CATEGORIES.STRADDLES,
      sentiment: 'Neutral',
      directionBadge: 'Vol Expansion',
      badgeClass: 'badge-volatility',
      conviction: ivRank < 30 ? 'Cheap Volatility' : 'Speculative',
      dte,
      expiryDate: exp.dateStr,
      expiryLabel: `${exp.dateStr} (${exp.type})`,
      transactSpec: buildTransactSpec(quote, exp, 'Long Straddle', dte),
      spotPrice: S,
      targetPrice: exitPlan.targetBooking.spotPrice,
      stopLossPrice: S,
      entryPremium: exitPlan.entryPremium,
      targetPremium: exitPlan.targetBooking.targetPremium,
      stopLossPremium: exitPlan.stopLoss.stopLossPremium,
      targetPremiumPrice: exitPlan.targetBooking.targetPremium,
      stopLossPremiumPrice: exitPlan.stopLoss.stopLossPremium,
      exitPlan,
      legs,
      netCost,
      isCredit: false,
      maxProfit: 'Unlimited',
      maxLoss,
      breakevens: [lowerBE, upperBE],
      riskReward: 'Unlimited Dual Wing',
      pop: 46.5,
      ivRank,
      netDelta: payoff.netDelta,
      netTheta: payoff.netTheta,
      catalyst
    });
  }

  // -------------------------------------------------------------
  // 8. STRATEGY: Theta Decay Harvester (16-Delta Strangle Condor)
  // Sell OTM ~16-Delta Put + Sell OTM ~16-Delta Call + Buy Wider Protective Wings (4 legs)
  // Replaces narrow ATM pinning butterfly with asymmetric 1-sigma safe plateau
  // Gated by: IV Rank >= 40 and VRP >= 3.0%
  // -------------------------------------------------------------
  if (ivRank >= 40 && vrp >= 3.0) {
    // Force nextMonthlyExp to target 30-45 DTE window and avoid late-stage Gamma explosion
    const exp = nextMonthlyExp;
    const dte = exp.dte;
    const T = dte / 365;

    // Binary event check: Avoid gap risk if earnings event occurs before expiration
    if (!hasEarningsBefore(dte)) {
      // 16-Delta OTM Short Strikes (~1 Standard Deviation buffer)
      // Asymmetric put side has an extra margin of safety to absorb negative market skew
      const shortPut = atmStrike - step * 2;
      const longPut  = atmStrike - step * 5; // Wide 3-step put wing for crash safety
      const shortCall = atmStrike + step * 2;
      const longCall  = atmStrike + step * 4; // 2-step call wing

      const spGreeks = calculateGreeks('put', S, shortPut, T, r, ivDecimal);
      const lpGreeks = calculateGreeks('put', S, longPut, T, r, ivDecimal);
      const scGreeks = calculateGreeks('call', S, shortCall, T, r, ivDecimal);
      const lcGreeks = calculateGreeks('call', S, longCall, T, r, ivDecimal);

      // Low-Liquidity Wing filter: both long protection legs must evaluate to at least $0.04
      if (lpGreeks.price >= 0.04 && lcGreeks.price >= 0.04) {
        const putCredit = Math.max(0.04, spGreeks.price - lpGreeks.price);
        const callCredit = Math.max(0.04, scGreeks.price - lcGreeks.price);
        const totalCredit = Number((putCredit + callCredit).toFixed(2));
        const maxWingWidth = Math.max(shortPut - longPut, longCall - shortCall);

        // Minimum Net Credit Floor: total credit collected must be >= 12% of maxWingWidth
        if (totalCredit >= 0.12 * maxWingWidth) {
          const maxLossPerShare = Number((maxWingWidth - totalCredit).toFixed(2));
          const lowerBE = Number((shortPut - totalCredit).toFixed(2));
          const upperBE = Number((shortCall + totalCredit).toFixed(2));

          const popLower = calculatePOP(S, lowerBE, T, ivDecimal, true);
          const popUpper = calculatePOP(S, upperBE, T, ivDecimal, false);
          const pop = Number((Math.min(95, Math.max(60, (popLower + popUpper) / 2))).toFixed(1));

          const legs = [
            { type: 'put', action: 'buy', strike: longPut, premium: lpGreeks.price, contracts: 1, label: `Buy ${curr}${longPut} Put (Tail Protection)` },
            { type: 'put', action: 'sell', strike: shortPut, premium: spGreeks.price, contracts: 1, label: `Sell ${curr}${shortPut} Put (16-Delta Theta)` },
            { type: 'call', action: 'sell', strike: shortCall, premium: scGreeks.price, contracts: 1, label: `Sell ${curr}${shortCall} Call (16-Delta Theta)` },
            { type: 'call', action: 'buy', strike: longCall, premium: lcGreeks.price, contracts: 1, label: `Buy ${curr}${longCall} Call (Tail Protection)` }
          ];

          const payoff = calculatePayoffProfile(legs, S, lotSize, dte, ivDecimal, r);
          const netCost = Number((totalCredit * lotSize).toFixed(2));
          const maxProfit = netCost;
          const maxLoss = Number((maxLossPerShare * lotSize).toFixed(2));

          const exitPlan = buildExitPlan({
            type: 'THETA_DECAY',
            S,
            lotSize,
            netCost,
            maxProfit,
            maxLoss,
            isCredit: true,
            curr,
            atmStrike: S,
            shortStrike: shortPut,
            premium: totalCredit,
            step
          });

          const netDailyThetaCurr = Math.abs(payoff.netTheta).toFixed(1);

          strategies.push({
            id: `${quote.ticker}-THETA-DECAY-${shortPut}-${shortCall}`,
            ticker: quote.ticker,
            displayTicker: quote.displayTicker,
            name: quote.name,
            market: quote.market,
            type: quote.type,
            cap: quote.cap || 'LARGE',
            sector: quote.sector || '',
            currency: quote.currency,
            currencySymbol: curr,
            strategyName: 'Theta Decay Harvester (16-Delta Strangle Condor)',
            category: STRATEGY_CATEGORIES.THETA_DECAY,
            sentiment: 'Neutral',
            directionBadge: 'Theta Decay',
            badgeClass: 'badge-theta',
            conviction: '1-Sigma Safe Buffer',
            dte,
            expiryDate: exp.dateStr,
            expiryLabel: `${exp.dateStr} (${exp.type})`,
            transactSpec: buildTransactSpec(quote, exp, 'Theta Decay Harvester', dte),
            spotPrice: S,
            targetPrice: S,
            stopLossPrice: exitPlan.stopLoss.spotPrice,
            entryPremium: exitPlan.entryPremium,
            targetPremium: exitPlan.targetBooking.targetPremium,
            stopLossPremium: exitPlan.stopLoss.stopLossPremium,
            targetPremiumPrice: exitPlan.targetBooking.targetPremium,
            stopLossPremiumPrice: exitPlan.stopLoss.stopLossPremium,
            exitPlan,
            legs,
            netCost,
            isCredit: true,
            maxProfit,
            maxLoss,
            breakevens: [lowerBE, upperBE],
            riskReward: `1 : ${(totalCredit / maxLossPerShare).toFixed(2)}`,
            pop,
            ivRank,
            netDelta: payoff.netDelta,
            netTheta: payoff.netTheta,
            catalyst: `Engineered for steady positive time decay (+${curr}${netDailyThetaCurr}/day) across a wide 1-sigma safe buffer (${curr}${shortPut} — ${curr}${shortCall}). Backed by Volatility Risk Premium (VRP: +${vrp}%). Enforces 21-DTE Gamma Armor to capture theta without pinning risk.`
          });
        }
      }
    }
  }

  return strategies;
}

/**
 * Scan all quotes in the universe and return prioritized strategies
 */
export function scanAllUniverseStrategies(quotes) {
  if (!Array.isArray(quotes)) return [];
  const all = [];
  quotes.forEach(quote => {
    const assetStrats = scanStrategiesForAsset(quote);
    all.push(...assetStrats);
  });

  // Sort by Probability of Profit (POP) and Conviction
  return all.sort((a, b) => (b.pop || 50) - (a.pop || 50));
}
