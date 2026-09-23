/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { getLevelData } from '../game/GameConfig';
import { Sparkles, ArrowUpRight } from 'lucide-react';

interface EvolutionModalProps {
  level: number;
  onClose: () => void;
}

export const EvolutionModal: React.FC<EvolutionModalProps> = ({ level, onClose }) => {
  if (level <= 1) return null;
  const data = getLevelData(level);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-emerald-500/50 rounded-2xl shadow-2xl p-6 text-center text-slate-100 flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-3 text-emerald-400 shadow-inner">
          <Sparkles className="w-7 h-7 animate-spin-slow" />
        </div>

        <div className="inline-block px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-1">
          生物形态进化 · EVOLUTION
        </div>

        <h2 className="text-2xl font-extrabold text-white mt-1 mb-0.5 tracking-wide">
          Lv.{data.level} {data.name}
        </h2>
        <div className="text-xs text-emerald-400/90 font-medium mb-3">
          {data.species}
        </div>

        <p className="text-xs text-slate-300/90 leading-relaxed mb-5 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          {data.description}
        </p>

        {/* 属性跃升 */}
        <div className="grid grid-cols-2 gap-3 w-full mb-5">
          <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-400">生命上限 HP</div>
            <div className="text-base font-extrabold text-emerald-400 font-mono flex items-center justify-center gap-1">
              {data.maxHp} <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>
          <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-400">攻击力 ATK</div>
            <div className="text-base font-extrabold text-amber-400 font-mono flex items-center justify-center gap-1">
              {data.atk} <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-sm hover:brightness-110 active:scale-98 transition-all shadow-lg cursor-pointer"
        >
          吸收生命原质，继续征战
        </button>
      </div>
    </div>
  );
};
