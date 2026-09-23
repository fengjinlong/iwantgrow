/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameConfig } from '../game/GameConfig';
import { GameEngine } from '../game/GameEngine';

interface MiniMapProps {
  engine: GameEngine | null;
}

export const MiniMap: React.FC<MiniMapProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!engine) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mapSize = 100; // 紧凑型尺寸，适配移动端屏幕
    canvas.width = mapSize;
    canvas.height = mapSize;

    const renderRadar = () => {
      const w = GameConfig.map.width;
      const h = GameConfig.map.height;
      const scale = mapSize / w;

      ctx.clearRect(0, 0, mapSize, mapSize);

      // 背景与暗绿雷达感
      ctx.fillStyle = 'rgba(10, 28, 16, 0.85)';
      ctx.beginPath();
      ctx.arc(mapSize / 2, mapSize / 2, mapSize / 2 - 2, 0, Math.PI * 2);
      ctx.fill();

      // 外环边框
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.save();
      // 将原点移至雷达中心
      ctx.translate(mapSize / 2, mapSize / 2);

      // 1. 安全区
      const safeR = GameConfig.map.safeZoneRadius * scale;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, safeR, 0, Math.PI * 2);
      ctx.fill();

      // 2. 草丛区
      ctx.fillStyle = 'rgba(21, 128, 61, 0.35)';
      for (const grass of engine.mapSystem.grassPatches) {
        ctx.beginPath();
        ctx.arc(grass.x * scale, grass.y * scale, grass.radius * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. 资源点
      ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
      for (const res of engine.mapSystem.resources) {
        if (res.isCollected) continue;
        ctx.fillRect(res.x * scale - 1, res.y * scale - 1, 2, 2);
      }

      // 4. 生物点 (按威胁度着色)
      const pLevel = engine.player.level;
      for (const m of engine.mapSystem.monsters) {
        if (m.isDead) continue;
        if (m.level > pLevel) {
          ctx.fillStyle = '#ef4444'; // 高级危险红点
        } else if (m.level === pLevel) {
          ctx.fillStyle = '#facc15'; // 同级黄点
        } else {
          ctx.fillStyle = '#22c55e'; // 可猎杀绿点
        }
        ctx.beginPath();
        ctx.arc(m.x * scale, m.y * scale, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. 玩家点与朝向
      const px = engine.player.x * scale;
      const py = engine.player.y * scale;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 玩家视线方向小三角
      const ang = engine.player.facingAngle;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(ang) * 6, py + Math.sin(ang) * 6);
      ctx.lineTo(px + Math.cos(ang + 2.5) * 4, py + Math.sin(ang + 2.5) * 4);
      ctx.lineTo(px + Math.cos(ang - 2.5) * 4, py + Math.sin(ang - 2.5) * 4);
      ctx.fill();

      ctx.restore();

      animId = requestAnimationFrame(renderRadar);
    };

    animId = requestAnimationFrame(renderRadar);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  return (
    <div className="absolute top-12 sm:top-14 right-2 sm:right-4 z-20 pointer-events-none flex flex-col items-center">
      <div className="relative rounded-full shadow-lg border border-emerald-500/30 overflow-hidden bg-slate-950/50 backdrop-blur-xs">
        <canvas ref={canvasRef} className="block" />
        <div className="absolute inset-0 rounded-full border border-emerald-400/20 pointer-events-none" />
        {engine && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-slate-950/80 border border-amber-500/30 text-[8px] text-amber-300 font-medium whitespace-nowrap">
            {engine.lightingSystem.getCurrentLightingState().phaseName}
          </div>
        )}
      </div>
      <div className="hidden xs:flex items-center gap-1.5 mt-1 text-[9px] text-emerald-300/80 font-mono tracking-tight bg-slate-900/80 px-1.5 py-0.5 rounded border border-emerald-900/40">
        <span className="flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> 强敌
        </span>
        <span className="text-slate-600">·</span>
        <span className="flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" /> 同级
        </span>
        <span className="text-slate-600">·</span>
        <span className="flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> 猎物
        </span>
      </div>
    </div>
  );
};
