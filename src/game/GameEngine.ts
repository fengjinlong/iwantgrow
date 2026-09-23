/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { audioManager } from './AudioManager';
import { CombatSystem } from './CombatSystem';
import { eventBus, GameEvents } from './EventBus';
import { GameConfig, getLevelData } from './GameConfig';
import { LightingSystem } from './LightingSystem';
import { MapSystem } from './MapSystem';
import { Storage } from './Storage';
import {
  IEntity,
  IFloatingText,
  IParticle,
  IThreatIndicator,
  Vector2D,
} from './Types';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private isRunning: boolean = false;

  // 游戏核心状态
  public player: IEntity;
  public playerExp: number = 0;
  public totalKills: number = 0;
  public totalInstakills: number = 0;
  public totalResources: number = 0;

  // 闪现技能冷却
  public flashCooldownTimer: number = 0; // 0 = ready, > 0 = in cooldown

  // 地图与生态实体系统
  public mapSystem: MapSystem;

  // 视觉与特效系统
  public floatingTexts: IFloatingText[] = [];
  public particles: IParticle[] = [];
  public threatIndicators: IThreatIndicator[] = [];

  // 输入控制系统 (按住滑动控制方向，手指离开即停，无虚拟摇杆)
  private isTouching: boolean = false;
  private touchStartPos: Vector2D = { x: 0, y: 0 };
  private currentDragVector: Vector2D = { x: 0, y: 0 };

  // 摄像机平滑跟踪
  public camera: Vector2D = { x: 0, y: 0 };

  // 进草状态检测
  public isPlayerInGrass: boolean = false;

  // 全局昼夜动态光照与色温滤镜系统
  public lightingSystem: LightingSystem;

  // 战斗快照与回退 (死亡不掉级，经验回退至本次遭遇前)
  private activeCombatMonster: IEntity | null = null;
  private encounterStartExp: number = 0;

  // 视口尺寸
  private viewWidth: number = 800;
  private viewHeight: number = 600;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    // 初始化地图系统
    this.mapSystem = new MapSystem();

    // 初始化全局昼夜动态光照系统
    this.lightingSystem = new LightingSystem();

    // 读取持久化存档或初始化 Lv1 幼虫
    const saved = Storage.load();
    const initLevel = saved ? Math.min(GameConfig.levels.maxLevel, Math.max(1, saved.level)) : 1;
    const initExp = saved ? saved.exp : 0;
    this.playerExp = initExp;
    this.totalKills = saved?.totalKills || 0;
    this.totalInstakills = saved?.totalInstakills || 0;
    this.totalResources = saved?.totalSwallowedResources || 0;

    const levelData = getLevelData(initLevel);
    this.player = {
      id: 'player_hero',
      type: 'player',
      level: initLevel,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: levelData.bodyRadius,
      maxHp: levelData.maxHp,
      currentHp: levelData.maxHp,
      atk: levelData.atk,
      moveSpeed: levelData.moveSpeed,
      facingAngle: 0,
      isDead: false,
      respawnTimer: 0,
      spawnX: 0,
      spawnY: 0,
      aiState: 'idle',
      wanderTimer: 0,
      nextAttackTime: 0,
      inCombat: false,
      lastCombatTime: 0,
      color: levelData.color,
      accentColor: levelData.accentColor,
      name: levelData.name,
      hitFlashTimer: 0,
      animPhase: 0,
    };

    this.encounterStartExp = this.playerExp;

    this.initEvents();
  }

  private initEvents(): void {
    eventBus.on(GameEvents.CONFIG_UPDATED, () => {
      this.refreshPlayerAttributes();
      this.mapSystem.refreshAllMonsters();
    });
  }

  public resize(width: number, height: number): void {
    this.viewWidth = width;
    this.viewHeight = height;
    this.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(this.dpr, this.dpr);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  // ==================== 输入系统 (触屏滑动，无摇杆) ====================
  public onPointerDown(clientX: number, clientY: number): void {
    this.isTouching = true;
    this.touchStartPos = { x: clientX, y: clientY };
    this.currentDragVector = { x: 0, y: 0 };
  }

  public onPointerMove(clientX: number, clientY: number): void {
    if (!this.isTouching) return;
    const dx = clientX - this.touchStartPos.x;
    const dy = clientY - this.touchStartPos.y;
    this.currentDragVector = { x: dx, y: dy };
  }

  public onPointerUp(): void {
    this.isTouching = false;
    this.currentDragVector = { x: 0, y: 0 };
  }

  // ==================== 技能系统 (随机方向闪现逃脱) ====================
  public triggerFlash(): boolean {
    if (this.flashCooldownTimer > 0 || this.player.isDead) {
      return false;
    }

    // 随机方向 (保留不确定性，增加追杀逃生紧张感)
    const randomAngle = Math.random() * Math.PI * 2;
    const distance = GameConfig.input.flashDistance;

    const oldX = this.player.x;
    const oldY = this.player.y;

    let targetX = oldX + Math.cos(randomAngle) * distance;
    let targetY = oldY + Math.sin(randomAngle) * distance;

    // 地图边界约束
    const halfW = GameConfig.map.width / 2 - this.player.radius - 10;
    const halfH = GameConfig.map.height / 2 - this.player.radius - 10;
    targetX = Math.max(-halfW, Math.min(halfW, targetX));
    targetY = Math.max(-halfH, Math.min(halfH, targetY));

    this.player.x = targetX;
    this.player.y = targetY;
    this.player.facingAngle = randomAngle;

    // 脱战判定：若脱离敌方判定圆环则立即清空战斗标记
    if (this.activeCombatMonster) {
      const dist = CombatSystem.getDistance(this.player, this.activeCombatMonster);
      const breakDist = (this.player.radius + this.activeCombatMonster.radius) * 1.3;
      if (dist > breakDist) {
        this.player.inCombat = false;
        this.activeCombatMonster.inCombat = false;
        this.activeCombatMonster = null;
      }
    }

    // 重置冷却时间 (3秒)
    this.flashCooldownTimer = GameConfig.input.flashCooldownSeconds;

    // 特效与音效
    audioManager.playFlash();
    this.addFloatingText('闪现!', this.player.x, this.player.y - 30, '#a855f7', true);
    this.addParticles(oldX, oldY, '#c084fc', 16);
    this.addParticles(targetX, targetY, '#c084fc', 20);

    eventBus.emit(GameEvents.FLASH_USED, { from: { x: oldX, y: oldY }, to: { x: targetX, y: targetY } });
    return true;
  }

  // ==================== 主循环 ====================
  private gameLoop(time: number): void {
    if (!this.isRunning) return;
    const dt = Math.min(0.1, (time - this.lastTime) / 1000);
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  private update(dt: number): void {
    // 1. 冷却与计时器推进
    if (this.flashCooldownTimer > 0) {
      this.flashCooldownTimer = Math.max(0, this.flashCooldownTimer - dt);
    }
    if (this.player.hitFlashTimer > 0) {
      this.player.hitFlashTimer = Math.max(0, this.player.hitFlashTimer - dt);
    }
    this.player.animPhase += dt * 5.0;

    // 2. 玩家移动逻辑
    this.updatePlayerMovement(dt);

    // 3. 草丛机制判定 (玩家进草使NPC检测半径缩小)
    const wasInGrass = this.isPlayerInGrass;
    this.isPlayerInGrass = this.mapSystem.isPlayerInGrass(this.player.x, this.player.y);
    if (this.isPlayerInGrass && !wasInGrass) {
      audioManager.playGrassRustle();
      eventBus.emit(GameEvents.GRASS_STATE_CHANGE, { inGrass: true });
    } else if (!this.isPlayerInGrass && wasInGrass) {
      eventBus.emit(GameEvents.GRASS_STATE_CHANGE, { inGrass: false });
    }

    // 4. 地图资源检测与吞噬
    this.checkResourceSwallow();
    this.mapSystem.updateResources(dt);

    // 5. 怪物更新 (AI漫步/追击/逃跑/回血/重生)
    this.updateMonsters(dt);
    this.mapSystem.updateMonstersRegenAndRespawn(dt);

    // 6. 战斗系统结算 (判定圆环、固定节拍换血、秒杀)
    this.updateCombatSystem(dt);

    // 7. 玩家自然缓慢回血 (脱战状态下)
    if (!this.player.inCombat && !this.player.isDead && this.player.currentHp < this.player.maxHp) {
      const heal = this.player.maxHp * GameConfig.regen.playerRegenRate * dt;
      this.player.currentHp = Math.min(this.player.maxHp, this.player.currentHp + heal);
    }

    // 8. 更新特效与飘字
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);

    // 9. 更新视口边缘威胁与目标指示器
    this.updateThreatIndicators();

    // 10. 摄像机跟随
    this.camera.x += (this.player.x - this.camera.x) * 0.12;
    this.camera.y += (this.player.y - this.camera.y) * 0.12;

    // 11. 全局昼夜动态光照与色温滤镜推进
    this.lightingSystem.update(dt);
  }

  // ==================== 玩家移动 ====================
  private updatePlayerMovement(dt: number): void {
    if (this.player.isDead) {
      this.player.vx = 0;
      this.player.vy = 0;
      return;
    }

    if (this.isTouching) {
      const dx = this.currentDragVector.x;
      const dy = this.currentDragVector.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > GameConfig.input.dragDeadZone) {
        const moveRatio = Math.min(1.0, dist / GameConfig.input.maxDragDistance);
        const speed = this.player.moveSpeed * moveRatio;
        const angle = Math.atan2(dy, dx);

        this.player.vx = Math.cos(angle) * speed;
        this.player.vy = Math.sin(angle) * speed;
        this.player.facingAngle = angle;
      } else {
        this.player.vx = 0;
        this.player.vy = 0;
      }
    } else {
      // 手指离开屏幕，角色立即停止移动
      this.player.vx = 0;
      this.player.vy = 0;
    }

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    // 地图边界硬限制
    const halfW = GameConfig.map.width / 2 - this.player.radius;
    const halfH = GameConfig.map.height / 2 - this.player.radius;
    this.player.x = Math.max(-halfW, Math.min(halfW, this.player.x));
    this.player.y = Math.max(-halfH, Math.min(halfH, this.player.y));
  }

  // ==================== 资源吞噬 ====================
  private checkResourceSwallow(): void {
    if (this.player.isDead) return;

    for (const res of this.mapSystem.resources) {
      if (res.isCollected) continue;

      const dx = this.player.x - res.x;
      const dy = this.player.y - res.y;
      const distSq = dx * dx + dy * dy;
      const eatDist = this.player.radius + res.radius + 6;

      if (distSq <= eatDist * eatDist) {
        res.isCollected = true;
        res.respawnTimer = GameConfig.exp.resourceRespawnSeconds;

        this.addExp(res.expValue);
        this.totalResources++;
        audioManager.playSwallow();

        this.addFloatingText(`+${res.expValue}`, res.x, res.y - 15, '#4ade80');
        this.addParticles(res.x, res.y, res.color, 10);

        eventBus.emit(GameEvents.RESOURCE_SWALLOWED, { resourceId: res.id, exp: res.expValue });
      }
    }
  }

  // ==================== 经验增加与升级 ====================
  public addExp(amount: number): void {
    if (this.player.level >= GameConfig.levels.maxLevel) {
      this.playerExp = Math.min(9999, this.playerExp + amount);
      this.saveProgress();
      return;
    }

    this.playerExp += amount;
    const currentThreshold = GameConfig.levels.expThreshold[this.player.level - 1];

    if (this.playerExp >= currentThreshold) {
      // 升级触发：经验池满自动升级，同时回满血
      this.playerExp -= currentThreshold;
      this.player.level = Math.min(GameConfig.levels.maxLevel, this.player.level + 1);
      this.refreshPlayerAttributes();
      this.player.currentHp = this.player.maxHp; // 自动回满血

      audioManager.playLevelUp();
      this.addFloatingText('等级提升!', this.player.x, this.player.y - 50, '#facc15', true);
      this.addParticles(this.player.x, this.player.y, '#facc15', 30);

      eventBus.emit(GameEvents.PLAYER_LEVEL_UP, {
        level: this.player.level,
        name: this.player.name,
        maxHp: this.player.maxHp,
        atk: this.player.atk,
      });
    }

    this.saveProgress();
  }

  private refreshPlayerAttributes(): void {
    const data = getLevelData(this.player.level);
    this.player.name = data.name;
    this.player.maxHp = data.maxHp;
    this.player.atk = data.atk;
    this.player.moveSpeed = data.moveSpeed;
    this.player.radius = data.bodyRadius;
    this.player.color = data.color;
    this.player.accentColor = data.accentColor;
  }

  // ==================== 怪物 AI 行为 ====================
  private updateMonsters(dt: number): void {
    const playerPos = { x: this.player.x, y: this.player.y };
    // 草丛遮挡机制：站在草丛中时，NPC检测半径缩小
    const detectionRadius = this.isPlayerInGrass
      ? GameConfig.npcAI.grassDetectionRadius
      : GameConfig.npcAI.normalDetectionRadius;

    for (const m of this.mapSystem.monsters) {
      if (m.isDead) continue;

      m.animPhase += dt * 4.0;
      if (m.hitFlashTimer > 0) {
        m.hitFlashTimer = Math.max(0, m.hitFlashTimer - dt);
      }

      const distToPlayer = CombatSystem.getDistance(m, playerPos);

      // AI 行为：若开启 monstersStayStationary，怪物在初始位置原地驻守，不主动四处乱跑或追杀，静候玩家探索
      if (GameConfig.npcAI.monstersStayStationary) {
        m.aiState = 'idle';
        m.vx = 0;
        m.vy = 0;
        // 面向接近的玩家或保持默认朝向
        if (distToPlayer <= detectionRadius) {
          m.facingAngle = Math.atan2(this.player.y - m.y, this.player.x - m.x);
        }
      } else if (!this.player.isDead && distToPlayer <= detectionRadius) {
        if (m.level > this.player.level) {
          // 追击玩家：针对比自己等级低的玩家，主动锁定追杀
          m.aiState = 'pursuit';
          const angle = Math.atan2(this.player.y - m.y, this.player.x - m.x);
          m.vx = Math.cos(angle) * m.moveSpeed;
          m.vy = Math.sin(angle) * m.moveSpeed;
          m.facingAngle = angle;
        } else if (m.level < this.player.level) {
          // 逃跑：针对比自己等级低的NPC，面对高等级玩家时尝试逃跑
          m.aiState = 'flee';
          const fleeAngle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
          m.vx = Math.cos(fleeAngle) * m.moveSpeed;
          m.vy = Math.sin(fleeAngle) * m.moveSpeed;
          m.facingAngle = fleeAngle;
        } else {
          // 同级生物：保持警惕，在攻击范围内才会相互换血，平时小幅移动
          m.aiState = 'idle';
          this.updateMonsterIdle(m, dt);
        }
      } else {
        // 超出检测范围，若处于追击则返回原位或进入漫步
        const distToSpawn = CombatSystem.getDistance(m, { x: m.spawnX, y: m.spawnY });
        if (distToSpawn > GameConfig.npcAI.wanderRadius * 1.5) {
          m.aiState = 'return';
          const returnAngle = Math.atan2(m.spawnY - m.y, m.spawnX - m.x);
          m.vx = Math.cos(returnAngle) * (m.moveSpeed * GameConfig.npcAI.wanderSpeedRatio);
          m.vy = Math.sin(returnAngle) * (m.moveSpeed * GameConfig.npcAI.wanderSpeedRatio);
          m.facingAngle = returnAngle;
        } else {
          m.aiState = 'idle';
          this.updateMonsterIdle(m, dt);
        }
      }

      m.x += m.vx * dt;
      m.y += m.vy * dt;

      // 限制在地图内
      const halfW = GameConfig.map.width / 2 - m.radius;
      const halfH = GameConfig.map.height / 2 - m.radius;
      m.x = Math.max(-halfW, Math.min(halfW, m.x));
      m.y = Math.max(-halfH, Math.min(halfH, m.y));
    }
  }

  private updateMonsterIdle(m: IEntity, dt: number): void {
    m.wanderTimer -= dt;
    if (m.wanderTimer <= 0) {
      m.wanderTimer = GameConfig.npcAI.wanderIntervalSeconds + Math.random();
      // 随机悠闲游走
      const angle = Math.random() * Math.PI * 2;
      const speed = m.moveSpeed * GameConfig.npcAI.wanderSpeedRatio;
      m.vx = Math.cos(angle) * speed;
      m.vy = Math.sin(angle) * speed;
      m.facingAngle = angle;
    }
  }

  // ==================== 战斗系统结算 ====================
  private updateCombatSystem(dt: number): void {
    if (this.player.isDead) return;

    const currentTime = performance.now() / 1000;
    let currentlyCollidingMonster: IEntity | null = null;

    // 寻找最近的碰撞怪物
    for (const m of this.mapSystem.monsters) {
      if (m.isDead) continue;

      if (CombatSystem.isColliding(this.player, m)) {
        currentlyCollidingMonster = m;
        break; // 每次与一个主要目标锁定换血
      }
    }

    if (currentlyCollidingMonster) {
      // 首次进入战斗圈，记录本次遭遇前的经验快照 (用于死亡找回损失经验)
      if (!this.player.inCombat) {
        this.player.inCombat = true;
        this.encounterStartExp = this.playerExp;
        this.activeCombatMonster = currentlyCollidingMonster;
        currentlyCollidingMonster.inCombat = true;
        this.player.nextAttackTime = currentTime; // 立即触发第一次攻击或开始计时
        eventBus.emit(GameEvents.COMBAT_ENTER, { opponentId: currentlyCollidingMonster.id });
      }

      // 到达固定攻击节拍时间点 (每 1 秒一次)
      if (currentTime >= this.player.nextAttackTime) {
        this.player.nextAttackTime = currentTime + GameConfig.combat.attackIntervalSeconds;

        const result = CombatSystem.executeCombatTick(
          this.player,
          currentlyCollidingMonster,
          currentTime,
          this.addFloatingText.bind(this),
          this.addParticles.bind(this),
        );

        if (result.targetDied) {
          if (result.expGained > 0) {
            this.addExp(result.expGained);
            this.totalKills++;
            if (result.isInstakill) {
              this.totalInstakills++;
            }
          }
          this.activeCombatMonster = null;
          this.player.inCombat = false;
        }

        // 检查玩家死亡与复活机制
        if (this.player.isDead) {
          this.handlePlayerDeath();
        }
      }
    } else {
      // 玩家主动移动/闪现离开对方判定圆环，脱战
      if (this.player.inCombat) {
        this.player.inCombat = false;
        if (this.activeCombatMonster) {
          this.activeCombatMonster.inCombat = false;
          this.activeCombatMonster = null;
        }
        eventBus.emit(GameEvents.COMBAT_EXIT);
      }
    }
  }

  // ==================== 玩家死亡与复活 ====================
  private handlePlayerDeath(): void {
    // 按照设计文档 4.4 节严格执行：
    // - 不掉级 (level保持不变)
    // - 经验值回到本次战斗开始前的状态 (本次遭遇损失的经验会被找回，不是清零重来)
    // - 血量回满至当前等级对应的最大血量
    // - 位置重置回出发点 (0, 0)
    // - 无无敌时间 (因已传送回安全出发点)
    this.playerExp = this.encounterStartExp;
    this.player.currentHp = this.player.maxHp;
    this.player.x = 0;
    this.player.y = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.isDead = false;
    this.player.inCombat = false;
    if (this.activeCombatMonster) {
      this.activeCombatMonster.inCombat = false;
      this.activeCombatMonster = null;
    }

    this.addFloatingText('已被击退，重返出发点', 0, -30, '#ef4444', true);
    this.addParticles(0, 0, '#38bdf8', 25);

    eventBus.emit(GameEvents.PLAYER_DIED, { level: this.player.level, exp: this.playerExp });
    this.saveProgress();
  }

  // ==================== 飘字与粒子系统 ====================
  public addFloatingText(text: string, x: number, y: number, color: string, isCritical: boolean = false): void {
    this.floatingTexts.push({
      id: Math.random().toString(),
      text,
      x,
      y,
      color,
      scale: isCritical ? 1.4 : 1.0,
      alpha: 1.0,
      duration: isCritical ? 1.3 : 0.9,
      elapsed: 0,
      vy: -35,
      isCritical,
    });
  }

  public addParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 85;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2 + Math.random() * 3.5,
        alpha: 1.0,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.35,
      });
    }
  }

  private updateFloatingTexts(dt: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.elapsed += dt;
      t.y += t.vy * dt;
      t.vy *= 0.94; // 阻尼
      t.alpha = Math.max(0, 1.0 - t.elapsed / t.duration);

      if (t.elapsed >= t.duration) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.alpha = Math.max(0, 1.0 - p.life / p.maxLife);

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  // ==================== 屏幕边缘威胁指示器 ====================
  private updateThreatIndicators(): void {
    this.threatIndicators = [];
    const halfW = this.viewWidth / 2;
    const halfH = this.viewHeight / 2;

    for (const m of this.mapSystem.monsters) {
      if (m.isDead) continue;

      const screenX = m.x - this.camera.x + halfW;
      const screenY = m.y - this.camera.y + halfH;

      // 仅针对视口外或边缘附近的实体
      const margin = 20;
      const isOffScreen =
        screenX < margin || screenX > this.viewWidth - margin || screenY < margin || screenY > this.viewHeight - margin;

      if (isOffScreen) {
        const dx = m.x - this.player.x;
        const dy = m.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 仅在一定感知范围内显示边缘预警 (高级危险生物显红色警戒，可捕猎目标显绿色)
        if (dist < 800) {
          const angle = Math.atan2(dy, dx);
          this.threatIndicators.push({
            angle,
            distance: dist,
            level: m.level,
            isThreat: m.level > this.player.level,
            monsterId: m.id,
            x: m.x,
            y: m.y,
          });
        }
      }
    }
  }

  private saveProgress(): void {
    Storage.save({
      level: this.player.level,
      exp: this.playerExp,
      totalKills: this.totalKills,
      totalInstakills: this.totalInstakills,
      totalSwallowedResources: this.totalResources,
      maxLevelReached: Math.max(this.player.level, Storage.load()?.maxLevelReached || 1),
      updatedAt: Date.now(),
    });
  }

  // ==================== 渲染引擎 (HTML5 2D Canvas) ====================
  private render(): void {
    const ctx = this.ctx;
    const w = this.viewWidth;
    const h = this.viewHeight;

    // 清屏与草地基底
    ctx.save();
    ctx.fillStyle = '#0f2415'; // 微观草地深邃腐殖质绿
    ctx.fillRect(0, 0, w, h);

    // 视口坐标变换
    ctx.translate(w / 2 - this.camera.x, h / 2 - this.camera.y);

    // 1. 绘制草地网格与微观纹理
    this.renderMeadowBackground(ctx);

    // 2. 绘制地图边界与警戒区 (带警示虚线与光晕)
    this.renderMapBoundaries(ctx);

    // 3. 绘制中央安全基地
    this.renderSafeZone(ctx);

    // 4. 绘制草丛遮挡物 (底层)
    this.renderGrassPatches(ctx);

    // 5. 绘制微观资源 (甘甜露珠、浆果、苜蓿)
    this.renderResources(ctx);

    // 6. 绘制所有NPC生物
    this.renderMonsters(ctx);

    // 7. 绘制玩家角色
    this.renderPlayer(ctx);

    // 8. 绘制粒子与击打特效
    this.renderParticles(ctx);

    // 9. 绘制飘字动画
    this.renderFloatingTexts(ctx);

    ctx.restore();

    // 10. 全局昼夜动态光照与色温滤镜 (清晨/正午/午后/黄昏/幽夜多层融合与视口暗角)
    const playerScreenX = this.viewWidth / 2 + (this.player.x - this.camera.x);
    const playerScreenY = this.viewHeight / 2 + (this.player.y - this.camera.y);
    this.lightingSystem.renderLightingOverlay(ctx, this.viewWidth, this.viewHeight, playerScreenX, playerScreenY);

    // 11. 绘制视口边框警戒光晕 (当靠近地图边界时)
    this.renderBoundaryScreenWarning(ctx);

    // 12. 绘制屏幕边缘生物预警箭头 (红警高危，绿标捕食)
    this.renderEdgeIndicators(ctx);
  }

  private renderMeadowBackground(ctx: CanvasRenderingContext2D): void {
    const halfW = GameConfig.map.width / 2;
    const halfH = GameConfig.map.height / 2;

    // 地图底色
    ctx.fillStyle = '#143820';
    ctx.fillRect(-halfW, -halfH, GameConfig.map.width, GameConfig.map.height);

    // 网格纹理
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    const gridSize = 120;
    const startX = Math.floor(-halfW / gridSize) * gridSize;
    const startY = Math.floor(-halfH / gridSize) * gridSize;

    ctx.beginPath();
    for (let x = startX; x <= halfW; x += gridSize) {
      ctx.moveTo(x, -halfH);
      ctx.lineTo(x, halfH);
    }
    for (let y = startY; y <= halfH; y += gridSize) {
      ctx.moveTo(-halfW, y);
      ctx.lineTo(halfW, y);
    }
    ctx.stroke();
  }

  private renderMapBoundaries(ctx: CanvasRenderingContext2D): void {
    const halfW = GameConfig.map.width / 2;
    const halfH = GameConfig.map.height / 2;
    const warnDist = GameConfig.map.boundaryWarningDistance;

    // 边界警戒区渐变条
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 12]);
    ctx.strokeRect(-halfW + warnDist, -halfH + warnDist, (halfW - warnDist) * 2, (halfH - warnDist) * 2);
    ctx.setLineDash([]);

    // 绝对地图边界
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 8;
    ctx.strokeRect(-halfW, -halfH, GameConfig.map.width, GameConfig.map.height);
  }

  private renderSafeZone(ctx: CanvasRenderingContext2D): void {
    const radius = GameConfig.map.safeZoneRadius;

    // 安全区地面柔和绿光
    const grad = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
    grad.addColorStop(0.8, 'rgba(34, 197, 94, 0.15)');
    grad.addColorStop(1, 'rgba(34, 197, 94, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // 符文边界圆环
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 中心微标
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('安全出发点', 0, 4);
  }

  private renderGrassPatches(ctx: CanvasRenderingContext2D): void {
    for (const grass of this.mapSystem.grassPatches) {
      // 仅在视口附近渲染
      if (
        Math.abs(grass.x - this.camera.x) > this.viewWidth / 2 + grass.radius + 50 ||
        Math.abs(grass.y - this.camera.y) > this.viewHeight / 2 + grass.radius + 50
      ) {
        continue;
      }

      ctx.save();
      ctx.translate(grass.x, grass.y);

      // 草丛底阴影
      ctx.fillStyle = 'rgba(6, 78, 59, 0.45)';
      ctx.beginPath();
      ctx.arc(0, 0, grass.radius, 0, Math.PI * 2);
      ctx.fill();

      // 茂密草叶绘制
      ctx.fillStyle = '#15803d';
      for (let i = 0; i < grass.bladeCount; i++) {
        const angle = (i / grass.bladeCount) * Math.PI * 2 + Math.sin(grass.seed + i) * 0.2;
        const r = (grass.radius * 0.45) + (Math.sin(grass.seed + i * 2) * 0.35 + 0.35) * (grass.radius * 0.5);
        const bx = Math.cos(angle) * r;
        const by = Math.sin(angle) * r;

        ctx.beginPath();
        ctx.ellipse(bx, by, 6, 14, angle + Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderResources(ctx: CanvasRenderingContext2D): void {
    for (const res of this.mapSystem.resources) {
      if (res.isCollected) continue;

      if (
        Math.abs(res.x - this.camera.x) > this.viewWidth / 2 + 50 ||
        Math.abs(res.y - this.camera.y) > this.viewHeight / 2 + 50
      ) {
        continue;
      }

      const bobY = Math.sin(res.bobOffset) * 3;

      ctx.save();
      ctx.translate(res.x, res.y + bobY);

      // 光晕
      ctx.fillStyle = res.color + '44';
      ctx.beginPath();
      ctx.arc(0, 0, res.radius + 5, 0, Math.PI * 2);
      ctx.fill();

      // 资源实体
      ctx.fillStyle = res.color;
      ctx.beginPath();
      ctx.arc(0, 0, res.radius, 0, Math.PI * 2);
      ctx.fill();

      // 高光晶莹反光点
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(-res.radius * 0.3, -res.radius * 0.3, res.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderMonsters(ctx: CanvasRenderingContext2D): void {
    for (const m of this.mapSystem.monsters) {
      if (m.isDead) continue;

      if (
        Math.abs(m.x - this.camera.x) > this.viewWidth / 2 + m.radius + 60 ||
        Math.abs(m.y - this.camera.y) > this.viewHeight / 2 + m.radius + 60
      ) {
        continue;
      }

      ctx.save();
      ctx.translate(m.x, m.y);

      // 受击闪白
      if (m.hitFlashTimer > 0) {
        ctx.filter = 'brightness(2.2)';
      }

      // 等级压制光圈预警：比玩家强 = 红色攻击警示圈；比玩家弱 = 绿色猎捕圈
      const isStronger = m.level > this.player.level;
      const ringColor = isStronger ? 'rgba(239, 68, 68, 0.35)' : 'rgba(74, 222, 128, 0.35)';
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, m.radius * GameConfig.combat.collisionDistanceMultiplier, 0, Math.PI * 2);
      ctx.stroke();

      // 旋转对齐朝向
      ctx.rotate(m.facingAngle);

      // 绘制特定物种的外观 (角、刺、螯肢等)
      this.drawCreatureBody(ctx, m);

      ctx.restore();

      // 绘制怪物头顶血条与等级标牌 (在世界坐标系下不随角度旋转)
      this.renderMonsterHUD(ctx, m);
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    if (this.player.isDead) return;

    ctx.save();
    ctx.translate(this.player.x, this.player.y);

    // 草丛潜行隐匿透明度
    if (this.isPlayerInGrass) {
      ctx.globalAlpha = 0.55;
    }

    if (this.player.hitFlashTimer > 0) {
      ctx.filter = 'brightness(2.0)';
    }

    // 玩家判定圆环与护盾感
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.player.radius * GameConfig.combat.collisionDistanceMultiplier, 0, Math.PI * 2);
    ctx.stroke();

    // 朝向旋转
    ctx.rotate(this.player.facingAngle);

    // 绘制玩家生物形态
    this.drawCreatureBody(ctx, this.player, true);

    ctx.restore();
  }

  /**
   * 绘制微观生物几何形态 (随Lv1-10升级展现肢体、触角、棘刺、外骨骼)
   */
  private drawCreatureBody(ctx: CanvasRenderingContext2D, entity: IEntity, isPlayer: boolean = false): void {
    const r = entity.radius;
    const level = entity.level;
    const anim = Math.sin(entity.animPhase) * 3;

    // 1. 身体动态漫射投影 (响应太阳光照方位与长度)
    const shadowOffset = this.lightingSystem.getCurrentLightingState().shadowOffset;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(shadowOffset.x * 0.4, shadowOffset.y * 0.4, r * 1.05, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. 特征附肢 (依等级阶梯展现)
    if (level === 1) {
      // 纤毛幼虫：周围纤毛微动
      ctx.strokeStyle = entity.accentColor;
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const wiggle = Math.sin(entity.animPhase + i) * 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
        ctx.lineTo(Math.cos(ang) * (r + 5 + wiggle), Math.sin(ang) * (r + 5 + wiggle));
        ctx.stroke();
      }
    } else if (level >= 3 && level <= 4) {
      // 节肢撞角 / 刺毛
      ctx.fillStyle = entity.accentColor;
      // 头部撞角
      ctx.beginPath();
      ctx.moveTo(r * 0.8, -r * 0.3);
      ctx.lineTo(r + 10, 0);
      ctx.lineTo(r * 0.8, r * 0.3);
      ctx.fill();
    } else if (level >= 5 && level <= 6) {
      // 螳螂双刃 / 毒蜈螯肢
      ctx.strokeStyle = entity.accentColor;
      ctx.lineWidth = 4;
      // 左侧刀足
      ctx.beginPath();
      ctx.moveTo(r * 0.4, -r * 0.8);
      ctx.lineTo(r + 12 + anim, -r * 0.9);
      ctx.lineTo(r + 6, -r * 0.3);
      ctx.stroke();
      // 右侧刀足
      ctx.beginPath();
      ctx.moveTo(r * 0.4, r * 0.8);
      ctx.lineTo(r + 12 + anim, r * 0.9);
      ctx.lineTo(r + 6, r * 0.3);
      ctx.stroke();
    } else if (level >= 7 && level <= 9) {
      // 刺猬硬刺 / 迅捷蜥尾
      ctx.fillStyle = entity.accentColor;
      for (let i = 1; i <= 5; i++) {
        const ang = Math.PI * 0.7 + (i / 6) * Math.PI * 0.6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
        ctx.lineTo(Math.cos(ang) * (r + 12), Math.sin(ang) * (r + 12));
        ctx.lineTo(Math.cos(ang + 0.15) * r, Math.sin(ang + 0.15) * r);
        ctx.fill();
      }
      // 细长摆尾
      ctx.strokeStyle = entity.accentColor;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.quadraticCurveTo(-r - 15, anim * 2, -r - 28, anim * 3);
      ctx.stroke();
    } else if (level >= 10) {
      // Lv10 草原霸王·冠刺蜥 (尊贵金边冠羽、厚重鳞甲、凶猛尖刺)
      ctx.fillStyle = '#f59e0b';
      // 头部王冠刺羽
      for (let i = -2; i <= 2; i++) {
        const ang = (i * 0.2);
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
        ctx.lineTo(Math.cos(ang) * (r + 20 + Math.abs(i) * -4), Math.sin(ang) * (r + 20));
        ctx.lineTo(Math.cos(ang + 0.12) * r, Math.sin(ang + 0.12) * r);
        ctx.fill();
      }
      // 威武巨尾
      ctx.strokeStyle = entity.accentColor;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.quadraticCurveTo(-r - 25, anim * 3, -r - 45, anim * 4);
      ctx.stroke();
    }

    // 3. 主躯体圆环与甲壳渐变
    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    grad.addColorStop(0, entity.color);
    grad.addColorStop(1, entity.accentColor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // 4. 眼睛 (朝向前方)
    const eyeDist = r * 0.55;
    const eyeSpread = r * 0.45;
    ctx.fillStyle = '#ffffff';

    // 左眼
    ctx.beginPath();
    ctx.arc(eyeDist, -eyeSpread, Math.max(3, r * 0.2), 0, Math.PI * 2);
    ctx.fill();
    // 右眼
    ctx.beginPath();
    ctx.arc(eyeDist, eyeSpread, Math.max(3, r * 0.2), 0, Math.PI * 2);
    ctx.fill();

    // 瞳孔 (黑曜石光泽)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(eyeDist + 1, -eyeSpread, Math.max(1.8, r * 0.11), 0, Math.PI * 2);
    ctx.arc(eyeDist + 1, eyeSpread, Math.max(1.8, r * 0.11), 0, Math.PI * 2);
    ctx.fill();
  }

  private renderMonsterHUD(ctx: CanvasRenderingContext2D, m: IEntity): void {
    const barW = Math.max(36, m.radius * 1.8);
    const barH = 5;
    const barX = m.x - barW / 2;
    const barY = m.y - m.radius - 22;

    // 等级标牌与名称
    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    const isStronger = m.level > this.player.level;
    ctx.fillStyle = isStronger ? '#ef4444' : m.level === this.player.level ? '#facc15' : '#4ade80';
    ctx.fillText(`Lv.${m.level} ${m.name}`, m.x, barY - 4);

    // 血条底色
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX, barY, barW, barH);

    // 血条填充
    const hpRatio = Math.max(0, m.currentHp / m.maxHp);
    ctx.fillStyle = hpRatio > 0.4 ? '#22c55e' : '#ef4444';
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    // 描边
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D): void {
    for (const t of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = t.color;
      ctx.font = t.isCritical
        ? '900 18px "Plus Jakarta Sans", sans-serif'
        : 'bold 13px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }

  private renderBoundaryScreenWarning(ctx: CanvasRenderingContext2D): void {
    const halfW = GameConfig.map.width / 2;
    const halfH = GameConfig.map.height / 2;
    const distToBorder = Math.min(
      halfW - Math.abs(this.player.x),
      halfH - Math.abs(this.player.y),
    );

    const warnDist = GameConfig.map.boundaryWarningDistance;
    if (distToBorder < warnDist) {
      const intensity = (1 - distToBorder / warnDist) * 0.55;
      ctx.save();
      ctx.strokeStyle = `rgba(239, 68, 68, ${intensity})`;
      ctx.lineWidth = 18;
      ctx.strokeRect(0, 0, this.viewWidth, this.viewHeight);
      ctx.restore();
    }
  }

  private renderEdgeIndicators(ctx: CanvasRenderingContext2D): void {
    const cx = this.viewWidth / 2;
    const cy = this.viewHeight / 2;
    const indicatorRadius = Math.min(cx, cy) - 30;

    for (const ind of this.threatIndicators) {
      const ix = cx + Math.cos(ind.angle) * indicatorRadius;
      const iy = cy + Math.sin(ind.angle) * indicatorRadius;

      ctx.save();
      ctx.translate(ix, iy);
      ctx.rotate(ind.angle);

      // 危险生物显红三角与警戒框，低级猎物显绿箭头
      ctx.fillStyle = ind.isThreat ? '#ef4444' : '#22c55e';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-6, -7);
      ctx.lineTo(-6, 7);
      ctx.closePath();
      ctx.fill();

      // 等级标
      ctx.rotate(-ind.angle);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`L${ind.level}`, 0, 16);

      ctx.restore();
    }
  }

  // ==================== 重置与调试工具 ====================
  public resetGame(): void {
    Storage.clear();
    this.playerExp = 0;
    this.player.level = 1;
    this.refreshPlayerAttributes();
    this.player.currentHp = this.player.maxHp;
    this.player.x = 0;
    this.player.y = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.isDead = false;
    this.player.inCombat = false;
    this.flashCooldownTimer = 0;
    this.mapSystem.initMap();
    this.saveProgress();
  }

  public setPlayerLevel(level: number): void {
    this.player.level = Math.max(1, Math.min(GameConfig.levels.maxLevel, level));
    this.refreshPlayerAttributes();
    this.player.currentHp = this.player.maxHp;
    this.saveProgress();
  }
}
