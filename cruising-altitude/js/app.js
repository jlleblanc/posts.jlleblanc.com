// Phase 4: flights you buy, budgets, loyalty + points, lounge, erosion.
import { getAirportById, getAirlineById, AIRLINES, AVATARS, INTERESTS_ALL, MAX_INTERESTS, DIFFICULTIES } from './data.js';
import { startTimeForAirport, formatGameTime, formatLocalTime, formatDuration } from './time.js';
import { getFlightsFrom } from './schedule.js';
import { getPeopleAt, getIntelForAll } from './people.js';
import { eligibleActivities, successChance, matchMultiplier, runEncounter, MAX_ACTIVITIES } from './encounters.js';
import {
  blankLoyalty, ensureRecs, applyErosion, nextTierProgress, pointsPriceForMiles, earnForFlight,
  budgetFor, canAffordCash, anyLoungeAccess, loungeBonus, buyLoungePass,
  LOUNGE_PASS_COST, LOUNGE_PASS_MINUTES,
} from './loyalty.js';

const weekInput = document.getElementById('week-input');
const airportInput = document.getElementById('airport-input');
const difficultyInput = document.getElementById('difficulty-input');
const listEl = document.getElementById('flight-list');
const peopleEl = document.getElementById('people-list');
const intelEl = document.getElementById('intel-list');
const loyaltyEl = document.getElementById('loyalty-list');
const clockEl = document.getElementById('clock-line');
const walletEl = document.getElementById('wallet-line');
const scoreEl = document.getElementById('score-line');
const arrivalEl = document.getElementById('arrival-line');
const pickerEl = document.getElementById('interest-picker');
const loungeBannerEl = document.getElementById('lounge-banner');
const modalEl = document.getElementById('encounter-modal');
const charBarEl = document.getElementById('char-bar');
const charModalEl = document.getElementById('char-modal');
const profileCharEl = document.getElementById('profile-char');
const currentWeekEl = document.getElementById('current-week-line');

let trip = null;
let currentWeek = 1; // setup inputs never drive the game directly; only actions do
let activeTab = 'flights';
let encounterTarget = null;
let encounterPicked = new Set();
let arrivalMsg = '';
let erosionMsg = '';
let charMenuOpen = false;
let draftAvatar = AVATARS[0];
let draftInterests = new Set();

function getWeek() { return currentWeek; }

// ---- characters: interests are permanent, chosen once at creation ----
function loadChars() {
  try {
    const raw = localStorage.getItem('ca_chars');
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((c) => c && c.id && Array.isArray(c.interests)) : [];
  } catch { return []; }
}

function saveChars(list) {
  try { localStorage.setItem('ca_chars', JSON.stringify(list)); } catch { /* ignore */ }
}

function activeChar() {
  const list = loadChars();
  if (list.length === 0) return null;
  try {
    const id = localStorage.getItem('ca_active');
    const found = list.find((c) => c.id === id);
    if (found) return found;
  } catch { /* ignore */ }
  return list[0];
}

function setActiveChar(id) {
  try { localStorage.setItem('ca_active', id); } catch { /* ignore */ }
  trip = null;
  arrivalMsg = '';
  erosionMsg = '';
  charMenuOpen = false;
}

// One-time migration: pre-character saves move under the first character.
function migrateLegacyTo(cid) {
  try {
    const loy = localStorage.getItem('ca_loyalty');
    if (loy != null) {
      localStorage.setItem(`ca_loyalty_${cid}`, loy);
      localStorage.removeItem('ca_loyalty');
    }
    for (let w = 1; w <= 53; w++) {
      for (const k of ['trip', 'score', 'met', 'log']) {
        const oldK = `ca_${k}_w${w}`;
        const v = localStorage.getItem(oldK);
        if (v != null) {
          localStorage.setItem(`ca_${k}_${cid}_w${w}`, v);
          localStorage.removeItem(oldK);
        }
      }
    }
    localStorage.removeItem('ca_interests');
  } catch { /* ignore */ }
}

function legacyInterests() {
  try {
    const raw = localStorage.getItem('ca_interests');
    if (raw) return JSON.parse(raw).slice(0, MAX_INTERESTS);
  } catch { /* ignore */ }
  return null;
}

function hasLegacySaves() {
  try {
    if (localStorage.getItem('ca_interests') || localStorage.getItem('ca_loyalty')) return true;
    for (let w = 1; w <= 53; w++) {
      if (localStorage.getItem(`ca_trip_w${w}`)) return true;
    }
  } catch { /* ignore */ }
  return false;
}

// Returns chars (maybe empty — caller opens the creation modal then).
function ensureChars() {
  const list = loadChars();
  if (list.length > 0) return list;
  if (hasLegacySaves()) {
    const cid = 'c_' + Date.now().toString(36);
    const interests = legacyInterests() || ['coffee', 'hookup', 'sex'];
    saveChars([{ id: cid, name: 'Traveler', avatar: AVATARS[2], interests, createdAt: Date.now() }]);
    setActiveChar(cid);
    migrateLegacyTo(cid);
    return loadChars();
  }
  return [];
}

// ---- persistence (per character per week) ----
function cid() { const c = activeChar(); return c ? c.id : 'none'; }
function tripKey() { return `ca_trip_${cid()}_w${getWeek()}`; }
function scoreKey() { return `ca_score_${cid()}_w${getWeek()}`; }
function metKey() { return `ca_met_${cid()}_w${getWeek()}`; }
function logKey() { return `ca_log_${cid()}_w${getWeek()}`; }

function loadTrip() {
  try {
    const raw = localStorage.getItem(tripKey());
    if (raw) {
      const t = JSON.parse(raw);
      if (t && t.airport && getAirportById(t.airport)) return t;
    }
  } catch { /* ignore */ }
  return null;
}

function initTrip() {
  const airport = airportInput.value;
  trip = {
    airport,
    gameTime: startTimeForAirport(airport),
    difficulty: difficultyInput.value || 'medium',
    spent: 0,
    loungePass: null,
    locked: false, // interests stay editable until the first action
  };
  saveTrip();
}

function getInterests() {
  const c = activeChar();
  return c ? [...c.interests] : [];
}

// The week-started flag is kept on the trip for save compat; interests
// themselves are permanent on the character and never edited after creation.
function lockWeek() {
  if (trip && !trip.locked) {
    trip.locked = true;
    saveTrip();
  }
}

function saveTrip() {
  try { localStorage.setItem(tripKey(), JSON.stringify(trip)); } catch { /* ignore */ }
}

function loadLoyalty() {
  try {
    const raw = localStorage.getItem(`ca_loyalty_${cid()}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.recs) return ensureRecs(parsed);
    }
  } catch { /* ignore */ }
  return { recs: blankLoyalty(), erosionWeek: null };
}

function saveLoyalty(store) {
  try { localStorage.setItem(`ca_loyalty_${cid()}`, JSON.stringify(store)); } catch { /* ignore */ }
}

function loyaltyStore() {
  const store = loadLoyalty();
  const week = getWeek();
  if (store.erosionWeek !== week) {
    const eroded = applyErosion(store.recs, week);
    store.erosionWeek = week;
    saveLoyalty(store);
    erosionMsg = eroded.length > 0
      ? `Status eroded on ${eroded.join(', ')} — skipped a full week, miles halved.`
      : '';
  }
  return store;
}

function getScore() {
  try { return parseInt(localStorage.getItem(scoreKey()) || '0', 10) || 0; }
  catch { return 0; }
}
function addScore(n) {
  const v = getScore() + n;
  try { localStorage.setItem(scoreKey(), String(v)); } catch { /* ignore */ }
  return v;
}
function getMetIds() {
  try { return new Set(JSON.parse(localStorage.getItem(metKey()) || '[]')); }
  catch { return new Set(); }
}
function markMet(id) {
  const s = getMetIds();
  s.add(id);
  try { localStorage.setItem(metKey(), JSON.stringify([...s].slice(-500))); } catch { /* ignore */ }
}
function logEncounter(entry) {
  try {
    const raw = JSON.parse(localStorage.getItem(logKey()) || '[]');
    raw.unshift({ ...entry, at: Date.now() });
    localStorage.setItem(logKey(), JSON.stringify(raw.slice(0, 100)));
  } catch { /* ignore */ }
}

function getInterests() {
  try {
    const raw = localStorage.getItem('ca_interests');
    if (raw) return JSON.parse(raw).slice(0, MAX_INTERESTS);
  } catch { /* ignore */ }
  return ['coffee', 'hookup', 'sex'];
}

function renderPicker() {
  const c = activeChar();
  const mine = new Set(c ? c.interests : []);
  pickerEl.innerHTML = '';
  const note = document.createElement('div');
  note.className = 'lock-note';
  note.textContent = c
    ? `${c.avatar} ${c.name}'s interests — permanent, chosen at creation.`
    : 'Create a character to begin.';
  pickerEl.appendChild(note);
  for (const tag of INTERESTS_ALL) {
    const chip = document.createElement('button');
    chip.className = 'chip' + (mine.has(tag) ? ' selected' : '');
    chip.textContent = tag;
    chip.disabled = true;
    chip.title = c ? 'Permanent — set at character creation' : '';
    pickerEl.appendChild(chip);
  }
}

function renderCharBar() {
  const c = activeChar();
  charBarEl.innerHTML = '';
  if (!c) {
    const b = document.createElement('button');
    b.className = 'btn btn-primary btn-small';
    b.textContent = '＋ New traveler';
    b.addEventListener('click', () => openCharModal(true));
    charBarEl.appendChild(b);
    return;
  }
  const btn = document.createElement('button');
  btn.className = 'char-btn';
  btn.innerHTML = `<span class="char-avatar">${c.avatar}</span> <span>${c.name}</span> <span class="char-caret">▾</span>`;
  btn.addEventListener('click', () => { charMenuOpen = !charMenuOpen; renderCharBar(); });
  charBarEl.appendChild(btn);
  if (!charMenuOpen) return;
  const menu = document.createElement('div');
  menu.className = 'char-menu';
  for (const other of loadChars()) {
    const item = document.createElement('button');
    item.className = 'char-item' + (other.id === c.id ? ' active' : '');
    item.innerHTML = `<span>${other.avatar}</span> <span>${other.name}</span> <span class="flight-sub">${other.interests.length} interests</span>`;
    if (other.id !== c.id) {
      const id = other.id;
      item.addEventListener('click', () => { setActiveChar(id); render(); });
    }
    menu.appendChild(item);
  }
  const add = document.createElement('button');
  add.className = 'char-item new';
  add.textContent = '＋ New traveler';
  add.addEventListener('click', () => { charMenuOpen = false; openCharModal(false); });
  menu.appendChild(add);
  charBarEl.appendChild(menu);
}

function openCharModal(mustCreate) {
  draftAvatar = AVATARS[0];
  draftInterests = new Set();
  renderCharDraft(mustCreate, '');
  charModalEl.style.display = 'flex';
}

function closeCharModal() {
  charModalEl.style.display = 'none';
}

function renderCharDraft(mustCreate, error) {
  charModalEl.innerHTML = `
    <div class="modal-card">
      <h3>${mustCreate && loadChars().length === 0 ? 'Create your traveler' : 'New traveler'}</h3>
      <div class="flight-sub">Name, face, and 2–5 interests — permanent for this character's whole career.</div>
      <input id="char-name" class="name-input" maxlength="20" placeholder="Name..." value="">
      <div class="section-title">Face</div>
      <div class="avatar-grid">
        ${AVATARS.map((a) => `<button class="avatar-option${a === draftAvatar ? ' selected' : ''}" data-avatar="${a}">${a}</button>`).join('')}
      </div>
      <div class="section-title">Interests — pick ${MAX_INTERESTS} max (${draftInterests.size} picked)</div>
      <div class="chip-grid">
        ${INTERESTS_ALL.map((t) => `<button class="chip${draftInterests.has(t) ? ' selected' : ''}" data-interest="${t}">${t}</button>`).join('')}
      </div>
      ${error ? `<div class="form-error">${error}</div>` : ''}
      <div class="modal-actions">
        ${mustCreate && loadChars().length === 0 ? '' : '<button class="btn btn-small" id="char-cancel">Cancel</button>'}
        <button class="btn btn-primary btn-small" id="char-create">Create</button>
      </div>
    </div>`;
  charModalEl.querySelectorAll('[data-avatar]').forEach((b) => {
    b.addEventListener('click', () => {
      draftAvatar = b.dataset.avatar;
      charModalEl.querySelectorAll('[data-avatar]').forEach((x) => x.classList.toggle('selected', x.dataset.avatar === draftAvatar));
    });
  });
  charModalEl.querySelectorAll('[data-interest]').forEach((b) => {
    b.addEventListener('click', () => {
      const t = b.dataset.interest;
      if (draftInterests.has(t)) draftInterests.delete(t);
      else {
        if (draftInterests.size >= MAX_INTERESTS) return;
        draftInterests.add(t);
      }
      b.classList.toggle('selected', draftInterests.has(t));
      renderCharDraftCount();
    });
  });
  const cancel = charModalEl.querySelector('#char-cancel');
  if (cancel) cancel.addEventListener('click', closeCharModal);
  charModalEl.querySelector('#char-create').addEventListener('click', () => {
    const name = (charModalEl.querySelector('#char-name').value || '').trim().slice(0, 20);
    if (!name) { renderCharDraft(mustCreate, 'Give your traveler a name.'); return; }
    if (draftInterests.size < 2) { renderCharDraft(mustCreate, 'Pick at least 2 interests — they last forever.'); return; }
    const list = loadChars();
    const id = 'c_' + Date.now().toString(36);
    list.push({ id, name, avatar: draftAvatar, interests: [...draftInterests], createdAt: Date.now() });
    saveChars(list);
    setActiveChar(id);
    closeCharModal();
    render();
  });
  if (!mustCreate || loadChars().length > 0) {
    charModalEl.onclick = (e) => { if (e.target === charModalEl) closeCharModal(); };
  } else {
    charModalEl.onclick = null;
  }
}

function renderCharDraftCount() {
  const titles = charModalEl.querySelectorAll('.section-title');
  const last = titles[titles.length - 1];
  if (last) last.textContent = `Interests — pick ${MAX_INTERESTS} max (${draftInterests.size} picked)`;
}

function visiblePeople(weekNum) {
  const met = getMetIds();
  return getPeopleAt(trip.airport, trip.gameTime, weekNum, getInterests()).filter((p) => !met.has(p.id));
}

// ---- booking ----
function bookFlight(f, usePoints) {
  const week = getWeek();
  const store = loyaltyStore();
  const from = trip.airport;
  if (usePoints) {
    const cost = pointsPriceForMiles(f.miles);
    const rec = store.recs[f.airline];
    if (!rec || rec.points < cost) return;
    rec.points -= cost;
  } else {
    if (!canAffordCash(trip, f.price)) return;
    trip.spent += f.price;
  }
  trip.airport = f.to;
  trip.gameTime = f.actualArrival; // no booking ahead: you board now, time jumps to arrival
  lockWeek();
  const earned = earnForFlight(store.recs, f.airline, from, f.to, week);
  saveLoyalty(store);
  const al = getAirlineById(f.airline);
  arrivalMsg = `Arrived ${f.to}${f.delayed ? ` (delayed +${formatDuration(f.delayMinutes)})` : ''} · +${earned.miles.toLocaleString()} mi +${earned.points.toLocaleString()} pts ${al ? al.name : ''} (${earned.tier})`;
  saveTrip();
  render();
}

function renderFlights(weekNum, store) {
  const flights = getFlightsFrom(trip.airport, trip.gameTime, weekNum, 1440).slice(0, 20);
  listEl.innerHTML = '';
  if (flights.length === 0) {
    listEl.innerHTML = '<div class="flight-row"><div class="flight-sub">No departures — advance time.</div></div>';
    return;
  }
  for (const f of flights) {
    const al = getAirlineById(f.airline);
    const affordCash = canAffordCash(trip, f.price);
    const ptsCost = pointsPriceForMiles(f.miles);
    const affordPts = (store.recs[f.airline]?.points ?? 0) >= ptsCost;
    const row = document.createElement('div');
    row.className = 'flight-row' + (f.deal ? ' deal' : '');
    row.innerHTML = `
      <div class="flight-main">
        <div class="flight-route">${f.from} → ${f.to} · ${al ? al.name : f.airline} ${f.flightNumber}</div>
        <div class="flight-sub">Dep ${formatLocalTime(f.scheduledDeparture, f.from)} · Arr ${formatLocalTime(f.actualArrival, f.to)} · ${formatDuration(f.duration)} · Gate ${f.gate}</div>
        <div class="flight-sub">${f.delayed ? `<span class="delayed-tag">Delayed +${formatDuration(f.delayMinutes)}</span> · ` : ''}${f.miles.toLocaleString()} mi · ${ptsCost.toLocaleString()} pts award</div>
        ${f.deal ? `<span class="deal-tag">✨ ${f.dealLabel}</span>` : ''}
      </div>
      <div class="flight-actions">
        <div class="flight-price">$${f.price}</div>
        <button class="btn-book" ${affordCash ? '' : 'disabled'}>Book</button>
        <button class="btn-book pts" ${affordPts ? '' : 'disabled'}>${ptsCost.toLocaleString()} pts</button>
      </div>`;
    const [cashBtn, ptsBtn] = row.querySelectorAll('.btn-book');
    cashBtn.title = affordCash ? `Fly now for $${f.price}` : 'Over budget';
    ptsBtn.title = affordPts ? `Redeem ${ptsCost.toLocaleString()} ${al ? al.name : ''} points` : `Need ${ptsCost.toLocaleString()} pts`;
    cashBtn.addEventListener('click', () => bookFlight(f, false));
    ptsBtn.addEventListener('click', () => bookFlight(f, true));
    listEl.appendChild(row);
  }
}

function renderLoungeBanner(store) {
  const lounges = AIRLINES.filter((a) => a.hubs.includes(trip.airport));
  if (lounges.length === 0) {
    loungeBannerEl.style.display = 'none';
    return;
  }
  loungeBannerEl.style.display = '';
  const access = anyLoungeAccess({ ...trip, loyalty: store.recs }, trip.airport);
  if (access) {
    loungeBannerEl.className = 'lounge-banner has-access';
    loungeBannerEl.innerHTML = `
      <div><strong>${access.airline.icon} ${access.airline.lounge}</strong> — access granted (${access.via === 'status' ? store.recs[access.airline.id].tier : 'day pass'})</div>
      <div class="flight-sub">Encounters here get +15% success.</div>`;
    return;
  }
  loungeBannerEl.className = 'lounge-banner';
  loungeBannerEl.innerHTML = `
    <div><strong>No lounge access here.</strong> <span class="flight-sub">Day pass $25 · 4h · +15% encounter success</span></div>
    <div class="pass-row"></div>`;
  const row = loungeBannerEl.querySelector('.pass-row');
  for (const a of lounges) {
    const b = document.createElement('button');
    b.className = 'btn btn-small';
    b.textContent = `${a.icon} ${a.id} pass $25`;
    b.disabled = !canAffordCash(trip, LOUNGE_PASS_COST);
    b.addEventListener('click', () => {
      const res = buyLoungePass({ ...trip, loyalty: store.recs }, a.id);
      if (!res.ok) { arrivalMsg = res.reason; render(); return; }
      trip.spent += LOUNGE_PASS_COST;
      trip.loungePass = { airline: a.id, expires: trip.gameTime + LOUNGE_PASS_MINUTES };
      arrivalMsg = `${a.lounge} day pass — 4h of +15% encounters.`;
      saveTrip();
      render();
    });
    row.appendChild(b);
  }
}

function renderPeople(weekNum, store) {
  renderLoungeBanner(store);
  const people = visiblePeople(weekNum);
  peopleEl.innerHTML = '';
  if (people.length === 0) {
    peopleEl.innerHTML = '<div class="person-card"><div class="flight-sub">Nobody here right now. Advance time — crowds build around arrivals and 1–2h before departures.</div></div>';
    return;
  }
  for (const p of people) {
    const card = document.createElement('div');
    card.className = 'person-card';
    const route = p.inboundFlight
      ? `in ${p.inboundFlight.from} → out ${p.outboundFlight.to} ${p.outboundFlight.flightNumber}`
      : `originating → out ${p.outboundFlight.to} ${p.outboundFlight.flightNumber}`;
    card.innerHTML = `
      <div class="person-top">
        <span class="person-avatar">${p.avatar}</span>
        <div><div class="person-name">${p.name}, ${p.age}</div>
        <div class="flight-sub">${p.background} · ${route}</div></div>
        <span class="tier tier-${p.tier.toLowerCase()}">${p.tier}</span>
      </div>
      <div class="person-bottom">
        <span class="flight-sub">⏱ ${formatDuration(p.minutesLeft)} left · ${p.shared} shared interest${p.shared === 1 ? '' : 's'}</span>
        <button class="btn btn-meet">Meet</button>
      </div>`;
    card.querySelector('.btn-meet').addEventListener('click', () => openEncounter(p, store));
    peopleEl.appendChild(card);
  }
}

function renderIntel(weekNum) {
  const rows = getIntelForAll(trip.gameTime, weekNum, getInterests());
  intelEl.innerHTML = '';
  for (const r of rows.slice(0, 24)) {
    const ap = getAirportById(r.airportId);
    const div = document.createElement('div');
    div.className = 'intel-row' + (r.airportId === trip.airport ? ' current' : '');
    div.innerHTML = `
      <span class="intel-code">${r.airportId}</span>
      <span class="intel-name">${ap ? ap.name : ''}</span>
      <span class="intel-count">${r.count} here</span>
      <span class="tier tier-${r.vibe.toLowerCase()}">${r.vibe}</span>`;
    intelEl.appendChild(div);
  }
}

function renderLoyalty(weekNum, store) {
  loyaltyEl.innerHTML = '';
  if (erosionMsg) {
    const d = document.createElement('div');
    d.className = 'erosion-note';
    d.textContent = erosionMsg;
    loyaltyEl.appendChild(d);
  }
  for (const al of AIRLINES) {
    const rec = store.recs[al.id];
    const prog = nextTierProgress(rec);
    const card = document.createElement('div');
    card.className = 'loyalty-card';
    card.style.borderTopColor = al.color;
    card.innerHTML = `
      <div class="person-top">
        <span>${al.icon} <strong>${al.name}</strong></span>
        <span class="tier tier-${rec.tier === 'member' ? 'cold' : rec.tier === 'silver' ? 'warm' : 'hot'}">${rec.tier}</span>
      </div>
      <div class="flight-sub">${rec.miles.toLocaleString()} mi · ${rec.segments} segs · ${rec.points.toLocaleString()} pts${rec.lastActiveWeek != null ? ` · last flown Wk ${rec.lastActiveWeek}` : ''}</div>
      <div class="progress"><div class="progress-bar" style="width:${prog.pct}%; background:${al.color};"></div></div>
      <div class="flight-sub">${prog.next ? `Next: ${prog.next} — ${prog.needMiles.toLocaleString()} mi or ${prog.needSeg} segs` : 'Top tier ✨'}</div>`;
    loyaltyEl.appendChild(card);
  }
}

function render() {
  const weekNum = getWeek();
  if (!trip) trip = loadTrip();
  if (!trip) initTrip();
  renderCharBar();
  syncSetupSelects();
  const store = loyaltyStore();
  clockEl.textContent = `Week ${weekNum} · ${trip.airport} · ${formatGameTime(trip.gameTime, trip.airport)} (STD, no DST)`;
  const budget = budgetFor(trip.difficulty);
  walletEl.textContent = budget == null
    ? `💰 Unlimited budget · $${trip.spent.toLocaleString()} spent`
    : `💰 $${(budget - trip.spent).toLocaleString()} left of $${budget.toLocaleString()} (${DIFFICULTIES[trip.difficulty].label})`;
  walletEl.classList.toggle('over', budget != null && trip.spent > budget);
  scoreEl.textContent = `⭐ ${getScore()} pts this week`;
  renderPicker(); // keeps the interest lock note in sync after the first action
  if (arrivalMsg) {
    arrivalEl.style.display = '';
    arrivalEl.textContent = arrivalMsg;
  } else {
    arrivalEl.style.display = 'none';
  }
  renderFlights(weekNum, store);
  renderPeople(weekNum, store);
  renderIntel(weekNum);
  renderLoyalty(weekNum, store);
  renderProfile();
}

// Setup inputs mirror the live trip only when the week/character context
// changes — never while the player is editing them in Profile.
let selectsFor = '';
function syncSetupSelects() {
  const key = `${cid()}:w${getWeek()}`;
  if (selectsFor === key || !trip) return;
  selectsFor = key;
  weekInput.value = getWeek();
  airportInput.value = trip.airport;
  difficultyInput.value = trip.difficulty;
}

function renderProfile() {
  const c = activeChar();
  profileCharEl.innerHTML = '';
  if (c) {
    const d = document.createElement('div');
    d.className = 'profile-char-card';
    let since = '';
    try { since = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''; } catch { /* ignore */ }
    d.innerHTML = `<span class="person-avatar">${c.avatar}</span><div><div class="person-name">${c.name}</div><div class="flight-sub">${since ? `Traveling since ${since} · ` : ''}${c.interests.length} permanent interests</div></div>`;
    profileCharEl.appendChild(d);
  }
  const budget = budgetFor(trip.difficulty);
  currentWeekEl.textContent = `Playing Week ${getWeek()} · started at ${trip.airport} · ${budget == null ? 'Unlimited budget' : `${DIFFICULTIES[trip.difficulty].label} budget ($${budget.toLocaleString()})`} · $${trip.spent.toLocaleString()} spent`;
}

function weekHasProgress() {
  if (getScore() > 0 || getMetIds().size > 0) return true;
  if (!trip) return false;
  return trip.spent > 0 || trip.gameTime > startTimeForAirport(trip.airport);
}

// Native confirm, guarded so headless/blocked environments default to "yes".
function safeConfirm(msg) {
  try {
    if (typeof confirm === 'function') return confirm(msg);
  } catch { /* ignore */ }
  return true;
}

// ---- encounter modal ----
function openEncounter(person, store) {
  encounterTarget = person;
  encounterPicked = new Set();
  renderEncounterPick(store);
  modalEl.style.display = 'flex';
}

function closeEncounter() {
  modalEl.style.display = 'none';
  encounterTarget = null;
}

function renderEncounterPick(store) {
  const p = encounterTarget;
  if (!p) return;
  const bonus = loungeBonus({ ...trip, loyalty: store.recs }, trip.airport);
  const mult = matchMultiplier(p.matchScore);
  const eligible = eligibleActivities(p);
  modalEl.innerHTML = `
    <div class="modal-card">
      <div class="person-top">
        <span class="person-avatar">${p.avatar}</span>
        <div><div class="person-name">${p.name}, ${p.age}</div>
        <div class="flight-sub">${p.background} · ${p.tier} · ×${mult.toFixed(1)} match mult${bonus > 0 ? ' · ✨ lounge +15%' : ''}</div></div>
        <span class="tier tier-${p.tier.toLowerCase()}">${p.tier}</span>
      </div>
      <div class="flight-sub">⏱ ${formatDuration(p.minutesLeft)} before their flight · pick up to ${MAX_ACTIVITIES} activities (saying hi costs 15m)</div>
      <div class="act-list">
        ${eligible.map((a) => {
          const chance = Math.round(successChance(a, p, bonus) * 100);
          const pts = Math.round(a.basePoints * mult);
          return `<button class="act-row" data-act="${a.name}">
            <span><strong>${a.name}</strong> · ${formatDuration(a.duration)} · ~${pts} pts</span>
            <span class="chance">${chance}%</span>
          </button>`;
        }).join('')}
      </div>
      ${eligible.length === 0 ? '<div class="flight-sub">No chemistry — nothing to try here.</div>' : ''}
      <div class="modal-actions">
        <button class="btn btn-small" id="enc-cancel">Not now</button>
        <button class="btn btn-primary btn-small" id="enc-go">Go (${encounterPicked.size})</button>
      </div>
    </div>`;
  modalEl.querySelectorAll('.act-row').forEach((b) => {
    const name = b.dataset.act;
    if (encounterPicked.has(name)) b.classList.add('picked');
    b.addEventListener('click', () => {
      if (encounterPicked.has(name)) encounterPicked.delete(name);
      else {
        if (encounterPicked.size >= MAX_ACTIVITIES) return;
        encounterPicked.add(name);
      }
      modalEl.querySelectorAll('.act-row').forEach((x) => x.classList.toggle('picked', encounterPicked.has(x.dataset.act)));
      modalEl.querySelector('#enc-go').textContent = `Go (${encounterPicked.size})`;
    });
  });
  modalEl.querySelector('#enc-cancel').addEventListener('click', closeEncounter);
  modalEl.querySelector('#enc-go').addEventListener('click', () => resolveEncounter(store));
  modalEl.onclick = (e) => { if (e.target === modalEl) closeEncounter(); };
}

function resolveEncounter(store) {
  const p = encounterTarget;
  if (!p) return;
  const bonus = loungeBonus({ ...trip, loyalty: store.recs }, trip.airport);
  const result = runEncounter(p, [...encounterPicked], Math.random, bonus);
  trip.gameTime += result.totalTime;
  lockWeek();
  saveTrip();
  markMet(p.id);
  const total = addScore(result.totalPoints);
  logEncounter({
    name: p.name, tier: p.tier, points: result.totalPoints,
    activities: result.results.map((r) => `${r.name}${r.success ? '' : ' (miss)'}`),
    minutes: result.totalTime, airport: trip.airport, lounge: result.loungeBoost,
  });
  modalEl.innerHTML = `
    <div class="modal-card">
      <div class="person-top">
        <span class="person-avatar">${p.avatar}</span>
        <div><div class="person-name">${p.name}</div>
        <div class="flight-sub">${formatDuration(result.totalTime)} spent · ×${result.multiplier} mult${result.trimmed ? ' · trimmed to fit their layover' : ''}${result.loungeBoost ? ' · ✨ lounge boost' : ''}</div></div>
      </div>
      <div class="act-list">
        ${result.results.length === 0 ? '<div class="flight-sub">Just said hi — no time for more before their flight.</div>' : ''}
        ${result.results.map((r) => `
          <div class="act-row done ${r.success ? 'win' : 'miss'}">
            <span>${r.success ? '✓' : '✗'} ${r.name}</span>
            <span>${r.success ? `+${r.points}` : '+0'}</span>
          </div>`).join('')}
      </div>
      ${result.consolation ? '<div class="flight-sub">No spark, but a nice chat (+5 consolation).</div>' : ''}
      <div class="reward">+${result.totalPoints} pts · ${total} total</div>
      <div class="modal-actions">
        <button class="btn btn-primary btn-small" id="enc-done">Continue</button>
      </div>
    </div>`;
  modalEl.querySelector('#enc-done').addEventListener('click', () => { closeEncounter(); render(); });
  modalEl.onclick = (e) => { if (e.target === modalEl) { closeEncounter(); render(); } };
}

document.getElementById('goto-week-btn').addEventListener('click', () => {
  const n = Math.max(1, parseInt(weekInput.value || '1', 10));
  if (n === getWeek()) { render(); return; }
  if (weekHasProgress() && !safeConfirm(`Leave Week ${getWeek()}? Its flights, score, and encounters stay saved for this traveler.`)) {
    weekInput.value = getWeek();
    return;
  }
  currentWeek = n;
  trip = null;
  arrivalMsg = '';
  erosionMsg = '';
  render();
});
document.getElementById('restart-week-btn').addEventListener('click', () => {
  if (weekHasProgress() && !safeConfirm(`Restart Week ${getWeek()}? This wipes its flights, score, and encounters for this traveler.`)) return;
  try {
    localStorage.removeItem(tripKey());
    localStorage.removeItem(scoreKey());
    localStorage.removeItem(metKey());
    localStorage.removeItem(logKey());
  } catch { /* ignore */ }
  arrivalMsg = '';
  erosionMsg = '';
  selectsFor = '';
  initTrip();
  render();
});
document.querySelectorAll('[data-advance]').forEach((b) => {
  b.addEventListener('click', () => {
    if (!trip) return;
    trip.gameTime += parseInt(b.dataset.advance, 10);
    lockWeek();
    arrivalMsg = '';
    saveTrip();
    render();
  });
});
document.querySelectorAll('.tab').forEach((b) => {
  b.addEventListener('click', () => {
    activeTab = b.dataset.tab;
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === b));
    for (const t of ['flights', 'people', 'intel', 'miles', 'profile']) {
      document.getElementById(`tab-${t}`).style.display = activeTab === t ? '' : 'none';
    }
  });
});

try {
  const d = localStorage.getItem('ca_difficulty');
  if (d && DIFFICULTIES[d]) difficultyInput.value = d;
} catch { /* ignore */ }
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(() => {}));
}
const _chars = ensureChars();
if (_chars.length === 0) openCharModal(true);
render();
