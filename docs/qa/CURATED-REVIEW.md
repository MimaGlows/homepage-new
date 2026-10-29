# Curated Archive：视觉对比与本地验证

记录日期：2026-10-28。原版为 `308bf45`，新版为本工作区修改；未发布。浏览器为 Codex 内置浏览器，本地 Vite 生产预览，截图是模拟视口，不代表真机。桌面为 1440×900，手机为 390×844；前后选择 Blog、相同模式和主题。静态预览使用公开入口封面和中性占位，不烘焙人物等非固定入口图片。

## 逐张对比

| 视口 / 状态 | 原版 | 新版 | 实际观察 |
|---|---|---|---|
| 桌面 FOCUS · DAY | [前](curated/before-focus-day.jpg) | [后](curated/after-focus-day.jpg) | 选中卡原本夹在密集阵列；新版单件主体放大，右侧保留少量后景，顶部与主体有更多留白。 |
| 桌面 FOCUS · NIGHT | [前](curated/before-focus-night.jpg) | [后](curated/after-focus-night.jpg) | 原有玻璃边光继续保留，背景与卡片分离更明确；底部标题减小以降低视觉争夺。 |
| 桌面 ARCHIVE · DAY | [前](curated/before-archive-day.jpg) | [后](curated/after-archive-day.jpg) | 仍是多列真实实体盒；视角更开阔，保留深色与浅色封面的层次。 |
| 桌面 ARCHIVE · NIGHT | [前](curated/before-archive-night.jpg) | [后](curated/after-archive-night.jpg) | 后景阵列有更多横向留白，边缘照明和多层遮挡保留。 |
| 手机 FOCUS · DAY | [前](curated/before-mobile-focus-day.jpg) | [后](curated/after-mobile-focus-day.jpg) | 原版主体埋在阵列中；新版放大单件，底部链接分行可见。 |
| 手机 FOCUS · NIGHT | [前](curated/before-mobile-focus-night.jpg) | [后](curated/after-mobile-focus-night.jpg) | 新版保留清晰单件边框，背景减少重复轮廓。 |
| 手机 ARCHIVE · DAY | [前](curated/before-mobile-archive-day.jpg) | [后](curated/after-mobile-archive-day.jpg) | 新版阵列更靠近视野，留下底部导航；低画质下远处细节仍较柔和。 |
| 手机 ARCHIVE · NIGHT | [前](curated/before-mobile-archive-night.jpg) | [后](curated/after-mobile-archive-night.jpg) | 新版强调卡片前后重叠和边缘明暗，底部入口仍可见。 |

## 操作与边界

- 浏览器实际点击展品：摘要优先出现，点击“阅读完整档案”后进入独立滚动区域；手机人物正文可滚动到底并保留来源、关系与署名。桌面回到摘要与列表路径可用。
- 实际检查开场重播起始与结束、方向键选档、高画质 SMAA、亮暗切换；320×568 和 844×390 检查链接区域、备案与顶部工具。820×1180 发生尺寸变化后，画布与容器均为 820×1180。
- 本地隔离副本阻止 WebGL context 创建后进入 `fallback`，仍有三条链接和与 ARCHIVE 对应的夜间静态图。另一隔离副本模拟 JavaScript `matchMedia` 减少动态效果：场景就绪、`reduced=true`、静置 `animationScheduled=false`，选档和主题仍可用；该模拟不等同操作系统的 CSS 媒体查询验证。
- 将生产 HTML 中可执行脚本移除并按 `<noscript>` 隐藏工具后，浏览器画面仍有姓名、三条真实链接、备案与静态图；这是无脚本副本，不是实际关闭浏览器 JavaScript 的测试。另一个隔离生产副本实际移除 GLB 后返回 `fallback`，静态预览和三条链接保留。真实触摸和真实设备尚未单独复测。
- `/homepage-new/` 本地子路径构建可加载阵列、模型与 `preview-day-archive.webp`；未部署或更改远端。
- `npm run dev` 可启动；`npm run build`、`npm run check`（23/23）通过。浏览器验收脚本已更新为摘要/阅读状态，语法检查通过；本轮没有直接执行该 Playwright 脚本，以上浏览器操作通过内置浏览器完成。

## 加载样本

本机内置浏览器，893×801、localhost、无网络或 CPU 限速；原版与新版各一次暖缓存样本，均 DAY / FOCUS、选中 Minecraft。使用仅在隔离测量副本注入的 PerformanceObserver 和 Resource Timing；OS/GPU 缓存、系统负载与图集状态未清除，结果不具统计代表性，也不是公网或真实手机数据。

| 指标 | 原版 | 新版 |
|---|---:|---:|
| LCP | 64 ms | 84 ms |
| 预览图 decode 后下一帧 | 35 ms | 40 ms |
| 三维准备完成 | 645 ms | 653 ms |
| CLS | 0 | 0 |

上表来自最终源码的单次暖缓存样本；多个 WebGL 测试页面并存时另一次观测的三维准备约 7.4 秒，系统负载和 GPU 状态足以造成明显波动，因此不能据此声称稳定无回退。LCP 只是最大内容绘制的候选，三维准备后的 1.2 秒淡入另计。完成部署前应在真实 HTTPS、冷缓存和目标设备上重复测试。

补充重复测量：同一浏览器和 893×801 视口，DAY / FOCUS、选中 Blog，分别连续三次暖缓存加载（先新版、后原版）。LCP 原版 60 / 68 / 88 ms，新版 80 / 72 / 92 ms；预览图显示原版 29 / 31 / 58 ms，新版 57 / 36 / 63 ms；三维准备原版 779 / 781 / 822 ms，新版 710 / 765 / 769 ms；六次 CLS 均为 0。这些样本没有显示明显的三维准备回退，首屏数值也仅能代表本机暖缓存；样本数量有限，且顺序、缓存和负载未经控制，不能代替冷缓存、限速及真机测试。
