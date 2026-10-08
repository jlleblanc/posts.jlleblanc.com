// Pixi boot — progressive enhancement over the DOM game.
// Zero-build: PIXI comes from a pinned CDN UMD script (see index.html,
// `pixi.min.js` exposes `window.PIXI`). No npm step, nothing runs on push.
// If WebGL/Pixi unavailable, or ?fallback=emoji / ?webgl=off, the DOM
// lists + emoji avatars remain fully playable (existing bundle.js path).

import { clampedDpr, wantsEmojiFallback, isLowPowerDevice } from './config.js';
import { drawTerminal } from './scene-terminal.js';

let booted = false;
let pixiApp = null;
let useEmoji = true;
let currentState = null;
let stageEl = null;

function pixiGlobal() {
  try { return window.PIXI || null; } catch { return null; }
}

// The CDN script may still be loading when this module runs.
function waitForPixi(timeoutMs) {
  return new Promise((resolve) => {
    if (pixiGlobal()) return resolve(pixiGlobal());
    try {
      const script = document.querySelector('script[data-pixi-cdn]');
      if (script) {
        script.addEventListener('load', () => resolve(pixiGlobal()), { once: true });
        script.addEventListener('error', () => resolve(null), { once: true });
      }
    } catch { /* ignore */ }
    setTimeout(() => resolve(pixiGlobal()), timeoutMs);
  });
}

function stageSize() {
  try {
    const w = Math.max(320, stageEl ? stageEl.clientWidth : 720);
    return { w, h: 340 };
  } catch { return { w: 720, h: 340 }; }
}

export async function boot({ canvas } = {}) {
  if (booted) return { ok: !!pixiApp, emojiFallback: useEmoji };
  booted = true;
  useEmoji = wantsEmojiFallback();
  try { stageEl = canvas ? canvas.parentElement : null; } catch { stageEl = null; }
  const PIXI = useEmoji ? null : await waitForPixi(4000);
  if (useEmoji || !canvas || !PIXI) {
    useEmoji = true;
    return { ok: false, emojiFallback: true };
  }
  try {
    pixiApp = new PIXI.Application({
      view: canvas,
      autoDensity: true,
      resolution: clampedDpr(),
      backgroundAlpha: 0,
      antialias: !isLowPowerDevice(),
    });
    resize();
    try {
      new ResizeObserver(() => resize()).observe(stageEl);
    } catch { window.addEventListener('resize', resize); }
    attachVisibilityPause();
    if (currentState) drawTerminal(PIXI, pixiApp, currentState, stageSize());
    startAmbient(PIXI);
    try { window.dispatchEvent(new Event('ca:webgl-ready')); } catch { /* ignore */ }
    return { ok: true, emojiFallback: false };
  } catch {
    pixiApp = null;
    useEmoji = true;
    return { ok: false, emojiFallback: true };
  }
}

function resize() {
  if (!pixiApp) return;
  try {
    const { w, h } = stageSize();
    pixiApp.renderer.resize(w, h);
    if (currentState) {
      const PIXI = pixiGlobal();
      if (PIXI) drawTerminal(PIXI, pixiApp, currentState, { w, h });
    }
  } catch { /* ignore */ }
}

// Pause the ambient ticker when the tab/stage is hidden (phone battery).
function attachVisibilityPause() {
  if (!pixiApp) return;
  const update = () => {
    try {
      let visible = document.visibilityState === 'visible';
      if (visible && stageEl && typeof IntersectionObserver !== 'undefined') {
        // Ticker keeps running; draw skips work when off-screen (checked in tick).
      }
      if (visible) pixiApp.ticker.start();
      else pixiApp.ticker.stop();
    } catch { /* ignore */ }
  };
  try {
    document.addEventListener('visibilitychange', update);
    if (stageEl && typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver((entries) => {
        try {
          const onScreen = entries.some((e) => e.isIntersecting);
          if (document.visibilityState === 'visible') {
            if (onScreen) pixiApp.ticker.start();
            else pixiApp.ticker.stop();
          }
        } catch { /* ignore */ }
      }).observe(stageEl);
    }
  } catch { /* ignore */ }
}

function startAmbient(PIXI) {
  if (!pixiApp) return;
  let reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* ignore */ }
  if (reduced) return; // static frame only
  pixiApp.ticker.add(() => {
    try {
      const anim = pixiApp._caAnim;
      if (!anim) return;
      anim.t += pixiApp.ticker.deltaMS / 1000;
      for (const r of anim.rings) {
        try { r.gfx.alpha = r.base + r.amp * Math.sin(anim.t * r.speed); } catch { /* ignore */ }
      }
      for (const cl of anim.clouds) {
        try {
          cl.x += cl.speed * pixiApp.ticker.deltaMS / 1000;
          const span = (pixiApp.screen.width || 720) + 220;
          if (cl.x > span - 110) cl.x = -110;
          cl.sprite.x = cl.x;
        } catch { /* ignore */ }
      }
      for (const pt of anim.dust) {
        pt.y -= pt.speed * pixiApp.ticker.deltaMS / 1000;
        pt.sprite.y = pt.y;
        if (pt.y < -8) { pt.y = anim.h + 8; pt.sprite.y = pt.y; }
      }
      if (anim.shimmer) anim.shimmer.alpha = 0.25 + 0.2 * Math.sin(anim.t * 1.5);
    } catch { /* ignore */ }
  });
}

// Called from app.js render() — never throws into game logic.
export function renderWebGL(state) {
  currentState = state;
  try {
    if (!state || useEmoji || !pixiApp) return { ok: false, emojiFallback: true };
    const PIXI = pixiGlobal();
    if (!PIXI) return { ok: false, emojiFallback: true };
    const { w, h } = stageSize();
    drawTerminal(PIXI, pixiApp, state, { w, h });
    return { ok: true, emojiFallback: false };
  } catch (err) {
    try { window.CAWebGL.lastError = String((err && err.message) || err); } catch { /* ignore */ }
    return { ok: false, emojiFallback: true };
  }
}

export function bootOptions() {
  return { dpr: 1, emojiFallback: true };
}
