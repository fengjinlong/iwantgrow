/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { GameConfig, getLevelData } from '../game/GameConfig';
import { GameEngine } from '../game/GameEngine';
import { Zap, Shield, Eye, Flame } from 'lucide-react';

interface CombatHudProps {
  engine: GameEngine | null;
  onTriggerFlash: () => void;
}

export const CombatHud: React.FC<CombatHudProps> = ({ engine, onTriggerFlash }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!engine) return;
    const interval = setInterval(() => {
      setTick((t) => (t + 1) % 1000);
    }, 50); // 20 FPS HUD update for smooth bars and timers
    return () => clearInterval(interval);
  }, [engine]);

  if (!engine) return null;

  const player = engine.player;
  const levelData = getLevelData(player.level);
  const hpPercent = Math.max(0, Math.min(100, (player.currentHp / player.maxHp) * 100));

  const currentThreshold = GameConfig.levels.expThreshold[player.level - 1] || 9999;
  const expPercent =
    player.level >= GameConfig.levels.maxLevel
      ? 100
      : Math.max(0, Math.min(100, (engine.playerExp / currentThreshold) * 100));

  const flashCd = engine.flashCooldownTimer;
  const isFlashReady = flashCd <= 0;
  const flashProgress = isFlashReady
    ? 0
    : (flashCd / GameConfig.input.flashCooldownSeconds) * 100;

  return (
    <>
      {/* 顶部中央：当前遭遇与潜行状态浮动提示 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
        {player.inCombat && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-950/85 border border-red-500/50 text-red-200 text-xs font-medium shadow-lg backdrop-blur-xs animate-pulse">
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>战斗状态 · 1秒单次节拍换血</span>
          </div>
        )}

        {engine.isPlayerInGrass && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-950/85 border border-emerald-500/40 text-emerald-200 text-xs font-medium shadow-lg backdrop-blur-xs">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>草丛隐匿 · 怪物感知半径收缩至 1米</span>
          </div>
        )}
      </div>

      {/* 底部常驻 HUD：生命值、EVO进化进度与闪现技能按钮 (响应式紧凑设计，针对手机H5优化) */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-2.5 sm:p-4 pointer-events-none flex items-end justify-between gap-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
        {/* 左侧及中央：生物阶梯卡片与生命/EVO双槽 */}
        <div className="flex-1 max-w-sm sm:max-w-md bg-slate-950/85 backdrop-blur-md p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-emerald-900/40 shadow-2xl pointer-events-auto">
          {/* 生物头衔与物种信息 */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-extrabold text-slate-950"
                style={{ backgroundColor: player.color }}
              >
                Lv.{player.level}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-100 tracking-wide">
                {levelData.name}
              </span>
              <span className="text-[10px] sm:text-xs text-emerald-400/80 font-medium hidden xs:inline">
                {levelData.species}
              </span>
            </div>

            <div className="text-[10px] sm:text-xs text-slate-400 font-mono tabular-nums">
              攻: <span className="text-amber-400 font-bold">{player.atk}</span>
              <span className="mx-1 text-slate-600">·</span>
              速: <span className="text-sky-400">{player.moveSpeed}</span>
            </div>
          </div>

          {/* 生命值 (HP) 进度条 */}
          <div className="mb-1.5">
            <div className="flex items-center justify-between text-[10px] mb-0.5 font-mono">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-red-400" /> HP
              </span>
              <span className="text-slate-300 tabular-nums">
                {Math.round(player.currentHp)} / {player.maxHp}
              </span>
            </div>
            <div className="w-full h-1.5 sm:h-2 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="h-full rounded-full transition-all duration-150 ease-out"
                style={{
                  width: `${hpPercent}%`,
                  backgroundColor: hpPercent > 30 ? '#22c55e' : '#ef4444',
                }}
              />
            </div>
          </div>

          {/* EVO 经验进度条 */}
          <div>
            <div className="flex items-center justify-between text-[10px] mb-0.5 font-mono">
              <span className="text-sky-300 font-medium flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-sky-400" /> EVO
              </span>
              <span className="text-sky-300 tabular-nums">
                {player.level >= GameConfig.levels.maxLevel
                  ? '已达草地顶峰'
                  : `${engine.playerExp} / ${currentThreshold} (${Math.round(expPercent)}%)`}
              </span>
            </div>
            <div className="w-full h-1.5 sm:h-2 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all duration-150 ease-out"
                style={{ width: `${expPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 右侧：更紧凑小巧的闪现逃脱按钮 (从w-18缩小至w-12 sm:w-14) */}
        <div className="pointer-events-auto shrink-0 flex flex-col items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTriggerFlash();
            }}
            disabled={!isFlashReady}
            className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-transform active:scale-90 shadow-xl border ${
              isFlashReady
                ? 'bg-gradient-to-b from-purple-600 to-indigo-700 border-purple-400/60 text-white cursor-pointer hover:brightness-110'
                : 'bg-slate-900/90 border-slate-700 text-slate-500 cursor-not-allowed'
            }`}
            title="闪现：随机方向瞬间位移逃脱，3秒CD"
          >
            {/* 冷却遮罩 */}
            {!isFlashReady && (
              <div
                className="absolute inset-0 bg-slate-950/85 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-xs"
                style={{
                  clipPath: `inset(0 0 ${100 - flashProgress}% 0)`,
                }}
              />
            )}

            <Zap
              className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${
                isFlashReady ? 'text-amber-300 scale-105' : 'text-slate-500'
              }`}
            />
            <span className="text-[9px] sm:text-[10px] font-bold mt-0.5 tracking-tight">
              {isFlashReady ? '闪现' : `${flashCd.toFixed(1)}s`}
            </span>
          </button>
          <span className="text-[8px] sm:text-[9px] text-purple-300/70 mt-0.5 font-mono">3s逃脱</span>
        </div>
      </div>
    </>
  );
};
