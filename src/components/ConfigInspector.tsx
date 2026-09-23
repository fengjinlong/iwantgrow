/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameConfig } from '../game/GameConfig';
import { GameEngine } from '../game/GameEngine';
import { eventBus, GameEvents } from '../game/EventBus';
import { Sliders, X, RotateCcw } from 'lucide-react';

interface ConfigInspectorProps {
  engine: GameEngine | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigInspector: React.FC<ConfigInspectorProps> = ({ engine, isOpen, onClose }) => {
  const [, setRerender] = useState(0);

  if (!isOpen) return null;

  const triggerUpdate = () => {
    setRerender((r) => r + 1);
    eventBus.emit(GameEvents.CONFIG_UPDATED);
  };

  const handleResetDefaults = () => {
    GameConfig.combat.attackIntervalSeconds = 1.0;
    GameConfig.combat.monsterAtkFluctuation = 0.10;
    GameConfig.exp.resourceExpValue = 10;
    GameConfig.exp.sameLevelKillMultiplier = 1.5;
    GameConfig.regen.globalMonsterRegenRate = 0.02;
    GameConfig.regen.respawnDelaySeconds = 300.0;
    GameConfig.input.flashCooldownSeconds = 3.0;
    GameConfig.input.flashDistance = 190.0;
    triggerUpdate();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 h-full border-l border-emerald-900/50 shadow-2xl p-6 overflow-y-auto text-slate-100 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-slate-100">数值配置面板 (GameConfig)</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-2 mb-4 leading-relaxed">
            设计文档第8.2节要求：所有玩法数值统一由此公共配置文件调度，实时调参即时生效。
          </p>

          {/* 快捷生物等级测试器 */}
          <div className="mb-6 p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
            <div className="text-xs font-semibold text-emerald-300 mb-2 flex items-center justify-between">
              <span>快速切换形态 (Lv1 - Lv10 测试)</span>
              <span className="text-[11px] text-slate-400">当前: Lv.{engine?.player.level}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    engine?.setPlayerLevel(lvl);
                    triggerUpdate();
                  }}
                  className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                    engine?.player.level === lvl
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Lv.{lvl}
                </button>
              ))}
            </div>
          </div>

          {/* 战斗节奏与体型参数 */}
          <div className="space-y-4 text-xs">
            {/* 全局生物体型缩放 */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-emerald-800/50">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-emerald-300">玩家与NPC体型缩放</span>
                <span className="font-mono text-emerald-400 tabular-nums">
                  {(GameConfig.levels.globalCreatureScale * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={GameConfig.levels.globalCreatureScale}
                onChange={(e) => {
                  GameConfig.levels.globalCreatureScale = parseFloat(e.target.value);
                  triggerUpdate();
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">
                可自由缩小体型，在大地图中体验更广阔微观行走感
              </span>
            </div>

            {/* 怪物原地驻守开关 */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-sky-800/50 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sky-300">怪物原地驻守 (不主动追逐)</div>
                <div className="text-[10px] text-slate-400">
                  开启后怪物在初始位置静止等待玩家探索，彻底避免出门被怪追击围殴
                </div>
              </div>
              <button
                onClick={() => {
                  GameConfig.npcAI.monstersStayStationary = !GameConfig.npcAI.monstersStayStationary;
                  triggerUpdate();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  GameConfig.npcAI.monstersStayStationary
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {GameConfig.npcAI.monstersStayStationary ? '已静止' : '游走中'}
              </button>
            </div>

            {/* 攻击圆环比例 */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-200">攻击与换血判定圈比例</span>
                <span className="font-mono text-amber-400 tabular-nums">
                  {(GameConfig.combat.collisionDistanceMultiplier * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="1.30"
                step="0.05"
                value={GameConfig.combat.collisionDistanceMultiplier}
                onChange={(e) => {
                  GameConfig.combat.collisionDistanceMultiplier = parseFloat(e.target.value);
                  triggerUpdate();
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                控制近身搏斗攻击光圈大小，圈越小贴身越紧凑
              </span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-200">固定攻击节拍 (秒)</span>
                <span className="font-mono text-emerald-400 tabular-nums">
                  {GameConfig.combat.attackIntervalSeconds.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={GameConfig.combat.attackIntervalSeconds}
                onChange={(e) => {
                  GameConfig.combat.attackIntervalSeconds = parseFloat(e.target.value);
                  triggerUpdate();
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                默认1.0s：双方在判定圆环内每隔该时间交换一次伤害
              </span>
            </div>

            {/* 怪物攻击力浮动 */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-200">怪物攻击随机浮动比例</span>
                <span className="font-mono text-amber-400 tabular-nums">
                  ±{(GameConfig.combat.monsterAtkFluctuation * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.30"
                step="0.02"
                value={GameConfig.combat.monsterAtkFluctuation}
                onChange={(e) => {
                  GameConfig.combat.monsterAtkFluctuation = parseFloat(e.target.value);
                  triggerUpdate();
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                默认±10%：同级换血时怪物的非对称博弈不确定性
              </span>
            </div>

            {/* 同级击杀加成系数 */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-200">同级击杀经验加成系数</span>
                <span className="font-mono text-sky-400 tabular-nums">
                  ×{GameConfig.exp.sameLevelKillMultiplier.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={GameConfig.exp.sameLevelKillMultiplier}
                onChange={(e) => {
                  GameConfig.exp.sameLevelKillMultiplier = parseFloat(e.target.value);
                  triggerUpdate();
                }}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                默认1.5倍：鼓励冒换血风险对抗同级目标，避免无脑割草
              </span>
            </div>

            {/* 闪现冷却时间 */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-200">闪现逃脱冷却时间 (秒)</span>
                <span className="font-mono text-purple-400 tabular-nums">
                  {GameConfig.input.flashCooldownSeconds.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.5"
                value={GameConfig.input.flashCooldownSeconds}
                onChange={(e) => {
                  GameConfig.input.flashCooldownSeconds = parseFloat(e.target.value);
                  triggerUpdate();
                }}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                默认3.0s：随机方向折跃脱战
              </span>
            </div>

            {/* 全图怪物自然回血速度 */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-200">全图怪物每秒自然回血率</span>
                <span className="font-mono text-emerald-400 tabular-nums">
                  {(GameConfig.regen.globalMonsterRegenRate * 100).toFixed(1)}%/s
                </span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.08"
                step="0.005"
                value={GameConfig.regen.globalMonsterRegenRate}
                onChange={(e) => {
                  GameConfig.regen.globalMonsterRegenRate = parseFloat(e.target.value);
                  triggerUpdate();
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                默认2%/s：生态平衡机制，怪物血量持续缓慢恢复
              </span>
            </div>

            {/* 昼夜循环速度 */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-200">全局光照昼夜循环时长</span>
                <span className="font-mono text-amber-400 tabular-nums">
                  {GameConfig.lighting.dayCycleDurationSeconds.toFixed(0)}s
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="300"
                step="5"
                value={GameConfig.lighting.dayCycleDurationSeconds}
                onChange={(e) => {
                  GameConfig.lighting.dayCycleDurationSeconds = parseFloat(e.target.value);
                  triggerUpdate();
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                清晨到黄昏完整光影色温演变循环周期
              </span>
            </div>
          </div>
        </div>

        {/* 底部重置与保存 */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            恢复默认配置
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors"
          >
            应用并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
