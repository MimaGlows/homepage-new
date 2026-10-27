/* MimaGlows Interactive Archive v3
 * Pure presentation UI: the archive geometry, physical materials, camera and
 * lighting stay in the upstream Rhine-Music-Demo Three.js application.
 */
const overlay = document.querySelector('#mima-overlay');
if (overlay) {
  const links = Array.from(overlay.querySelectorAll('[data-mima-index]'));
  const destinations = window.MIMA_LINKS || {};
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = reducedQuery.matches;
  let selected = 0;
  let pending = null;
  let ready = false;
  let particlesEnabled = !reduceMotion;
  let lastChange = 0;
  let currentTheme = 'night';
  let authPlaying = false;
  let authFrame = 0;
  let introStarted = 0;
  let mouseX = 0, mouseY = 0;
  let pulse = 0;
  try { currentTheme = localStorage.getItem('mima-theme') === 'day' ? 'day' : 'night'; }
  catch {}
  overlay.dataset.mimaTheme = currentTheme;

  const sun = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2m15 0h2M5.3 5.3l1.4 1.4m10.6 10.6 1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/></svg>';
  const moon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.8A8.5 8.5 0 0 1 9.2 4a8.5 8.5 0 1 0 10.8 10.8Z"/></svg>';
  overlay.insertAdjacentHTML('afterbegin', `
    <div class="mima-interaction" aria-hidden="true"></div>
    <canvas class="mima-particles" aria-hidden="true"></canvas>
    <div class="mima-top-controls" aria-label="显示设置">
      <div class="mima-theme-toggle" role="group" aria-label="亮暗主题">
        <button type="button" data-mima-theme-button="day" aria-label="亮色主题" title="亮色主题 · D">${sun}</button>
        <button type="button" data-mima-theme-button="night" aria-label="暗色主题" title="暗色主题 · N">${moon}</button>
      </div>
    </div>
    <div class="mima-orbit-marks" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="mima-auth" role="status" aria-live="polite" aria-label="正在显示 MimaGlows 的访客入口动画">
      <div class="mima-auth-body">
        <div class="mima-auth-sigil"><div class="mima-auth-ring r1"></div><div class="mima-auth-ring r2"></div><div class="mima-auth-core"><span>M</span></div></div>
        <div class="mima-auth-wordmark">MimaGlows</div>
        <div class="mima-auth-status">INITIALIZING TERMINAL</div>
        <div class="mima-auth-rail"><span></span></div>
        <div class="mima-auth-sub">PERSONAL ARCHIVE / VISITOR ACCESS</div>
      </div>
      <button class="mima-auth-skip" type="button" aria-label="跳过开场动画">SKIP INTRO ↗</button>
    </div>
  `);
  const interaction = overlay.querySelector('.mima-interaction');
  const canvas = overlay.querySelector('.mima-particles');
  const ctx = canvas.getContext('2d', { alpha: true });
  const auth = overlay.querySelector('.mima-auth');
  const authStatus = overlay.querySelector('.mima-auth-status');
  const authProgress = overlay.querySelector('.mima-auth-rail > span');
  const track = overlay.querySelector('.mima-track');
  if (track) {
    track.removeAttribute('aria-hidden');
    track.setAttribute('role', 'group');
    track.setAttribute('aria-label', '档案选择');
    track.innerHTML = links.map((a, i) => `<button type="button" data-mima-track="${i}" aria-label="选择 ${a.textContent.trim()}" aria-pressed="false"></button>`).join('');
  }
  const trackButtons = Array.from(overlay.querySelectorAll('[data-mima-track]'));
  const themeButtons = Array.from(overlay.querySelectorAll('[data-mima-theme-button]'));
  const signature = overlay.querySelector('.mima-signature');
  if (signature) {
    signature.setAttribute('title', '重播访问动画 · R');
    signature.setAttribute('role', 'button');
    signature.setAttribute('tabindex', '0');
    signature.setAttribute('aria-label', 'MimaGlows，重播访问动画');
  }

  function applyActive(index) {
    selected = (index + links.length) % links.length;
    links.forEach((el, i) => {
      el.classList.toggle('mima-active', i === selected);
      if (i === selected) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
    trackButtons.forEach((el, i) => el.setAttribute('aria-pressed', String(i === selected)));
    overlay.style.setProperty('--mima-selection', String(selected));
  }
  function navigate(index, force = false) {
    if (!links.length) return;
    const next = (index + links.length) % links.length;
    if (next === selected && !force) return;
    applyActive(next);
    pending = next;
    pulse = Math.max(pulse, .7);
    flushNavigation();
  }
  function flushNavigation() {
    const bridge = window.rhineMusic;
    if (pending !== null && typeof bridge?.mimaNavigate === 'function') {
      if (bridge.mimaNavigate(pending)) pending = null;
    }
  }
  function step(direction) { navigate(selected + direction); }

  function syncTheme() {
    const bridge = window.rhineMusic;
    // Upstream sets this class only after preparing its original 3D renderer.
    if (document.querySelector('#stage.theme-motion-ready') && bridge?.mimaTheme) {
      bridge.mimaTheme(currentTheme);
      ready = true;
      overlay.dataset.ready = 'true';
      return true;
    }
    return false;
  }
  function setTheme(theme) {
    if (!['day', 'night'].includes(theme)) return;
    currentTheme = theme;
    overlay.dataset.mimaTheme = theme;
    try { localStorage.setItem('mima-theme', theme); } catch {}
    themeButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.mimaThemeButton === theme));
    });
    syncTheme();
    pulse = 1;
  }
  themeButtons.forEach(button => button.addEventListener('click', () => setTheme(button.dataset.mimaThemeButton)));
  setTheme(currentTheme);
  const readyTimer = setInterval(() => {
    if (syncTheme()) {
      clearInterval(readyTimer);
      flushNavigation();
    }
  }, 250);

  links.forEach((a, i) => {
    const dest = destinations[a.dataset.mimaLink];
    if (typeof dest === 'string' && dest.trim()) a.href = dest;
    a.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') navigate(i);
    });
    a.addEventListener('focus', () => navigate(i));
  });
  trackButtons.forEach((button, i) => button.addEventListener('click', () => navigate(i)));
  applyActive(0);

  // Cosmetic identity-sequence only. Never requests, verifies, stores or sends passwords.
  function finishIntro() {
    if (!authPlaying && auth.hidden) return;
    authPlaying = false;
    cancelAnimationFrame(authFrame);
    auth.classList.add('completed');
    auth.setAttribute('aria-hidden', 'true');
    auth.setAttribute('aria-live', 'off');
    auth.inert = true;
    window.setTimeout(() => { if (!authPlaying) auth.hidden = true; }, 750);
  }
  function introFrame(now) {
    if (!authPlaying) return;
    const duration = 2600;
    const progress = Math.min(1, (now - introStarted) / duration);
    const eased = 1 - Math.pow(1 - progress, 2.1);
    authProgress.style.transform = `scaleX(${eased})`;
    authStatus.textContent = progress < .31 ? 'ESTABLISHING CONNECTION' :
      progress < .68 ? 'VERIFYING VISITOR ID' : 'ACCESS GRANTED';
    if (progress >= 1) return finishIntro();
    authFrame = requestAnimationFrame(introFrame);
  }
  function startIntro(replayScene = false) {
    auth.hidden = false;
    auth.inert = false;
    auth.classList.remove('completed');
    auth.removeAttribute('aria-hidden');
    auth.setAttribute('aria-live', 'polite');
    authProgress.style.transform = 'scaleX(0)';
    authStatus.textContent = 'ESTABLISHING CONNECTION';
    cancelAnimationFrame(authFrame);
    if (replayScene) window.rhineMusic?.mimaReplay?.();
    if (reduceMotion) return finishIntro();
    introStarted = performance.now();
    authPlaying = true;
    authFrame = requestAnimationFrame(introFrame);
  }
  auth.querySelector('.mima-auth-skip').addEventListener('click', finishIntro);
  if (signature) {
    signature.addEventListener('click', () => startIntro(true));
    signature.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        startIntro(true);
      }
    });
  }
  reducedQuery.addEventListener?.('change', event => {
    reduceMotion = event.matches;
    particlesEnabled = !reduceMotion;
    if (reduceMotion) finishIntro();
  });
  startIntro(false);

  let pointerStart = null;
  const pointerDown = e => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    pointerStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
    interaction.setPointerCapture?.(e.pointerId);
  };
  const pointerUp = e => {
    if (!pointerStart || pointerStart.id !== e.pointerId) return;
    const dx = e.clientX - pointerStart.x;
    const dy = e.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 54 && Math.abs(dx) > Math.abs(dy) * 1.18) step(dx < 0 ? 1 : -1);
  };
  interaction.addEventListener('pointerdown', pointerDown);
  interaction.addEventListener('pointerup', pointerUp);
  interaction.addEventListener('pointercancel', () => { pointerStart = null; });
  interaction.addEventListener('dblclick', () => {
    const a = links[selected];
    if (a) window.location.assign(a.href);
  });
  overlay.addEventListener('pointermove', e => {
    mouseX = e.clientX / Math.max(1, window.innerWidth) - 0.5;
    mouseY = e.clientY / Math.max(1, window.innerHeight) - 0.5;
    overlay.style.setProperty('--pointer-x', String(mouseX));
    overlay.style.setProperty('--pointer-y', String(mouseY));
  }, { passive: true });
  interaction.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) < 3 && Math.abs(e.deltaX) < 3) return;
    e.preventDefault();
    if (performance.now() - lastChange < 680) return;
    lastChange = performance.now();
    step((Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) > 0 ? 1 : -1);
  }, { passive: false });

  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
    if (e.target?.matches?.('input,textarea,select,[contenteditable="true"]')) return;
    const key = e.key.toLowerCase();
    if (key === 'escape' && !auth.hidden) { e.preventDefault(); finishIntro(); return; }
    if (key === 'arrowright' || key === 'arrowleft') {
      e.preventDefault(); e.stopImmediatePropagation();
      step(key === 'arrowright' ? 1 : -1);
    } else if (key === 'd' || key === 'n') setTheme(key === 'd' ? 'day' : 'night');
    else if (key === 'r' && e.target !== signature) startIntro(true);
    else if (key === 'p') { particlesEnabled = !particlesEnabled && !reduceMotion; if (!particlesEnabled) ctx?.clearRect(0, 0, width, height); }
  }, true);

  // Lightweight ambient particle field. Overlay pixels do not modify or
  // replace the PBR scene; GPU rendering remains entirely with upstream.
  let width = 1, height = 1, dpr = 1, points = [];
  let lastFrame = performance.now(), prevFrame = 0;
  let seed = 4137;
  const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    dpr = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = width < 740 ? 35 : 85;
    points = Array.from({length:count}, () => ({
      x:rand()*width, y:rand()*height, radius:.32+rand()*1.05,
      depth:.25+rand()*.75, speed:.4+rand()*1.0,
      phase:rand()*Math.PI*2, amplitude:.25+rand()*.55
    }));
  }
  resize();
  addEventListener('resize', resize, { passive: true });
  function particlesFrame(now) {
    requestAnimationFrame(particlesFrame);
    if (!ctx || document.hidden) { lastFrame = now; return; }
    const dt = Math.min(.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    if (now - prevFrame < (width < 740 ? 26 : 16)) return;
    prevFrame = now;
    ctx.clearRect(0, 0, width, height);
    if (!particlesEnabled) return;
    const day = currentTheme === 'day';
    const base = day ? '120, 94, 63' : '213, 230, 250';
    pulse *= Math.pow(.1,dt);
    for (const p of points) {
      p.y -= dt * 3.5 * p.speed;
      p.x += dt * (.7 + p.depth);
      if (p.y < -8) p.y = height + 8;
      if (p.x > width+8) p.x = -8;
      const x = p.x + mouseX * 23 * p.depth;
      const y = p.y + mouseY * 16 * p.depth;
      const glow = (.28 + .22 * Math.sin(now / 2200 + p.phase)) * p.amplitude;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${base},${Math.min(.45, glow + pulse * .045).toFixed(3)})`;
      ctx.arc(x, y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  requestAnimationFrame(particlesFrame);
  // These are implemented by the upstream bridge once the scene is ready.
  function tick() { if (pending !== null) flushNavigation(); requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
}
