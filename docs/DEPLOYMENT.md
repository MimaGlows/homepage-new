# 静态部署

## 当前 GitHub 目标

用户已于 2026-10-27 指定 https://github.com/MimaGlows/homepage-new 作为源码仓库，并授权使用 GitHub Pages。预期地址为 https://mimaglows.github.io/homepage-new/；首次部署结果以仓库 Actions 的 Pages 运行记录及实际 HTTPS 检查为准。

仓库 main 保存源工程，不提交 node_modules、dist、真实环境变量、imports、.studio、本地 releases 或旧 .openai 身份。Pages Source 选择 GitHub Actions，在 Actions 中手动运行 “Publish static archive to GitHub Pages”。工作流执行 npm ci、npm run check、npm run build，再仅上传 dist。Studio 代码可随工程版本管理，但管理进程不在 Pages 运行。

后续更新：在本机编辑、校验与预览后，提交源码至 main；再手动运行 Pages 工作流。普通保存或同步不会自动发布。公开仓库中不要提交非公开角色设定、未授权图片或密钥；published:false 只控制静态产物，不能让 GitHub 已提交的源文件变成私密。

Node.js ≥22.12，构建命令 `npm ci && npm run build`，发布目录 `dist`。没有后端、API 密钥、音乐服务或 SPA 路由要求。HTML/CSS/JS/WebP/GLB 使用同源相对 URL，可放在站点根目录或 GitHub Pages 子目录。

| 平台 | 配置 |
|---|---|
| Vercel | Framework 选 Vite / Other；Build `npm run build`；Output `dist`；Node 22 或更新受支持版本 |
| Cloudflare Pages | Build `npm run build`；Output `dist`；配置满足 engines 的 Node 版本 |
| GitHub Pages | Actions 中 setup-node@v4 指定 Node 22；运行 npm ci / npm run build；upload-pages-artifact 的 path 为 dist，再 deploy-pages |

以上是本项目的构建输入，未在这些平台执行线上部署。部署平台的账户、域名、计划与界面选项以实际后台为准。无需给 GLB 添加跨域服务，也不要把所有 404 都重写为 index.html，否则模型加载失败会收到 HTML。

根目录原有 `.openai/hosting.json` 的旧 Site 身份未修改，不能据此声称本次已发布到该 Site。

## 上线检查

1. 确认三个配置网址正确，尤其 Stronghold 的自定义 HTTPS 端口 `44580` 可被访问且证书有效。网页仅导航，不代理该服务。
2. 上传整个 dist，而非只有 index.html；核对 WebP、GLB 和三个动态 chunk 均返回正确内容类型。
3. 用平台提供的 HTTPS URL 冷缓存测量 Performance/Network；区分 FCP/LCP、预览解码和三维准备。检查一次手机网络。
4. 在子目录发布时检查 `assets/` 请求留在子目录。相对 base 不需要手工改 Three.js 路径。
5. 开启平台自动 gzip/Brotli；哈希 JS/CSS 可长缓存，HTML 要能及时更新；无哈希的 preview/cover 建议短缓存或发布时清理 CDN，以免图与场景不匹配。
6. 保留 `licenses/` 的版权文本。模型及原作相关素材的权利不因 MIT 程序代码而自动改变。

工程附带 `vercel.json` 与 `.github/workflows/pages.yml`。GitHub 仓库启用 Pages 的 GitHub Actions 来源后，可手动运行 “Publish static archive to GitHub Pages”；工作流只响应 workflow_dispatch，不随普通提交自动发布。Cloudflare Pages 可直接使用上表的构建与输出设置。

## Windows 内容维护流程（本轮内容架构）

1. 安装 Node.js 22.12+，重开 PowerShell，运行 `node -v` / `npm -v` 确认 PATH。
2. 进入项目目录，`npm ci`，然后 `npm run content:validate`。
3. `npm run dev` 预览；只编辑 content/JSON、Markdown、public/media，不编辑 dist。
4. `npm run check`、`npm run build`、`npm run preview` 检查生产版本。
5. Git 提交内容、缓存和媒体后，按既有静态平台构建或手动 Pages 发布。无需在服务器运行音乐服务或管理台。

`npm run manage` 启动 Studio（4317）和预览（4318），仅绑定 127.0.0.1；不要部署管理进程。公开构建与管理服务保持隔离。环境变量写入被 Git 忽略的 .env.local，平台令牌使用仓库 Secrets，不在 VITE_ 变量里保存 secret。Node/sharp 原生依赖通过 npm ci 安装，公开静态托管无需 Node 运行时。

public/_headers 为 Cloudflare Pages 提供静态缓存建议：HTML/内容 JSON 重新验证，媒体短缓存并保留 nosniff/referrer-policy。其他平台按同样策略在后台设置；GitHub Pages 使用平台自带缓存，不能将 _headers 当作其生效配置。尚未联网部署，CDN 命中和公网 LCP 必须上线后另测。
