# 同步来源与人工优先

公开网页只读本站构建好的 JSON，不请求第三方 API。同步器运行在本机或手动/定时 GitHub Actions，令牌只读环境变量；自动结果只写 generated。所有平台都允许关同步后使用手动和上次缓存。

| 来源 | 方式与状态 | 授权 | 建议间隔 / 失败处理 |
|---|---|---|---|
| Blog | https://mimaglows.com/rss/，本轮直接 HTTP 读取 200；Ghost Content API 作为以后可选方式 | 公开 RSS 不需密钥 | 24 小时；保留上次结果 |
| 友链 | https://mimaglows.com/about-2/，解析公开书签容器，不抓全站 | 用户指定公开友链来源 | 168 小时；人工覆盖优先 |
| OC | https://nanakaze.mimaglows.com/ 的公开设定文章；以手动 Markdown 为主 | 用户提供来源，注明作者和图片权利 | 不自动覆盖本人设定 |
| Last.fm | 用户 MimaGlows，官方 user.getRecentTracks | 本地 LASTFM_API_KEY；该读取方法不需要用户密码或会话签名 | 24 小时；缺 key 不清空缓存 |
| ListenBrainz | 可选用户名 public listens | 公开读取接口；仅在配置后启用 | 24 小时 |
| Apple Music | 官方 Catalog API，用 ID/ISRC 再谨慎搜索 | APPLE_MUSIC_DEVELOPER_TOKEN，仅同步端；保存接口返回的歌曲 URL | 不在浏览器做搜索；人工确认结果优先 |
| 网易云 / YouTube Music | 采用本人导出文件导入或已授权记录中间层 | 不要求 Cookie，不引入非官方登录服务 | 按本人导入；保留平台来源 |
| X | https://x.com/MimaGlows；手动精选为可用回退，未来官方接口可选 | 不做绕过登录或未授权抓取 | 时间线仅用户主动选择后加载 |

Last.fm 参数与权限以[官方 user.getRecentTracks 文档](https://www.last.fm/api/show/user.getRecentTracks)为准。Apple 查询使用[官方 Catalog Song API](https://developer.apple.com/documentation/applemusicapi/get-a-catalog-song)，不能把拼接搜索地址当作已匹配歌曲链接。

content/sync.json 管来源 enabled，content/site.json 的模块 syncEnabled 管总开关；二者都启用才执行。refreshInterval / refreshHours 是小时。失败记录 lastAttemptAt 与经过清理的错误，lastSuccessfulAt 和 items 不变。新来源返回无效数据不落盘。不能将第三方完整错误响应、认证头、Cookie 或 token 保存进公开缓存。

自动获取数据只进入 generated；手动新增在 content/records，强制修正在 content/overrides，永久隐藏在 content/tombstones。手动改过的链接、合并关系、图片和顺序不得在下次同步时重置。所有来源关闭不影响静态构建。

当前进度与各适配器的实际验收见 docs/ROADMAP.md；配置存在不代表已成功连接真实账号。不能用示例数据冒充最近听歌。

博客和友链已实际同步。运行 `npm run sync -- --force`，或 `--source=blog-rss` 指定来源。force 只忽略时间间隔，不绕过开关。图片读取失败回退旧图/占位图；本地转换为 256/768/1440 WebP。

如果本机 TUN 代理把域名映射到 198.18 测试网段，可在 .env.local 显式配置 `MIMA_SYNC_DNS_DOH=1`，通过固定公共解析器获取真实公网 A 记录并固定连接地址。它不允许访问私网。普通网络无需此项。来源请求限制 HTTPS、大小、超时与重定向，不转发跨域令牌。

## 音乐来源操作

- Last.fm：使用官方 HTTPS user.getRecentTracks，未提供 API Key 时返回可读状态并保留缓存。nowplaying 无完成时间戳，不伪造 PlayEvent。每次只取近期最多 100 条；缓存最多 500 首与 10000 条播放事件，不拉取整个历史。
- ListenBrainz：配置公开 username 后，使用官方 `/1/user/{name}/listens` 有界近期读取，不用该接口遍历完整历史。[官方接口](https://listenbrainz.readthedocs.io/en/latest/users/api/core.html)。
- Apple：配置 APPLE_MUSIC_DEVELOPER_TOKEN，官方 catalog 地区默认 cn，可在 Studio 修改 storefront；按已知数字 ID、ISRC、最后才歌名/歌手/时长/版本检索。多个候选或证据不足保留人工处理，不拼造歌曲 URL。[官方 ISRC 方法](https://developer.apple.com/documentation/applemusicapi/get-multiple-catalog-songs-by-isrc)。
- 网易云：Studio 音乐导入支持本人授权 JSON 的 songs/tracks 数组，name、ar[{name}]、al{name}、dt（毫秒）、数字 id。没有播放时间的歌单只创建录音，不伪造收听事件。
- YouTube Music：导入本人 Google Takeout JSON 数组，title/titleUrl/subtitles/time；保留原链接和原时间。频道名可能不等于歌手，应在 Studio 核对修正；未知字段不推断。
- 通用手工导出可用 `{tracks:[{id,name,artist,album,duration,isrc,url}]}`，duration 为秒；在 Studio 选择对应平台。CLI 来源可指定 `importFile:imports/name.json`，目录不进入公开构建。禁止含密码、Cookie 或令牌的导出文件；导入文件只处理音乐字段。

公开网页完全不调用上述 API。API Key 与 Apple token 尚未配置，未进行真实账号联调；本轮真实同步证据是公开 RSS 和友链。适配器/人工纠错使用隔离测试数据验证，未把测试歌曲放入网站内容。

GitHub 的 “Refresh public content cache” 手动工作流输出 generated 与 public/media 的审核工件，不编辑 content、不推送、不发布。下载审核后合入本地并构建；之后确需无人值守定时更新时，再明确配置仓库调度及提交策略。
