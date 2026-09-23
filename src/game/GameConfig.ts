/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ILevelData } from './Types';

/**
 * GameConfig —— 公共参数配置文件
 * 严格按照《吞噬进化》MVP设计文档要求组织，所有玩法数值均为待调参数，需通过本配置文件统一管理。
 */
export const GameConfig = {
  // 等级体系与数值成长 (Lv1 - Lv10 草地生态梯队)
  levels: {
    maxLevel: 10,
    // 各等级对应经验阈值 (Lv1->2, Lv2->3, ..., Lv9->10)
    expThreshold: [50, 120, 220, 360, 540, 780, 1100, 1500, 2000, 999999],
    // 各等级基础最大血量
    hpGrowth: [80, 120, 170, 240, 330, 440, 580, 750, 960, 1300],
    // 各等级基础攻击力 (注意秒杀判定：玩家攻击力 >= 怪物当前血量)
    atkGrowth: [35, 55, 80, 120, 175, 250, 350, 480, 650, 900],
    // 各等级基础移动速度 (保证高等级生物移速快于低等级生物，产生天然追及感)
    moveSpeedGrowth: [140, 150, 160, 170, 180, 190, 200, 210, 220, 235],
    // 生物体型碰撞半径 (调小体型，强化大地图探索辽阔感与微观生态沉浸感)
    radiusGrowth: [12, 14, 17, 20, 24, 28, 33, 38, 44, 52],
    // 全局生物体型缩放系数 (支持在面板中手动自由调节 0.5x - 1.5x)
    globalCreatureScale: 0.85,
    // 生物物种名称与美学设定 (Lv1-10 微观草地阶段物种形态)
    speciesList: [
      {
        level: 1,
        name: '绿芽幼虫',
        species: '原生单胞体',
        description: '微观草地底层的原生软体生物，生有微小纤毛与感光点。',
        color: '#4ade80',
        accentColor: '#22c55e',
        eyeCount: 2,
        feature: 'cilia',
      },
      {
        level: 2,
        name: '露珠跳虫',
        species: '节肢跳跃体',
        description: '背负露珠光泽的敏捷跳虫，开始具备初级甲壳。',
        color: '#38bdf8',
        accentColor: '#0284c7',
        eyeCount: 2,
        feature: 'carapace',
      },
      {
        level: 3,
        name: '刺毛草蛛',
        species: '捕猎幼蛛',
        description: '长有防御刺毛的四足小型草蛛，具备初级毒毛与触肢。',
        color: '#facc15',
        accentColor: '#ca8a04',
        eyeCount: 4,
        feature: 'spikes',
      },
      {
        level: 4,
        name: '斑角甲虫',
        species: '重甲节肢类',
        description: '坚固角质外壳覆盖躯干，头部生出斑纹撞角。',
        color: '#fb923c',
        accentColor: '#ea580c',
        eyeCount: 2,
        feature: 'horns',
      },
      {
        level: 5,
        name: '翠玉螳螂',
        species: '刀足掠食者',
        description: '草间优雅凶猛的猎杀者，生有一对锐利的折叠刀臂。',
        color: '#10b981',
        accentColor: '#059669',
        eyeCount: 2,
        feature: 'claws',
      },
      {
        level: 6,
        name: '赤纹毒蜈',
        species: '多足剧毒体',
        description: '红黑相间的环节毒虫，带有高侵略性的攻击性螯肢。',
        color: '#ef4444',
        accentColor: '#b91c1c',
        eyeCount: 6,
        feature: 'spikes',
      },
      {
        level: 7,
        name: '迅捷草蜥',
        species: '小型爬行类',
        description: '具备极佳机动性的微型爬行动物，细长鳞尾保持平衡。',
        color: '#8b5cf6',
        accentColor: '#6d28d9',
        eyeCount: 2,
        feature: 'wings',
      },
      {
        level: 8,
        name: '荆棘角蟾',
        species: '厚皮两栖霸主',
        description: '厚实多疣的角蟾，背部布满坚韧骨质棘刺。',
        color: '#ec4899',
        accentColor: '#be185d',
        eyeCount: 2,
        feature: 'horns',
      },
      {
        level: 9,
        name: '刺猬猎手',
        species: '草地猛兽幼体',
        description: '全身覆盖密集硬刺的杂食掠食兽，领地意识极强。',
        color: '#d97706',
        accentColor: '#92400e',
        eyeCount: 2,
        feature: 'spikes',
      },
      {
        level: 10,
        name: '草原霸王·冠刺蜥',
        species: '草地生态顶点',
        description: 'Lv1-10草地生态链无可匹敌的绝对霸主，头顶威严冠刺！',
        color: '#06b6d4',
        accentColor: '#0891b2',
        eyeCount: 2,
        feature: 'crested',
      },
    ] as const,
  },

  // 战斗节奏与结算规则
  combat: {
    attackIntervalSeconds: 1.0, // 固定攻击节拍 (秒)
    monsterAtkFluctuation: 0.10, // 怪物攻击力浮动 ±10%
    collisionDistanceMultiplier: 0.85, // 紧凑型判定攻击圆环 (0.85倍体型半径，既不过大又能准确触发)
  },

  // 经验结算规则
  exp: {
    resourceExpValue: 10, // 资源统一经验值 (草、浆果、露珠等拾取物统一为10)
    sameLevelKillMultiplier: 1.5, // 同级击杀经验加成系数 (承担换血风险的补偿)
    resourceRespawnSeconds: 15.0, // 资源采集后15秒重新生长
  },

  // 血量恢复与怪物重生
  regen: {
    globalMonsterRegenRate: 0.02, // 全图怪物每秒自然回血比例 (2%)
    playerRegenRate: 0.03, // 玩家在非战斗状态下的自然回血比例 (3%/秒)
    respawnDelaySeconds: 300.0, // 怪物击杀后5分钟重生 (300秒)
  },

  // 操作与技能
  input: {
    flashCooldownSeconds: 3.0, // 闪现冷却时间 (3秒)
    flashDistance: 240.0, // 闪现位移距离 (加大闪现距离以匹配大地图)
    flashDirectionMode: 'random' as const, // 闪现方向：随机 (增加紧张感)
    dragDeadZone: 6.0, // 拖动触发移动的最小死区
    maxDragDistance: 90.0, // 拖动最大力道映射半径
  },

  // NPC / 怪物 AI 行为
  npcAI: {
    monstersStayStationary: true, // 核心配置：怪物在初始位置静止驻守，不主动到处游走，避免出门扎堆被打死
    normalDetectionRadius: 180.0, // 缩小主动警戒半径
    grassDetectionRadius: 40.0, // 草丛内NPC检测半径 (大幅缩小)
    fleeDistance: 160.0, // 低级NPC面对高等级玩家的逃跑感应半径
    wanderRadius: 0.0, // 闲逛半径 (驻守模式为0)
    wanderIntervalSeconds: 4.0, // 闲逛方向切换间隔
    wanderSpeedRatio: 0.0, // 初始位置静止
  },

  // 地图与生态场景 (大地图辽阔设计)
  map: {
    width: 4800.0, // 地图总宽度大幅扩大至4800
    height: 4800.0, // 地图总高度大幅扩大至4800
    safeZoneRadius: 520.0, // 出发点中央安全区大幅扩充至520px，保证出门有极其充裕的安全空间和初级资源
    boundaryWarningDistance: 180.0, // 警戒区触发边缘距离
    grassPatchCount: 42, // 草丛区域数量
    grassPatchMinRadius: 100.0,
    grassPatchMaxRadius: 200.0,
    resourceCount: 160, // 充裕的草地微观资源，方便新手前期安全发育
    monsterCount: 50, // 稀疏分布，在4800x4800地图上形成舒适生态距离，避免怪群扎堆
  },

  // 全局昼夜动态光照与色温滤镜系统 (清晨 -> 正午 -> 午后 -> 黄昏 -> 幽夜循环)
  lighting: {
    enabled: true,
    dayCycleDurationSeconds: 120.0, // 默认完整昼夜循环2分钟 (120秒)，可自由调速
    ambientLightIntensity: 0.85, // 全局光照强度基准
    colorGradeEnabled: true, // 启用色温微观色彩分级
    vignetteIntensity: 0.28, // 暗角氛围强度
  },
};

export function getLevelData(level: number): ILevelData {
  const clampedLevel = Math.max(1, Math.min(GameConfig.levels.maxLevel, Math.floor(level)));
  const index = clampedLevel - 1;
  const species = GameConfig.levels.speciesList[index];
  const baseRadius = GameConfig.levels.radiusGrowth[index];
  const scale = GameConfig.levels.globalCreatureScale || 0.85;

  return {
    level: clampedLevel,
    name: species.name,
    species: species.species,
    description: species.description,
    maxHp: GameConfig.levels.hpGrowth[index],
    atk: GameConfig.levels.atkGrowth[index],
    moveSpeed: GameConfig.levels.moveSpeedGrowth[index],
    expThreshold: GameConfig.levels.expThreshold[index],
    bodyRadius: Math.round(baseRadius * scale),
    color: species.color,
    accentColor: species.accentColor,
    eyeCount: species.eyeCount,
    feature: species.feature,
  };
}
