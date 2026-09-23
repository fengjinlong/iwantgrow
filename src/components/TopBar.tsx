/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, VolumeX, Sliders, BookOpen, Smartphone, Monitor, Sparkles } from 'lucide-react';

interface TopBarProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenConfig: () => void;
  onOpenRules: () => void;
  onOpenLightingPreview: () => void;
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isMuted,
  onToggleMute,
  onOpenConfig,
  onOpenRules,
  onOpenLightingPreview,
  isMobileFrame,
  onToggleMobileFrame,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-2.5 sm:px-4 py-2 sm:py-3 bg-slate-950/75 backdrop-blur-md border-b border-emerald-950/60 pointer-events-auto select-none pt-[max(0.5rem,env(safe-area-inset-top))]">
      {/* Zone 1: 单行品牌标识 */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
        <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-white font-display">
          吞噬进化
        </h1>
        <span className="text-[10px] text-emerald-400/70 font-mono hidden md:inline">
          草地篇
        </span>
      </div>

      {/* Zone 2: 导航与功能入口 */}
      <nav className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-xs font-medium text-slate-300">
        <button
          onClick={onOpenLightingPreview}
          className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-950/40 border border-amber-600/30 text-amber-300 hover:bg-amber-900/40 hover:text-white transition-colors cursor-pointer"
          title="预览清晨到黄昏光照与色温变化"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">昼夜光照</span>
        </button>

        <button
          onClick={onOpenRules}
          className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
          title="查看玩法规则与生态阶梯"
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">手册</span>
        </button>

        <button
          onClick={onOpenConfig}
          className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
          title="调整游戏参数与测试等级"
        >
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">调参</span>
        </button>
      </nav>

      {/* Zone 3: 视图框架切换与音效控制 */}
      <div className="flex items-center gap-2">
        {/* 微信小游戏真机模拟框切换 */}
        <button
          onClick={onToggleMobileFrame}
          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title={isMobileFrame ? '切换为桌面全屏视野' : '切换为微信小游戏竖屏框'}
        >
          {isMobileFrame ? (
            <Monitor className="w-4 h-4 text-sky-400" />
          ) : (
            <Smartphone className="w-4 h-4 text-emerald-400" />
          )}
        </button>

        {/* 音效静音切换 */}
        <button
          onClick={onToggleMute}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isMuted
              ? 'bg-slate-800 text-slate-500'
              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
          }`}
          title={isMuted ? '开启音效' : '静音'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
