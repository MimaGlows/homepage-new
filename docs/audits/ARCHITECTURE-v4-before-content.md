# 架构和性能边界

## 首屏不依赖三维

HTML 内有真实姓名与 href；`config/links.json` 在 Vite transformIndexHtml 阶段注入。CSS 约 8 KB，系统字体，不引入网络字体。picture 在 HTML 中可被解析器立即发现，手机选择自己的 WebP。所有资源采用相对 base，支持静态子目录。

shell 的运行时 import 图不含 Three.js；只有 type import，在编译后被擦除。`modulePreload:false` 禁止 Vite 将三维依赖提前塞进首屏。两次 RAF 后延迟 400ms 导入场景；这只是让静态层优先，不声称浏览器空闲 API 或 shader 成本已消失。

首屏预览来自本项目真实 WebGL 渲染，含昼/夜、桌面/手机四种构图。先显示图片，再让不透明 WebGL canvas 以 1.2 秒 opacity 过渡覆盖；失败时反向回到图片。姓名与链接层始终独立于 canvas。Chrome 本轮把姓名按钮作为 LCP 候选，因此额外记录 `mima:preview-visible`，不能用文字 LCP 代替背景就绪。

## 原生引擎保留与精简

`src/engine/scene.ts` 和玻璃、灯光、镜头、波形、主题过渡等核心模块来自指定 tag，见 SHA 清单。入口不再 import 原 music-app，所以播放器、CoreAudio/FFmpeg、曲库轮询、介绍管理、设置面板、原字体准备、PWA 和全管线预热均不进入运行路径。保留引擎的部分兼容方法不表示提供旧 `?original=1` 档案入口；本个人主页只使用音乐盒渲染路径。

- 可见池：9 × 40 = 360 实例，仍使用 InstancedMesh、原生几何与完整编排时钟。减少远端深度，不改变盒体比例、列距和镜头轨迹。修改深度必须检查完整重播，避免边缘露空。
- 纹理：三个记录分别拥有一个 256px tile，所有重复实例共享 tile。768 × 256 RGBA = 786,432 bytes（0.75 MiB）；不随可见池实例数增长。选中纹理仍为独立 1024px；快照与归位副本维持原材质路径。
- 封面：三张 WebP 共约 80 KB，无原 PNG/SVG 重复下载。图片解码并发、过期取消与有限缓存保留。
- 桌面：DPR ≤1.5、AO 16 samples/半分辨率、DOF 65%、透射 0.75、2048 阴影，最多 60 FPS。
- 手机/粗指针：DPR ≤1、无 AO/DOF、透射 0.5、1024 阴影，最多 30 FPS。透射和真实光照继续保留。
- 后台停止 RAF。减少动态效果时在改变状态后有限绘帧，静置停止调度。GPU 时间未直接测量；CPU longtask 不等于 GPU 耗时。

20 秒超时覆盖动态 import 和模型阶段；AbortController 触发场景释放，过期异步完成不能重新接管。GLB loader 底层网络请求本身不支持此控制器取消，但迟到资源不会重新初始化场景。无 WebGL、资源失败、context loss 均显示静态画面与重试。BFCache 暂停并复用，不卸载；普通卸载释放 GPU。

## 维护预算

- shell JS 原始体积 ≤18 KB；Three.js 只能出现在后续 chunk，禁止 modulepreload。
- 首屏预览目标：桌面 <120 KB，手机 <70 KB/主题；压缩参数可以调整，必须目检玻璃边缘。
- public 不含音乐、网络字体、音乐服务、未使用的旧模型。
- 每次修改运行 `npm run build`（含产物预算检查）；交互改动跑真实浏览器 QA。性能目标为文字/导航约 1 秒可用、LCP 争取 <2.5 秒；必须按实际环境重新测量。

当前 Three.js 公共 chunk 约 940 KB minified、300 KB gzip，仍有真实下载、解析和 shader 工作。低端 GPU 可以在静态层停留更久；本版本未宣称所有设备 60 FPS。后续优化优先基于现场 Performance/Network 和目标设备采样，避免为了缩小数字删掉光学层次。
