# 《吞噬进化：草地篇》微信小游戏工程说明

本目录 `minigame/` 是完全遵循**微信小游戏（WeChat Mini Game）官方运行规范**构建的原生小游戏工程。

---

## 一、微信小游戏架构特点

- **无 DOM 依赖**：微信小游戏平台无 `window`、`document`、`div` 等 DOM 结构。
- **全局主 Canvas**：通过微信原生 `wx.createCanvas()` 创建主渲染上下文。
- **高分屏像素倍率适配**：自动获取 `wx.getSystemInfoSync().pixelRatio`，在 iOS/Android Retina 屏上实现高清渲染。
- **原生触控事件流**：全面接入 `wx.onTouchStart`、`wx.onTouchMove`、`wx.onTouchEnd` 实现无摇杆任意滑动手势控制。
- **硬件级震动反馈**：在击杀秒杀或升级进化时调用 `wx.vibrateShort({ type: 'light' })`，提供沉浸式手感反馈。

---

## 二、如何在「微信开发者工具」中打开并运行？

1. **下载并安装**：
   从微信官方平台下载安装 [微信开发者工具 (WeChat DevTools)](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。

2. **导入项目**：
   - 打开微信开发者工具，选择 **「小游戏」** 标签（注意不是“小程序”）。
   - 点击 **「导入」**。
   - **项目目录**：选择本工程的 `minigame` 文件夹。
   - **AppID**：可填入您自己的小游戏 AppID，或直接选择 **「测试号 / 游客模式 (touristappid)」** 即可立即在模拟器内运行。

3. **真机预览与调试**：
   - 在微信开发者工具顶部工具栏点击 **「预览」**，使用微信扫描生成的二维码即可在手机微信中实时畅玩体验！

---

## 三、目录结构

```
minigame/
├── game.json              # 微信小游戏全局配置 (竖屏 portrait、状态栏隐藏等)
├── project.config.json    # 微信开发者工具工程定义
├── game.js                # 小游戏核心主入口与逻辑帧主循环
├── src/
│   └── adapter.js         # 微信小游戏轻量化环境适配器 (Storage / Vibrate / DPR)
└── README.md              # 导入与开发指南
```
