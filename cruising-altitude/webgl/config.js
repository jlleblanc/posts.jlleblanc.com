// WebGL config — broad-phone budgets for the PixiJS 2.5D revamp.
// PWA-only; file:// classic bundle keeps working without this layer.

export const MAX_DPR = 2;
export const MIN_DPR = 1;
export const TARGET_FPS = 60;
export const PARTICLE_BUDGET_HIGH = 220;
export const PARTICLE_BUDGET_LOW = 80;

export function wantsEmojiFallback() {
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('fallback') === 'emoji') return true;
    if (q.get('webgl') === 'off') return true;
  } catch { /* ignore */ }
  try {
    if (window.localStorage.getItem('ca_webgl') === 'off') return true;
  } catch { /* ignore */ }
  return false;
}

export function isLowPowerDevice() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  } catch { /* ignore */ }
  const mem = navigator.deviceMemory;
  if (typeof mem === 'number' && mem <= 4) return true;
  return false;
}

export function clampedDpr() {
  try {
    const raw = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    if (isLowPowerDevice()) return Math.min(raw, 1.5);
    return Math.max(MIN_DPR, raw);
  } catch { return 1; }
}

export function particleBudget() {
  return isLowPowerDevice() ? PARTICLE_BUDGET_LOW : PARTICLE_BUDGET_HIGH;
}
