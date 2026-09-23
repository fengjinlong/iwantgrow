/**
 * 微信小游戏主入口
 * 针对微信小游戏原生环境设计：无 DOM 依赖，直接通过微信提供的全局 Canvas 渲染
 */

import { MiniGameAdapter } from './src/adapter.js';

// 获取小游戏全局主 Canvas
const canvas = (typeof wx !== 'undefined' && wx.createCanvas) ? wx.createCanvas() : document.createElement('canvas');
const ctx = canvas.getContext('2d');

// 设置小游戏高分屏物理像素比例，保证在 Retina 手机屏上高清无锯齿
const width = MiniGameAdapter.windowWidth;
const height = MiniGameAdapter.windowHeight;
const dpr = MiniGameAdapter.pixelRatio;

canvas.width = width * dpr;
canvas.height = height * dpr;
ctx.scale(dpr, dpr);

// ==================== 游戏基础配置 ====================
const Config = {
  mapWidth: 4800,
  mapHeight: 4800,
  safeZoneRadius: 520,
  flashCooldown: 3.0,
  flashDistance: 240,
  monstersStayStationary: true, // 怪物在初始位置静止不移动
  species: [
    { level: 1, name: '绿芽幼虫', maxHp: 100, atk: 25, speed: 175, radius: 10, color: '#4ade80' },
    { level: 2, name: '青斑草蜢', maxHp: 150, atk: 40, speed: 185, radius: 12, color: '#22c55e' },
    { level: 3, name: '拟态尺蠖', maxHp: 220, atk: 60, speed: 190, radius: 14, color: '#16a34a' },
    { level: 4, name: '刺甲蝼蛄', maxHp: 320, atk: 85, speed: 195, radius: 17, color: '#0d9488' },
    { level: 5, name: '巨螯步甲', maxHp: 460, atk: 120, speed: 200, radius: 20, color: '#0284c7' },
    { level: 6, name: '锯齿螽斯', maxHp: 650, atk: 165, speed: 205, radius: 23, color: '#2563eb' },
    { level: 7, name: '碧玉螳螂', maxHp: 900, atk: 225, speed: 210, radius: 27, color: '#7c3aed' },
    { level: 8, name: '黑金虎甲', maxHp: 1220, atk: 300, speed: 215, radius: 31, color: '#9333ea' },
    { level: 9, name: '翡翠树蛙', maxHp: 1620, atk: 395, speed: 220, radius: 36, color: '#c026d3' },
    { level: 10, name: '草丛霸主·赤腹游蛇', maxHp: 2150, atk: 510, speed: 225, radius: 42, color: '#e11d48' },
  ],
  expThresholds: [60, 140, 260, 420, 650, 950, 1350, 1900, 2600, 9999],
};

// ==================== 玩家状态 ====================
let player = {
  level: 1,
  x: 0,
  y: 0,
  hp: 100,
  maxHp: 100,
  atk: 25,
  speed: 175,
  radius: 10,
  color: '#4ade80',
  exp: 0,
  facingAngle: 0,
  inCombat: false,
};

// 闪现冷却计时器
let flashCd = 0;

// 摄像机
let camera = { x: 0, y: 0 };

// 触屏滑动控制
let isTouching = false;
let touchStart = { x: 0, y: 0 };
let touchDrag = { x: 0, y: 0 };

// 闪现按钮布局 (右下角，缩小至更灵巧尺寸 radius: 22)
const flashBtn = {
  x: width - 45,
  y: height - 70,
  radius: 22,
};

// 怪物列表与资源点
let monsters = [];
let resources = [];
let grassPatches = [];

// 全局昼夜系统 (清晨 -> 正午 -> 黄昏 -> 幽夜)
let timeProgress = 0.1;

// 初始化地图实体
function initWorld() {
  monsters = [];
  resources = [];
  grassPatches = [];

  // 1. 草丛
  for (let i = 0; i < 20; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = 320 + Math.random() * 900;
    grassPatches.push({
      x: Math.cos(ang) * dist,
      y: Math.sin(ang) * dist,
      radius: 90 + Math.random() * 60,
    });
  }

  // 2. 怪物生成 (大幅扩大距离，离安全区更远，低级在前高级在后)
  for (let i = 0; i < 45; i++) {
    const ang = Math.random() * Math.PI * 2;
    // 距离中心 600 - 2200px 均匀稀疏分布
    const dist = 600 + Math.random() * 1600;
    // 越靠近安全区等级越低 (1-2级)，离得远才会遇到高级怪
    let lvl = 1;
    if (dist < 900) {
      lvl = Math.random() < 0.75 ? 1 : 2;
    } else if (dist < 1350) {
      lvl = 2 + Math.floor(Math.random() * 3);
    } else if (dist < 1800) {
      lvl = 4 + Math.floor(Math.random() * 4);
    } else {
      lvl = 7 + Math.floor(Math.random() * 4);
      lvl = Math.min(10, lvl);
    }

    const mData = Config.species[lvl - 1];
    monsters.push({
      id: i,
      level: lvl,
      x: Math.cos(ang) * dist,
      y: Math.sin(ang) * dist,
      hp: mData.maxHp,
      maxHp: mData.maxHp,
      atk: mData.atk,
      radius: mData.radius,
      color: mData.color,
      name: mData.name,
      isDead: false,
      wanderAngle: ang,
      wanderTimer: 0,
    });
  }

  // 3. 资源生成 (140个丰富散布在安全区与野外)
  for (let i = 0; i < 140; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.random() * 2100;
    resources.push({
      x: Math.cos(ang) * dist,
      y: Math.sin(ang) * dist,
      radius: 6,
      exp: 10,
      isCollected: false,
    });
  }
}

initWorld();

// ==================== 微信原生触控事件监听 ====================
if (typeof wx !== 'undefined') {
  wx.onTouchStart((e) => {
    const touch = e.touches[0];
    const tx = touch.clientX;
    const ty = touch.clientY;

    // 检测是否点击了闪现按钮
    const distToFlash = Math.hypot(tx - flashBtn.x, ty - flashBtn.y);
    if (distToFlash <= flashBtn.radius) {
      triggerFlash();
      return;
    }

    isTouching = true;
    touchStart = { x: tx, y: ty };
    touchDrag = { x: 0, y: 0 };
  });

  wx.onTouchMove((e) => {
    if (!isTouching) return;
    const touch = e.touches[0];
    touchDrag = {
      x: touch.clientX - touchStart.x,
      y: touch.clientY - touchStart.y,
    };
  });

  wx.onTouchEnd(() => {
    isTouching = false;
    touchDrag = { x: 0, y: 0 };
  });

  wx.onTouchCancel(() => {
    isTouching = false;
    touchDrag = { x: 0, y: 0 };
  });
}

// 触发闪现：向随机方向瞬间位移脱战
function triggerFlash() {
  if (flashCd > 0) return;
  flashCd = Config.flashCooldown;
  const randAngle = Math.random() * Math.PI * 2;
  player.x += Math.cos(randAngle) * Config.flashDistance;
  player.y += Math.sin(randAngle) * Config.flashDistance;
  MiniGameAdapter.vibrateShort();
}

// 玩家升级逻辑
function addExp(amount) {
  player.exp += amount;
  const threshold = Config.expThresholds[player.level - 1] || 9999;
  if (player.exp >= threshold && player.level < 10) {
    player.level++;
    const nextData = Config.species[player.level - 1];
    player.maxHp = nextData.maxHp;
    player.hp = nextData.maxHp; // 满血进化
    player.atk = nextData.atk;
    player.speed = nextData.speed;
    player.radius = nextData.radius;
    player.color = nextData.color;
    player.exp = 0;
    MiniGameAdapter.vibrateShort();
  }
}

// ==================== 主渲染与逻辑帧循环 ====================
let lastTime = Date.now();
let attackTickTimer = 0;

function loop() {
  const now = Date.now();
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  // 1. 推进昼夜光照 (2分钟完整周期)
  timeProgress = (timeProgress + dt / 120.0) % 1.0;
  if (flashCd > 0) flashCd = Math.max(0, flashCd - dt);

  // 2. 玩家移动更新 (滑动拖拽)
  if (isTouching) {
    const dragDist = Math.hypot(touchDrag.x, touchDrag.y);
    if (dragDist > 10) {
      const angle = Math.atan2(touchDrag.y, touchDrag.x);
      player.facingAngle = angle;
      player.x += Math.cos(angle) * player.speed * dt;
      player.y += Math.sin(angle) * player.speed * dt;
    }
  }

  // 限制地图边界
  const bound = Config.mapWidth / 2 - 50;
  player.x = Math.max(-bound, Math.min(bound, player.x));
  player.y = Math.max(-bound, Math.min(bound, player.y));

  // 摄像机平滑跟随
  camera.x += (player.x - camera.x) * 0.12;
  camera.y += (player.y - camera.y) * 0.12;

  // 3. 资源拾取
  for (const r of resources) {
    if (!r.isCollected) {
      const d = Math.hypot(player.x - r.x, player.y - r.y);
      if (d <= player.radius + r.radius) {
        r.isCollected = true;
        addExp(r.exp);
      }
    }
  }

  // 4. 战斗判定与换血节拍
  attackTickTimer += dt;
  let hasEnemyInCircle = false;

  for (const m of monsters) {
    if (m.isDead) continue;
    const dist = Math.hypot(player.x - m.x, player.y - m.y);
    const combatCircle = (player.radius + m.radius) * 1.5;

    if (dist <= combatCircle) {
      hasEnemyInCircle = true;

      // 规则：若玩家攻击力 >= 怪物血量，直接秒杀！
      if (player.atk >= m.hp) {
        m.isDead = true;
        addExp(m.level * 20);
        MiniGameAdapter.vibrateShort();
        continue;
      }

      // 1秒固定节拍换血
      if (attackTickTimer >= 1.0) {
        m.hp -= player.atk;
        const monsterDmg = m.atk * (0.9 + Math.random() * 0.2); // ±10% 浮动
        player.hp -= monsterDmg;

        if (m.hp <= 0) {
          m.isDead = true;
          addExp(m.level * 25);
        }

        if (player.hp <= 0) {
          // 死亡复活：不掉级，回满血回出发点
          player.hp = player.maxHp;
          player.x = 0;
          player.y = 0;
          break;
        }
      }
    }
  }

  if (attackTickTimer >= 1.0) attackTickTimer = 0;
  player.inCombat = hasEnemyInCircle;

  // ==================== 画面绘制 ====================
  ctx.clearRect(0, 0, width, height);

  // 绘制微观草地深绿底色
  ctx.fillStyle = '#0b1d12';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width / 2 - camera.x, height / 2 - camera.y);

  // 绘制安全区
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, Config.safeZoneRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 绘制草丛
  ctx.fillStyle = 'rgba(21, 128, 61, 0.35)';
  for (const g of grassPatches) {
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 绘制资源点
  ctx.fillStyle = '#38bdf8';
  for (const r of resources) {
    if (r.isCollected) continue;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 绘制怪物
  for (const m of monsters) {
    if (m.isDead) continue;
    // 怪物血条
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(m.x - 20, m.y - m.radius - 12, 40, 5);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(m.x - 20, m.y - m.radius - 12, (m.hp / m.maxHp) * 40, 5);

    // 怪物本体
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
    ctx.fill();

    // 怪物等级名
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv.${m.level}`, m.x, m.y + 3);
  }

  // 绘制玩家
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // 玩家视线方向
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(
    player.x + Math.cos(player.facingAngle) * (player.radius - 3),
    player.y + Math.sin(player.facingAngle) * (player.radius - 3),
    4,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.restore();

  // ==================== 全局光照与昼夜滤镜叠加 ====================
  // 清晨(金黄) -> 正午(白透) -> 黄昏(橙红) -> 幽夜(暗蓝)
  let filterColor = 'rgba(253, 224, 71, 0.08)';
  if (timeProgress > 0.2 && timeProgress < 0.6) {
    filterColor = 'rgba(240, 253, 250, 0.03)';
  } else if (timeProgress >= 0.6 && timeProgress < 0.85) {
    filterColor = 'rgba(249, 115, 22, 0.16)';
  } else if (timeProgress >= 0.85) {
    filterColor = 'rgba(30, 58, 138, 0.22)';
  }

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = filterColor;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // ==================== 微信小游戏轻量化 HUD ====================
  // 1. 顶部等级与生命值条
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(20, 45, 200, 52);
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(20, 45, 200, 52);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  const currSpecies = Config.species[player.level - 1];
  ctx.fillText(`Lv.${player.level} ${currSpecies.name}`, 30, 63);

  // HP 条
  ctx.fillStyle = '#334155';
  ctx.fillRect(30, 72, 180, 8);
  ctx.fillStyle = player.hp > 30 ? '#22c55e' : '#ef4444';
  ctx.fillRect(30, 72, Math.max(0, (player.hp / player.maxHp) * 180), 8);

  // 2. 右下角闪现技能按钮
  ctx.save();
  ctx.beginPath();
  ctx.arc(flashBtn.x, flashBtn.y, flashBtn.radius, 0, Math.PI * 2);
  ctx.fillStyle = flashCd <= 0 ? '#7c3aed' : '#334155';
  ctx.fill();
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(flashCd <= 0 ? '闪现' : `${flashCd.toFixed(1)}s`, flashBtn.x, flashBtn.y);
  ctx.restore();

  // 3. 右上角简易小地图雷达
  const radarSize = 65;
  const rx = width - 85;
  const ry = 45;
  ctx.fillStyle = 'rgba(10, 28, 16, 0.85)';
  ctx.beginPath();
  ctx.arc(rx + radarSize / 2, ry + radarSize / 2, radarSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.5)';
  ctx.stroke();

  // 下一帧请求 (兼容微信小游戏 requestAnimationFrame)
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(loop);
  }
}

loop();
