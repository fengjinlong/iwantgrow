/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type EventHandler<T = any> = (data: T) => void;

class EventBus {
  private events: Map<string, Set<EventHandler>> = new Map();

  on<T = any>(event: string, handler: EventHandler<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off<T = any>(event: string, handler: EventHandler<T>): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit<T = any>(event: string, data?: T): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (e) {
          console.error(`[EventBus] Error in handler for event "${event}":`, e);
        }
      });
    }
  }

  clear(): void {
    this.events.clear();
  }
}

export const eventBus = new EventBus();

// 事件名称常量定义
export const GameEvents = {
  ENTITY_DIE: 'OnEntityDie',
  DAMAGE_EXCHANGE: 'OnDamageExchange',
  PLAYER_LEVEL_UP: 'OnPlayerLevelUp',
  PLAYER_DIED: 'OnPlayerDied',
  PLAYER_RESPAWN: 'OnPlayerRespawn',
  FLASH_USED: 'OnFlashUsed',
  COMBAT_ENTER: 'OnCombatEnter',
  COMBAT_EXIT: 'OnCombatExit',
  RESOURCE_SWALLOWED: 'OnResourceSwallowed',
  GRASS_STATE_CHANGE: 'OnGrassStateChange',
  LIGHTING_CHANGED: 'OnLightingChanged',
  CONFIG_UPDATED: 'OnConfigUpdated',
} as const;
