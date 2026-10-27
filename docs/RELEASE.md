# v5 交付与复核

本地工程位于当前项目目录。静态网站的唯一发布目录是 dist；源工程、Studio、原始缓存与本地恢复副本不作为静态根目录上传。

交付文件在 releases：

- MimaGlows_Personal_Archive_v5_source.zip：可维护源码、JSON/Markdown、公开来源缓存、媒体、原生三维及中文文档。排除 node_modules、.git、.openai、.studio、imports、真实 .env 和旧 releases。
- MimaGlows_Personal_Archive_v5_static.zip：生产网站，解压即是 index.html、assets、data、media、licenses 和 _headers。
- manifest-v5.json：文件数、体积、SHA-256 与静态文件清单。
- verification-v5.json：交付包解压、干净依赖安装、构建及检查的结果。

已有 Node 22.12+ 时，源码解压到独立文件夹，执行 npm ci、npm run dev。图形维护使用 npm run manage；保存 → 预览 → Git 提交 → 按 DEPLOYMENT 发布。当前机器未修改系统 Node 安装，本次使用 Codex 内置 Node 24.22.1 和临时 npm 10.9.2。

重新打包：先 npm run check / npm run build，再用 Python 3 运行 scripts/package-release.py。Python 仅用于这份可选 ZIP 打包脚本，开发、Studio 和正式构建不依赖 Python。

验收矩阵见 ACCEPTANCE，实测见 PERFORMANCE，维护说明见 MAINTENANCE。Last.fm 与 Apple 密钥待本人稍后配置；不会将测试收听记录当作真实内容。没有执行公开部署或远端推送。

2026-10-27 本地审阅修订已合入当前 v5 包：底部导航/右下备案、移除装饰栏、大档案阅读区和低中高画质/SMAA。变化与对应证据见 REVIEW-2026-10-27.md；下载包与当前源码的一致性以 releases/manifest-v5.json 和 verification-v5.json 为准。
