/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import { GameConfig } from '../game/GameConfig';
import {
  Sun,
  Sunset,
  Sunrise,
  Moon,
  Play,
  Pause,
  Thermometer,
  Layers,
  Sparkles,
} from 'lucide-react';

interface LightingPreviewProps {
  engine: GameEngine | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LightingPreview: React.FC<LightingPreviewProps> = ({
  engine,
  isOpen,
  onClose,
}) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isOpen || !engine) return;
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 1000);
    }, 50); // 20 FPS 刷新光照色温与仪表盘
    return () => clearInterval(timer);
  }, [isOpen, engine]);

  if (!isOpen || !engine) return null;

  const lighting = engine.lightingSystem;
  const state = lighting.getCurrentLightingState();
  const progressPercent = Math.round(state.timeProgress * 100);

  // 快捷预设阶段跳转
  const handleJumpToPhase = (progress: number) => {
    lighting.setProgress(progress);
    setTick((t) => t + 1);
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'dawn':
        return <Sunrise className="w-4 h-4 text-amber-300" />;
      case 'noon':
        return <Sun className="w-4 h-4 text-yellow-400" />;
      case 'afternoon':
        return <Sun className="w-4 h-4 text-amber-400" />;
      case 'dusk':
        return <Sunset className="w-4 h-4 text-orange-400" />;
      case 'night':
      default:
        return <Moon className="w-4 h-4 text-indigo-300" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                全局光照与环境色温预览
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950/80 text-amber-300 border border-amber-700/50">
                  AI Studio Live
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-xs"
          >
            关闭
          </button>
        </div>

        {/* 主体交互区域 */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* 当前色温与氛围仪表盘 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner transition-colors duration-300"
                style={{
                  backgroundColor:
                    state.phase === 'night'
                      ? 'rgba(30, 58, 138, 0.4)'
                      : state.phase === 'dusk'
                      ? 'rgba(234, 88, 12, 0.35)'
                      : 'rgba(234, 179, 8, 0.25)',
                }}
              >
                {getPhaseIcon(state.phase)}
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">当前时段与色温</div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <span>{state.phaseName}</span>
                  <span className="text-xs font-mono text-amber-400 flex items-center gap-1 font-semibold">
                    <Thermometer className="w-3 h-3" />
                    {state.colorTemperatureK}K
                  </span>
                </div>
              </div>
            </div>

            {/* 暂停/播放循环 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  lighting.isPaused = !lighting.isPaused;
                  setTick((t) => t + 1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                  lighting.isPaused
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                {lighting.isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5" /> 恢复自然流动
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" /> 暂停时间流动
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 交互时间轴：清晨至黄昏快速预览滑动条 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">
                拖动时间轴预览 (当前: {progressPercent}%)
              </span>
              <span className="font-mono text-slate-400 text-[11px]">
                全天耗时: {GameConfig.lighting.dayCycleDurationSeconds}秒
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={state.timeProgress}
              onChange={(e) => {
                lighting.setProgress(parseFloat(e.target.value));
                setTick((t) => t + 1);
              }}
              className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />

            {/* 时段刻度节点 */}
            <div className="grid grid-cols-5 gap-1 pt-1 text-[11px] font-medium text-center">
              <button
                onClick={() => handleJumpToPhase(0.0)}
                className="py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-200 border border-slate-800 cursor-pointer"
              >
                01 清晨
              </button>
              <button
                onClick={() => handleJumpToPhase(0.25)}
                className="py-1 rounded bg-slate-900 hover:bg-slate-800 text-yellow-300 border border-slate-800 cursor-pointer"
              >
                02 正午
              </button>
              <button
                onClick={() => handleJumpToPhase(0.5)}
                className="py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 cursor-pointer"
              >
                03 午后
              </button>
              <button
                onClick={() => handleJumpToPhase(0.75)}
                className="py-1 rounded bg-slate-900 hover:bg-slate-800 text-orange-400 border border-slate-800 cursor-pointer"
              >
                04 黄昏
              </button>
              <button
                onClick={() => handleJumpToPhase(0.9)}
                className="py-1 rounded bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-800 cursor-pointer"
              >
                05 幽夜
              </button>
            </div>
          </div>

          {/* 光照系统微调参数 */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>光照与环境氛围调参</span>
            </div>

            {/* 昼夜流转循环时长 */}
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">昼夜全周期耗时 (秒)</span>
                <span className="font-mono text-amber-400">
                  {GameConfig.lighting.dayCycleDurationSeconds}s
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="300"
                step="10"
                value={GameConfig.lighting.dayCycleDurationSeconds}
                onChange={(e) => {
                  GameConfig.lighting.dayCycleDurationSeconds = parseFloat(e.target.value);
                  setTick((t) => t + 1);
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                可调范围 20s~300s，调快可直观欣赏日出日落色彩更迭
              </span>
            </div>

            {/* 边缘暗角强度 */}
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">微观草地视口暗角强度 (Vignette)</span>
                <span className="font-mono text-emerald-400">
                  {Math.round(GameConfig.lighting.vignetteIntensity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.6"
                step="0.05"
                value={GameConfig.lighting.vignetteIntensity}
                onChange={(e) => {
                  GameConfig.lighting.vignetteIntensity = parseFloat(e.target.value);
                  setTick((t) => t + 1);
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-between items-center">
          <div className="text-[11px] text-slate-400">
            随时可在顶部导航栏切换不同预览场景
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
          >
            完成预览
          </button>
        </div>
      </div>
    </div>
  );
};
