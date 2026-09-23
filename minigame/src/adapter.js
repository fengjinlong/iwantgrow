/**
 * 微信小游戏轻量化环境适配器
 * 用于桥接微信运行环境与原生 Canvas 2D / 存储 / 触控
 */

const systemInfo = (typeof wx !== 'undefined' && wx.getSystemInfoSync) ? wx.getSystemInfoSync() : {
  windowWidth: 375,
  windowHeight: 667,
  pixelRatio: 2,
};

export const MiniGameAdapter = {
  windowWidth: systemInfo.windowWidth,
  windowHeight: systemInfo.windowHeight,
  pixelRatio: systemInfo.pixelRatio || 2,

  // 本地存储适配 (支持微信缓存与降级 localStorage)
  getItem(key) {
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      try {
        return wx.getStorageSync(key);
      } catch (e) {
        return null;
      }
    }
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },

  setItem(key, value) {
    if (typeof wx !== 'undefined' && wx.setStorageSync) {
      try {
        wx.setStorageSync(key, value);
      } catch (e) {}
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  },

  // 短震动反馈 (用于升级或秒杀)
  vibrateShort() {
    if (typeof wx !== 'undefined' && wx.vibrateShort) {
      wx.vibrateShort({ type: 'light' });
    }
  },
};
