# 性能与验收记录

记录日期（中国标准时间）：2026-10-27。原始数据：[qa/results.json](qa/results.json)；边界场景：[qa/edge-results.json](qa/edge-results.json)。浏览器 Chrome **156.0.8078.48**，使用隔离 headless Chrome、生产 Vite preview 与 Chrome DevTools Protocol 的 Network / Performance。每轮新 browser context 并禁用 HTTP cache；未清理操作系统/GPU shader cache。Vite preview 实际提供 gzip，资源报告同时保存 encoded/decoded 体积。

## 测量条件

桌面：1440×900、DPR 1、不限速的 localhost。手机模拟：390×844、DPR 1、触摸、下行 1.6 Mbps、上行 750 Kbps、延迟 150ms、CPU 4× slowdown。两组各三轮；串行运行，均使用最终构建（JS/CSS SHA 在 JSON 的 build 字段）。该结果不等于真实手机、国内公网、CDN 或低端 GPU 的结果。

## 首屏与三维阶段

单位毫秒，表格为中位数（最小–最大）。

| 指标 | 桌面 | 手机限速模拟 |
|---|---:|---:|
| FCP / 姓名可见 | 48（36–52） | 460（460–460） |
| LCP | 48（36–52） | 460（460–460） |
| 预览图解码后下一帧 | 38（35–39） | 495（492–496） |
| 开始请求三维 | 435（428–438） | 883（876–884） |
| 三维准备完成 | 694（656–756） | 4138（4121–4147） |

**本轮 LCP 实际候选：BUTTON**；本轮不能用这个值表示背景或 WebGL 已就绪。单独记录 preview-visible（图片 decode 后的 RAF，近似可显示时刻，非硬件扫描时刻），并保留资源下载结束时序。scene-ready 表示初始真实渲染与控制器已完成，此后仍有 1.2 秒淡入；它不是“首屏到这里才可使用”。

每轮 DOMContentLoaded 后检查三条静态 anchor 的真实 href、≥44px 高度和实际命中目标；所有链接均未被开场覆盖。六轮 CLS 均为 0，未测得真实访问 INP 或 GPU 帧耗时。浏览器仍观察到三维阶段的长任务，不能把 shader、解析或 GPU 初始化描述为零成本。

在这组实验条件下，首屏数据如上表所示，三维在后台继续准备。目标是首屏约 1 秒、LCP 争取 ≤2.5 秒；**未进行公网发布或真实设备验收，因此不把本机数据写成所有访问均达到目标**。

## 与原 v3 的可比项

原 v3 在独立临时副本应用原 patch，按其 package-lock 安装并通过原 npm run build。相同桌面 Chrome、localhost、冷 HTTP cache 各记录资源。这里只比较可直接观察的传输与图集，不用两个不同视觉入口的 LCP 数字宣称整体提速倍数。

| 项目 | 原 v3 | 当前版本 |
|---|---:|---:|
| 本轮启动观察窗口传输（含响应开销） | 本轮未提供原 v3 预览 | 559 KiB |
| 封面图集 RGBA | 156 MiB | 8.00 MiB |
| 可见阵列实例 | 612 | 360 |
| 运行时外部字体请求 | 4 款 MiSans，约 19 MiB | 0 |
| 实际音乐盒 GLB | 78,948 bytes | 同一文件，未修改 |

本轮未重跑原 v3，不计算启动传输降幅；此前原始记录保存在 audits/results-v4-baseline.json。三个封面由 PNG 转 WebP；真实场景预览亮色桌面 27.9 KiB / 手机 20.0 KiB，深蓝另有对应图片。Three.js chunk 仍约 300 KiB gzip，只在静态首屏之后请求。

## 实际验收

- npm run dev 实际启动，开发页面正常渲染；npm run build 包含 tsc、Vite 与产物预算检查，通过；npm run check 通过。
- 13 项主浏览器验收通过：Theme controls update scene lighting, DOM and persisted preference；Replay and Escape skip preserve unobstructed external navigation；Keyboard and link hover select matching native 3D archive lanes；Extraction and return use original camera and lift transition；Full 5.2-second native camera replay reaches a continuous browsing endpoint；Context loss keeps poster + links and supports a clean retry；Touch swipe changes archive without touching the link strip；Reduced motion suppresses intro, parallax, idle animation and recurring RAF；Complete static fallback: no-javascript；Complete static fallback: module-failure；Complete static fallback: model-failure；Complete static fallback: no-webgl；Complete static fallback: save-data。
- 6 项边界验收通过：Subpath static hosting loads all relative chunks, previews and GLB；Failed dynamic module can be retried after network recovery；20-second timeout rejects a stalled model, ignores its late result, and retries cleanly；Resize desktop → portrait → landscape preserves accessible links and finite camera；Physical card hover raycasts select a different native archive lane；Changing reduced-motion during playback cancels the intro and reaches static browsing。
- 桌面/手机昼夜、开场、抽取和失败图位于 qa/。完整重播检查了开始、中段及浏览交接；原玻璃、几何、灯光和镜头核心模块保持上游实现。
- 子目录 /rhine/ 实际加载成功，支持相对资源路径。Vercel/Cloudflare Pages/GitHub Pages 的线上部署未执行。

## 复现与后续

先 npm run build，再 npm run preview -- --port 4173。已有 Chrome / Playwright 后运行 scripts/browser-qa.mjs；可用 BASELINE_URL 指向原 v3 生产预览。边界脚本另需 /rhine/ 预览服务，见 README。运行 node scripts/summarize-performance.mjs 由 raw JSON 更新本文。

正式部署后应使用真实 HTTPS URL、至少一部手机及目标网络重测；特别观察无哈希预览图的缓存、字体零请求、three chunk 请求顺序、首次 shader 长任务和连续操作响应。
