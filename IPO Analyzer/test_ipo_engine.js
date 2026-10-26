import { IPO_UNIVERSE } from './src/data/ipoUniverse.js';
import { IpoEvaluationEngine } from './src/quant/ipoEvaluationEngine.js';

console.log('====================================================');
console.log('🧪 TESTING IPO ANALYZER INSTITUTIONAL EVALUATION ENGINE');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

for (const ipo of IPO_UNIVERSE) {
  try {
    const result = IpoEvaluationEngine.evaluate(ipo);
    const markdown = IpoEvaluationEngine.formatAsMarkdownMemo(result);

    console.log(`[PASS] ${ipo.ticker.padEnd(12)} | Market: ${ipo.market} (${ipo.tier.padEnd(8)}) | Verdict: ${result.verdictLabel.padEnd(25)} | Score: ${result.score}/100 | RedFlags: ${result.redFlags.length}`);
    
    // Verify required 5 parts in dossier
    const d = result.dossier;
    if (!d.part1_executiveVerdict || !d.part2_businessAndRedFlags || !d.part3_valuationVsPeers || !d.part4_marketSentiment || !d.part5_tacticalNote) {
      throw new Error(`Missing one of the 5 required dossier parts for ${ipo.ticker}`);
    }

    if (!markdown.includes('INSTITUTIONAL IPO MEMORANDUM')) {
      throw new Error(`Markdown export failed for ${ipo.ticker}`);
    }

    passed++;
  } catch (err) {
    console.error(`[FAIL] ${ipo.ticker}:`, err.message);
    failed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${IPO_UNIVERSE.length} IPOs evaluated.`);
if (failed > 0) process.exit(1);
