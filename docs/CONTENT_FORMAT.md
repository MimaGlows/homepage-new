# 内容格式

只使用两种文本格式：JSON 管结构，Markdown 管长文。图片为 public 下的普通文件。`content/schemas/*.schema.json` 为编辑器 Schema，`npm run content:validate` 使用同一份定义和跨文件检查。格式错误会显示如 `content/records/friends.json.items[0].url`。

## 文件职责

| 文件 | 维护者 |
|---|---|
| content/site.json | 网站、导航、备案、主题、模式、模块配置 |
| content/records/*.json | 人工记录；每个文件 schemaVersion:1 + items 数组 |
| content/characters/*.md | OC 等长篇正文 |
| content/overrides.json | 对稳定 ID 的强制字段覆盖 |
| content/tombstones.json | 永久隐藏的 ID 数组 |
| content/sync.json | 公开来源配置；只有环境变量名，不能填令牌值 |
| generated/*.json | 自动同步结果及状态，失败保留上次 items |
| content/examples/records.json | 不发布的已验证示例 |
| dist/data/catalog.json | 构建产物，只有公开目录摘要 |
| dist/data/modules/*.json | 按需加载的公开详细记录 |
| dist/data/bodies/*.json | 仅公开记录的 Markdown 正文 |

## 通用字段

必填：id（稳定、小写字母/数字/点/横线/下划线/冒号）、type、title（非空）。type 可为 navigation、friend、music、blog、social、character。navigation 的初始三条由 site.json 生成。

可选默认值：description 空字符串，image 默认 /assets/placeholder.svg，published:true，featured:false，pinned:false，archived:false，order:100，modes:["focus","archive"]，tags:[]。updatedAt、publishedAt、lastPlayedAt 使用 UTC ISO 时间，例如 2026-10-26T00:00:00Z。

url 必须完整 HTTPS，不接受 javascript、data、用户名密码或协议相对链接。image 只接受 /media/ 或 /assets/ 下的本地文件路径；正文 bodyFile 相对于 content，不允许 .. 越界。外部图片应先由同步/图片处理工具缓存成本地媒体，避免公开页面依赖图片 API。

隐藏和归档都不导出公开数据。相同层内 ID 不可重复；跨人工/自动层同 ID 是有意覆盖，类别必须相同。置顶优先，然后按模块 sorting，再以 ID 稳定排序。order 越小越靠前。

## 专属字段

- 友链：group、source（url / attribution / license / retrievedAt）。
- OC：bodyFile、artworks[{image,caption,sourceUrl,attribution,public}]、relations[{targetId,label,public}]、articleLinks[{title,url}]。只有公开人物之间的公开关系可导出。
- 音乐：artist 必填；album、isrc、duration（秒）、version、platformLinks[{platform,url,platformId,confirmed}]、lastPlayedAt。合法 ISRC 例如 USABC2600001。canonicalId 指向人工确认的主录音，指向自身表示独立；mergeLocked 禁止再自动归并，neverMergeWith 保存禁止合并 ID。Studio 操作会写这些字段，无需手改代码。
- 博客/社交：publishedAt、source；主题通过 tags，例如“朝花夕拾”。

## 自动缓存与优先级

缓存格式为 schemaVersion:1、source、items；可有 lastAttemptAt、lastSuccessfulAt、error、playEvents。播放事件独立存 id / trackId / playedAt / platform，不能把“播放一次”和“某首录音”混为同一个 ID。

Apple 官方匹配独立缓存 matches[{trackId,platformLinks,method,matchedAt}]，method 为 id/isrc/metadata。构建输出 CanonicalTrack，并带 aliasIds、playCount、lastPlayedAt；原始 PlayEvent 留在 generated，不作为公开个人流水导出。任一成员被永久隐藏或标为不公开，统一录音也不公开，避免换平台别名后恢复。自动匹配要求版本一致；无 ISRC 时要求歌名/歌手相同且已知时长差不超过 2 秒。

图片字段 image 为 768 WebP，thumbnail 为 256，imageLarge 为 1440；手写单个本地 image 也有效。source.imageUrl 可保留原图 HTTPS 出处；版权说明不代表将第三方图片改授 MIT。

优先级：tombstone 永久隐藏 > overrides 强制覆盖 > 手动记录 > 自动缓存 > 默认占位。人工隐藏、精选和顺序属于手动层，不允许下一次同步覆盖。失败时缓存数据保留；模块 fallbackBehavior 可选择 cache、manual 或 hide。

维护者只需关注常用字段；不要把 shader 参数放进内容文件。完整允许字段见 Schema；字段拼错会报错，不会悄悄忽略。
