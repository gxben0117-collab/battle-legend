# 🐛 Bug 修復計劃 v0.6.2

## 問題清單

### 1. ❌ 關卡解鎖問題
**症狀**：打通 1-5，但第 2 章第 1 關（2-1）沒開放

**原因分析**：
- 關卡解鎖邏輯：`locked = i > 0 && !G.stageCleared[chapterStages[i - 1].id]`
- 這個邏輯只檢查**同一章節內的前一關**
- 跨章節時沒有檢查上一章最後一關是否通關

**修復方案**：
- 第 2 章第 1 關（2-1）應該檢查 1-10 是否通關
- 修改關卡解鎖邏輯，第一關需要檢查上一章最後一關

### 2. ❌ 能量暴增 Bug
**症狀**：每秒瘋狂加 1 能量（應該是每 2 秒加 1）

**原因分析**：
```javascript
B.energyTimer += dt;  // dt 是毫秒
while (B.energyTimer >= B.energyRate && B.energy < B.maxEnergy) {
  B.energy++;
  B.energyTimer -= B.energyRate;  // energyRate = 2000ms
}
```

**可能原因**：
- 倍速影響？當前 ATB 有 ×2 加速
- dt 計算錯誤？

**需要檢查**：
- 倍速是否影響能量恢復
- 能量恢復應該不受倍速影響

### 3. ❌ 手動模式卡住
**症狀**：有能量但招喚不出卡片

**原因分析**：
```javascript
function playCardById(cardId) {
  const card = CARD_DB[cardId];
  if (!card || card.cost > B.energy) return;  // 檢查能量
  
  const freeCell = findFreeCell(true);
  if (!freeCell) return;  // 檢查是否有空位
  
  // ... 出牌邏輯
}
```

**可能原因**：
- `findFreeCell(true)` 找不到空位
- 戰場已滿但沒有提示

**修復方案**：
- 添加提示訊息
- 檢查 findFreeCell 邏輯

### 4. 💡 BOSS 招喚小兵功能
**需求**：BOSS 應該能招喚小兵或開場帶小兵

**實現方案**：
- 方案 A：BOSS 開場帶固定數量小兵（簡單）
- 方案 B：BOSS 技能可以招喚小兵（複雜）

**建議**：先實現方案 A

### 5. 💡 一般關卡招喚
**確認**：一般關卡敵人不會招喚怪物（死靈術士除外）

---

## 修復順序

1. ✅ 關卡解鎖邏輯修復（高優先級）
2. ✅ 能量暴增 Bug（高優先級）
3. ✅ 手動模式卡住（高優先級）
4. ⏸️ BOSS 招喚小兵（功能增強，可選）
5. ✅ 一般關卡確認（無需修復）

---

## 修復方案

### 修復 1：關卡解鎖邏輯

**修改位置**：renderStageList() 函數

```javascript
// 修改前
const locked = i > 0 && !G.stageCleared[chapterStages[i - 1].id];

// 修改後
let locked = false;
if (i > 0) {
  // 同章節內檢查前一關
  locked = !G.stageCleared[chapterStages[i - 1].id];
} else {
  // 章節第一關，檢查上一章最後一關
  const chapterNum = parseInt(chapter.stagePrefix.split('-')[0]);
  if (chapterNum > 1) {
    const prevChapterLastStage = `${chapterNum - 1}-10`;
    locked = !G.stageCleared[prevChapterLastStage];
  }
}
```

### 修復 2：能量恢復不受倍速影響

**修改位置**：gameLoop() 函數

```javascript
// 修改前
B.energyTimer += dt;

// 修改後
B.energyTimer += dt / B.speed;  // 除以倍速，使能量恢復不受影響
```

或者直接使用真實時間：

```javascript
// 能量恢復使用真實時間（不受倍速影響）
const realDt = now - B.lastTime;  // 真實時間差
B.energyTimer += realDt;
```

### 修復 3：手動模式提示

**修改位置**：playCardById() 函數

```javascript
function playCardById(cardId) {
  const card = CARD_DB[cardId];
  if (!card || card.cost > B.energy) {
    if (card && card.cost > B.energy) {
      showToast('⚡ 能量不足');
    }
    return;
  }
  
  const freeCell = findFreeCell(true);
  if (!freeCell) {
    showToast('❌ 戰場已滿');
    return;
  }
  
  // ... 出牌邏輯
}
```

---

## 測試計劃

### 測試 1：關卡解鎖
1. 新遊戲
2. 通關 1-1
3. 確認 1-2 解鎖
4. 通關到 1-10
5. 確認 2-1 解鎖

### 測試 2：能量恢復
1. 進入戰鬥
2. 觀察能量恢復速度
3. 切換倍速（×1/×2/×4）
4. 確認能量恢復始終是每 2 秒 +1

### 測試 3：手動模式
1. 切換到手動模式
2. 等待能量滿
3. 點擊手牌
4. 如果戰場滿，應該顯示提示

---

**準備開始修復！**
