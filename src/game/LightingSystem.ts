/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameConfig } from './GameConfig';
import { ILightingState, TimeOfDayPhase, Vector2D } from './Types';

interface IColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface ILightingKeyframe {
  progress: number; // 0.0 - 1.0
  phase: TimeOfDayPhase;
  phaseName: string;
  colorTemperatureK: number; // 视觉色温值 (K)
  overlayColor: IColorRGBA; // 全局色调滤镜
  skyAmbientColor: string; // 环境漫射底色
  sunIntensity: number; // 阳光强度
  shadowLength: number; // 投影长度
  shadowAngle: number; // 太阳方位角 (rad)
}

// 清晨 -> 正午 -> 午后 -> 黄昏 -> 幽夜 昼夜自然光照演色表
const KEYFRAMES: ILightingKeyframe[] = [
  // 0.00: 拂晓清晨 (Dawn) - 露水微凉，金色初阳，柔和冷绿与浅金，色温约 3600K
  {
    progress: 0.00,
    phase: 'dawn',
    phaseName: '清晨拂晓',
    colorTemperatureK: 3600,
    overlayColor: { r: 253, g: 224, b: 71, a: 0.08 }, // 柔金微光
    skyAmbientColor: '#122c1b',
    sunIntensity: 0.75,
    shadowLength: 14,
    shadowAngle: Math.PI * 0.25,
  },
  // 0.25: 正午艳阳 (Noon) - 阳光直射，树影微短，高反差中性白光，色温约 6200K
  {
    progress: 0.25,
    phase: 'noon',
    phaseName: '正午骄阳',
    colorTemperatureK: 6200,
    overlayColor: { r: 240, g: 253, b: 250, a: 0.04 }, // 清透高亮
    skyAmbientColor: '#174026',
    sunIntensity: 1.0,
    shadowLength: 5,
    shadowAngle: Math.PI * 0.5,
  },
  // 0.50: 盛夏午后 (Afternoon) - 暖绿丰茂，微风草波，温和舒适，色温约 4800K
  {
    progress: 0.50,
    phase: 'afternoon',
    phaseName: '温润午后',
    colorTemperatureK: 4800,
    overlayColor: { r: 251, g: 191, b: 36, a: 0.07 }, // 暖琥珀
    skyAmbientColor: '#143820',
    sunIntensity: 0.9,
    shadowLength: 11,
    shadowAngle: Math.PI * 0.8,
  },
  // 0.75: 晚霞黄昏 (Dusk) - 晚霞满天，暮色流金染红草尖，长影西斜，色温约 2700K
  {
    progress: 0.75,
    phase: 'dusk',
    phaseName: '黄昏霞光',
    colorTemperatureK: 2700,
    overlayColor: { r: 249, g: 115, b: 22, a: 0.18 }, // 浓郁暮色金橙
    skyAmbientColor: '#2b1b17',
    sunIntensity: 0.65,
    shadowLength: 22,
    shadowAngle: Math.PI * 1.2,
  },
  // 0.90: 幽蓝月夜 (Night) - 草丛微光荧荧，暗夜微凉，幽蓝静谧，色温约 8500K
  {
    progress: 0.90,
    phase: 'night',
    phaseName: '荧光幽夜',
    colorTemperatureK: 8500,
    overlayColor: { r: 30, g: 58, b: 138, a: 0.24 }, // 幽夜深蓝滤镜
    skyAmbientColor: '#0a1410',
    sunIntensity: 0.35,
    shadowLength: 8,
    shadowAngle: Math.PI * 1.7,
  },
  // 1.00: 循环回归清晨
  {
    progress: 1.00,
    phase: 'dawn',
    phaseName: '清晨拂晓',
    colorTemperatureK: 3600,
    overlayColor: { r: 253, g: 224, b: 71, a: 0.08 },
    skyAmbientColor: '#122c1b',
    sunIntensity: 0.75,
    shadowLength: 14,
    shadowAngle: Math.PI * 0.25,
  },
];

export class LightingSystem {
  // 当前周期进度 0.0 - 1.0
  public timeProgress: number = 0.0;
  // 是否暂停自然昼夜流动 (用于用户手动滑块快速预览)
  public isPaused: boolean = false;

  constructor() {
    this.timeProgress = 0.08; // 默认清晨初始
  }

  /**
   * 推进自然光照昼夜循环
   */
  public update(dt: number): void {
    if (!GameConfig.lighting.enabled || this.isPaused) return;

    const cycleDuration = Math.max(10.0, GameConfig.lighting.dayCycleDurationSeconds);
    this.timeProgress = (this.timeProgress + dt / cycleDuration) % 1.0;
  }

  /**
   * 手动设置时间进度 (0.0 - 1.0)
   */
  public setProgress(progress: number): void {
    this.timeProgress = Math.max(0, Math.min(1.0, progress % 1.0));
  }

  /**
   * 获取当前光照插值计算结果
   */
  public getCurrentLightingState(): ILightingState {
    const p = (this.timeProgress % 1.0 + 1.0) % 1.0;

    // 寻找区间帧
    let k1 = KEYFRAMES[0];
    let k2 = KEYFRAMES[1];

    for (let i = 0; i < KEYFRAMES.length - 1; i++) {
      if (p >= KEYFRAMES[i].progress && p <= KEYFRAMES[i + 1].progress) {
        k1 = KEYFRAMES[i];
        k2 = KEYFRAMES[i + 1];
        break;
      }
    }

    const span = k2.progress - k1.progress;
    const t = span > 0 ? (p - k1.progress) / span : 0;
    // 使用平滑缓动插值
    const easeT = t * t * (3 - 2 * t);

    // 插值颜色
    const r = Math.round(k1.overlayColor.r + (k2.overlayColor.r - k1.overlayColor.r) * easeT);
    const g = Math.round(k1.overlayColor.g + (k2.overlayColor.g - k1.overlayColor.g) * easeT);
    const b = Math.round(k1.overlayColor.b + (k2.overlayColor.b - k1.overlayColor.b) * easeT);
    const a = k1.overlayColor.a + (k2.overlayColor.a - k1.overlayColor.a) * easeT;

    const colorTemp = Math.round(
      k1.colorTemperatureK + (k2.colorTemperatureK - k1.colorTemperatureK) * easeT,
    );
    const sunIntensity = k1.sunIntensity + (k2.sunIntensity - k1.sunIntensity) * easeT;

    const shadowLen = k1.shadowLength + (k2.shadowLength - k1.shadowLength) * easeT;
    const shadowAng = k1.shadowAngle + (k2.shadowAngle - k1.shadowAngle) * easeT;

    const shadowOffset: Vector2D = {
      x: Math.cos(shadowAng) * shadowLen,
      y: Math.sin(shadowAng) * shadowLen,
    };

    return {
      timeProgress: p,
      phase: t < 0.5 ? k1.phase : k2.phase,
      phaseName: t < 0.5 ? k1.phaseName : k2.phaseName,
      ambientColor: k1.skyAmbientColor,
      filterOverlayColor: `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`,
      colorTemperatureK: colorTemp,
      shadowOffset,
      sunIntensity,
    };
  }

  /**
   * 渲染全屏光照滤镜与色温环境
   */
  public renderLightingOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    playerScreenX: number,
    playerScreenY: number,
  ): void {
    if (!GameConfig.lighting.enabled) return;

    const state = this.getCurrentLightingState();

    ctx.save();

    // 1. 全局色温色相混合层 (从清晨金浅到黄昏暮橙再到幽夜深蓝)
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = state.filterOverlayColor;
    ctx.fillRect(0, 0, width, height);

    // 2. 暖阳高光与暗角光晕叠加 (Soft-light / Screen)
    ctx.globalCompositeOperation = 'soft-light';
    const maxRadius = Math.max(width, height) * 0.85;
    const vignetteGrad = ctx.createRadialGradient(
      playerScreenX,
      playerScreenY,
      80,
      playerScreenX,
      playerScreenY,
      maxRadius,
    );

    const vignetteAlpha = GameConfig.lighting.vignetteIntensity;
    vignetteGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    vignetteGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    vignetteGrad.addColorStop(1, `rgba(0, 0, 0, ${vignetteAlpha})`);

    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }
}
