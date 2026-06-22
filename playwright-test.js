// ============================================================
// 戰棋傳說 - Playwright 自動化測試
// ============================================================

const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');

// 測試配置
const CONFIG = {
  url: process.env.TEST_URL || pathToFileURL(path.join(__dirname, 'index.html')).href,
  rounds: Number(process.env.TEST_ROUNDS || 3),  // 測試次數
  speed: Number(process.env.TEST_SPEED || 3),    // 倍速
  timeout: 300000,   // 單局超時（5分鐘）
  headless: process.env.HEADLESS !== 'false',    // false = 顯示瀏覽器，true = 無頭模式
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
  await page.addInitScript(() => {
    window.__PLAYWRIGHT_TEST__ = true;
  });

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

  page.on('dialog', async dialog => {
    console.log('⚠️ 對話框:', dialog.message());
    await dialog.dismiss();
  });

  try {
    console.log('📡 正在載入遊戲...\n');
    await page.goto(CONFIG.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await runManualCardClickRegression(page);
    await runShopPurchaseRegression(page);
    await runDeckAutoBuildRegression(page);
    await runCardCostRegression(page);
    await runSplitSpeedRegression(page);
    await runStageStartFlowRegression(page);
    await runBattleControlsRegression(page);
    await runBattleUxFeatureRegression(page);
    await runCustomHeroRegression(page);
    await runEventTowerRegression(page);

    // 運行所有測試
    for (let i = 1; i <= CONFIG.rounds; i++) {
      await runSingleTest(page, i);
    }

  } catch (error) {
    console.error('💥 測試過程發生錯誤:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
    displayResults();
  }
}

async function resetGameForRegression(page) {
  await page.evaluate(() => {
    localStorage.removeItem('battleLegend_v1');
    startNewGame();
  });
}

// 手動出牌回歸測試：能量恢復到足夠後，手牌必須重新變成可點擊
async function runManualCardClickRegression(page) {
  console.log('🧪 手動出牌回歸測試...');

  await page.evaluate(() => {
    localStorage.removeItem('battleLegend_v1');
    startNewGame();
    startBattle('1-1');
    B.autoPlay = false;

    const cost3 = B.hand.find(id => CARD_DB[id]?.cost === 3);
    if (!cost3) {
      B.hand.unshift('archer');
    }

    B.energy = 2;
    renderHand();
    B.energy = 3;
    renderEnergy();
  });

  const before = await page.evaluate(() => ({
    units: B.units.length,
    energy: B.energy,
    clickable: document.querySelectorAll('.hand-card.clickable').length,
  }));

  if (before.clickable === 0) {
    throw new Error('手動模式能量足夠時沒有可點擊手牌');
  }

  await page.click('.hand-card.clickable');
  await page.waitForTimeout(300);

  const after = await page.evaluate(() => ({
    units: B.units.length,
    energy: B.energy,
    lastError: B.lastError || null,
  }));

  if (after.lastError) {
    throw new Error(`手動出牌觸發戰鬥錯誤: ${after.lastError}`);
  }
  if (after.units <= before.units) {
    throw new Error('手動點擊手牌後沒有部署單位');
  }
  if (after.energy >= before.energy) {
    throw new Error('手動點擊手牌後沒有扣除能量');
  }

  console.log('✅ 手動出牌回歸測試通過\n');
}

async function runShopPurchaseRegression(page) {
  console.log('🧪 商店扣款回歸測試...');
  await resetGameForRegression(page);

  const result = await page.evaluate(() => {
    showScreen('shop');
    const beforeGold = G.player.gold;
    const beforeTotal = Object.values(G.collection).reduce((sum, count) => sum + count, 0);

    buyPack('normal');

    const afterPackGold = G.player.gold;
    const afterPackTotal = Object.values(G.collection).reduce((sum, count) => sum + count, 0);

    buyCard('warrior', 100);

    return {
      beforeGold,
      afterPackGold,
      finalGold: G.player.gold,
      beforeTotal,
      afterPackTotal,
      warriorCount: G.collection.warrior,
      shopGoldText: document.getElementById('shop-gold')?.textContent,
    };
  });

  if (result.afterPackGold !== result.beforeGold - 100) {
    throw new Error(`普通卡包未正確扣款: ${result.beforeGold} -> ${result.afterPackGold}`);
  }
  if (result.afterPackTotal !== result.beforeTotal + 1) {
    throw new Error('普通卡包未增加收藏');
  }
  if (result.finalGold !== result.beforeGold - 200) {
    throw new Error(`單卡購買未正確扣款: final=${result.finalGold}`);
  }
  if (String(result.finalGold) !== result.shopGoldText) {
    throw new Error('商店金幣 UI 未同步更新');
  }

  console.log('✅ 商店扣款回歸測試通過\n');
}

async function runDeckAutoBuildRegression(page) {
  console.log('🧪 一鍵組隊回歸測試...');
  await resetGameForRegression(page);

  const result = await page.evaluate(() => {
    showScreen('deck');
    autoBuildDeck('balanced');
    saveDeck();

    const counts = {};
    G.deck.forEach(cardId => {
      counts[cardId] = (counts[cardId] || 0) + 1;
    });

    const violations = Object.entries(counts).filter(([cardId, count]) => {
      const card = CARD_DB[cardId];
      const owned = G.collection[cardId] || 0;
      const maxCopies = getCardMaxCopies(card);
      return count > owned || count > maxCopies;
    });

    return {
      deckSize: G.deck.length,
      avgCost: getDeckStats(G.deck).avgCost,
      violations,
      summaryText: document.getElementById('deck-summary')?.textContent || '',
    };
  });

  if (result.deckSize < 10 || result.deckSize > 30) {
    throw new Error(`一鍵組隊張數異常: ${result.deckSize}`);
  }
  if (result.violations.length > 0) {
    throw new Error(`一鍵組隊超出收藏或同名限制: ${JSON.stringify(result.violations)}`);
  }
  if (!result.summaryText.includes('平均費用')) {
    throw new Error('牌組統計未渲染');
  }

  console.log(`✅ 一鍵組隊回歸測試通過，${result.deckSize} 張，平均費用 ${result.avgCost}\n`);
}

async function runCardCostRegression(page) {
  console.log('🧪 卡片 COST / 商店過濾回歸測試...');
  await resetGameForRegression(page);

  const result = await page.evaluate(() => {
    showScreen('shop');
    const purchasable = Object.values(CARD_DB).filter(isPurchasableCard);
    const invalidPurchasable = purchasable.filter(card => !card.cost || card.cost <= 0 || card.cardType === 'boss');
    const shopCards = [...document.querySelectorAll('.shop-card')].map(el => ({
      cardId: el.dataset.cardId,
      cardType: el.dataset.cardType,
      cost: Number(el.dataset.cardCost || 0),
    }));
    const invalidShopCards = shopCards.filter(card => card.cardType === 'boss' || card.cost <= 0);
    return {
      purchasableCount: purchasable.length,
      invalidCount: invalidPurchasable.length,
      shopCount: shopCards.length,
      invalidShopCards,
    };
  });

  if (result.purchasableCount === 0 || result.shopCount === 0) {
    throw new Error('商店沒有可購買卡片');
  }
  if (result.invalidCount > 0 || result.invalidShopCards.length > 0) {
    throw new Error(`商店包含不可購買或 COST 0 卡片: ${JSON.stringify(result)}`);
  }

  console.log('✅ 卡片 COST / 商店過濾回歸測試通過\n');
}

async function runSplitSpeedRegression(page) {
  console.log('🧪 移動速度 / 攻擊速度分離回歸測試...');
  await resetGameForRegression(page);

  const result = await page.evaluate(() => {
    startBattle('1-1');
    const unit = B.units.find(u => u.alive && u.isMy && !u.isCommander);
    const enemy = B.units.find(u => u.alive && !u.isMy && !u.isCommander);
    if (!unit || !enemy) return { missingUnit: true };

    unit.x = 3;
    unit.y = 8;
    enemy.x = 8;
    enemy.y = 0;
    unit.range = 1;
    unit.atkSpd = 10;
    unit.moveSpd = 500;
    unit.atb = 0;
    unit.moveAtb = 0;

    const target = findTargetForAction(unit);
    const inRange = isTargetInRange(unit, target);
    const before = { x: unit.x, y: unit.y, atb: unit.atb, moveAtb: unit.moveAtb };

    unit.moveAtb += unit.moveSpd * 1000 / 1000 * 3;
    if (unit.moveAtb >= unit.maxMoveAtb) {
      unit.moveAtb = 0;
      moveToward(unit, target);
    }

    return {
      missingUnit: false,
      atkSpd: unit.atkSpd,
      moveSpd: unit.moveSpd,
      inRange,
      before,
      after: { x: unit.x, y: unit.y, atb: unit.atb, moveAtb: unit.moveAtb },
    };
  });

  if (result.missingUnit) {
    throw new Error('速度回歸測試找不到可測試單位');
  }
  if (!(result.atkSpd > 0 && result.moveSpd > 0)) {
    throw new Error(`速度欄位未正確建立: ${JSON.stringify(result)}`);
  }
  if (result.inRange) {
    throw new Error('速度回歸測試目標距離設定錯誤');
  }
  if (result.after.x === result.before.x && result.after.y === result.before.y) {
    throw new Error('移動速度累積後沒有移動');
  }
  if (result.after.atb !== 0) {
    throw new Error('移動時不應累積攻擊 ATB');
  }

  console.log('✅ 移動速度 / 攻擊速度分離回歸測試通過\n');
}

async function runStageStartFlowRegression(page) {
  console.log('🧪 關卡開始與結算返回回歸測試...');
  await resetGameForRegression(page);

  const result = await page.evaluate(() => {
    showScreen('stage');
    const firstChapter = document.querySelector('.chapter-card:not(.locked)');
    firstChapter?.click();

    const startButtonBefore = document.getElementById('btn-start-selected-stage');
    const disabledBeforeSelect = startButtonBefore?.disabled;
    const firstStage = document.querySelector('#stage-list-main .stage-item:not(.locked)');
    firstStage?.click();

    const selectedTitle = document.getElementById('stage-selected-title')?.textContent || '';
    const startButtonAfter = document.getElementById('btn-start-selected-stage');
    const enabledAfterSelect = startButtonAfter && !startButtonAfter.disabled;
    startButtonAfter?.click();

    const battleStarted = !!B && B.running === true && document.getElementById('screen-battle')?.classList.contains('active');
    endBattle('win');
    collectReward();

    return {
      disabledBeforeSelect,
      selectedTitle,
      enabledAfterSelect,
      battleStarted,
      returnedToStage: document.getElementById('screen-stage')?.classList.contains('active'),
      stageListVisible: document.getElementById('stage-list-view')?.style.display === 'block',
      title: document.getElementById('stage-screen-title')?.textContent || '',
    };
  });

  if (!result.disabledBeforeSelect) {
    throw new Error('未選關卡時開始戰鬥按鈕應該停用');
  }
  if (!result.selectedTitle.includes('1-1') || !result.enabledAfterSelect) {
    throw new Error(`選取關卡後開始戰鬥按鈕未啟用: ${JSON.stringify(result)}`);
  }
  if (!result.battleStarted) {
    throw new Error('點擊開始戰鬥後沒有進入戰鬥');
  }
  if (!result.returnedToStage || !result.stageListVisible) {
    throw new Error(`領獎後沒有返回關卡列表: ${JSON.stringify(result)}`);
  }

  console.log('✅ 關卡開始與結算返回回歸測試通過\n');
}

async function runBattleControlsRegression(page) {
  console.log('🧪 戰鬥控制列回歸測試...');
  await resetGameForRegression(page);

  const result = await page.evaluate(() => {
    startBattle('1-1');
    const speedLabels = [...document.querySelectorAll('.speed-controls .speed-btn')].map(btn => btn.textContent.trim());
    document.getElementById('btn-speed-5')?.click();
    const controlsParentClass = document.querySelector('.battle-right')?.parentElement?.className || '';
    return {
      speedLabels,
      speed: B.speed,
      btn5Active: document.getElementById('btn-speed-5')?.classList.contains('active'),
      controlsInsideBattleMain: controlsParentClass.includes('battle-main'),
    };
  });

  if (result.speedLabels.join(',') !== '1×,3×,5×') {
    throw new Error(`倍速按鈕應為 1×/3×/5×: ${result.speedLabels.join(',')}`);
  }
  if (result.speed !== 5 || !result.btn5Active) {
    throw new Error('5× 倍速按鈕未正確設定戰鬥速度');
  }
  if (!result.controlsInsideBattleMain) {
    throw new Error('戰鬥控制列沒有放在 9×9 地圖區下方');
  }

  console.log('✅ 戰鬥控制列回歸測試通過\n');
}

async function runBattleUxFeatureRegression(page) {
  console.log('Testing battle UX additions...');
  await resetGameForRegression(page);

  const result = await page.evaluate(async () => {
    const hasNewCard = !!CARD_DB['field-medic'];
    const starterHasNewCard = G.deck.includes('field-medic') && G.collection['field-medic'] === 1;
    const shopHasNewCard = Object.values(CARD_DB).filter(isPurchasableCard).some(card => card.id === 'field-medic');

    startBattle('1-1');
    const initialLogText = document.getElementById('battle-log')?.textContent || '';
    const beforeTimer = B.timer;
    document.getElementById('btn-pause')?.click();
    const paused = B.paused === true;
    const pauseButtonText = document.getElementById('btn-pause')?.textContent || '';
    await new Promise(resolve => setTimeout(resolve, 250));
    const timerFrozen = B.timer === beforeTimer;
    document.getElementById('btn-pause')?.click();
    const resumed = B.paused === false;

    B.autoPlay = false;
    B.energy = 10;
    B.hand.unshift('field-medic');
    playCardById('field-medic');
    const logText = document.getElementById('battle-log')?.textContent || '';
    const fieldMedicUnit = B.units.find(unit => unit.cardId === 'field-medic' && unit.isMy);
    const fieldMedicSprite = fieldMedicUnit
      ? document.querySelector(`#unit-${fieldMedicUnit.uid} .unit-sprite`)?.getAttribute('src') || ''
      : '';

    return {
      hasNewCard,
      starterHasNewCard,
      shopHasNewCard,
      paused,
      resumed,
      pauseButtonText,
      timerFrozen,
      initialLogText,
      logText,
      deployed: !!fieldMedicUnit,
      spriteCount: document.querySelectorAll('.unit-sprite').length,
      fieldMedicSprite,
    };
  });

  if (!result.hasNewCard || !result.starterHasNewCard || !result.shopHasNewCard) {
    throw new Error(`Field Medic is not wired into card systems: ${JSON.stringify(result)}`);
  }
  if (!result.paused || !result.resumed || result.pauseButtonText !== 'Resume' || !result.timerFrozen) {
    throw new Error(`Pause/resume did not freeze battle state correctly: ${JSON.stringify(result)}`);
  }
  if (!result.initialLogText.includes('Battle started') || !result.logText.includes('Deployed Field Medic') || !result.deployed) {
    throw new Error(`Battle log or deployment did not update: ${JSON.stringify(result)}`);
  }
  if (result.spriteCount === 0 || !result.fieldMedicSprite.includes('assets/units/kenney-roguelike/field-medic.png')) {
    throw new Error(`Kenney unit sprites did not render: ${JSON.stringify(result)}`);
  }

  console.log('Battle UX additions passed.\n');
}

async function runCustomHeroRegression(page) {
  console.log('🧪 自訂角色回歸測試...');
  await resetGameForRegression(page);

  const result = await page.evaluate(() => {
    showScreen('custom');
    const beforeClass = G.customHero.classKey;
    selectCustomHeroJob('mage');
    const cardAfterClass = CARD_DB[CUSTOM_HERO_ID];

    G.player.essence = 999;
    const beforeLevel = G.customHero.level;
    levelUpCustomHero();
    upgradeCustomHeroStat('matk');
    addCustomHeroToDeck();

    startBattle('1-1');
    B.autoPlay = false;
    B.energy = 10;
    B.hand.unshift(CUSTOM_HERO_ID);
    playCardById(CUSTOM_HERO_ID);
    const customUnit = B.units.find(u => u.cardId === CUSTOM_HERO_ID);

    return {
      beforeClass,
      classKey: G.customHero.classKey,
      job: cardAfterClass.job,
      cost: cardAfterClass.cost,
      level: G.customHero.level,
      points: G.customHero.points,
      owned: G.collection[CUSTOM_HERO_ID],
      deckCopies: G.deck.filter(id => id === CUSTOM_HERO_ID).length,
      customUnit: customUnit ? { name: customUnit.name, isMy: customUnit.isMy, matk: customUnit.matk } : null,
      screenActive: document.getElementById('screen-custom')?.classList.contains('active'),
    };
  });

  if (result.classKey !== 'mage' || result.job !== '法師') {
    throw new Error(`自訂角色職業切換失敗: ${JSON.stringify(result)}`);
  }
  if (result.cost <= 0 || result.owned !== 1 || result.deckCopies !== 1) {
    throw new Error(`自訂角色卡牌資料異常: ${JSON.stringify(result)}`);
  }
  if (result.level <= 1 || !result.customUnit || !result.customUnit.isMy) {
    throw new Error(`自訂角色沒有升級或沒有參戰: ${JSON.stringify(result)}`);
  }

  console.log('✅ 自訂角色回歸測試通過\n');
}

async function runEventTowerRegression(page) {
  console.log('🧪 活動副本無限塔回歸測試...');
  await resetGameForRegression(page);

  const result = await page.evaluate(() => {
    showScreen('stage');
    const eventChapter = [...document.querySelectorAll('.chapter-card')]
      .find(card => card.textContent.includes('活動副本'));
    eventChapter?.click();
    const panelVisible = document.getElementById('event-tower-panel')?.style.display !== 'none';
    startEventTower();

    const commander = B.units.find(u => u.isMy && u.isCommander);
    const initialWave = B.tower.wave;
    B.timer = B.tower.interval;
    updateTowerWaves();

    const myUnit = B.units.find(u => u.isMy && !u.isCommander && !u.isSummon);
    const beforeHand = B.hand.length;
    if (myUnit) killUnit(myUnit);

    return {
      panelVisible,
      isTower: B.isEventTower,
      commanderPos: commander ? { x: commander.x, y: commander.y, hp: commander.maxHp } : null,
      initialWave,
      waveAfterTick: B.tower.wave,
      enemies: B.units.filter(u => u.alive && !u.isMy).length,
      handReturned: B.hand.length > beforeHand,
      handHasDeadCard: myUnit ? B.hand.includes(myUnit.cardId) : false,
      bestWave: G.eventTowerBestWave,
    };
  });

  if (!result.panelVisible || !result.isTower) {
    throw new Error(`無限塔入口或模式未啟動: ${JSON.stringify(result)}`);
  }
  if (!result.commanderPos || result.commanderPos.x !== 4 || result.commanderPos.y !== 4 || result.commanderPos.hp < 500) {
    throw new Error(`無限塔主堡沒有在中央或血量異常: ${JSON.stringify(result)}`);
  }
  if (result.initialWave < 1 || result.waveAfterTick <= result.initialWave || result.enemies === 0) {
    throw new Error(`無限塔波次沒有正確追加: ${JSON.stringify(result)}`);
  }
  if (!result.handReturned || !result.handHasDeadCard) {
    throw new Error(`無限塔我方戰死未回手牌: ${JSON.stringify(result)}`);
  }

  console.log('✅ 活動副本無限塔回歸測試通過\n');
}

// 單次測試
async function runSingleTest(page, testNum) {
  console.log(`\n🎮 測試 #${testNum} 開始...`);
  const startTime = Date.now();
  results.total++;

  try {
    // 1. 返回大廳
    await page.evaluate(() => {
      document.getElementById('screen-result')?.classList.remove('show');
      if (typeof showScreen === 'function') {
        showScreen('hub');
      }
    });
    await page.waitForTimeout(500);

    // 2. 直接調用 startBattle 進入關卡
    await page.evaluate(() => {
      if (typeof startBattle !== 'function') {
        throw new Error('startBattle 未定義');
      }
      if (typeof STAGES === 'undefined' || !Array.isArray(STAGES)) {
        throw new Error('STAGES 未定義或格式錯誤');
      }
      const stage = STAGES.find(s => s.id === '1-1');
      if (!stage) {
        throw new Error('STAGES 中找不到 1-1');
      }
      startBattle('1-1');
    });

    await page.waitForTimeout(2000); // 等待戰鬥初始化

    // 3. 等待戰鬥狀態初始化
    await page.waitForFunction(() => {
      return typeof B !== 'undefined' && B !== null && B.running === true;
    }, { timeout: 10000 });

    // 4. 設置倍速和自動模式
    await page.evaluate((speed) => {
      if (typeof setSpeed === 'function' && typeof B !== 'undefined' && B) {
        setSpeed(speed);
      }
      if (typeof B !== 'undefined' && B) {
        B.autoPlay = true;
      }
    }, CONFIG.speed);

    // 5. 等待戰鬥結束
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
      if (typeof B !== 'undefined' && B && B.lastError) {
        return `error:${B.lastError}`;
      }

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
            if (text.includes('失敗') || text.includes('敗北')) return 'lose';
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

  if (results.crashes.length > 0 || results.errors.length > 0) {
    process.exitCode = 1;
  }
}

// 執行測試
runTests().catch(console.error);
