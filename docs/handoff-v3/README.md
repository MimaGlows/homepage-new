# MimaGlows · Interactive Rhine Archive v3

**保留 [RonaldDeng/Rhine-Music-Demo](https://github.com/RonaldDeng/Rhine-Music-Demo) v0.5.0 原生 Three.js 场景的极简个人名片改造包。**

本项目不制作假的 3D 视觉图层，也不替换原项目的透射玻璃模型、灯光系统、镜头轨道与专辑架运动；只把演示专辑替换成三份个人档案并覆盖个人界面。三个对外链接仍由你在 `public/mima/links.js` 配置。

## 新增功能

- **主题切换**：右上角太阳 / 月亮按钮同步切换原版 Three.js 三维场景和 HUD 色调；可用 D / N 快捷键；保存到本地浏览器，下次访问保留。默认夜间。
- **入场验证动画**：约 2.6 秒的视觉序列、同心环、身份状态和进度条；`Skip Intro` / Esc 可跳过；点击左下角 `MimaGlows` 或按 R 重播（原版镜头有准备完毕后才重播）。**这只是装饰性开场，不执行真实登录、鉴权或密码操作。**
- **粒子与视差**：画面上方少量环境尘埃粒子，鼠标视差，主题响应及切档短暂光感增强；轻量 2D Canvas，原版三维渲染不受影响；P 键可以关闭 / 打开粒子。
- **更多互动**：鼠标悬停三个链接驱动原始 3D 镜头；顶部三个细刻度可选择档案；背景鼠标滚轮、触控横滑以及左右方向键切换；背景双击进入当前链接。支持键盘焦点、减少动态效果设置、小屏幕布局。

## Windows（推荐）

先准备 Git、Python 3.10+ 和 Node.js 22.12+。

1. 解压 ZIP，打开 `MimaGlows_Rhine_Interactive_v3` 文件夹。
2. **双击 `INSTALL_WINDOWS.bat`**，它会优先使用 Windows 的 `py -3` 启动器，因此可以绕过之前 `python3` 没有输出的情况。
3. 初次运行将从 GitHub 拉取 `Rhine-Music-Demo` v0.5.0，并打上补丁。完成后打开 PowerShell：

   ```powershell
   cd .\Rhine-Music-Demo
   npm ci
   npm run dev
   ```

4. 打开 Vite 命令行输出的网址，通常是 `http://127.0.0.1:5173`。

如果**你之前已经用 v2 改造过原项目**，不用再下载原项目。可以在 PowerShell 中执行：

```powershell
py -3 -u .\patch_rhine.py --repo "C:\完整路径\到\原来的\Rhine-Music-Demo"
```

或将路径传给批处理：

```powershell
.\INSTALL_WINDOWS.bat --repo "C:\完整路径\到\原来的\Rhine-Music-Demo"
```

脚本支持从 v2 就地升级到 v3；不会重复覆盖 Three.js 主渲染器。已有项目如果源码不是原版 v0.5.0 或兼容的 v2 衍生版，脚本会拒绝未知补丁位置。

## macOS / Linux

```sh
python3 -u patch_rhine.py
cd Rhine-Music-Demo
npm ci
npm run dev
```

## 配置真实链接

打开 `Rhine-Music-Demo/public/mima/links.js`：

```js
window.MIMA_LINKS = Object.freeze({
  blog: 'https://your-site.example/blog',
  minecraft: 'https://your-site.example/minecraft',
  stronghold: 'https://your-site.example/stronghold-protocol'
});
```

这三个网址目前是占位值，不代表你的真实网站地址。

## 文件说明

| 文件 | 用途 |
| --- | --- |
| `patch_rhine.py` | 自动拉取原项目、安装改造、或升级原有 v2 项目 |
| `INSTALL_WINDOWS.bat` | 优先使用 `py -3` 的 Windows 启动入口 |
| `site/overlay.js` | 主题持久化、登录动画、颗粒场、交互与三维场景联动 |
| `site/overlay.css` | 原版三维层上方的极简亮暗 HUD |
| `site/links.js` | 真实网站地址 |
| `site/cover-*.png` | 三份原创抽象档案封面 |

## 性能与验证边界

Canvas 粒子在移动端自动减少、设备像素比有限制，并支持 `prefers-reduced-motion`。本机验收应检查 WebGL2 渲染、档案列切换、日夜灯光过渡和手机触控。当前交付中，Python 补丁的入口、安装与升级逻辑、前端语法和模拟 DOM 交互可以自动测试；**原项目约 85MB 的 GLB 模型、真实材质与 WebGL 动画尚未在此环境完整构建渲染验证**，因此不能声称已达到上游最终视觉质量或所有浏览器完全兼容。

## 授权与来源

保持上游 `LICENSE`、`NOTICE.md` 和署名：音乐工程由 RonaldDeng 维护，原始 RhineLabUI 作者为 LBEILC。原作《明日方舟》的商标、字体、音乐与非开源视觉素材仍按各自许可处理。新增个人封面和界面代码为非官方同人改造内容。
