// ============================================================
// 戰棋傳說 - 自動化測試腳本
// 使用方法：在瀏覽器控制台貼上此腳本，然後執行 await fullTest()
// ============================================================

let testResults = {
  total: 0,
  wins: 0,
  loses: 0,
  draws: 0,
  errors: [],
  crashes: [],
  avgTime: 0,
  totalTime: 0,
};

// 測試配置
const TEST_CONFIG = {
  rounds: 100,        // 測試次數
  speed: 3,           // 倍速（1/2/3）
  autoMode: true,     // 自動模式
  stage: '1-1',       // 測試關卡
  delayBetween: 1000, // 每次測試間隔（ms）
};

// 單次測試
async function runSingleTest(testNum) {
  console.log(`\n🎮 測試 #${testNum} 開始...`);

  const startTime = performance.now();

  try {
    // 1. 返回大廳
    if (typeof showScreen === 'function') {
      showScreen('hub');
      await sleep(500);
    }

    // 2. 進入關卡
    if (typeof startStage === 'function') {
      const stage = STAGES[TEST_CONFIG.stage];
      if (!stage) {
        throw new Error(`關卡 ${TEST_CONFIG.stage} 不存在`);
      }
      startStage(stage);
      await sleep(1000);
    } else {
      throw new Error('startStage 函數不存在');
    }

    // 3. 設置倍速
    if (typeof setSpeed === 'function') {
      setSpeed(TEST_CONFIG.speed);
    }

    // 4. 設置自動模式
    if (typeof B !== 'undefined' && B) {
      B.autoPlay = TEST_CONFIG.autoMode;
    }

    // 5. 等待戰鬥結束
    const result = await waitForBattleEnd();

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;

    // 6. 記錄結果
    testResults.total++;
    testResults.totalTime += duration;

    if (result === 'win') {
      testResults.wins++;
      console.log(`✅ 測試 #${testNum} 勝利 (${duration.toFixed(2)}s)`);
    } else if (result === 'lose') {
      testResults.loses++;
      console.log(`❌ 測試 #${testNum} 失敗 (${duration.toFixed(2)}s)`);
    } else if (result === 'draw') {
      testResults.draws++;
      console.log(`⏸️ 測試 #${testNum} 平局 (${duration.toFixed(2)}s)`);
    } else {
      testResults.errors.push({ test: testNum, error: '未知結果', result });
      console.log(`⚠️ 測試 #${testNum} 未知結果: ${result}`);
    }

  } catch (error) {
    testResults.crashes.push({ test: testNum, error: error.message, stack: error.stack });
    console.error(`💥 測試 #${testNum} 崩潰:`, error);
  }

  // 等待間隔
  await sleep(TEST_CONFIG.delayBetween);
}

// 等待戰鬥結束
function waitForBattleEnd() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      // 檢查是否還在戰鬥
      if (typeof B === 'undefined' || !B || !B.running) {
        clearInterval(checkInterval);

        // 判斷結果
        if (B && B.result) {
          resolve(B.result);
        } else {
          // 通過當前畫面判斷
          const currentScreen = document.querySelector('.screen:not([style*="none"])');
          if (currentScreen && currentScreen.id === 'screen-result') {
            const resultText = document.querySelector('.result-title')?.textContent;
            if (resultText?.includes('勝利')) resolve('win');
            else if (resultText?.includes('失敗')) resolve('lose');
            else resolve('unknown');
          } else {
            resolve('unknown');
          }
        }
      }
    }, 100);

    // 超時保護（5 分鐘）
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve('timeout');
    }, 300000);
  });
}

// 睡眠函數
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 主測試流程
async function runAllTests() {
  console.log('═══════════════════════════════════════');
  console.log('🎮 戰棋傳說 - 自動化測試');
  console.log('═══════════════════════════════════════');
  console.log(`測試次數: ${TEST_CONFIG.rounds}`);
  console.log(`測試關卡: ${TEST_CONFIG.stage}`);
  console.log(`倍速: ${TEST_CONFIG.speed}×`);
  console.log(`自動模式: ${TEST_CONFIG.autoMode ? '是' : '否'}`);
  console.log('═══════════════════════════════════════\n');

  const overallStart = performance.now();

  for (let i = 1; i <= TEST_CONFIG.rounds; i++) {
    await runSingleTest(i);

    // 每 10 次顯示進度
    if (i % 10 === 0) {
      console.log(`\n📊 進度: ${i}/${TEST_CONFIG.rounds} (${(i/TEST_CONFIG.rounds*100).toFixed(1)}%)`);
      console.log(`   勝利: ${testResults.wins}, 失敗: ${testResults.loses}, 平局: ${testResults.draws}`);
      console.log(`   崩潰: ${testResults.crashes.length}, 錯誤: ${testResults.errors.length}\n`);
    }
  }

  const overallEnd = performance.now();
  const totalDuration = (overallEnd - overallStart) / 1000;

  // 顯示最終結果
  displayResults(totalDuration);
}

// 顯示測試結果
function displayResults(totalDuration) {
  console.log('\n\n');
  console.log('═══════════════════════════════════════');
  console.log('📊 測試結果總結');
  console.log('═══════════════════════════════════════');
  console.log(`總測試次數: ${testResults.total}`);
  console.log(`✅ 勝利: ${testResults.wins} (${(testResults.wins/testResults.total*100).toFixed(1)}%)`);
  console.log(`❌ 失敗: ${testResults.loses} (${(testResults.loses/testResults.total*100).toFixed(1)}%)`);
  console.log(`⏸️ 平局: ${testResults.draws} (${(testResults.draws/testResults.total*100).toFixed(1)}%)`);
  console.log(`💥 崩潰: ${testResults.crashes.length} (${(testResults.crashes.length/testResults.total*100).toFixed(1)}%)`);
  console.log(`⚠️ 錯誤: ${testResults.errors.length} (${(testResults.errors.length/testResults.total*100).toFixed(1)}%)`);
  console.log('───────────────────────────────────────');
  console.log(`總耗時: ${totalDuration.toFixed(2)}s`);
  console.log(`平均每局: ${(testResults.totalTime / testResults.total).toFixed(2)}s`);
  console.log(`每局真實時間: ${(totalDuration / testResults.total).toFixed(2)}s`);
  console.log('═══════════════════════════════════════\n');

  // 顯示崩潰詳情
  if (testResults.crashes.length > 0) {
    console.log('\n💥 崩潰詳情:');
    testResults.crashes.forEach(crash => {
      console.log(`  測試 #${crash.test}: ${crash.error}`);
      console.log(`  堆疊: ${crash.stack}`);
    });
  }

  // 顯示錯誤詳情
  if (testResults.errors.length > 0) {
    console.log('\n⚠️ 錯誤詳情:');
    testResults.errors.forEach(err => {
      console.log(`  測試 #${err.test}: ${err.error} (結果: ${err.result})`);
    });
  }

  // 穩定性評分
  const stability = ((testResults.total - testResults.crashes.length - testResults.errors.length) / testResults.total * 100).toFixed(1);
  console.log(`\n🎯 穩定性評分: ${stability}%`);

  if (stability >= 95) {
    console.log('✅ 優秀！遊戲非常穩定！');
  } else if (stability >= 80) {
    console.log('⚠️ 良好，但仍有改進空間');
  } else {
    console.log('❌ 需要修復！穩定性較差');
  }
}

// 快速測試（10 次）
window.quickTest = async function() {
  TEST_CONFIG.rounds = 10;
  TEST_CONFIG.delayBetween = 500;
  await runAllTests();
};

// 完整測試（100 次）
window.fullTest = async function() {
  TEST_CONFIG.rounds = 100;
  TEST_CONFIG.delayBetween = 1000;
  await runAllTests();
};

// 壓力測試（1000 次）
window.stressTest = async function() {
  TEST_CONFIG.rounds = 1000;
  TEST_CONFIG.delayBetween = 100;
  await runAllTests();
};

console.log('✅ 測試腳本已載入！');
console.log('');
console.log('使用方法：');
console.log('  quickTest()   - 快速測試（10 次）');
console.log('  fullTest()    - 完整測試（100 次）');
console.log('  stressTest()  - 壓力測試（1000 次）');
console.log('');
console.log('開始測試：');
console.log('  await fullTest()');
