# 架构

四层各自负责一件事：内容文件管事实，配置文件管显示选择，展示层管网页布局，三维层管真实玻璃与镜头。

```text
content/records + Markdown + media    generated/ 自动缓存
               ↓                         ↓
        Schema 校验 → 人工优先合并 → 隐私过滤
                         ↓
      data/catalog.json + modules/*.json + bodies/*.json
                         ↓
        DOM 展示 / FOCUS / ARCHIVE（同一稳定 ID）
                         ↓
        渲染适配器 → 一个 ArchiveScene / WebGLRenderer
```

## 内容与配置

JSON 是唯一结构化格式。Schema 源在 scripts/content/schema.mjs，导出为 content/schemas 供编辑器识别。校验、构建与 Studio 复用这一份规则；没有额外框架、数据库或远程 CMS。

content/site.json 集中管理姓名、导航文字/URL、备案、默认主题/模式、开场、粒子和模块设置。content/records 管人工条目，content/characters 管 Markdown。generated 管自动缓存和同步状态；不能直接覆盖人工文件。永久隐藏、覆盖和手动记录有独立优先级。

生成器 scripts/content/project.mjs 验证全工程后合并。人工强制覆盖 > 手动记录/精选/隐藏 > 自动缓存 > 默认占位；永久隐藏最高。published:false、archived:true、禁用模块、私密关系与图片不进入静态 JSON，隐藏正文也不生成。错误包含文件与字段；缺图指向真实本地默认图。

生产构建关闭整个 public 的盲目复制：只导出核心场景资源、许可文本与公开档案实际引用的图片。隐藏立绘和未使用上传不进入 dist；开发服务器只在本机预览源文件。直接更改主图时，会忽略属于旧主图的自动尺寸版本，避免详情仍显示旧图。

通用静态场景预览使用中性纹理截图，避免先前公开的 OC 肖像在隐藏后仍被烘焙保留于回退背景。模型、玻璃、相机与光照是真实渲染；动态接管后展示当次发布的公开内容。

## 静态生成与预览

scripts/content/vite-plugin.mjs 在开发和构建共用：HTML 直接注入姓名、真实 href 和备案；浏览器不等 JS 才得到入口。开发时监听内容/缓存文件，校验后整页更新；错误显示开发叠层。构建时导出公开目录与按模块 JSON/正文，不在公开浏览器导入 Node 文件处理或管理代码。

公开组件只读同源静态 JSON，模块数据与正文在浏览时按需获取。Three.js 仍由动态 import 请求。外部内容 API 不由公开网页请求；只有用户点击 X 官方时间线时才加载其脚本。断网/接口故障不会清空已发布的缓存。

## 三维边界

src/engine 保留原生模型、着色、灯光、阴影、相机与编排；src/engine/data.ts 只将标准档案适配为 renderer records。修改业务内容、排序或增加 OC 不修改该适配器。

显示池为 9×40；重复卡片按稳定记录共享纹理图块，图集现在能按记录数换行，不把所有图块挤在一条纹理上。显示模式必须共享 scene、renderer 和图集；不能为 FOCUS 和 ARCHIVE 各创建一套 GPU 管线。

当前 22 条公开目录用 8 MiB RGBA 图集；大目录的图集上限 16 MiB，按卡片数降低远处缩略尺寸，抽取封面保持 1024px。两种模式不重新建 renderer 或图集，解码队列/图片缓存共用。

静态四张真实场景预览、短暂延后动态导入、1.2 秒淡入、20 秒超时、WebGL 失败回退、后台暂停和 reduced-motion 保留。初始 shell JS 预算仍为 18 KB；模块/管理代码不塞入首屏。日常设置不暴露 shader 参数。

画面参数集中在 src/config/graphics.ts，只公开低/中/高三档。初次手机、≤4 核或已知内存 ≤4 GiB 采用低档，其他默认中档；未手动选择时，桌面在 4 秒热身后观察连续 3 秒，平均帧间隔 >36 ms 自动降至低档。访客手动选择保存在 mima-quality，本次访问和刷新后都不自动降级。中/高启用原管线已有的 SMAAPass，高档 125% 渲染比例、DPR 上限 2，继续受 8.3 MP 缓冲预算限制。

低档关闭粒子/扫描、AO/DOF，限制 30 fps；中档约 45% 粒子、AO16、2048 阴影；高档完整 140 星点/96 空间微粒、AO32、4096 阴影和完整透射。站点粒子总开关仍生效，减少动态效果保留静态粒子并停止常驻 RAF。切换复用 renderer、模型、图集和相机；只调整后处理、纹理/阴影预算和粒子 drawRange，不替换玻璃。

档案浏览区使用 archive-workspace：桌面保留目录与独立滚动详情，手机同一区域切换列表/详情；标题和类别不随正文滚动。底部导航和备案始终在面板之外。

## 本地管理与同步

Studio 使用 localhost Node HTTP 服务直接保存上述文件。保存先用候选文件校验完整工程，再保存恢复副本并原子替换；修订哈希防止覆盖其他窗口编辑。Host/Origin、随机请求 token、路径/符号链接边界和上传类型都在服务端验证。管理端与 Node 图片/XML/HTML 依赖不进入公开脚本。

同步命令/Actions 是独立适配器层。令牌只在同步进程中读取；错误经过清理。失败保留 lastSuccessfulAt 和 items。Last.fm 为已选来源，用户名 MimaGlows；尚需 API Key。Apple 官方匹配与音乐人工映射放在音乐业务层，不能进入渲染引擎。

music.mjs 将源录音归并为 CanonicalTrack，真实 PlayEvent 独立保存，多平台链接按人工确认优先合并。历史缓存轮转与重复导入保留人工映射/隐藏所需的旧别名；容量不足时报告失败并保留旧缓存，不静默丢弃决定。首屏只持有目录摘要；收藏、合并和隐藏不是 shader 参数。

阶段实际完成度见 ROADMAP；历史 v4 性能数值见 audits，不自动代表新内容版本。
