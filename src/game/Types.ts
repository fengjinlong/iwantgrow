/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EntityType = 'player' | 'monster';

export type AIState = 'idle' | 'pursuit' | 'flee' | 'return';

export type ResourceType = 'dew' | 'berry' | 'clover' | 'spore';

export interface Vector2D {
  x: number;
  y: number;
}

export interface ILevelData {
  level: number;
  name: string;
  species: string;
  description: string;
  maxHp: number;
  atk: number;
  moveSpeed: number;
  expThreshold: number; // Exp required to level up to next
  bodyRadius: number;
  color: string;
  accentColor: string;
  eyeCount: number;
  feature: 'cilia' | 'spikes' | 'wings' | 'horns' | 'claws' | 'carapace' | 'crested';
}

export interface IEntity {
  id: string;
  type: EntityType;
  level: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxHp: number;
  currentHp: number;
  atk: number;
  moveSpeed: number;
  facingAngle: number;
  isDead: boolean;
  respawnTimer: number;
  spawnX: number;
  spawnY: number;

  // AI fields (for monsters)
  aiState: AIState;
  targetX?: number;
  targetY?: number;
  wanderTimer: number;

  // Combat fields
  nextAttackTime: number;
  inCombat: boolean;
  combatTargetId?: string;
  preCombatExpSnapshot?: number; // Snapshot of exp before current combat for player death rewind
  lastCombatTime: number;

  // Visual & form
  color: string;
  accentColor: string;
  name: string;
  hitFlashTimer: number;
  animPhase: number;
}

export interface IResource {
  id: string;
  type: ResourceType;
  name: string;
  x: number;
  y: number;
  radius: number;
  expValue: number;
  isCollected: boolean;
  respawnTimer: number;
  bobOffset: number;
  color: string;
}

export interface IGrassPatch {
  id: string;
  x: number;
  y: number;
  radius: number;
  bladeCount: number;
  seed: number;
}

export interface IFloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  scale: number;
  alpha: number;
  duration: number;
  elapsed: number;
  vy: number;
  isCritical?: boolean;
}

export interface IParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface IThreatIndicator {
  angle: number;
  distance: number;
  level: number;
  isThreat: boolean; // true = dangerous high level, false = huntable low level
  monsterId: string;
  x: number;
  y: number;
}

export type TimeOfDayPhase = 'dawn' | 'noon' | 'afternoon' | 'dusk' | 'night';

export interface ILightingState {
  timeProgress: number; // 0.0 - 1.0 (0=清晨, 0.25=正午, 0.5=午后, 0.75=黄昏, 1.0=回归)
  phase: TimeOfDayPhase;
  phaseName: string;
  ambientColor: string;
  filterOverlayColor: string;
  colorTemperatureK: number; // 色温如 3200K (暖黄) 到 6500K (正午冷白) 到 2500K (暮色金红)
  shadowOffset: Vector2D;
  sunIntensity: number;
}
