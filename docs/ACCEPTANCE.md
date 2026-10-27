# 维护验收与交付边界

2026-10-26，在隔离副本完成维护操作，不修改正式内容来伪造结果。UI 用实际 Chrome，服务直接读写临时项目文件；网络来源另有成功重抓真实友链页的验证。音乐测试数据仅存在临时副本，没有发布到正式歌曲列表。

| 要求 | 实际操作与证据 |
|---|---|
| 1 新增友链、保存、预览出现 | Studio 新增/上传/保存，实际预览找到对应 ID；qa/phase4-studio.json |
| 2 修改已有友链网址 | 编辑后核对磁盘 JSON 与真实 anchor；phase4-studio / phase1-maintenance |
| 3 隐藏友链再同步不恢复 | 隔离副本隐藏一位真实友链，成功重新抓取实际公开来源；qa/phase7-real-source-maintenance.json |
| 4 OC 简介与立绘 | Studio 上传替换、Markdown/简介保存；直接文件替换也验证旧尺寸图被清除；phase4-studio / phase1-maintenance |
| 5 第四位 OC 无代码新增 | Studio 新建数据与 Markdown，列表/网页出现；同上 |
| 6 OC 排序在两模式一致 | 修改 order 后比较 FOCUS、ARCHIVE 人物列表 ID 顺序；qa/phase1-maintenance.json |
| 7 歌曲首页精选 | 勾选 featured，核对 overrides 与统一歌曲；qa/phase4-studio.json |
| 8 人工修正 Apple URL | 在直观 URL 字段编辑，保存 confirmed，重导入后保留；同上 |
| 9 人工合并后再次同步 | UI 合并/拆分/再导入验证；scripts/music.test.mjs 另调用真实同步 runner 写缓存两次验证；同上 |
| 10 隐藏自动歌曲后不恢复 | UI 隐藏、重新导入，磁盘编译及连续稳定预览 JSON 都无歌曲；同上 |
| 11 修改 Minecraft | 设置页保存后核对真实文件与静态 anchor；phase4-studio / phase1-maintenance |
| 12 关闭 X 不留空白/报错 | 模块开关后目录不含通讯，其他内容正常；phase1-maintenance 与内容测试 |
| 13 关闭全部第三方同步 | 所有来源返回 disabled，缓存/人工目录保持；qa/phase7-real-source-maintenance.json |
| 14 手机与备案 | 390×844 触摸模拟，备案处于视窗内可点击；phase1-maintenance / phase2-modes / results |
| 15 Git 恢复误操作 | 临时独立 Git 仓库实际 init/add/commit，写坏文件，再 git restore，字节一致；scripts/content.test.mjs |

## 核心工程证据

- `npm run check`：23 项实际文件/服务/构建测试，涵盖 Schema、优先级、缓存失败、音乐版本/映射、CSRF/并发、恢复、Git 与隐私导出。
- `npm run build`：TypeScript、Vite、静态链接/资源/首屏预算检查。`npm run dev`、`npm run manage` 实际启动。
- `qa/results.json`：六轮生产 Performance/Network；主题、完整开场、抽取、上下文丢失、触摸、减少动态效果及五种静态回退。
- `qa/edge-results.json`：子目录、模块失败重试、20 秒超时后晚到模型、横竖屏、原生悬停和动态减少动画。
- `qa/phase2-modes.json`：相同 canvas/WebGL context、稳定选中 ID、纹理缓存、URL 优先和手机切换。
- `qa/phase3-content.json`：真实 OC 设计稿/署名、Markdown、关系、RSS、友链和按需读取。
- `qa/phase6-relations.json`：友链/人物网络、键盘、X 脚本仅主动载入，失败仍可打开来源。
- `qa/phase7-pointer.json`：真实三维卡片点击、抽取拖转、对齐归位；rotation 实测改变。
- `qa/phase7-adaptive-quality.json`：桌面低硬件提示与持续慢帧模拟触发性能档，核对实际 AO/阴影设置及单一 renderer；不冒充真实低端 GPU 实测。
- `scripts/publication.test.mjs`：实际构建临时站点，确认隐藏图、隐藏人物头像、未用上传文件都不在 dist。

## 尚需账号或人工决定的部分

Last.fm 用户已确认为 MimaGlows，用户选择稍后配置 API Key。Apple 官方 Catalog 需要 developer token；目前验证的是官方接口形状、保守匹配规则与失败回退，未声称真实账号联调成功。公开歌曲列表保持为空，可随时手动维护或导入本人导出。

林阿良良没有从所给公开蓝皮书找到立绘，戚风刃缺少可核实详细设定；保留可维护档案与占位图，没有编造。X 以本人账号入口和手动精选为主，官方时间线的可用性由 X 决定。

本轮没有公开部署、推送或修改旧 Site 身份。交付可部署的 dist、源文件、配置和中文维护文档。真实公网/CDN、真实手机与 Windows 实机尚未测试；本机测量不能替代这些结果。源工程包含 Studio/原始缓存，仅 dist 是公开托管目录。

## 2026-10-27 本地审阅修订

四条标注和三档画面设置已按 REVIEW-2026-10-27.md 实施。qa/review-feedback.json 核对实际 SMAAPass、画质变化、完整粒子、同一画布与选档、设置记忆、四种尺寸及静态导航；qa/phase7-adaptive-quality.json 另核对慢帧下手选高档保留。正文、模式、关系、原生交互、主生产性能和边界脚本已对当前代码重新运行，不能把旧包的数字当作本次测量。
