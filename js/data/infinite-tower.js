/**
 * 活動副本：無限塔
 * 特色：波次挑戰，前3波怪物數量減半
 */
(function(global) {
  'use strict';

  const INFINITE_TOWER = {
    id: 'infinite-tower',
    name: '無限塔',
    description: '挑戰無盡的敵人，證明你的實力！',
    type: 'event',

    // 無限塔設定
    settings: {
      startWave: 1,
      easyWaveCount: 3, // 前3波為簡單模式（怪物數量減半）
      rewardMultiplier: 1.5, // 獎勵倍率
    },

    // 波次模板（會根據波數動態調整）
    waveTemplates: [
      {
        // 波次 1-3：基礎敵人（減半）
        type: 'basic',
        baseEnemies: [
          {card: 'warrior', count: 2},
          {card: 'archer', count: 2},
        ],
        positions: [
          {x: 6, y: 1},
          {x: 8, y: 1},
          {x: 7, y: 0},
          {x: 7, y: 2},
        ]
      },
      {
        // 波次 4-6：混合敵人
        type: 'mixed',
        baseEnemies: [
          {card: 'knight', count: 2},
          {card: 'warrior', count: 2},
          {card: 'archer', count: 2},
          {card: 'mage', count: 1},
        ],
        positions: [
          {x: 6, y: 0},
          {x: 7, y: 0},
          {x: 8, y: 0},
          {x: 6, y: 1},
          {x: 8, y: 1},
          {x: 7, y: 2},
          {x: 6, y: 2},
        ]
      },
      {
        // 波次 7-9：精英敵人
        type: 'elite',
        baseEnemies: [
          {card: 'tank', count: 1},
          {card: 'knight', count: 2},
          {card: 'assassin', count: 2},
          {card: 'mage', count: 2},
        ],
        positions: [
          {x: 7, y: 0},
          {x: 6, y: 1},
          {x: 8, y: 1},
          {x: 5, y: 2},
          {x: 7, y: 2},
          {x: 9, y: 2},
          {x: 6, y: 3},
        ]
      },
      {
        // 波次 10+：困難敵人
        type: 'hard',
        baseEnemies: [
          {card: 'tank', count: 2},
          {card: 'knight', count: 2},
          {card: 'assassin', count: 2},
          {card: 'mage', count: 2},
          {card: 'archer', count: 2},
        ],
        positions: [
          {x: 6, y: 0},
          {x: 7, y: 0},
          {x: 8, y: 0},
          {x: 5, y: 1},
          {x: 7, y: 1},
          {x: 9, y: 1},
          {x: 6, y: 2},
          {x: 8, y: 2},
          {x: 7, y: 3},
          {x: 6, y: 3},
        ]
      }
    ],

    // 獎勵計算（根據波數）
    calculateReward(wave) {
      const baseGold = 50;
      const baseEssence = 5;
      const multiplier = this.settings.rewardMultiplier;

      return {
        gold: Math.floor(baseGold * wave * multiplier),
        essence: Math.floor(baseEssence * wave * multiplier)
      };
    },

    // 生成指定波次的敵人配置
    generateWave(waveNumber) {
      const isEasyWave = waveNumber <= this.settings.easyWaveCount;

      // 選擇模板
      let template;
      if (waveNumber <= 3) {
        template = this.waveTemplates[0]; // basic
      } else if (waveNumber <= 6) {
        template = this.waveTemplates[1]; // mixed
      } else if (waveNumber <= 9) {
        template = this.waveTemplates[2]; // elite
      } else {
        template = this.waveTemplates[3]; // hard
      }

      // 生成敵人列表
      const enemies = [];
      template.baseEnemies.forEach(enemyDef => {
        let count = enemyDef.count;

        // 前3波：怪物數量減半
        if (isEasyWave) {
          count = Math.max(1, Math.floor(count / 2));
        }

        // 波數越高，敵人屬性提升
        const statBonus = Math.floor((waveNumber - 1) * 0.1 * 100) / 100; // 每波 +10%

        for (let i = 0; i < count; i++) {
          if (template.positions[enemies.length]) {
            enemies.push({
              card: enemyDef.card,
              x: template.positions[enemies.length].x,
              y: template.positions[enemies.length].y,
              statMultiplier: 1 + statBonus // 屬性倍率
            });
          }
        }
      });

      return {
        wave: waveNumber,
        enemies: enemies,
        reward: this.calculateReward(waveNumber),
        isEasyWave: isEasyWave
      };
    }
  };

  // 暴露到全局
  global.INFINITE_TOWER = INFINITE_TOWER;

})(window);
