# GitHub 源码迁移与 Pages 首次部署

记录日期：2026-10-27（中国标准时间）。本次发布由用户指定仓库并明确授权，取代此前“暂不发布”的决定。

## 已完成

- 源码仓库：https://github.com/MimaGlows/homepage-new ，主分支 main。
- 首次完整导入提交：0360628bfe25f1d75a81889b62641ba1f85e63ad。275 个文件已逐一与 GitHub Git blob SHA 核对，含原始模型、媒体、维护文档和 Studio 源码。
- 本地 origin 已连接该仓库，main 跟踪 origin/main。旧站点 Git 历史保存在仅本地的 codex/previous-local-site 分支；没有推送旧 .openai 身份或旧 dist。
- Pages Source 已设为 GitHub Actions。只通过手动 workflow_dispatch 发布；普通内容保存和同步不会自动上线。
- [首次发布运行](https://github.com/MimaGlows/homepage-new/actions/runs/40445610810)已成功：Ubuntu 上 npm ci、23 项测试、生产构建和 Pages deploy 全部通过。
- Pages 只上传 dist，不运行 Studio 或同步服务，不上传密钥、依赖、导入文件、本地恢复副本和 releases。
- 线上 76 个静态文件均返回 200，SHA-256 与本地验收产物完全一致；证据见 qa/github-pages.json。这是 HTTP 文件验证，不是公网 LCP 或真实手机测试。

## 当前访问地址与域名限制

GitHub 返回的实际展示地址为 http://hexo.mimaglows.com/homepage-new/ ，已确认 HTTP 页面和所有静态资源可访问。

默认地址 https://mimaglows.github.io/homepage-new/ 当前返回 301 到上述 HTTP 地址。原因是账号主站 MimaGlows/mimaglows.github.io 的 master 分支仍有 CNAME：hexo.mimaglows.com。项目仓库没有自定义域名，但 GitHub Pages 会继承账号主站的域名。

目前 https://hexo.mimaglows.com/homepage-new/ 的证书主机名不匹配。没有忽略证书错误，也没有把 HTTP 访问写成 HTTPS 验收成功。

根据 [GitHub 官方说明](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages#using-a-custom-domain-across-multiple-repositories)，解除这个默认继承需要移除账号主站的自定义域名，或为本项目单独配置其他域名。这会涉及其他站点或 DNS；已请求用户选择，尚未修改旧主站的绑定、CNAME 或 DNS。

## 后续维护

在本机 Studio 或内容文件中维护，校验、预览并提交 main 后，进入 Actions → Publish static archive to GitHub Pages → Run workflow → main → Run workflow。等待 build 和 deploy 均成功后，再检查线上页面。

本机 Git 的远端已配置；终端写入认证仍需使用本人常用的 GitHub 登录方式。当前首次上传使用已授权的 GitHub 连接完成，没有把访问令牌保存进工程。

Last.fm / Apple 密钥仍待本人配置；不影响手动内容、缓存和当前静态展示。若以后向公开仓库提交内容，published:false 只控制网站构建，不会隐藏已提交的源文件。
