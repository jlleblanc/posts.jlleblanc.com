// Terminal scene — people at THIS airport as 2.5D billboards.
// Layout helpers above are pure (Node-tested); drawTerminal() below runs
// in the browser with the PIXI global passed in (zero-build UMD).

import { urgencyPulse, daylightFactor, localDaylight } from './lighting.js';
import { particleBudget } from './config.js';
import { getAirportById } from '../js/data.js';

export function layoutTerminalPeople({ people, width, height, nowMs }) {
  const n = people.length;
  if (n === 0) return [];
  const cols = Math.ceil(Math.sqrt(n * (width / Math.max(1, height))));
  return people.map((p, i) => {
    const col = i % Math.max(1, cols);
    const row = Math.floor(i / Math.max(1, cols));
    return {
      id: p.id,
      x: ((col + 0.5) / Math.max(1, cols)) * width,
      y: height * 0.35 + (row + 0.5) * (height * 0.55 / (Math.ceil(n / Math.max(1, cols)) || 1)),
      scale: p.tier === 'Hot' ? 1.15 : p.tier === 'Warm' ? 1.0 : 0.9,
      pulse: urgencyPulse(p.minutesLeft, nowMs),
      lounge: !!p.loungeAccess,
      tier: p.tier,
    };
  });
}

export function terminalSceneState({ airport, people, gameTime, loungeAccess }) {
  return {
    scene: 'terminal',
    airport,
    gameTime,
    lounge: !!loungeAccess,
    count: people.length,
  };
}

// Remaining boarding window as 0..1 (for the tier ring sweep).
export function fractionLeft(person, gameTime) {
  const span = (person.availableUntil - person.availableFrom) || 1;
  return Math.max(0, Math.min(1, (person.availableUntil - gameTime) / span));
}

const TIER_COLORS = { Hot: 0xe94560, Warm: 0xf1c40f, Cold: 0x8ea3bd };

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function softDotTexture(PIXI, app) {
  if (app._caTex && app._caTex.dot) return app._caTex.dot;
  const s = 128;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  app._caTex = app._caTex || {};
  app._caTex.dot = PIXI.Texture.from(c);
  return app._caTex.dot;
}

// Vertical gradient texture painted once and stretched.
function vGradientTexture(PIXI, app, key, stops) {
  app._caTex = app._caTex || {};
  if (app._caTex[key]) return app._caTex[key];
  const w = 8;
  const h = 160;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  app._caTex[key] = PIXI.Texture.from(c);
  return app._caTex[key];
}

function skyTextures(PIXI, app) {
  app._caTex = app._caTex || {};
  if (app._caTex.skyDay) return app._caTex;
  // Horizon glow baked in: bright band low, deep color up top.
  app._caTex.skyDay = vGradientTexture(PIXI, app, 'skyDayPainted', [
    [0, '#3f6ea6'], [0.55, '#8fc3ee'], [0.8, '#c4e2f7'], [1, '#e8d9b0'],
  ]);
  app._caTex.skyNight = vGradientTexture(PIXI, app, 'skyNightPainted', [
    [0, '#060b18'], [0.6, '#101d38'], [0.85, '#27406b'], [1, '#3a2c4e'],
  ]);
  return app._caTex;
}

function cloudTexture(PIXI, app) {
  app._caTex = app._caTex || {};
  if (app._caTex.cloud) return app._caTex.cloud;
  const c = makeCanvas(180, 90);
  const ctx = c.getContext('2d');
  const blobs = [[60, 60, 34], [95, 52, 42], [130, 60, 30], [95, 68, 44]];
  for (const [x, y, r] of blobs) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  app._caTex.cloud = PIXI.Texture.from(c);
  return app._caTex.cloud;
}

// Deterministic pseudo-random for stable layouts between redraws.
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// People stand on the floor (below the glass facade) in 1–2 perspective rows.
// Rows are sized/placed from the figure radius so rings + labels fit the
// stage; the front row is staggered half a back-step so figures never stack.
export function floorSpots(n, w, h, floorTop) {
  const R = Math.round(Math.min(26, Math.max(15, w / 26)));
  const depth = h - floorTop;
  const pad = Math.max(26, w * 0.07);
  const spread = (count, y, scale, inset, row, span) => {
    const out = [];
    for (let i = 0; i < count; i++) {
      const x = count === 1 ? w / 2 : pad + inset + (i * span) / (count - 1);
      out.push({ x, y, scale, row });
    }
    return out;
  };
  if (n <= 4) return spread(n, floorTop + depth * 0.5, 0.95, 0, 1, w - 2 * pad);
  const nBack = Math.ceil(n / 2);
  const nFront = n - nBack;
  const rBack = R * 0.76;
  const backY = floorTop + rBack + 30;
  const frontY = h - R - 30;
  const backSpan = w - 2 * pad;
  const backStep = nBack > 1 ? backSpan / (nBack - 1) : 0;
  let frontInset = nBack > 1 ? backStep / 2 : 18;
  let frontSpan = w - 2 * pad - 2 * frontInset;
  if (frontSpan <= 0) {
    frontInset = 18;
    frontSpan = Math.max(1, w - 2 * pad - 2 * frontInset);
  }
  return [
    ...spread(nBack, backY, 0.76, 0, 0, backSpan),
    ...spread(nFront, frontY, 1.0, frontInset, 1, frontSpan),
  ];
}

function flashCard(id) {
  try {
    const el = document.querySelector(`.person-card[data-person-id="${CSS.escape(id)}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    el.classList.remove('flash');
    void el.offsetWidth; // restart animation
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1300);
  } catch { /* ignore */ }
}

// Full redraw on each game-state push (state changes are infrequent:
// flights, time advances, encounters — not per-frame).
export function drawTerminal(PIXI, app, state, { w, h }) {
  const people = Array.isArray(state.people) ? state.people : [];
  const gameTime = state.gameTime || 0;
  const tz = (() => { try { return getAirportById(state.airport)?.tzOffsetStd || 0; } catch { return 0; } })();
  const daylight = localDaylight(gameTime, tz);
  const night = 1 - daylight;
  const small = w < 480;
  // Local wall-clock minutes — drives sun/moon placement.
  const localMins = (((gameTime + tz) % 1440) + 1440) % 1440;

  if (app._caRoot) {
    app.stage.removeChild(app._caRoot);
    app._caRoot.destroy({ children: true });
  }
  const root = new PIXI.Container();
  app._caRoot = root;
  app.stage.addChild(root);
  const anim = { t: 0, rings: [], dust: [], clouds: [], shimmer: null, h };
  app._caAnim = anim;
  const rnd = seededRand(people.length * 977 + Math.floor(gameTime));

  const tex = skyTextures(PIXI, app);
  const dot = softDotTexture(PIXI, app);

  // ---- sky with baked horizon glow ----
  const skyH = h * 0.44;
  const daySky = new PIXI.Sprite(tex.skyDay);
  daySky.width = w;
  daySky.height = skyH + 2;
  root.addChild(daySky);
  const nightSky = new PIXI.Sprite(tex.skyNight);
  nightSky.width = w;
  nightSky.height = skyH + 2;
  nightSky.alpha = night;
  root.addChild(nightSky);

  // Stars (night only).
  const stars = new PIXI.Graphics();
  for (let i = 0; i < 26; i++) {
    stars.beginFill(0xffffff, (0.25 + rnd() * 0.6) * night);
    stars.drawCircle(rnd() * w, rnd() * skyH * 0.75, rnd() < 0.2 ? 1.6 : 1);
    stars.endFill();
  }
  root.addChild(stars);

  // Sun rides a daytime arc in local wall-clock time (up 6 AM–6 PM);
  // moon takes the night shift. Dawn/dusk sit low near the horizon.
  const dayFrac = localMins / 1440;
  const sunUp = localMins >= 360 && localMins < 1080;
  const sunElev = sunUp ? Math.sin(((localMins - 360) / 720) * Math.PI) : 0;
  const orbX = w * 0.12 + dayFrac * w * 0.76;
  const orbY = skyH * 0.68 - sunElev * skyH * 0.52;
  const sunHalo = new PIXI.Sprite(dot);
  sunHalo.tint = 0xffd76a;
  sunHalo.anchor.set(0.5);
  sunHalo.width = 72;
  sunHalo.height = 72;
  sunHalo.position.set(orbX, orbY);
  sunHalo.alpha = 0.45 * daylight * (sunUp ? 1 : 0);
  root.addChild(sunHalo);
  const sun = new PIXI.Sprite(dot);
  sun.tint = 0xffe9a8;
  sun.anchor.set(0.5);
  sun.width = 26;
  sun.height = 26;
  sun.position.set(orbX, orbY);
  sun.alpha = sunUp ? 0.35 + 0.65 * daylight : 0;
  root.addChild(sun);
  const moon = new PIXI.Sprite(dot);
  moon.tint = 0xdfe9ff;
  moon.anchor.set(0.5);
  moon.width = 20;
  moon.height = 20;
  moon.position.set(w - orbX, skyH * 0.3);
  moon.alpha = 0.9 * night * (sunUp ? 0 : 1);
  root.addChild(moon);

  // Drifting clouds, tinted by time of day.
  const cloudTex = cloudTexture(PIXI, app);
  for (let i = 0; i < (small ? 2 : 3); i++) {
    const cl = new PIXI.Sprite(cloudTex);
    const sc = 0.7 + rnd() * 0.8;
    cl.scale.set(sc);
    cl.alpha = daylight > 0.5 ? 0.75 : 0.28;
    cl.tint = daylight > 0.5 ? 0xffffff : 0x3a4a6e;
    const y = 12 + rnd() * (skyH * 0.5);
    const x = rnd() * w;
    cl.position.set(x, y);
    root.addChild(cl);
    anim.clouds.push({ sprite: cl, x, speed: 3 + rnd() * 6 });
  }

  // ---- distant skyline ----
  const skyline = new PIXI.Graphics();
  skyline.beginFill(0x0d1a30);
  let bx = 0;
  const bRnd = seededRand(42);
  while (bx < w) {
    const bw = 30 + bRnd() * 52;
    const bh = 10 + bRnd() * 22;
    skyline.drawRoundedRect(bx, skyH - bh, bw, bh + 2, 4);
    // Antenna nubs on some towers.
    if (bRnd() < 0.3) skyline.drawRect(bx + bw / 2 - 1, skyH - bh - 8, 2, 8);
    bx += bw + 6 + bRnd() * 18;
  }
  skyline.endFill();
  // A few lit windows on the skyline at night.
  for (let i = 0; i < 14; i++) {
    skyline.beginFill(0xffd76a, 0.75 * night);
    skyline.drawCircle(bRnd() * w, skyH - 4 - bRnd() * 30, 1.1);
    skyline.endFill();
  }
  root.addChild(skyline);

  // ---- glass facade ----
  const glassTop = skyH - 6;
  const glassH = h * 0.2;
  const glassBottom = glassTop + glassH;
  const glassTex = vGradientTexture(PIXI, app, 'glassPainted', [
    [0, '#2c537e'], [0.5, '#1b3a5e'], [1, '#10233c'],
  ]);
  const glass = new PIXI.Sprite(glassTex);
  glass.width = w;
  glass.height = glassH;
  glass.position.set(0, glassTop);
  root.addChild(glass);
  // Warm interior glow at night.
  const warmTex = vGradientTexture(PIXI, app, 'warmPainted', [
    [0, 'rgba(255,179,92,0)'], [1, 'rgba(255,179,92,0.85)'],
  ]);
  const warm = new PIXI.Sprite(warmTex);
  warm.width = w;
  warm.height = glassH;
  warm.position.set(0, glassTop);
  warm.alpha = 0.55 * night;
  root.addChild(warm);
  // Roof highlight + mullions + sheen.
  const frame = new PIXI.Graphics();
  frame.beginFill(0x9fd4ff, 0.25 + 0.35 * daylight);
  frame.drawRect(0, glassTop, w, 2);
  frame.endFill();
  frame.lineStyle(3, 0x050b16, 0.55);
  const bays = Math.max(5, Math.round(w / 56));
  for (let i = 0; i <= bays; i++) {
    const x = (i * w) / bays;
    frame.moveTo(x, glassTop);
    frame.lineTo(x, glassBottom);
  }
  frame.lineStyle(2, 0x050b16, 0.4);
  frame.moveTo(0, glassTop + glassH / 2);
  frame.lineTo(w, glassTop + glassH / 2);
  root.addChild(frame);
  const sheen = new PIXI.Graphics();
  sheen.beginFill(0xffffff, 0.07);
  sheen.drawPolygon([w * 0.15, glassTop, w * 0.42, glassTop, w * 0.24, glassBottom, w * 0.02, glassBottom]);
  sheen.endFill();
  root.addChild(sheen);

  // Backlit gate sign pill.
  const signText = `${state.airport} · TERMINAL`;
  const signStyle = {
    fontFamily: '-apple-system, sans-serif',
    fontSize: 14,
    fill: 0xdff2ff,
    letterSpacing: 2,
  };
  const measure = new PIXI.Text(signText, signStyle);
  const pillW = measure.width + 58;
  const pill = new PIXI.Graphics();
  pill.beginFill(0x060d1a, 0.88);
  pill.lineStyle(1.5, 0x2f9df0, 0.55);
  pill.drawRoundedRect(10, glassTop + 10, pillW, 30, 15);
  pill.endFill();
  root.addChild(pill);
  const liveDot = new PIXI.Graphics();
  liveDot.beginFill(0x2ecc71, 1);
  liveDot.drawCircle(26, glassTop + 25, 4);
  liveDot.endFill();
  root.addChild(liveDot);
  const sign = new PIXI.Text(signText, signStyle);
  sign.position.set(38, glassTop + 14);
  root.addChild(sign);

  // Lounge badge pill (top-right).
  if (state.loungeAccess) {
    const tag = new PIXI.Text('✨ lounge', {
      fontFamily: '-apple-system, sans-serif',
      fontSize: 12,
      fill: 0x7be3a0,
    });
    const lw = tag.width + 24;
    const badge = new PIXI.Graphics();
    badge.beginFill(0x06130c, 0.88);
    badge.lineStyle(1.5, 0x2ecc71, 0.6);
    badge.drawRoundedRect(w - lw - 10, glassTop + 10, lw, 30, 15);
    badge.endFill();
    root.addChild(badge);
    anim.shimmer = badge;
    tag.position.set(w - lw + 2, glassTop + 14);
    root.addChild(tag);
  }

  // ---- concourse floor ----
  const floorTex = vGradientTexture(PIXI, app, 'floorPainted', [
    [0, '#10233f'], [0.25, '#0b1830'], [1, '#050b18'],
  ]);
  const floor = new PIXI.Sprite(floorTex);
  floor.width = w;
  floor.height = h - glassBottom;
  floor.position.set(0, glassBottom);
  root.addChild(floor);
  const floorFx = new PIXI.Graphics();
  floorFx.lineStyle(1, 0x2f9df0, 0.1);
  for (let i = 0; i <= 6; i++) {
    const x = (w / 6) * i;
    floorFx.moveTo(x, glassBottom);
    floorFx.lineTo(w / 2 + (x - w / 2) * 2.4, h);
  }
  root.addChild(floorFx);

  // ---- people on the floor ----
  const spots = floorSpots(people.length, w, h, glassBottom);
  const R0 = Math.round(Math.min(26, Math.max(15, w / 26)));
  people.forEach((p, i) => {
    const s = spots[i];
    if (!s) return;
    const R = R0 * s.scale;
    const col = TIER_COLORS[p.tier] || TIER_COLORS.Cold;
    const c = new PIXI.Container();
    c.position.set(s.x, s.y);

    // Shadow + faint floor light streak.
    const ground = new PIXI.Graphics();
    ground.beginFill(0x000000, 0.32);
    ground.drawEllipse(0, R + 12, R * 1.0, R * 0.3);
    ground.endFill();
    ground.beginFill(col, 0.07);
    ground.drawRoundedRect(-R * 0.35, R + 12, R * 0.7, R * 0.8, 6);
    ground.endFill();
    c.addChild(ground);

    // Tier glow (tinted, never white) + dark disc for contrast.
    const glow = new PIXI.Sprite(dot);
    glow.tint = col;
    glow.anchor.set(0.5);
    glow.width = R * 3.1;
    glow.height = R * 3.1;
    glow.alpha = p.tier === 'Hot' ? 0.4 : p.tier === 'Warm' ? 0.3 : 0.2;
    c.addChild(glow);
    const disc = new PIXI.Graphics();
    disc.beginFill(0x0a1428, 0.94);
    disc.drawCircle(0, 0, R);
    disc.endFill();
    disc.lineStyle(1, 0xffffff, 0.14);
    disc.drawCircle(0, 0, R);
    disc.endFill();
    c.addChild(disc);

    // Emoji face stays until final soft-painted avatar art lands.
    const face = new PIXI.Text(p.avatar || '🧑', { fontSize: Math.round(R * 1.3) });
    face.anchor.set(0.5);
    c.addChild(face);

    // Timer ring: faint full track + bright remaining sweep + head dot.
    const rr = R + 7;
    const track = new PIXI.Graphics();
    track.lineStyle(3, col, 0.25);
    track.drawCircle(0, 0, rr);
    c.addChild(track);
    const sweep = new PIXI.Graphics();
    const frac = fractionLeft(p, gameTime);
    const endAngle = -Math.PI / 2 + frac * Math.PI * 2;
    sweep.lineStyle(3.5, col, 0.95);
    sweep.arc(0, 0, rr, -Math.PI / 2, endAngle);
    c.addChild(sweep);
    const head = new PIXI.Graphics();
    head.beginFill(col, 1);
    head.drawCircle(Math.cos(endAngle) * rr, Math.sin(endAngle) * rr, 3);
    head.endFill();
    c.addChild(head);
    if (p.minutesLeft < 60) {
      anim.rings.push({ gfx: sweep, base: 0.65, amp: 0.35, speed: p.minutesLeft < 30 ? 6 : 3 });
    }

    if (p.name) {
      const label = new PIXI.Text(p.name, {
        fontFamily: '-apple-system, sans-serif',
        fontSize: 11,
        fill: 0xffffff,
        stroke: 0x060d1a,
        strokeThickness: 3,
      });
      // Back row labels sit above their figures (front row is below them);
      // front row labels sit below, flipping up only if they'd clip.
      if (s.row === 0) {
        label.anchor.set(0.5, 1);
        label.position.set(0, -R - 12);
      } else if (s.y + R + 25 <= h) {
        label.anchor.set(0.5, 0);
        label.position.set(0, R + 11);
      } else {
        label.anchor.set(0.5, 1);
        label.position.set(0, -R - 12);
      }
      c.addChild(label);
    }

    c.interactive = true;
    c.cursor = 'pointer';
    c.on('pointertap', () => flashCard(p.id));
    root.addChild(c);
  });

  // Ambient dust motes, capped for phone batteries.
  const budget = Math.min(particleBudget(), small ? 30 : 80);
  const n = Math.round(budget / 6);
  for (let i = 0; i < n; i++) {
    const d = new PIXI.Sprite(dot);
    d.tint = 0x9fd4ff;
    d.anchor.set(0.5);
    const sz = 2 + rnd() * 4;
    d.width = sz;
    d.height = sz;
    d.alpha = 0.08 + rnd() * 0.14;
    const y = rnd() * h;
    d.position.set(rnd() * w, y);
    root.addChild(d);
    anim.dust.push({ sprite: d, y, speed: 3 + rnd() * 8 });
  }
}

export function clearTerminal(app) {
  try {
    if (app._caRoot) {
      app.stage.removeChild(app._caRoot);
      app._caRoot.destroy({ children: true });
      app._caRoot = null;
    }
    app._caAnim = null;
  } catch { /* ignore */ }
}
