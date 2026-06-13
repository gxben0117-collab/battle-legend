/**
 * 戰棋傳說 - Emoji 升級為 Sprite 腳本
 * 策略：使用 CSS + SVG 背景提升視覺效果，保持遊戲邏輯完全不變
 */

const fs = require('fs');
const path = require('path');

// 讀取 index.html
const htmlPath = path.join(__dirname, '../index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// 備份原檔案
const backupPath = path.join(__dirname, `../index.backup.${Date.now()}.html`);
fs.writeFileSync(backupPath, html, 'utf8');
console.log(`✅ 備份完成: ${backupPath}`);

// ==================== 步驟 1: 升級 CSS 樣式 ====================

// 找到 .unit-icon 的定義位置
const unitIconCssStart = html.indexOf('.unit-icon {');
const unitIconCssEnd = html.indexOf('}', unitIconCssStart);

// 新的 .unit-icon 樣式（支援 emoji + 背景裝飾）
const newUnitIconCss = `.unit-icon {
  font-size: 28px;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
  animation: icon-glow 3s ease-in-out infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;

  /* 添加漸層背景裝飾 */
  background: radial-gradient(
    circle at 50% 50%,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0.05) 40%,
    transparent 70%
  );
  border-radius: 50%;
}`;

html = html.substring(0, unitIconCssStart) + newUnitIconCss + html.substring(unitIconCssEnd + 1);
console.log('✅ 步驟 1: 升級 .unit-icon CSS');

// ==================== 步驟 2: 增強單位邊框效果 ====================

// 找到 .unit-icon::before 位置
const iconBeforeStart = html.indexOf('.unit-icon::before {');
if (iconBeforeStart !== -1) {
  const iconBeforeEnd = html.indexOf('}', iconBeforeStart);

  const enhancedBefore = `.unit-icon::before {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  padding: 2px;
  background: linear-gradient(135deg,
    rgba(100, 180, 255, 0.4) 0%,
    rgba(60, 120, 200, 0.2) 50%,
    rgba(100, 180, 255, 0.4) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  z-index: 1;
  animation: border-rotate 4s linear infinite;
}`;

  html = html.substring(0, iconBeforeStart) + enhancedBefore + html.substring(iconBeforeEnd + 1);
  console.log('✅ 步驟 2: 增強單位邊框效果');
}

// ==================== 步驟 3: 添加邊框旋轉動畫 ====================

const keyframesInsertPos = html.indexOf('@keyframes icon-glow');
const borderRotateKeyframes = `
@keyframes border-rotate {
  0%, 100% {
    filter: hue-rotate(0deg) brightness(1);
  }
  50% {
    filter: hue-rotate(30deg) brightness(1.2);
  }
}

`;

html = html.substring(0, keyframesInsertPos) + borderRotateKeyframes + html.substring(keyframesInsertPos);
console.log('✅ 步驟 3: 添加邊框旋轉動畫');

// ==================== 步驟 4: 升級攻擊特效 ====================

// 近戰揮刀特效升級
const meleeSlashFunc = html.indexOf('function showMeleeSlash');
if (meleeSlashFunc !== -1) {
  const funcStart = meleeSlashFunc;
  const funcEnd = html.indexOf('}\n', html.indexOf("setTimeout(() => div.remove(), 300);", funcStart));

  const enhancedMeleeSlash = `function showMeleeSlash(fromX, fromY, toX, toY) {
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.left = toX + 'px';
  div.style.top = toY + 'px';
  div.style.fontSize = '56px';
  div.style.pointerEvents = 'none';
  div.style.zIndex = '1000';
  div.textContent = '⚔️';
  div.style.transform = 'translate(-50%, -50%) rotate(45deg)';
  div.style.filter = 'drop-shadow(0 0 12px rgba(255, 200, 100, 0.8))';
  div.style.animation = 'slash-fade 0.3s ease-out';

  document.querySelector('.battle-main').appendChild(div);
  setTimeout(() => div.remove(), 300);
}`;

  html = html.substring(0, funcStart) + enhancedMeleeSlash + html.substring(funcEnd + 1);
  console.log('✅ 步驟 4.1: 升級近戰揮刀特效');
}

// 弓箭特效升級
const arrowFunc = html.indexOf('function showArrowEffect');
if (arrowFunc !== -1) {
  const funcStart = arrowFunc;
  const funcEnd = html.indexOf('}\n', html.indexOf("setTimeout(() => div.remove(), 350);", funcStart));

  const enhancedArrow = `function showArrowEffect(fromX, fromY, toX, toY) {
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.left = fromX + 'px';
  div.style.top = fromY + 'px';
  div.style.fontSize = '32px';
  div.style.pointerEvents = 'none';
  div.style.zIndex = '1000';
  div.textContent = '🏹';
  div.style.filter = 'drop-shadow(0 0 8px rgba(100, 200, 255, 0.6))';

  const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
  div.style.transform = \`translate(-50%, -50%) rotate(\${angle}deg)\`;
  div.style.transition = 'all 0.3s linear';

  document.querySelector('.battle-main').appendChild(div);

  setTimeout(() => {
    div.style.left = toX + 'px';
    div.style.top = toY + 'px';
  }, 10);

  setTimeout(() => div.remove(), 350);
}`;

  html = html.substring(0, funcStart) + enhancedArrow + html.substring(funcEnd + 1);
  console.log('✅ 步驟 4.2: 升級弓箭特效');
}

// 魔法彈特效升級
const magicFunc = html.indexOf('function showMagicBolt');
if (magicFunc !== -1) {
  const funcStart = magicFunc;
  const funcEnd = html.indexOf('}\n', html.indexOf('setTimeout(() => div.remove()', funcStart) + 50);

  const enhancedMagic = `function showMagicBolt(fromX, fromY, toX, toY) {
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.left = fromX + 'px';
  div.style.top = fromY + 'px';
  div.style.fontSize = '40px';
  div.style.pointerEvents = 'none';
  div.style.zIndex = '1000';
  div.textContent = '🔥';
  div.style.filter = 'drop-shadow(0 0 16px rgba(255, 100, 50, 0.9))';
  div.style.transition = 'all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)';

  document.querySelector('.battle-main').appendChild(div);

  setTimeout(() => {
    div.style.left = toX + 'px';
    div.style.top = toY + 'px';
    div.style.transform = 'translate(-50%, -50%) scale(1.3)';
  }, 10);

  setTimeout(() => {
    div.style.opacity = '0';
    div.style.transform = 'translate(-50%, -50%) scale(0.5)';
  }, 350);

  setTimeout(() => div.remove(), 450);
}`;

  html = html.substring(0, funcStart) + enhancedMagic + html.substring(funcEnd + 1);
  console.log('✅ 步驟 4.3: 升級魔法彈特效');
}

// ==================== 步驟 5: 增強 BOSS 單位視覺效果 ====================

const bossIconCss = html.indexOf('.unit.boss-unit .unit-icon {');
if (bossIconCss !== -1) {
  const bossIconEnd = html.indexOf('}', bossIconCss);

  const enhancedBossCss = `.unit.boss-unit .unit-icon {
  font-size: 36px;
  filter: drop-shadow(0 0 12px rgba(255, 100, 100, 0.8))
          drop-shadow(0 0 24px rgba(200, 50, 50, 0.5));
  animation: boss-icon-glow 1.5s ease-in-out infinite;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(255, 50, 50, 0.25) 0%,
    rgba(200, 0, 0, 0.1) 50%,
    transparent 80%
  );
}`;

  html = html.substring(0, bossIconCss) + enhancedBossCss + html.substring(bossIconEnd + 1);
  console.log('✅ 步驟 5: 增強 BOSS 視覺效果');
}

// ==================== 儲存升級後的檔案 ====================

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('\n🎉 升級完成！');
console.log(`📄 原檔案: ${htmlPath}`);
console.log(`💾 備份檔: ${backupPath}`);
console.log('\n✨ 視覺升級項目：');
console.log('  • 單位圖標添加漸層背景光暈');
console.log('  • 邊框添加旋轉動畫效果');
console.log('  • 攻擊特效添加發光陰影');
console.log('  • BOSS 單位添加紅色光暈');
console.log('  • 所有動畫保持流暢自然');
console.log('\n⚠️  遊戲邏輯完全未變動！');
console.log('\n🚀 請在瀏覽器中打開 index.html 查看效果');
