/**
 * 修復戰鬥畫面佈局 - 讓右側控制區正確顯示
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

console.log('🔧 開始修復戰鬥畫面佈局...\n');

// ==================== 修復 1: 將 grid 改為 3 欄佈局 ====================

const oldGrid2Col = `grid-template-columns: 252px minmax(620px, 1fr);`;
const newGrid3Col = `grid-template-columns: 252px 1fr auto;`;

if (html.includes(oldGrid2Col)) {
  html = html.replace(oldGrid2Col, newGrid3Col);
  console.log('✅ 修復 1: 將 grid 改為 3 欄（左、中、右）');
} else {
  console.log('⚠️  找不到 2 欄 grid 定義');
}

// ==================== 修復 2: 調整 battle-right 的 grid 位置 ====================

// 找到 .battle-right 的 CSS 定義
const battleRightStart = html.indexOf('.battle-right {', 2700);
if (battleRightStart !== -1) {
  const battleRightEnd = html.indexOf('}', html.indexOf('padding: 12px 16px;', battleRightStart));

  const oldBattleRightCss = html.substring(battleRightStart, battleRightEnd + 1);

  // 移除錯誤的 grid-column 設定
  const newBattleRightCss = oldBattleRightCss
    .replace(/grid-column: 2;/g, '')
    .replace(/justify-self: center;/g, '');

  html = html.substring(0, battleRightStart) + newBattleRightCss + html.substring(battleRightEnd + 1);
  console.log('✅ 修復 2: 移除 battle-right 的錯誤 grid 定位');
}

// ==================== 修復 3: 確保 battle-right 有適當寬度 ====================

const battleRightCssSearch = html.indexOf('.battle-right {', 2700);
if (battleRightCssSearch !== -1) {
  const insertPos = html.indexOf('flex-direction: row;', battleRightCssSearch);
  if (insertPos !== -1) {
    const before = html.substring(0, insertPos);
    const after = html.substring(insertPos);

    html = before + `width: 200px;\n  ` + after;
    console.log('✅ 修復 3: 設定 battle-right 寬度為 200px');
  }
}

// ==================== 修復 4: 響應式斷點也要改成 3 欄 ====================

const responsive2Col = `grid-template-columns: 220px minmax(600px, 1fr);`;
const responsive3Col = `grid-template-columns: 220px 1fr 200px;`;

if (html.includes(responsive2Col)) {
  html = html.replace(responsive2Col, responsive3Col);
  console.log('✅ 修復 4: 響應式斷點改為 3 欄');
}

// ==================== 儲存修復後的檔案 ====================

fs.writeFileSync(htmlPath, html, 'utf8');

console.log('\n🎉 佈局修復完成！');
console.log('\n📋 修復項目：');
console.log('  1. grid-template-columns: 2欄 → 3欄');
console.log('  2. 移除 battle-right 的錯誤定位');
console.log('  3. 設定 battle-right 固定寬度');
console.log('  4. 修復響應式斷點');
console.log('\n🚀 請重新打開遊戲測試控制按鈕');
