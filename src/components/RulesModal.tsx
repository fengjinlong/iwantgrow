/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameConfig } from '../game/GameConfig';
import { X, BookOpen, ShieldAlert, Zap, Compass, TreePine, Sparkles } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-emerald-800/50 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-slate-100">《吞噬进化》草地阶段 玩法手册</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* 核心闭环 */}
          <div>
            <h3 className="text-emerald-300 font-bold text-sm mb-2 flex items-center gap-1.5">
              <Compass className="w-4 h-4" /> 核心闭环与操作
            </h3>
            <p className="text-xs leading-relaxed text-slate-300">
              探索微观草地 → 吞食露珠/浆果/幼虫 → 积累进化点 (EVO) → 经验池满自动升级并回满血 →
              称霸当前生态位。
            </p>
            <div className="mt-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <div>
                <b className="text-slate-200">触屏滑动：</b>手指或鼠标按住屏幕任意位置拖动，角色朝拖动方向移动；松手立即停止（无虚拟摇杆UI干扰）。
              </div>
              <div>
                <b className="text-purple-300">闪现技能：</b>独立逃脱按钮，向
                <b className="text-purple-300">随机方向</b>瞬间折跃，3秒冷却，用于逃出捕食者攻击圆环。
              </div>
            </div>
          </div>

          {/* 战斗与等级压制机制 */}
          <div>
            <h3 className="text-amber-400 font-bold text-sm mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> 战斗判定与秒杀法则
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl">
                <div className="font-bold text-emerald-300 mb-1">高打低 (秒杀法则)</div>
                <div className="text-slate-400 leading-relaxed">
                  若玩家攻击力 ≥ 怪物当前血量，单次攻击直接秒杀该怪物，无伤吸收全部经验。
                </div>
              </div>
              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl">
                <div className="font-bold text-amber-300 mb-1">同级对抗 (1.5倍经验)</div>
                <div className="text-slate-400 leading-relaxed">
                  每秒固定节拍相互换血，怪物伤害有 ±10% 随机浮动。胜利享 1.5倍 经验补偿加成。
                </div>
              </div>
              <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl">
                <div className="font-bold text-red-300 mb-1">低打高 (锁定追击)</div>
                <div className="text-slate-400 leading-relaxed">
                  高级怪进入范围会主动追杀低级玩家。被击败不掉级，经验回溯至战斗前，回满血重返出发点。
                </div>
              </div>
            </div>
          </div>

          {/* 草丛隐匿机制 */}
          <div>
            <h3 className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-1.5">
              <TreePine className="w-4 h-4" /> 草丛功能性隐匿
            </h3>
            <p className="text-xs leading-relaxed text-slate-400">
              草丛为功能性遮挡：玩家进入深草丛后，掠食者对玩家的检测追踪半径由正常 230像素 急剧缩小至 55像素（约1米内方能察觉），可用于隐匿行踪或规避凶悍掠食者追杀。
            </p>
          </div>

          {/* 全局昼夜与环境色温滤镜 */}
          <div>
            <h3 className="text-amber-400 font-bold text-sm mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> 昼夜色调循环与动态色温
            </h3>
            <p className="text-xs leading-relaxed text-slate-400">
              沉浸式微观草地全局光照系统：支持【清晨拂晓（3600K浅金）→ 正午骄阳（6200K透亮冷白）→ 温润午后（4800K琥珀）→ 黄昏霞光（2700K落日金红）→ 荧光幽夜（8500K幽蓝静谧）】自然平滑过渡。生物地面投影角度与长度随太阳方位角实时动态拉伸。可随时在顶部导航栏打开【昼夜光照预览】手动拖动时间轴或暂停观察。
            </p>
          </div>

          {/* Lv1-10 生态阶梯 */}
          <div>
            <h3 className="text-sky-400 font-bold text-sm mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Lv1 - 10 草地生态阶梯
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {GameConfig.levels.speciesList.map((item, idx) => (
                <div
                  key={item.level}
                  className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] text-slate-950 shrink-0"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.level}
                    </span>
                    <div>
                      <div className="font-bold text-slate-200">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{item.species}</div>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 text-right">
                    <div>生命: {GameConfig.levels.hpGrowth[idx]}</div>
                    <div>攻击: {GameConfig.levels.atkGrowth[idx]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors"
          >
            知晓，开始进化
          </button>
        </div>
      </div>
    </div>
  );
};
