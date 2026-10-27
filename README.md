# MimaGlows · Personal Archive v5

个人档案主页：暖灰玻璃阵列、暖金信号光、深蓝夜间主题。基于 RonaldDeng/Rhine-Music-Demo **v0.5.0 / d200b84983e05cb306e49e564fe57113893e7056**，保留原生 Three.js 模型、透射着色、空间灯光、镜头与编排。首屏保持姓名和三个固定入口；友链、人物、文献、音乐和 X 在按需档案面板浏览。

## 本地运行

需要 **Node.js ≥ 22.12.0**（包含 npm）。当前机器的普通终端尚未配置 node/npm 到 PATH；本次使用 Codex 内置 Node 24.22.1 与临时 npm 10.9.2 完成验证，没有修改系统安装。若从普通终端启动，请先安装上述版本的 Node.js。

```sh
npm ci
npm run dev
# 图形内容维护台（同时启动真实网页预览）
npm run manage
```

生产构建与预览：

```sh
npm run build
npm run preview -- --port 4173
npm run check
```

不需要音乐服务、Python、FFmpeg 或远程字体。开发入口不运行旧改造脚本。`docs/handoff-v3/` 仅用于交接溯源；其中原 README 的旧网址占位、默认夜间和安装流程不适用于本版本。

## 人工维护入口

配置唯一来源已迁移至 [`content/site.json`](content/site.json)，包含姓名、导航、备案、默认主题/模式、动画开关和模块顺序。结构化内容在 content/records，长文在 content/characters。generated 只存自动缓存；人工覆盖与永久隐藏独立存储。

```sh
npm run content:validate
npm run dev
```

保存内容文件后开发页校验并刷新；构建自动生成公开 data/catalog.json 和按模块 JSON。无需修改 TypeScript。详见 [维护手册](docs/MAINTENANCE.md)、[格式](docs/CONTENT_FORMAT.md)、[来源](docs/SYNC_SOURCES.md) 和 [阶段状态](docs/ROADMAP.md)。旧 config/links.json 已退出使用，避免维护两份链接。

## 使用

- 右上三个刻度、左右/上下方向键、滚轮、手机横滑：选档。
- 悬停入口或三维卡片：选中对应档案；原始镜头连续移动。
- 右上抽取图标，或在背景按 Enter：抽取 / 归位；抽取后可拖转模型。
- 太阳 / 月亮图标或 D / N：切换 HTML 与真实三维灯光主题。本机保存，首次默认亮色。
- 右上滑杆图标：低 / 中 / 高画质；中、高档启用 SMAA，高档完整粒子及精细玻璃；选择在本机记忆。
- 点击左下 MimaGlows 或 R：重播装饰验证及原生 5.2 秒阵列编排。
- Skip Intro / Esc：跳过；Esc 同时归位。
- `prefers-reduced-motion`：跳过自动开场、关闭常态波动与视差，停止静置 RAF；选档、外链和主题仍可操作。

验证仅为视觉演出，不执行登录、密码或身份认证。首次显示静态预览与轻量验证，三维准备好后在同一浏览姿态淡入；完整镜头编排通过重播触发。

## 首屏与失败回退

`index.html + shell.css + 四张真实场景 WebP` 构成静态层。入口 JS 与 Three.js 分离，构建强制 ≤18 KB；两次 paint 和短暂空闲窗口之后，才通过 `import('./scene')` 请求 Three.js 和场景。实际体积和测量见 PERFORMANCE。

静态姓名、链接与构图不等待任何 GLB、字体、播放器或 shader 预编译。3D 启动失败、WebGL 不可用、上下文丢失或 20 秒超时时保留完整静态背景，允许重试；省流量模式默认停留静态层。禁用 JS 仍有完整首屏。三维 RAF 在后台暂停，BFCache 返回复用场景。

`?static` 可用于检查静态回退。它是视觉检查入口，不是服务端路由。

## 目录

| 位置 | 职责 |
|---|---|
| `index.html`、`src/shell.css`、`src/shell.ts` | 静态首屏、独立交互、动态导入与回退 |
| `src/scene.ts` | 精简 Three.js 控制器、画质与生命周期 |
| `src/engine/` | 保留的上游原生引擎及少量标明的适配 |
| `content/site.json` | 网站/导航/备案/主题/模式/模块配置的唯一来源 |
| `content/records`、`content/characters` | 人工档案、Markdown、覆盖与永久隐藏 |
| `generated`、`scripts/sync` | 本地公开来源缓存、保守音乐匹配与失败保留 |
| `studio`、`scripts/studio` | localhost 真正文件管理台、校验、图片与恢复；不进入 dist |
| `public/assets/` | 原 GLB、压缩封面与真实 WebGL 首屏预览 |
| `art/build-music-case.mjs` | 上游建模生成器，路径已适配，可用 `npm run model` 重建 |
| `docs/DESIGN.md` | 长期设计和交互约束 |
| `docs/ARCHITECTURE.md` | 性能边界、资源预算和维护方式 |
| `docs/UPSTREAM.md`、`docs/upstream-manifest.json` | 原始版本、文件差异和 SHA-256 |
| `docs/PERFORMANCE.md`、`docs/qa/results.json` | 实测条件、结果与边界 |
| `docs/ACCEPTANCE.md` | 15 项维护要求与实际验收证据 |
| `docs/DEPLOYMENT.md` | Vercel、Cloudflare Pages、GitHub Pages |
| `docs/handoff-v3/`、`docs/previous-site/` | 原 ZIP 内容与旧静态页面留档，不进入 dist |

## 浏览器验收与预览图重建

浏览器 QA 使用已有 Chrome 与 Playwright；它们不是网页运行依赖。安装 QA 工具后运行（或用 `PLAYWRIGHT_MODULE` / `SHARP_MODULE` 指向已有模块）：

```sh
QA_URL=http://127.0.0.1:4173/ node scripts/browser-qa.mjs
# 另起 npm run preview -- --base /rhine/ --port 4175 后：
QA_URL=http://127.0.0.1:4173/ node scripts/browser-edge-qa.mjs
QA_URL=http://127.0.0.1:4173/ node scripts/capture-previews.mjs
```

Chrome 路径可以通过 `CHROME_PATH` 指定。生成预览图额外需要 sharp。重新生成后需 `npm run build`；不能用旧 dist 继续测量。QA 报告保留设备、限速、CPU 倍率、浏览器版本及各阶段时序，不将本机结果视为公网保证。

## 许可与来源

保留根目录 `LICENSE`、`NOTICE.md`、`README.original.md` 和上游署名 **LBEILC / RonaldDeng**；生产文件包含 `licenses/`。有权授权的程序代码按 MIT；代码许可不自动涵盖原作相关非代码资产。模型未被替换或重新声明为 MimaGlows 原创。MimaGlows v3 封面由用户交接包提供，新 WebP 由该封面压缩转换。

本项目未复制 rhine-lock 的 AGPL 代码、字体或音乐；只将其列为用户指定的视觉参考。原项目及《明日方舟》相关权利说明见 [`docs/UPSTREAM.md`](docs/UPSTREAM.md)。本次交付为本地开发结果，未执行公开部署。

真实内容现有公开 RSS 文章、友链和七风设计稿。Last.fm 用户名已为 MimaGlows，用户选择稍后配置 API Key；Apple 官方 Catalog 也需要 developer token。无密钥仍可手动新增/导入音乐、修正链接与合并映射；未将测试数据或虚假收听写入正式内容。林阿良良和戚风刃缺少公开立绘/设定的部分保留占位，不编造。
