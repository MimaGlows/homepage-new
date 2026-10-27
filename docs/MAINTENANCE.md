# 人工维护手册

目标：日常改内容只编辑 JSON / Markdown 或使用本地 Studio，不修改 TypeScript 或 Three.js。该手册随阶段更新；尚未实现的功能不得当作已交付。

## 启动与预览

安装 Node.js ≥22.12（Windows 可使用 Node 官方安装包，勾选加入 PATH）。首次在项目目录执行 `npm ci`。修改文件后运行：

```sh
npm run content:validate
npm run dev
```

浏览器打开终端给出的 localhost 地址。JSON/Markdown 保存后，开发页会校验并刷新；错误会指出文件和字段。生产预览使用 `npm run build` 和 `npm run preview`。`dist` 是输出物，不直接编辑它。

图形入口使用 `npm run manage`，打开 http://127.0.0.1:4317。它同时启动 4318 端口的真实网页预览，只监听本机。设置、友链、OC、音乐、博客、X 均保存到项目文件。点击“校验并保存”，再用右上“预览已保存网页”检查；未保存内容不会进入预览。公开构建不含 studio。

列表支持拖动或 ↑ 排序；自动条目编辑保存到 overrides，“解除全部人工覆盖”恢复自动值。“永久隐藏”可恢复，且不会因同步重新出现。上传图片生成 256/768/1440 WebP。每次保存前备份相关文件至 .studio/backups；“恢复副本”可撤销，恢复动作也有备份。并发编辑冲突会拒绝覆盖，先重新读取。

## 导航、主题、模块与备案

打开 `content/site.json`：name 改左下姓名；title 改浏览器标题。navigation 中三项的 title、url、order 管名称、地址和顺序，id 不要改。registration 管备案文字及链接；首次默认 FOCUS/day，可改 defaults。intro、particles、parallax 是独立开关。

moduleOrder 是模块展示顺序，必须保留六个模块名，顺序可换。modules.<模块>.enabled 控制公开；showInFocus / showInArchive 控制模式；displayLimit 控制显示条数；sorting 为 manual / newest / title。关闭模块不删除内容文件。关闭 syncEnabled 只停止自动更新，不删除已有缓存。

老 `config/links.json` 不再是配置来源，已迁移至 site.json，避免同时维护两处。

## 添加友链

在 `content/records/friends.json` 的 items 中新增：

```json
{"id":"friend-example","type":"friend","title":"朋友的小站","description":"一句介绍","url":"https://example.org/","image":"/media/friends/avatar.webp","order":10,"published":true,"pinned":false,"group":"朋友"}
```

图片放在 public/media/friends/。图片不存在时用默认档案图，校验给出提示。用 pinned:true 置顶；order 越小越靠前；published:false 隐藏。删除自动友链时，将 ID 加进 content/tombstones.json，防止下次同步回来。修改自动信息用 content/overrides.json；不要编辑 generated。

## 新增 OC 与更换立绘

在 `content/records/characters.json` 添加 type:character 的记录，bodyFile 例如 `characters/fourth.md`，然后创建 `content/characters/fourth.md`。只需要数据和图片，不复制页面组件。

把立绘放在 public/media/characters/，或在 Studio 上传；其他图片用 artworks，只有 public 不为 false 的图片公开。关系用 relations 的 targetId 指向另一个人物稳定 ID；public:false 不导出。详细设定写 Markdown，支持安全的标题、列表、引文、强调和 HTTPS 链接，不执行原始 HTML。缺少的角色事实留空并附来源，不让 AI 代填。

## 添加或隐藏音乐、修正链接

在 content/records/music.json 添加 type:music 的记录，必须有 title 和 artist。platformLinks 存各平台 HTTPS URL。置顶喜欢的歌用 featured:true / pinned:true。对自动记录的 Apple URL 修改应写入 overrides 的 platformLinks，并设置 confirmed:true；同步器只能写 generated。

Studio → 音乐 →“合并 / 拆分 / 禁止合并”：选 A 和 B，合并后 B 是主录音；拆分 A 会将 A 独立，其他成员保持一组；禁止合并会保留人工约束。这些决定写入 overrides，再次同步不会撤销。自动歌曲若不公开，可用“隐藏”或永久隐藏；任一组内成员被隐藏，整首统一录音不公开。

编辑歌曲时直接修改 Apple / 网易云 / YouTube URL；人工修改标为 confirmed，优先于自动搜索。官方 Apple 自动匹配需要本地 developer token，来源页启用 apple-catalog 和模块“允许同步”后执行。只保存官方 Catalog 返回的 URL；无时长的模糊搜索不会擅自认定匹配。尚未配置真实 token，本轮仅验证官方请求形状与匹配规则，未声称成功连接 Apple。

音乐列表支持导入本人网易云或 YouTube 导出 JSON，也可手动新增。导入只写 generated，不修改人工内容。Last.fm 读取需在 .env.local 写 LASTFM_API_KEY，用户名已为 MimaGlows，然后同时启用音乐模块同步和来源。用户已选择稍后配置；当前不显示虚假的最近收听。

## 精选博客、朝花夕拾与 X

博客手动记录在 content/records/blog.json，type:blog；tags 中加入“朝花夕拾”，featured / pinned 管精选，description 是本人修订摘要。外部文章用完整 HTTPS URL。自动文章用 overrides 改摘要、封面和顺序。

X 手动记录在 content/records/social.json，type:social，填写原帖 URL 和本人可合法使用的摘要。关闭 social 模块后不显示空白区域。网页不会默认加载第三方时间线脚本。

## 人工覆盖的写法

```json
{"schemaVersion":1,"items":[{"id":"自动条目的稳定ID","patch":{"title":"人工名称","description":"人工摘要","published":false}}]}
```

位于 content/overrides.json。人工记录优先于自动缓存；覆盖又优先于人工记录。删除某条 override 后恢复人工记录或自动值。tombstones 是最高级永久隐藏，移除其中的 ID 可恢复。修改时保留原 ID，避免把旧隐藏项变成新条目。

## 发布与误操作恢复

确认本地预览后，运行 npm run check / npm run build，检查 dist。提交 content、generated、public/media 与必要源码到自己的 Git 仓库，再使用手动 Pages 工作流或现有静态托管构建。发布动作不由保存内容自动触发。

先使用 Git 提交建立恢复点，才能用 `git restore -- content/records/friends.json` 恢复这个文件到已提交版本；不要不加路径地恢复整个工程。当前已有未提交源码，应先审阅和备份，不能假设远端拥有这些内容。Studio 本地恢复副本独立于 Git，不能代替定期提交。

操作原则：保存 → 校验 → 预览 → Git 提交 → 手动发布。第三方同步失败时不要清空 generated，先查看上次成功时间和错误状态。

## 访客画面设置

右上滑杆图标打开低/中/高三档，选择立即生效并仅保存到访客本机，不修改网站内容文件。中档开启 SMAA；高档开启 SMAA、更精细玻璃/阴影和完整空间微粒与夜间星点。低档用于节省性能。首次访问按设备选择低或中；手动选择后不会被自动降级，手机也可手动选择高档。

站点 defaults.particles=false 仍能完全关闭粒子。系统减少动态效果仍优先停止持续动画。画面设置不需要配置密钥，也不影响已有内容保存、同步或发布流程。
