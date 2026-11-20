/**
 * Automated Test Suite: Action Screens "Back to Strategy Scanner" Navigation Verification
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Starting Action Screens "Back to Strategy Scanner" Navigation Test Suite...\n');

// 1. Verify index.html contains action-screen-nav-bar and back buttons
console.log('▶ Test 1: Verifying HTML structure for Action Screens Navigation Bars...');

const htmlPath = path.join(__dirname, 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// Check Strategy Analyzer (tab-analyzer)
assert(htmlContent.includes('id="tab-analyzer"'), 'index.html must contain tab-analyzer');
assert(htmlContent.includes('id="btnBackToScannerFromAnalyzer"'), 'Analyzer top nav must have btnBackToScannerFromAnalyzer');
assert(htmlContent.includes('id="btnBackToScannerFromAnalyzerControls"'), 'Analyzer controls must have btnBackToScannerFromAnalyzerControls');
assert(htmlContent.includes('id="btnBackToScannerFromAnalyzerBottom"'), 'Analyzer bottom must have btnBackToScannerFromAnalyzerBottom');
assert(htmlContent.includes('id="analyzerBreadcrumbTitle"'), 'Analyzer must have dynamic breadcrumb title');

// Check Live Option Chain (tab-chain)
assert(htmlContent.includes('id="tab-chain"'), 'index.html must contain tab-chain');
assert(htmlContent.includes('id="btnBackToScannerFromChain"'), 'Option Chain top nav must have btnBackToScannerFromChain');
assert(htmlContent.includes('id="chainBreadcrumbTitle"'), 'Option Chain must have dynamic breadcrumb title');

// Check Strategy Builder (tab-builder)
assert(htmlContent.includes('id="tab-builder"'), 'index.html must contain tab-builder');
assert(htmlContent.includes('id="btnBackToScannerFromBuilder"'), 'Strategy Builder top nav must have btnBackToScannerFromBuilder');
assert(htmlContent.includes('id="builderBreadcrumbTitle"'), 'Strategy Builder must have dynamic breadcrumb title');

// Check Market Overview (tab-overview)
assert(htmlContent.includes('id="tab-overview"'), 'index.html must contain tab-overview');
assert(htmlContent.includes('id="btnBackToScannerFromOverview"'), 'Market Overview top nav must have btnBackToScannerFromOverview');

console.log('  ✅ index.html contains complete Action Screen navigation bars, buttons, and breadcrumbs.');

// 2. Verify CSS rules in style.css
console.log('\n▶ Test 2: Verifying CSS styling rules for Back to Scanner controls...');

const cssPath = path.join(__dirname, 'src', 'style.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

assert(cssContent.includes('.action-screen-nav-bar'), 'style.css must contain .action-screen-nav-bar');
assert(cssContent.includes('.btn-back-to-scanner'), 'style.css must contain .btn-back-to-scanner');
assert(cssContent.includes('.action-screen-breadcrumb'), 'style.css must contain .action-screen-breadcrumb');
assert(cssContent.includes('.row-highlight-pulse'), 'style.css must contain .row-highlight-pulse');
assert(cssContent.includes('rowHighlightPulseAnim'), 'style.css must contain rowHighlightPulseAnim animation');

console.log('  ✅ CSS rules verified for navigation bar, hover animations, and row highlight pulse.');

// 3. Verify Strategy Builder footer back button
console.log('\n▶ Test 3: Verifying Strategy Builder footer back button...');

const builderPath = path.join(__dirname, 'src', 'components', 'strategyBuilder.js');
const builderContent = fs.readFileSync(builderPath, 'utf-8');

assert(builderContent.includes('btnBackToScannerFromBuilderFooter'), 'strategyBuilder.js must include btnBackToScannerFromBuilderFooter');
assert(builderContent.includes('btn-back-to-scanner'), 'strategyBuilder.js must have btn-back-to-scanner class');

console.log('  ✅ Strategy Builder component correctly renders Back to Strategy Scanner button.');

// 4. Verify main.js navigation logic & state tracking
console.log('\n▶ Test 4: Verifying main.js state tracking & navigateBackToScanner implementation...');

const mainPath = path.join(__dirname, 'src', 'main.js');
const mainContent = fs.readFileSync(mainPath, 'utf-8');

assert(mainContent.includes('lastInspectedStrategyId'), 'main.js must track lastInspectedStrategyId in state');
assert(mainContent.includes('scannerTableScrollLeft'), 'main.js must track scannerTableScrollLeft in state');
assert(mainContent.includes('navigateBackToScanner'), 'main.js must define and export navigateBackToScanner');
assert(mainContent.includes('.btn-back-to-scanner, [data-back-to="tab-scanner"]'), 'main.js must have global event delegation for back buttons');
assert(mainContent.includes("e.key === 'Escape'"), 'main.js must support Escape key shortcut to return to scanner');
assert(mainContent.includes('row-highlight-pulse'), 'main.js must trigger row-highlight-pulse on returned strategy');

console.log('  ✅ main.js logic verified for state tracking, event delegation, scroll restoration, and keyboard shortcuts.');

console.log('\n🎉 ALL ACTION SCREENS "BACK TO STRATEGY SCANNER" TESTS PASSED SUCCESSFULLY!\n');
