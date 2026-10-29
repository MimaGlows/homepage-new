# 来源、差异与许可

## 实际接手状态

工作目录原始 Git HEAD：`c68e4c9`，只有旧 `dist/index.html / script.js / styles.css` 和已有 Sites hosting manifest，无 npm 工程。旧页已保存到 `docs/previous-site/`。

用户 ZIP `MimaGlows_Rhine_Interactive_v3.zip` 是改造包，不含 Three.js 主工程。已完整保存 `docs/handoff-v3/`；审阅了 README、Python 改造器、Windows 启动器、overlay JS/CSS、链接及封面。脚本被视为参考实现，未直接作为新运行入口。

指定上游在临时独立目录检出：

- [RonaldDeng/Rhine-Music-Demo v0.5.0](https://github.com/RonaldDeng/Rhine-Music-Demo/tree/v0.5.0)
- Commit：`d200b84983e05cb306e49e564fe57113893e7056`
- 上游 README、设计约定、AGENTS 和 package.json 保存于 `docs/upstream/`；根目录保留原 LICENSE、NOTICE.md、README.original.md。
- 上游最初引用 [LBEILC/RhineLabUI 5abab02367465d9189f4ae65bcb6f17fdb5938f7](https://github.com/LBEILC/RhineLabUI/tree/5abab02367465d9189f4ae65bcb6f17fdb5938f7)。

另外在临时副本实际运行原 v3 改造器、按原锁文件安装和构建，并用相同 Chrome 生产预览测量。没有运行本机音乐服务、读取私人曲库、修改 service worker 存储或向上游推送。

## v3 的主要问题

v3 把个人 overlay 加在原 app 之上，并用 CSS 隐藏播放器。原 music-app 仍完整 import、准备多款约 19 MiB 字体、初始化音乐和设置模块，并预热 612 槽位封面图集。它还默认夜间，并用全屏不透明验证层盖住姓名和导航，约 2.6 秒后才解除；与本次静态首屏目标不一致。

交接文档提到约 85 MB GLB，但指定 tag 当前使用的 `music-case-v043.glb` 实测 **78,948 bytes**。本轮不把未经核实的旧资源大小作为优化基线。

## 保留与改动

`src/engine/` 中保留 30 个模块；当前 24 个与该 tag 字节相同，包括 `appearance.ts`、`music-model.ts`、`music-camera.ts`、`music-intro-motion.ts`、光学与主题过渡。`scene.ts` 包含内容可见性、图片刷新、双模式相机构图及真实实例编排；`music-lighting.ts` 调整了昼夜的选中照明，原玻璃着色、GLB 和相机运动机制继续复用。当前与原始 SHA-256 见 `upstream-manifest.json`，可运行 scripts/update-upstream-manifest.mjs 重算当前值。

| 文件 | 变化 |
|---|---|
| `src/engine/archive-loop.ts` | 显示池从 9×68 改为 9×40；盒体、列距与时钟不变 |
| `src/engine/cover-atlas.ts` | 重复实例按稳定记录共享图块，多行图集/16 MiB 上限/URL 更新；保留原印刷 shader、加载取消与快照，抽取封面仍为 1024px |
| `src/engine/data.ts` | 标准内容到原档案结构的薄适配器，日常内容不写在引擎中 |
| `src/engine/scene.ts` | 可见 ID 过滤、双模式相机构图、实例升降、图片刷新及粒子/视差开关；复用原 SMAA 管线、原模型和相机运动 |
| `src/engine/music-lighting.ts` | 调整昼夜选中光与环境填充强度，保留原局部光源和材质着色机制 |
| `src/engine/generated-album-cover.ts` | 仅本地系统字体的缺图回退，移除字体等待及原生成器依赖 |
| `art/build-music-case.mjs` | 仅调整引擎目录路径；模型参数和建模过程保留 |
| `src/scene.ts` | 新增精简控制器，替代庞大 music-app 的启动与 UI 所有权 |
| HTML / shell / config | 新增静态姓名和链接、渐入接管、主题、开场、重试与可访问交互 |

GLB 与上游字节相同，原始 SHA 见清单。模型生成器保留。旧原版档案入口、音乐服务和 PWA 不提供；未使用的旧 GLB、字体、音频、演示封面及服务脚本未复制进 public。

新增的网页内容、管理与同步逻辑独立于上游引擎。公开 OC 设计稿注明 MimaGlows 设定与虫子Neurax绘制；RSS/友链图片保留原图出处和权利归属。第三方素材未改授 MIT。

## 权利边界

上游 `LICENSE` 为 MIT，署名 **Copyright (c) 2026 LBEILC** 及 **Copyright (c) 2026 RonaldDeng**；使用、修改和分发其重要代码时保留完整文本。生产目录包含 `licenses/project-mit.txt`、`three.txt` 和上游资源说明。

上游 `NOTICE.md` 明确说明：`.blend`、GLB、原作相关图像/标志及视觉设计等非代码素材，不因代码采用 MIT 自动获得全部再分发许可。本项目保留该说明，没有重新声称原模型或《明日方舟》元素属于 MimaGlows 原创，也没有将模型与预览统一改授 MIT。原封面来自用户交接包，压缩和截图不改变底层权利。

用户还列出了 [rhine-lock](https://github.com/tmc5csxr9m-cpu/rhine-lock) 作为参考；其 README 声明代码为 AGPL-3.0-or-later。本项目未复制其代码或素材，只独立实现装饰验证，所以没有把 AGPL 代码混入此 MIT 衍生工程。也未从 RhineLabUI 再下载其他素材；本轮实际复用均来自指定音乐项目。

这些是仓库许可和本次复用范围的记录，不代表已获得所有第三方非代码素材的额外授权。本次只交付本地开发结果，没有公开发布。
