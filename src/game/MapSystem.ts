/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameConfig, getLevelData } from './GameConfig';
import { IEntity, IGrassPatch, IResource, ResourceType } from './Types';

export class MapSystem {
  public grassPatches: IGrassPatch[] = [];
  public resources: IResource[] = [];
  public monsters: IEntity[] = [];

  constructor() {
    this.initMap();
  }

  public initMap(): void {
    this.generateGrassPatches();
    this.generateResources();
    this.generateMonsters();
  }

  /**
   * 生成草丛遮挡区 (功能性遮挡，进草缩小被发现视野)
   */
  private generateGrassPatches(): void {
    this.grassPatches = [];
    const count = GameConfig.map.grassPatchCount;
    const halfW = GameConfig.map.width / 2 - 100;
    const halfH = GameConfig.map.height / 2 - 100;

    for (let i = 0; i < count; i++) {
      // 避免生成在出发点安全区中心
      let x = 0;
      let y = 0;
      let dist = 0;
      let attempts = 0;
      do {
        x = (Math.random() * 2 - 1) * halfW;
        y = (Math.random() * 2 - 1) * halfH;
        dist = Math.sqrt(x * x + y * y);
        attempts++;
      } while (dist < GameConfig.map.safeZoneRadius && attempts < 30);

      const radius =
        GameConfig.map.grassPatchMinRadius +
        Math.random() * (GameConfig.map.grassPatchMaxRadius - GameConfig.map.grassPatchMinRadius);

      this.grassPatches.push({
        id: `grass_${i}`,
        x,
        y,
        radius,
        bladeCount: Math.floor(18 + Math.random() * 16),
        seed: Math.random() * 1000,
      });
    }
  }

  /**
   * 生成散落的草地微观资源 (草、浆果、露珠、孢子)
   */
  private generateResources(): void {
    this.resources = [];
    const count = GameConfig.map.resourceCount;
    const halfW = GameConfig.map.width / 2 - 80;
    const halfH = GameConfig.map.height / 2 - 80;
    const types: { type: ResourceType; name: string; color: string }[] = [
      { type: 'dew', name: '甘甜露珠', color: '#60a5fa' },
      { type: 'berry', name: '草地浆果', color: '#f43f5e' },
      { type: 'clover', name: '进化苜蓿', color: '#22c55e' },
      { type: 'spore', name: '荧光孢子', color: '#a855f7' },
    ];

    for (let i = 0; i < count; i++) {
      const info = types[i % types.length];
      const x = (Math.random() * 2 - 1) * halfW;
      const y = (Math.random() * 2 - 1) * halfH;

      this.resources.push({
        id: `res_${i}`,
        type: info.type,
        name: info.name,
        x,
        y,
        radius: 7, // 缩小微观资源拾取点体型
        expValue: GameConfig.exp.resourceExpValue, // 资源统一经验值: 10
        isCollected: false,
        respawnTimer: 0,
        bobOffset: Math.random() * Math.PI * 2,
        color: info.color,
      });
    }
  }

  /**
   * 生成Lv1-10草地生物群系
   * 离中央安全区由近至远分布：
   * 近圈: Lv1-Lv2 (安全易捕食)
   * 中圈: Lv3-Lv5 (初具战斗力)
   * 外圈: Lv6-Lv8 (凶悍掠食者)
   * 极外圈/深草区: Lv9-Lv10 (刺猬猎手与霸王冠刺蜥)
   */
  private generateMonsters(): void {
    this.monsters = [];
    const count = GameConfig.map.monsterCount;
    const halfW = GameConfig.map.width / 2 - 120;
    const halfH = GameConfig.map.height / 2 - 120;

    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      let distFromCenter = 0;
      let attempts = 0;

      do {
        x = (Math.random() * 2 - 1) * halfW;
        y = (Math.random() * 2 - 1) * halfH;
        distFromCenter = Math.sqrt(x * x + y * y);
        attempts++;
      } while (distFromCenter < GameConfig.map.safeZoneRadius + 120 && attempts < 50);

      // 根据距中心距离确定生物生态等级梯队 (离安全区越近等级越低，安全过渡)
      const maxDist = Math.sqrt(halfW * halfW + halfH * halfH);
      const distRatio = Math.min(1.0, distFromCenter / maxDist);

      let targetLevel = 1;
      if (distRatio < 0.32) {
        // 近圈 (安全区外围第一圈)：100% 只刷新 Lv1 绿芽幼虫和少量 Lv2，确保新手绝对安全
        targetLevel = Math.random() < 0.75 ? 1 : 2;
      } else if (distRatio < 0.55) {
        // 中圈: Lv2 - 4
        targetLevel = 2 + Math.floor(Math.random() * 3);
      } else if (distRatio < 0.78) {
        // 外圈: Lv4 - 7
        targetLevel = 4 + Math.floor(Math.random() * 4);
      } else {
        // 极外圈: Lv7 - 10
        const rand = Math.random();
        if (rand < 0.45) targetLevel = 7;
        else if (rand < 0.75) targetLevel = 8;
        else if (rand < 0.93) targetLevel = 9;
        else targetLevel = 10;
      }

      // 保证至少有2只Lv10霸王冠刺蜥供后期挑战
      if (i === count - 1 || i === count - 2) {
        targetLevel = 10;
      }

      const levelData = getLevelData(targetLevel);

      this.monsters.push({
        id: `monster_${i}`,
        type: 'monster',
        level: targetLevel,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: levelData.bodyRadius,
        maxHp: levelData.maxHp,
        currentHp: levelData.maxHp,
        atk: levelData.atk,
        moveSpeed: levelData.moveSpeed,
        facingAngle: Math.random() * Math.PI * 2,
        isDead: false,
        respawnTimer: 0,
        spawnX: x,
        spawnY: y,
        aiState: 'idle',
        wanderTimer: Math.random() * 2.0,
        nextAttackTime: 0,
        inCombat: false,
        lastCombatTime: 0,
        color: levelData.color,
        accentColor: levelData.accentColor,
        name: levelData.name,
        hitFlashTimer: 0,
        animPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  /**
   * 检查玩家是否位于草丛中
   */
  public isPlayerInGrass(playerX: number, playerY: number): boolean {
    for (const grass of this.grassPatches) {
      const dx = playerX - grass.x;
      const dy = playerY - grass.y;
      if (dx * dx + dy * dy <= grass.radius * grass.radius) {
        return true;
      }
    }
    return false;
  }

  /**
   * 当全局缩放或数值配置变更时刷新所有存活怪物体型半径
   */
  public refreshAllMonsters(): void {
    for (const m of this.monsters) {
      const levelData = getLevelData(m.level);
      m.radius = levelData.bodyRadius;
      m.maxHp = levelData.maxHp;
      m.atk = levelData.atk;
      m.moveSpeed = levelData.moveSpeed;
    }
  }

  /**
   * 更新资源重生与动画
   */
  public updateResources(dt: number): void {
    for (const res of this.resources) {
      res.bobOffset += dt * 3.0;
      if (res.isCollected) {
        res.respawnTimer -= dt;
        if (res.respawnTimer <= 0) {
          res.isCollected = false;
        }
      }
    }
  }

  /**
   * 更新怪物自然回血与死亡重生计时 (5分钟)
   */
  public updateMonstersRegenAndRespawn(dt: number): void {
    for (const m of this.monsters) {
      if (m.isDead) {
        m.respawnTimer -= dt;
        if (m.respawnTimer <= 0) {
          // 重生在原出生点
          m.isDead = false;
          m.currentHp = m.maxHp;
          m.x = m.spawnX;
          m.y = m.spawnY;
          m.vx = 0;
          m.vy = 0;
          m.aiState = 'idle';
          m.inCombat = false;
          m.hitFlashTimer = 0;
        }
      } else {
        // 全图怪物自然缓慢回血
        if (m.currentHp < m.maxHp) {
          const healAmount = m.maxHp * GameConfig.regen.globalMonsterRegenRate * dt;
          m.currentHp = Math.min(m.maxHp, m.currentHp + healAmount);
        }
      }
    }
  }
}
