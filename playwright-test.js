// ============================================================
// 戰棋傳說 - Playwright 自動化測試
// ============================================================

const { chromium } = require('playwright');

// 測試配置
const CONFIG = {
  url: 'https://gxben0117-collab.github.io/battle-legend/',
  rounds: 10,        // 測試次數
  speed: 3,          // 倍速
  timeout: 300000,   // 單局超時（5分鐘）
  headless: false,   // false = 顯示瀏覽器，true = 無頭模式
};

// 測試結果
let results = {
  total: 0,
  wins: 0,
  loses: 0,
  draws: 0,
  errors: [],
  crashes: [],
  times: [],
};

// 主函數
async function runTests() {
  console.log('═══════════════════════════════════════');
  console.log('🎮 戰棋傳說 - Playwright 自動化測試');
  console.log('═══════════════════════════════════════');
  console.log(`測試網址: ${CONFIG.url}`);
  console.log(`測試次數: ${CONFIG.rounds}`);
  console.log(`倍速: ${CONFIG.speed}×`);
  console.log(`顯示模式: ${CONFIG.headless ? '無頭' : '可視'}`);
  console.log('═══════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: CONFIG.headless,
    args: ['--no-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  // 監聽控制台錯誤
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('🔴 控制台錯誤:', msg.text());
    }
  });

  // 監聽頁面錯誤
  page.on('pageerror', error => {
    console.error('💥 頁面錯誤:', error.message);
    results.crashes.push({
      test: results.total + 1,
      error: error.message,
      stack: error.stack,
    });
  });

  try {
    console.log('📡 正在載入遊戲...\n');
    await page.goto(CONFIG.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 運行所有測試
    for (let i = 1; i <= CONFIG.rounds; i++) {
      await runSingleTest(page, i);
    }

  } catch (error) {
    console.error('💥 測試過程發生錯誤:', error);
  } finally {
    await browser.close();
    displayResults();
  }
}

// 單次測試
async function runSingleTest(page, testNum) {
  console.log(`\n🎮 測試 #${testNum} 開始...`);
  const startTime = Date.now();
  results.total++;

  try {
    // 1. 返回大廳
    await page.evaluate(() => {
      if (typeof showScreen === 'function') {
        showScreen('hub');
      }
    });
    await page.waitForTimeout(500);

    // 2. 點擊第一關
    const stage1Button = await page.$('text=1-1');
    if (stage1Button) {
      await stage1Button.click();
      await page.waitForTimeout(1000);
    } else {
      throw new Error('找不到 1-1 關卡按鈕');
    }

    // 3. 設置倍速和自動模式
    await page.evaluate((speed) => {
      if (typeof setSpeed === 'function') {
        setSpeed(speed);
      }
      if (typeof B !== 'undefined' && B) {
        B.autoPlay = true;
      }
    }, CONFIG.speed);

    // 4. 等待戰鬥結束
    const result = await waitForBattleEnd(page);
    const duration = (Date.now() - startTime) / 1000;
    results.times.push(duration);

    // 5. 記錄結果
    if (result === 'win') {
      results.wins++;
      console.log(`✅ 測試 #${testNum} 勝利 (${duration.toFixed(2)}s)`);
    } else if (result === 'lose') {
      results.loses++;
      console.log(`❌ 測試 #${testNum} 失敗 (${duration.toFixed(2)}s)`);
    } else if (result === 'draw') {
      results.draws++;
      console.log(`⏸️ 測試 #${testNum} 平局 (${duration.toFixed(2)}s)`);
    } else {
      results.errors.push({ test: testNum, result });
      console.log(`⚠️ 測試 #${testNum} 未知結果: ${result}`);
    }

    // 每 10 次顯示進度
    if (testNum % 10 === 0) {
      console.log(`\n📊 進度: ${testNum}/${CONFIG.rounds}`);
      console.log(`   勝利: ${results.wins}, 失敗: ${results.loses}, 平局: ${results.draws}`);
      console.log(`   崩潰: ${results.crashes.length}, 錯誤: ${results.errors.length}\n`);
    }

  } catch (error) {
    console.error(`💥 測試 #${testNum} 崩潰:`, error.message);
    results.crashes.push({
      test: testNum,
      error: error.message,
      stack: error.stack,
    });
  }

  await page.waitForTimeout(1000);
}

// 等待戰鬥結束
async function waitForBattleEnd(page) {
  const maxWait = CONFIG.timeout;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const result = await page.evaluate(() => {
      // 檢查戰鬥是否結束
      if (typeof B === 'undefined' || !B || !B.running) {
        // 判斷結果
        if (B && B.result) {
          return B.result;
        }

        // 檢查結果畫面
        const resultScreen = document.getElementById('screen-result');
        if (resultScreen && resultScreen.style.display !== 'none') {
          const titleEl = document.querySelector('.result-title');
          if (titleEl) {
            const text = titleEl.textContent;
            if (text.includes('勝利')) return 'win';
            if (text.includes('失敗')) return 'lose';
            if (text.includes('平局')) return 'draw';
          }
        }

        return 'unknown';
      }
      return null; // 戰鬥仍在進行
    });

    if (result !== null) {
      return result;
    }

    await page.waitForTimeout(100);
  }

  return 'timeout';
}

// 顯示測試結果
function displayResults() {
  console.log('\n\n');
  console.log('═══════════════════════════════════════');
  console.log('📊 測試結果總結');
  console.log('═══════════════════════════════════════');
  console.log(`總測試次數: ${results.total}`);
  console.log(`✅ 勝利: ${results.wins} (${(results.wins/results.total*100).toFixed(1)}%)`);
  console.log(`❌ 失敗: ${results.loses} (${(results.loses/results.total*100).toFixed(1)}%)`);
  console.log(`⏸️ 平局: ${results.draws} (${(results.draws/results.total*100).toFixed(1)}%)`);
  console.log(`💥 崩潰: ${results.crashes.length} (${(results.crashes.length/results.total*100).toFixed(1)}%)`);
  console.log(`⚠️ 錯誤: ${results.errors.length} (${(results.errors.length/results.total*100).toFixed(1)}%)`);
  console.log('───────────────────────────────────────');

  if (results.times.length > 0) {
    const avgTime = results.times.reduce((a, b) => a + b, 0) / results.times.length;
    const minTime = Math.min(...results.times);
    const maxTime = Math.max(...results.times);
    console.log(`平均每局: ${avgTime.toFixed(2)}s`);
    console.log(`最快: ${minTime.toFixed(2)}s`);
    console.log(`最慢: ${maxTime.toFixed(2)}s`);
  }

  console.log('═══════════════════════════════════════\n');

  // 顯示崩潰詳情
  if (results.crashes.length > 0) {
    console.log('\n💥 崩潰詳情:');
    results.crashes.forEach(crash => {
      console.log(`  測試 #${crash.test}: ${crash.error}`);
      if (crash.stack) {
        console.log(`  堆疊: ${crash.stack.split('\n')[0]}`);
      }
    });
  }

  // 顯示錯誤詳情
  if (results.errors.length > 0) {
    console.log('\n⚠️ 錯誤詳情:');
    results.errors.forEach(err => {
      console.log(`  測試 #${err.test}: 結果 = ${err.result}`);
    });
  }

  // 穩定性評分
  const stability = ((results.total - results.crashes.length - results.errors.length) / results.total * 100).toFixed(1);
  console.log(`\n🎯 穩定性評分: ${stability}%`);

  if (stability >= 95) {
    console.log('✅ 優秀！遊戲非常穩定！');
  } else if (stability >= 80) {
    console.log('⚠️ 良好，但仍有改進空間');
  } else {
    console.log('❌ 需要修復！穩定性較差');
  }
}

// 執行測試
runTests().catch(console.error);
