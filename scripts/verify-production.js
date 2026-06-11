const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const testPath = path.join(root, 'playwright-test.js');

function fail(message) {
  console.error(`Production verification failed: ${message}`);
  process.exitCode = 1;
}

function assertIncludes(source, value, label) {
  if (!source.includes(value)) {
    fail(`missing ${label}: ${value}`);
  }
}

function assertNotIncludes(source, value, label) {
  if (source.includes(value)) {
    fail(`unexpected ${label}: ${value}`);
  }
}

if (!fs.existsSync(indexPath)) {
  fail('index.html does not exist');
  process.exit();
}

if (!fs.existsSync(testPath)) {
  fail('playwright-test.js does not exist');
  process.exit();
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const testScript = fs.readFileSync(testPath, 'utf8');

assertIncludes(indexHtml, '<div id="screen-home"', 'home screen');
assertIncludes(indexHtml, '<div id="screen-hub"', 'hub screen');
assertIncludes(indexHtml, '<div id="screen-battle"', 'battle screen');
assertIncludes(indexHtml, 'id="battlefield"', 'battlefield');
assertIncludes(indexHtml, 'function startBattle(', 'battle entrypoint');
assertIncludes(indexHtml, 'function updateCommanderHp()', 'commander HP updater');
assertIncludes(indexHtml, 'B.result = result;', 'battle result state');
assertIncludes(indexHtml, 'UI v0.8.2', 'current UI layer');
assertIncludes(indexHtml, 'B._handRenderEnergy !== B.energy', 'energy-to-hand refresh guard');
assertIncludes(indexHtml, 'function autoBuildDeck', 'deck auto-build helper');
assertIncludes(indexHtml, 'function getCardMaxCopies', 'shared deck copy limit helper');
assertIncludes(indexHtml, 'G.player.gold -= price;', 'single-card purchase gold deduction');
assertIncludes(indexHtml, 'G.player.gold -= cost;', 'pack or upgrade gold deduction');
assertIncludes(testScript, 'pathToFileURL', 'local file test target');
assertIncludes(testScript, 'runManualCardClickRegression', 'manual card click regression');
assertIncludes(testScript, 'runShopPurchaseRegression', 'shop purchase regression');
assertIncludes(testScript, 'runDeckAutoBuildRegression', 'deck auto-build regression');

assertNotIncludes(indexHtml, 'const SYNERGIES', 'removed synergy table');
assertNotIncludes(indexHtml, 'applySynergies();', 'removed synergy startup call');
assertNotIncludes(indexHtml, "console.log('生效羈絆:", 'removed synergy log');
assertNotIncludes(indexHtml, "document.getElementById('battle-timer').textContent", 'unguarded battle timer write');
assertNotIncludes(indexHtml, "document.getElementById('my-hp-bar').style", 'unguarded commander HP write');
assertNotIncludes(indexHtml, "document.getElementById('enemy-hp-bar').style", 'unguarded enemy HP write');
assertNotIncludes(indexHtml, '// G.player.gold -= price;', 'disabled single-card gold deduction');
assertNotIncludes(indexHtml, '// G.player.gold -= cost;', 'disabled cost gold deduction');
assertNotIncludes(testScript, "https://gxben0117-collab.github.io/battle-legend/", 'remote-only test target');
assertNotIncludes(testScript, 'startStage', 'old test battle entrypoint');

const scriptOpenCount = (indexHtml.match(/<script\b/g) || []).length;
const scriptCloseCount = (indexHtml.match(/<\/script>/g) || []).length;
if (scriptOpenCount !== scriptCloseCount) {
  fail(`script tag mismatch: ${scriptOpenCount} open, ${scriptCloseCount} close`);
}

const styleOpenCount = (indexHtml.match(/<style\b/g) || []).length;
const styleCloseCount = (indexHtml.match(/<\/style>/g) || []).length;
if (styleOpenCount !== styleCloseCount) {
  fail(`style tag mismatch: ${styleOpenCount} open, ${styleCloseCount} close`);
}

if (!process.exitCode) {
  console.log('Production verification passed.');
}
