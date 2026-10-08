// Node smoke for the WebGL layer (pure transforms only — no Pixi/DOM).
import { layoutTerminalPeople, fractionLeft, floorSpots } from './scene-terminal.js';
import { layoutMapArcs } from './scene-map.js';
import { encounterBackdrop } from './scene-encounter.js';
import { daylightFactor, localDaylight, urgencyPulse } from './lighting.js';
import { makeParticlePool } from './particles.js';
import { frameForAvatar, shouldUseEmojiSprite } from './sprites.js';

let failures = 0;
function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`);
  if (!cond) failures++;
}

const people = [
  { id: 'a', tier: 'Hot', minutesLeft: 20 },
  { id: 'b', tier: 'Warm', minutesLeft: 90 },
];
const laid = layoutTerminalPeople({ people, width: 720, height: 360, nowMs: 1000 });
check('terminal layout count', laid.length === 2);
check('hot scaled up', laid[0].scale > laid[1].scale);
check('urgent pulses', laid[0].pulse >= 0 && laid[0].pulse <= 1);

const arcs = layoutMapArcs({ flights: [{ id: 'f1', from: 'JFK', to: 'SFO' }, { id: 'f2', from: 'JFK', to: 'DEN' }], width: 720, height: 360 });
check('map arc endpoints', arcs[0].x2 !== arcs[1].x2 || arcs[0].y2 !== arcs[1].y2);

const bg = encounterBackdrop({ tier: 'Hot', loungeAccess: true, smallScreen: true });
check('encounter sparkles capped on small screens', bg.sparkles === 12);

check('daylight noon > midnight', daylightFactor(720) > daylightFactor(0));
check('JFK 6 AM is dawn-dim, noon bright', localDaylight(660, -300) < 0.6 && localDaylight(1020, -300) > 0.9);
check('urgency rises near boarding', urgencyPulse(10, 5000) >= 0);

const pool = makeParticlePool(80);
pool.spawn(200);
check('particle budget enforced', pool.live === 80);

const emojis = ['🧑', '👨', '🧔'];
check('avatar frame mapped', frameForAvatar('🧑', emojis) === 'traveler-01');
check('emoji fallback when no texture', shouldUseEmojiSprite(false, false) === true);
check('sprite used when texture ready', shouldUseEmojiSprite(false, true) === false);
check('ring full at window start', fractionLeft({ availableFrom: 100, availableUntil: 200 }, 100) === 1);
check('ring empty at boarding cutoff', fractionLeft({ availableFrom: 100, availableUntil: 200 }, 200) === 0);
const floor = floorSpots(9, 720, 300, 196);
check('floor fits all nine', floor.length === 9);
check('floor spots on the floor area', floor.every((s) => s.x >= 0 && s.x <= 720 && s.y > 196 && s.y <= 300));
check('floor rows have depth order', floor[0].scale < floor[floor.length - 1].scale);
{
  const wide = floorSpots(9, 678, 340, 212);
  const backs = wide.filter((s) => s.row === 0).map((s) => s.x);
  const fronts = wide.filter((s) => s.row === 1).map((s) => s.x);
  const minGap = Math.min(...backs.flatMap((b) => fronts.map((f) => Math.abs(b - f))));
  check('front row staggered off back columns', minGap > 30, `gap=${Math.round(minGap)}`);
}

process.exit(failures ? 1 : 0);
