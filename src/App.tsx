/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { audioManager } from './game/AudioManager';
import { eventBus, GameEvents } from './game/EventBus';
import { MiniMap } from './components/MiniMap';
import { CombatHud } from './components/CombatHud';
import { TopBar } from './components/TopBar';
import { ConfigInspector } from './components/ConfigInspector';
import { RulesModal } from './components/RulesModal';
import { EvolutionModal } from './components/EvolutionModal';
import { LightingPreview } from './components/LightingPreview';
import { Compass, RotateCcw } from 'lucide-react';

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // UI 模态与交互状态
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isLightingPreviewOpen, setIsLightingPreviewOpen] = useState(false);
  const [evolutionLevel, setEvolutionLevel] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(audioManager.getMuted());
  const [isMobileFrame, setIsMobileFrame] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [deathNotice, setDeathNotice] = useState<string | null>(null);
  const [, setEngineReady] = useState(false);

  // 初始化游戏引擎
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    setEngineReady(true);

    const updateSize = () => {
      if (!container || !engine) return;
      const rect = container.getBoundingClientRect();
      engine.resize(rect.width, rect.height);
    };

    updateSize();
    engine.start();

    window.addEventListener('resize', updateSize);

    // 订阅事件总线
    const unsubLevelUp = eventBus.on(GameEvents.PLAYER_LEVEL_UP, (data: any) => {
      setEvolutionLevel(data.level);
    });

    const unsubDied = eventBus.on(GameEvents.PLAYER_DIED, () => {
      setDeathNotice('生命耗尽！根据法则保留当前等级与战前经验，已安全传送回出发点。');
      setTimeout(() => {
        setDeathNotice(null);
      }, 4000);
    });

    return () => {
      window.removeEventListener('resize', updateSize);
      unsubLevelUp();
      unsubDied();
      engine.stop();
    };
  }, [isMobileFrame]);

  // 处理拖动转向与移动 (按住滑动控制方向，手指离开立即停止，无虚拟摇杆)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!engineRef.current) return;
    setHasInteracted(true);
    // 激活浏览器音频上下文
    audioManager.playAmbient();
    const rect = e.currentTarget.getBoundingClientRect();
    engineRef.current.onPointerDown(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!engineRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    engineRef.current.onPointerMove(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handlePointerUp = () => {
    if (!engineRef.current) return;
    engineRef.current.onPointerUp();
  };

  const handleTriggerFlash = () => {
    engineRef.current?.triggerFlash();
  };

  const handleToggleMute = () => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative w-screen h-screen h-[100dvh] bg-slate-950 flex items-center justify-center overflow-hidden select-none font-sans touch-none">
      {/* 微信小游戏真机竖屏框模拟 或 全屏视口模式 */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-slate-950 transition-all duration-300 ${
          isMobileFrame
            ? 'w-full max-w-[430px] h-[92vh] max-h-[900px] rounded-[42px] border-[9px] border-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.85)] ring-1 ring-white/10'
            : 'w-full h-full h-[100dvh]'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* 顶部三区式标准导航条 */}
        <TopBar
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenConfig={() => setIsConfigOpen(true)}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenLightingPreview={() => setIsLightingPreviewOpen(true)}
          isMobileFrame={isMobileFrame}
          onToggleMobileFrame={() => setIsMobileFrame(!isMobileFrame)}
        />

        {/* 游戏主 Canvas 视口 */}
        <canvas ref={canvasRef} className="absolute inset-0 block cursor-crosshair" />

        {/* 小地图雷达 */}
        <MiniMap engine={engineRef.current} />

        {/* 底部战斗 HUD 与闪现技能 */}
        <CombatHud engine={engineRef.current} onTriggerFlash={handleTriggerFlash} />

        {/* 玩家初次上手操作指引遮罩 (交互后自动淡出) */}
        {!hasInteracted && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-black/35 backdrop-blur-[2px] transition-opacity">
            <div className="p-5 max-w-xs bg-slate-950/85 border border-emerald-500/40 rounded-2xl text-center text-slate-200 shadow-2xl animate-pulse">
              <Compass className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              <div className="text-sm font-bold text-white mb-1">触屏拖动转向</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                按住屏幕任意位置拖动滑动转向，松手角色立即停止。探索微观草地，吞食低级生物与资源！
              </p>
              <div className="mt-3 text-[11px] text-purple-300 font-mono">
                右下角「闪现」可随机逃脱追杀
              </div>
            </div>
          </div>
        )}

        {/* 死亡复活找回经验提示通知 */}
        {deathNotice && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none max-w-sm px-4 py-2.5 rounded-xl bg-red-950/90 border border-red-500/60 shadow-2xl text-red-200 text-xs text-center backdrop-blur-xs animate-in fade-in slide-in-from-top-3 duration-200">
            {deathNotice}
          </div>
        )}

        {/* 快捷重置按钮 (备用悬浮) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('确定要重置当前草地进化进度吗？（将回到Lv1绿芽幼虫）')) {
              engineRef.current?.resetGame();
            }
          }}
          className="absolute bottom-24 right-4 z-20 w-8 h-8 rounded-full bg-slate-900/70 border border-slate-700/60 text-slate-400 hover:text-white flex items-center justify-center backdrop-blur-xs cursor-pointer"
          title="重置当前进度"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 数值配置调试面板 (GameConfig Drawer) */}
      <ConfigInspector
        engine={engineRef.current}
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />

      {/* 玩法规则与生态手册模态框 */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* 昼夜光照与色温滤镜预览面板 */}
      <LightingPreview
        engine={engineRef.current}
        isOpen={isLightingPreviewOpen}
        onClose={() => setIsLightingPreviewOpen(false)}
      />

      {/* 升级进阶形态庆祝框 */}
      {evolutionLevel && (
        <EvolutionModal
          level={evolutionLevel}
          onClose={() => setEvolutionLevel(null)}
        />
      )}
    </div>
  );
}
