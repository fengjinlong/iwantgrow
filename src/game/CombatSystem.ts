/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { audioManager } from './AudioManager';
import { eventBus, GameEvents } from './EventBus';
import { GameConfig } from './GameConfig';
import { IEntity } from './Types';

export class CombatSystem {
  /**
   * 判定两实体判定圆环是否接触
   */
  public static isColliding(a: IEntity, b: IEntity): boolean {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distSq = dx * dx + dy * dy;
    const collideDist = (a.radius + b.radius) * GameConfig.combat.collisionDistanceMultiplier;
    return distSq <= collideDist * collideDist;
  }

  /**
   * 计算几何距离
   */
  public static getDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 检查玩家对怪物的秒杀判定
   * 规则：怪物当前血量 <= 玩家攻击力 (单次伤害值) -> 触发秒杀
   */
  public static checkInstakill(player: IEntity, monster: IEntity): boolean {
    return monster.currentHp <= player.atk;
  }

  /**
   * 计算怪物随机浮动攻击力 (±10%)
   */
  public static getMonsterFluctuatedDamage(baseAtk: number): number {
    const fluctuation = GameConfig.combat.monsterAtkFluctuation;
    const factor = 1.0 + (Math.random() * (fluctuation * 2) - fluctuation);
    return Math.max(1, Math.round(baseAtk * factor));
  }

  /**
   * 计算击败怪物获得的经验值 (含同级1.5倍补偿加成)
   */
  public static calculateExpReward(playerLevel: number, monsterLevel: number): number {
    // 基础经验按该生物自身等级设定
    const baseExp = monsterLevel * 25 + 10;

    if (monsterLevel === playerLevel) {
      // 与自己同级的生物 (承担换血风险的补偿)
      return Math.round(baseExp * GameConfig.exp.sameLevelKillMultiplier);
    } else if (monsterLevel < playerLevel) {
      // 低于自己等级的生物 (秒杀或轻取，按自身基础经验结算，防无脑割草)
      return baseExp;
    } else {
      // 越级击杀高级生物获得高额经验奖励
      return Math.round(baseExp * 2.2);
    }
  }

  /**
   * 执行一次单次交换式伤害结算
   * 返回 true 表示有实体死亡
   */
  public static executeCombatTick(
    player: IEntity,
    monster: IEntity,
    currentTime: number,
    onAddFloatingText: (text: string, x: number, y: number, color: string, isCrit?: boolean) => void,
    onAddParticles: (x: number, y: number, color: string, count: number) => void,
  ): { targetDied: boolean; isInstakill: boolean; expGained: number } {
    // 1. 秒杀判定 (玩家攻击力 >= 怪物当前血量)
    if (this.checkInstakill(player, monster)) {
      monster.currentHp = 0;
      monster.isDead = true;
      monster.respawnTimer = GameConfig.regen.respawnDelaySeconds;
      monster.inCombat = false;
      player.inCombat = false;

      const exp = this.calculateExpReward(player.level, monster.level);

      // 音效与视觉反馈
      audioManager.playInstakill();
      onAddFloatingText('秒杀!', monster.x, monster.y - 30, '#f59e0b', true);
      onAddFloatingText(`+${exp} EVO`, player.x, player.y - 45, '#38bdf8');
      onAddParticles(monster.x, monster.y, monster.color, 25);

      eventBus.emit(GameEvents.ENTITY_DIE, {
        victimId: monster.id,
        killerId: player.id,
        isInstakill: true,
        expGained: exp,
      });

      return { targetDied: true, isInstakill: true, expGained: exp };
    }

    // 2. 正常单次换血结算
    // 玩家对怪物造成确定伤害
    const playerDmg = player.atk;
    monster.currentHp = Math.max(0, monster.currentHp - playerDmg);
    monster.hitFlashTimer = 0.2;
    onAddFloatingText(`-${playerDmg}`, monster.x, monster.y - 20, '#ffffff');
    onAddParticles(monster.x, monster.y, monster.color, 8);

    // 检查怪物是否被击杀
    if (monster.currentHp <= 0) {
      monster.isDead = true;
      monster.respawnTimer = GameConfig.regen.respawnDelaySeconds;
      monster.inCombat = false;
      player.inCombat = false;

      const exp = this.calculateExpReward(player.level, monster.level);
      audioManager.playHit();
      onAddFloatingText(`+${exp} EVO`, player.x, player.y - 45, '#38bdf8');
      onAddParticles(monster.x, monster.y, monster.color, 18);

      eventBus.emit(GameEvents.ENTITY_DIE, {
        victimId: monster.id,
        killerId: player.id,
        isInstakill: false,
        expGained: exp,
      });

      return { targetDied: true, isInstakill: false, expGained: exp };
    }

    // 怪物对玩家造成浮动伤害 (±10%)
    const monsterDmg = this.getMonsterFluctuatedDamage(monster.atk);
    player.currentHp = Math.max(0, player.currentHp - monsterDmg);
    player.hitFlashTimer = 0.2;
    audioManager.playHit();
    onAddFloatingText(`-${monsterDmg}`, player.x, player.y - 20, '#ef4444');
    onAddParticles(player.x, player.y, '#ef4444', 8);

    eventBus.emit(GameEvents.DAMAGE_EXCHANGE, {
      playerHp: player.currentHp,
      monsterHp: monster.currentHp,
      playerDmg,
      monsterDmg,
    });

    // 检查玩家是否死亡
    if (player.currentHp <= 0) {
      player.isDead = true;
      audioManager.playDeath();
      return { targetDied: true, isInstakill: false, expGained: 0 };
    }

    return { targetDied: false, isInstakill: false, expGained: 0 };
  }
}
