/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IPlayerSaveData {
  level: number;
  exp: number;
  totalKills: number;
  totalInstakills: number;
  totalSwallowedResources: number;
  maxLevelReached: number;
  updatedAt: number;
}

const STORAGE_KEY = 'SWALLOW_EVOLUTION_SAVE_V1';

export const Storage = {
  save(data: IPlayerSaveData): void {
    try {
      const json = JSON.stringify(data);
      // 微信小游戏环境兼容
      const wxObj = (window as any).wx;
      if (wxObj && typeof wxObj.setStorageSync === 'function') {
        wxObj.setStorageSync(STORAGE_KEY, json);
        return;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, json);
      }
    } catch (e) {
      console.warn('[Storage] Save failed:', e);
    }
  },

  load(): IPlayerSaveData | null {
    try {
      let json: string | null = null;
      const wxObj = (window as any).wx;
      if (wxObj && typeof wxObj.getStorageSync === 'function') {
        json = wxObj.getStorageSync(STORAGE_KEY);
      } else if (typeof window !== 'undefined' && window.localStorage) {
        json = window.localStorage.getItem(STORAGE_KEY);
      }

      if (json) {
        return JSON.parse(json) as IPlayerSaveData;
      }
    } catch (e) {
      console.warn('[Storage] Load failed:', e);
    }
    return null;
  },

  clear(): void {
    try {
      const wxObj = (window as any).wx;
      if (wxObj && typeof wxObj.removeStorageSync === 'function') {
        wxObj.removeStorageSync(STORAGE_KEY);
        return;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('[Storage] Clear failed:', e);
    }
  },
};
