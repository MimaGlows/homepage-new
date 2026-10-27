#!/usr/bin/env python3
"""MimaGlows Interactive Archive v3 adapter for Rhine-Music-Demo v0.5.0.

Keeps the upstream renderer, lighting, camera rig, case meshes, motions,
model resources, and attribution. Applies only targeted content/UI changes.
"""
from __future__ import annotations
import argparse
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MARK = 'MIMAGLOWS_OVERLAY_V2'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one matching upstream anchor; got {count}. Use Rhine-Music-Demo v0.5.0.')
    return text.replace(old, new, 1)


def build(repo: Path) -> None:
    index = repo / 'index.html'
    app = repo / 'src/music-app.ts'
    demo = repo / 'src/demo-library.ts'
    for f in (index, app, demo):
        if not f.is_file():
            raise RuntimeError(f'Original upstream file not found: {f}')
    doc = index.read_text(encoding='utf-8')
    src = app.read_text(encoding='utf-8')
    if MARK in src and 'mima-overlay' in doc:
        print('检测到 v2/v3 已安装，更新为交互版 v3...', flush=True)
        upgrade(repo)
        return
    if MARK in src or 'mima-overlay' in doc:
        raise RuntimeError('Partially patched project; restore the upstream v0.5.0 files first.')

    # Demo mode is the browser-only mode. It renders real 3D geometry and
    # original lights, but does NOT need the local audio/FFmpeg service.
    src = replace_once(
        src,
        'const lightingDemo = new URLSearchParams(location.search).get("demo") === "1";',
        'const lightingDemo = true; // ' + MARK,
        'demo mode',
    )
    src = replace_once(
        src,
        'const lightingLab = new URLSearchParams(location.search).get("lab") !== "0";',
        'const lightingLab = false;',
        'development lighting panel',
    )
    # Use one record per genre column, so selecting each URL moves through
    # genuine 3D album lanes instead of only changing text.
    src = replace_once(
        src,
        'preferences.arrayMode = normalizeMusicArrayMode(preferences.arrayMode);',
        'preferences.arrayMode = normalizeMusicArrayMode(preferences.arrayMode);\n'
        'preferences.sortMode = "genre";\n'
        'preferences.arrayMode = "filled";\n'
        'preferences.theme = "night";\n'
        'preferences.sound = false;\n'
        'preferences.bgm = false;',
        'fixed personal archive defaults',
    )
    # Bypass text/slogan opener, retain the ~4.76-second 3D array motion.
    src = replace_once(
        src,
        'boot?.start(performance.now() / 1000);',
        'boot?.replayScene(performance.now() / 1000);',
        '3D-only intro',
    )
    # Expose an *optional* stable bridge for the custom navigation. This
    # operates through upstream motion state, not DOM spoofing or transforms.
    original = '    stats: () => scene?.getStats(),'
    replacement = '''    mimaNavigate: (index: number) => {
      if (!ready || boot?.active || !records[index] || !scene) return false;
      if (presentation.phase !== "archive") setMode("archive");
      const start = fileLocation(navigationSelection()).lane;
      const end = fileLocation(index).lane;
      if (start !== end || navigationSelection() !== index)
        select(index, start === end ? undefined : { axis: "lane", direction: end - start }, false);
      return true;
    },
    mimaTheme: (theme: "day" | "night") => {
      if (ready) setTheme(theme);
    },
    stats: () => scene?.getStats(),'''
    src = replace_once(src, original, replacement, 'scene motion bridge')

    demo_content = '''import type { MusicAlbum, MusicGenre } from "./music-types";
// Three unique columns, using the original music archive 3D case renderer.
export const demoGenres: MusicGenre[] = [
  { id: "mima-blog", name: "Blog" },
  { id: "mima-minecraft", name: "Minecraft" },
  { id: "mima-stronghold", name: "Stronghold-Protocol" },
];
export const demoAlbums: MusicAlbum[] = [
  {
    id: "mima-blog", title: "Blog", artist: "MimaGlows", genreId: "mima-blog", year: 2026,
    coverUrl: "/mima/cover-blog.png", rawGenres: ["MimaGlows"], folder: "MimaGlows personal archive",
    tracks: [], producers: [], offline: false,
  },
  {
    id: "mima-minecraft", title: "Minecraft", artist: "MimaGlows", genreId: "mima-minecraft", year: 2026,
    coverUrl: "/mima/cover-minecraft.png", rawGenres: ["MimaGlows"], folder: "MimaGlows personal archive",
    tracks: [], producers: [], offline: false,
  },
  {
    id: "mima-stronghold", title: "Stronghold-Protocol", artist: "MimaGlows", genreId: "mima-stronghold", year: 2026,
    coverUrl: "/mima/cover-stronghold.png", rawGenres: ["MimaGlows"], folder: "MimaGlows personal archive",
    tracks: [], producers: [], offline: false,
  },
];
'''

    # Outside #stage: the original app replaces stage.innerHTML at startup.
    # Insert our overlay in #viewport so it shares fullscreen/safe areas.
    overlay = '''
    <!-- MimaGlows custom nav; original scene renders underneath -->
    <div id="mima-overlay" aria-label="MimaGlows personal website">
      <span class="mima-corner tl" aria-hidden="true"></span>
      <span class="mima-corner tr" aria-hidden="true"></span>
      <span class="mima-corner bl" aria-hidden="true"></span>
      <span class="mima-corner br" aria-hidden="true"></span>
      <div class="mima-track" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="mima-footer">
        <div class="mima-signature">MimaGlows</div>
        <nav class="mima-links" aria-label="Links">
          <a data-mima-index="0" data-mima-link="blog" href="/blog">Blog</a>
          <a data-mima-index="1" data-mima-link="minecraft" href="/minecraft">Minecraft</a>
          <a data-mima-index="2" data-mima-link="stronghold" href="/stronghold-protocol">Stronghold-Protocol</a>
        </nav>
      </div>
    </div>
'''
    doc = replace_once(doc, '</main>', '</main>' + overlay, 'HTML overlay position')
    doc = replace_once(doc, '</head>', '    <link rel="stylesheet" href="/mima/overlay.css" />\n  </head>', 'stylesheet import')
    doc = replace_once(doc, '<title>RHINE MUSIC · V0.5.0</title>', '<title>MimaGlows · Archive</title>', 'website title')
    doc = replace_once(doc, '</body>', '    <script src="/mima/links.js"></script>\n    <script type="module" src="/mima/overlay.js"></script>\n  </body>', 'overlay script')

    # Write only once all upstream signatures passed.
    index.write_text(doc, encoding='utf-8')
    app.write_text(src, encoding='utf-8')
    demo.write_text(demo_content, encoding='utf-8')
    target = repo / 'public' / 'mima'
    target.mkdir(parents=True, exist_ok=True)
    for f in (ROOT / 'site').iterdir():
        if f.is_file():
            shutil.copy2(f, target / f.name)
    print(f'Patched: {repo.resolve()}')
    print('Uses original Three.js model, scene materials, lighting and camera motions.')
    print('Edit public/mima/links.js to replace the three placeholder URLs.')
    upgrade(repo)
    print('启动：进入 Rhine-Music-Demo 目录，依次运行 npm ci 和 npm run dev。', flush=True)



def upgrade(repo: Path) -> None:
    """Upgrade v2 and fresh installations without modifying upstream 3D visuals."""
    app = repo / 'src' / 'music-app.ts'
    index = repo / 'index.html'
    src = app.read_text(encoding='utf-8')
    doc = index.read_text(encoding='utf-8')
    if MARK not in src or 'id="mima-overlay"' not in doc:
        raise RuntimeError('未发现有效的 v2 入口，请先确认是 Rhine-Music-Demo v0.5.0。')
    if 'mimaReplay:' not in src:
        src = replace_once(src,
            '    mimaTheme: (theme: "day" | "night") => {\n      if (ready) setTheme(theme);\n    },',
            '    mimaTheme: (theme: "day" | "night") => {\n      if (ready) setTheme(theme);\n    },\n'
            '    mimaReplay: () => {\n'
            '      if (ready && !boot?.active) boot?.replayScene(performance.now() / 1000);\n'
            '    },',
            'add cinematic replay bridge')
    old_theme = 'preferences.theme = "night";'
    new_theme = 'preferences.theme = (() => { try { return localStorage.getItem("mima-theme") === "day" ? "day" : "night"; } catch { return "night"; } })();' 
    if old_theme in src:
        src = replace_once(src, old_theme, new_theme, 'persistent 3D theme')
    elif new_theme not in src:
        raise RuntimeError('未识别 v2 主题设置，避免覆盖未知修改。')
    app.write_text(src, encoding='utf-8')
    target = repo / 'public' / 'mima'
    target.mkdir(parents=True, exist_ok=True)
    for source in (ROOT / 'site').iterdir():
        destination = target / source.name
        if not source.is_file():
            continue
        # Keep user-provided destinations and customized cover artwork.
        if source.name not in ('overlay.js', 'overlay.css') and destination.exists():
            continue
        shutil.copy2(source, destination)
    print('v3 已更新：昼夜切换／认证开场／微粒子／键鼠触摸交互', flush=True)


def clone_upstream(repo: Path, timeout: int) -> None:
    """Clone with immediate progress, heartbeat messages and a hard timeout."""
    url = 'https://github.com/RonaldDeng/Rhine-Music-Demo.git'
    if shutil.which('git') is None:
        raise RuntimeError('Git 未安装或不在 PATH 中。请先安装 Git，然后重新运行。')
    if repo.exists():
        raise RuntimeError(f'目标路径已存在，不能自动克隆：{repo}\n'
                           '如果是不完整下载，请先人工检查该目录；如果是完整 v0.5.0 项目，请添加 --repo 路径。')
    repo.parent.mkdir(parents=True, exist_ok=True)
    command = ['git', 'clone', '--progress', '--depth', '1', '--branch', 'v0.5.0', url, str(repo)]
    env = {**os.environ, 'GIT_TERMINAL_PROMPT': '0'}
    print(f'[1/4] 正在获取原项目 v0.5.0（源文件和 3D 模型较大）：{url}', flush=True)
    print(f'      下载位置：{repo}', flush=True)
    print('      以下会显示 Git 自带的进度。网络不通时每 15 秒提示一次。', flush=True)
    started = time.monotonic()
    try:
        process = subprocess.Popen(command, env=env)
    except OSError as exc:
        raise RuntimeError(f'无法启动 git: {exc}') from exc
    try:
        while True:
            used = time.monotonic()-started
            left = timeout-used
            if left <= 0:
                process.kill()
                process.wait()
                raise RuntimeError(f'下载已超过 {timeout} 秒，因此停止。请检查是否能访问 GitHub。\n'
                                   '建议先在浏览器下载原项目 v0.5.0 源码并解压，随后使用 --repo 指向解压目录。')
            try:
                code = process.wait(timeout=min(15,left))
                break
            except subprocess.TimeoutExpired:
                print(f'      正在等待 GitHub 下载... 已经过 {int(time.monotonic()-started)} 秒', flush=True)
        if code != 0:
            raise RuntimeError(f'Git 下载失败（退出码 {code}）。请检查网络或代理。\n'
                               '也可以手动获取 v0.5.0 源码后用 --repo 指定其位置。')
    except KeyboardInterrupt:
        process.kill()
        process.wait()
        print('\n已中断下载。请检查并清理不完整的 Rhine-Music-Demo 目录后重试。', flush=True)
        raise
    print('[2/4] 下载完成，准备检查项目源码。', flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description='Adapt Rhine-Music-Demo v0.5.0 into MimaGlows personal site')
    parser.add_argument('--repo', type=Path, default=None,
                        help='已有 v0.5.0 原项目目录；默认在脚本旁创建 Rhine-Music-Demo')
    parser.add_argument('--no-clone', action='store_true', help='原项目不存在时直接报错，不自动下载')
    parser.add_argument('--timeout', type=int, default=300, help='克隆超时秒数，默认 300')
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error('--timeout 必须是正整数')
    repo = (args.repo.expanduser() if args.repo is not None else ROOT / 'Rhine-Music-Demo').resolve()
    print('MimaGlows Rhine Interactive v3 / 原生 3D 引擎改造器', flush=True)
    print(f'脚本位置：{ROOT}', flush=True)
    print(f'上游位置：{repo}', flush=True)
    try:
        if not repo.exists():
            if args.no_clone:
                raise RuntimeError(f'原项目目录不存在：{repo}\n不下载模式需要 --repo 指定现有 v0.5.0 文件夹。')
            clone_upstream(repo, args.timeout)
        elif not (repo / 'src' / 'music-app.ts').exists():
            raise RuntimeError(f'目录存在，但缺少 src/music-app.ts：{repo}\n'
                               '可能是上次被中断的 Git 克隆；请先检查，不会自动删除已有文件。')
        else:
            print('[1/4] 检测到原项目，跳过下载。', flush=True)
        print('[3/4] 正在应用 MimaGlows 视觉与链接改造...', flush=True)
        build(repo)
        print('[4/4] 完成。', flush=True)
        print(f'下一步：cd "{repo}"', flush=True)
        print('        npm ci', flush=True)
        print('        npm run dev', flush=True)
    except RuntimeError as exc:
        print(f'\n[失败] {exc}', file=sys.stderr, flush=True)
        sys.exit(1)
    except KeyboardInterrupt:
        sys.exit(130)

if __name__ == '__main__':
    main()
