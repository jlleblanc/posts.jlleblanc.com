// Headless smoke test: stub DOM + storage, execute bundle.js render path.
import { readFileSync } from 'node:fs';

function makeEl() {
  const el = {
    children: [],
    _handlers: {},
    dataset: {},
    style: {},
    disabled: false,
    title: '',
    value: '',
    _html: '',
    _text: '',
    className: '',
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener(type, fn) { (el._handlers[type] = el._handlers[type] || []).push(fn); },
    appendChild(c) { el.children.push(c); return c; },
    querySelector() { return makeEl(); },
    querySelectorAll() { return [makeEl(), makeEl(), makeEl()]; },
  };
  Object.defineProperty(el, 'innerHTML', { get() { return el._html; }, set(v) { el._html = String(v); el.children = []; } });
  Object.defineProperty(el, 'textContent', { get() { return el._text; }, set(v) { el._text = String(v); } });
  return el;
}

const byId = {};
const inputValues = { 'week-input': '1', 'airport-input': 'JFK', 'difficulty-input': 'medium' };
globalThis.document = {
  getElementById(id) {
    if (!byId[id]) {
      byId[id] = makeEl();
      if (inputValues[id] != null) byId[id].value = inputValues[id];
    }
    return byId[id];
  },
  createElement() { return makeEl(); },
  querySelectorAll() { return []; },
};
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
// NOTE: node 26 already provides a global navigator (no serviceWorker) — leave it.

const src = readFileSync(new URL('./bundle.js', import.meta.url), 'utf8');

let failures = 0;
function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`);
  if (!cond) failures++;
}
function resetDom() { for (const k of Object.keys(byId)) delete byId[k]; }

// ---- Scenario A: seeded character renders the whole game ----
store.set('ca_chars', JSON.stringify([{ id: 'c1', name: 'Alex', avatar: '🧔', interests: ['coffee', 'hookup', 'sex'], createdAt: 1 }]));
store.set('ca_active', 'c1');
eval(src); // eslint-disable-line

check('clock shows Week 1 JFK', /Week 1.*JFK/.test(byId['clock-line'].textContent), JSON.stringify(byId['clock-line'].textContent));
check('flights rendered', byId['flight-list'].children.length > 5, `n=${byId['flight-list'].children.length}`);
check('people rendered', byId['people-list'].children.length > 0, `n=${byId['people-list'].children.length}`);
check('intel rows rendered', byId['intel-list'].children.length === 24, `n=${byId['intel-list'].children.length}`);
check('loyalty cards rendered', byId['loyalty-list'].children.length === 5, `n=${byId['loyalty-list'].children.length}`);
check('wallet shows Medium budget', /\$1,500/.test(byId['wallet-line'].textContent), JSON.stringify(byId['wallet-line'].textContent));
check('score line shows pts', /pts/.test(byId['score-line'].textContent), JSON.stringify(byId['score-line'].textContent));

const kids = byId['interest-picker'].children;
check('char note shown', kids[0].className === 'lock-note' && /Alex/.test(kids[0].textContent), JSON.stringify(kids[0].textContent));
check('24 chips rendered', kids.length === 25, `n=${kids.length}`);
check("char's 3 interests selected", kids.slice(1).filter((c) => /selected/.test(c.className)).length === 3);
check('chips read-only (disabled, no handlers)',
  kids.slice(1).every((c) => c.disabled === true && !(c._handlers.click || []).length));
check('char bar shows active traveler', byId['char-bar'].children.length >= 1, `n=${byId['char-bar'].children.length}`);
check('profile char card renders', byId['profile-char'].children.length === 1, `n=${byId['profile-char'].children.length}`);
check('current week line describes live week', /Week 1.*JFK.*Medium/.test(byId['current-week-line'].textContent), JSON.stringify(byId['current-week-line'].textContent));

// ---- Scenario A2: week jump + restart go through confirmed profile actions ----
byId['week-input'].value = '2';
byId['goto-week-btn']._handlers.click[0]();
check('goto-week loads Week 2', /Week 2/.test(byId['clock-line'].textContent), JSON.stringify(byId['clock-line'].textContent));
check('week 2 trip saved namespaced', store.get('ca_trip_c1_w2') != null);
byId['restart-week-btn']._handlers.click[0]();
check('restart keeps Week 2 and resets', /Week 2/.test(byId['clock-line'].textContent) && /\$1,500 left/.test(byId['wallet-line'].textContent));

// ---- Scenario B: legacy saves migrate under a Traveler ----
resetDom(); store.clear();
store.set('ca_interests', JSON.stringify(['wine', 'dancing']));
store.set('ca_trip_w1', JSON.stringify({ airport: 'LAX', gameTime: 900, difficulty: 'hard', spent: 100, loungePass: null, locked: true }));
store.set('ca_loyalty', JSON.stringify({ recs: { VL: { miles: 1000, segments: 1, points: 1000, tier: 'member', lastActiveWeek: 1 } }, erosionWeek: 1 }));
eval(src); // eslint-disable-line

const chars = JSON.parse(store.get('ca_chars'));
check('Traveler auto-created', chars.length === 1 && chars[0].name === 'Traveler', JSON.stringify(chars.map((c) => c.name)));
check('legacy interests adopted', JSON.stringify(chars[0].interests) === JSON.stringify(['wine', 'dancing']));
const cid = chars[0].id;
check('trip migrated to namespaced key', store.get(`ca_trip_${cid}_w1`) != null);
check('legacy trip key removed', store.get('ca_trip_w1') == null);
check('loyalty migrated', store.get(`ca_loyalty_${cid}`) != null && store.get('ca_loyalty') == null);
check('migrated traveler renders', /LAX/.test(byId['clock-line'].textContent), JSON.stringify(byId['clock-line'].textContent));

// ---- Scenario C: brand-new player is forced into creation ----
resetDom(); store.clear();
eval(src); // eslint-disable-line
check('creation modal opens with no characters', byId['char-modal'].style.display === 'flex');

process.exit(failures ? 1 : 0);
