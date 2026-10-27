# Phase 0 · 现有项目审计（2026-10-26）

此次检查的是当前工作树，不是原始音乐项目或旧聊天描述。Git 分支 main，基线 HEAD c68e4c9；此前 v4 重构尚未提交，有新增源码与已生成 dist。保留这些已有改动；不重置 Git 历史。

## 可复用

- Vite 7.3.1、TypeScript 5.9.3、Three.js 0.183.0；没有 React/Vue、数据库或必须运行的音乐服务。
- `src/engine/` 保留真实模型、透射/磨砂、灯光、相机、开场、实例化阵列。`public/assets/music-case-v043.glb` 为原始 78,948 bytes 文件。
- 静态姓名和三条 anchor、四张真实场景 WebP、动态导入、失败回退、减弱动态效果与后台暂停均已实现。
- `npm run build` 与现有 check 已重新执行。历史性能结果在 docs/PERFORMANCE.md；本轮内容系统变更后需重新测量，旧数字不能自动沿用。

## 耦合与缺口

| 当前代码 | 问题 | 处理方向 |
|---|---|---|
| config/links.json + vite.config.ts | 只有三条 URL；没有网站/模块配置 | 迁移到 content/site.json 作为配置唯一来源 |
| src/engine/data.ts | 三个记录、列和图片在引擎目录写死 | 由标准目录数据适配，稳定 ID 与顺序来自内容层 |
| src/shell.ts | 数量 3、主题和开场写死 | 使用构建输出的公开配置与目录 |
| index.html | 姓名、导航名称和品牌写死；没有备案行 | 构建时注入，保留无 JS 可访问性 |
| cover-atlas.ts | 图块容量依赖构造时的 records.length | 后续双模式/切模块必须支持可控重建，共享一个 renderer |
| public 内容 | 无正文或多类内容 | JSON 管结构，Markdown 管长文，本地图片管媒体 |
| scripts/contracts.test.mjs | 把既定 URL 当成断言，维护者改 URL 会误报 | 改为校验格式与配置/输出一致性 |
| .github/workflows/pages.yml | 手动静态发布已具备 | 构建前加入内容校验，不默认联网同步 |

目前没有 FOCUS/ARCHIVE、友链、音乐记录模型、博客/社交/OC 数据、人工覆盖、内容 Schema 或本地 Studio。不能把三入口档案架声称为完整私人档案馆。

## 最简维护架构

- 内容：JSON（设置、结构化记录、覆盖和永久隐藏）+ Markdown（OC 等长文）+ public/media 图片。暂不引入 YAML、CMS 或数据库。
- 自动缓存：generated/<module>.json；同步器只可写 generated，失败保存上次成功内容。人工内容只在 content。
- 构建：共享 schema 验证 → 人工优先合并 → 仅导出公开记录 → 小型目录 + 按模块 JSON/正文。网页组件不访问第三方 API。
- 展示：轻量原生 DOM 组件与模式控制；三维适配只消费标准记录，不拥有业务配置。
- Studio：后续本机 Node HTTP 服务真实读写同一份文件，localhost + Host/Origin 校验 + 可恢复删除，公开构建不含管理端代码。

## 来源状态

已尝试读取用户指定的友链、博客与 OC 页面；网页检索服务本轮返回 cache miss / timeout，不能从缺失响应虚构友链或角色设定。随后用直接 HTTP 请求确认博客 RSS 返回 200、友链页和 OC 主页可读；记录了三位友链及两篇 OC 来源链接。初始 OC 仅填写已证实信息，戚风刃只登记用户给出的名称，不虚构设定。

## 阶段验收

Phase 1 首先建立真实可编辑的数据链路：改配置/内容文件，无需 TypeScript，即可校验、预览并生成静态发布物。后续 Phase 2–7 继续按照需求推进，不能把此阶段当成全部功能已交付。
