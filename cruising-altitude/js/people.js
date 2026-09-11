// People engine — every NPC is bound to real flights, never random ambient spawns.
// - Connecting pax: inbound arrival A + outbound departure D, visible A.actualArrival → D.schedDep - 30.
// - Originating pax: outbound D only, visible D.schedDep - ~2h → D.schedDep - 30.
// - Terminating pax (inbound, no outbound): exit the terminal, never listed.
import {
  AIRPORTS, INTERESTS_ALL, FIRST_NAMES, BACKGROUNDS, AVATARS, getAirportById,
} from './data.js';
import { seededRng, seededInt, seededPick, weekSeed } from './seed.js';
import { getFlightsFrom, getArrivalsTo } from './schedule.js';

export const BOARDING_CUTOFF = 30; // people vanish 30m before departure
const MAX_LAYOVER = 600; // 10h cap on connections we model
const MIN_CONNECT = 45;

const _cache = new Map(); // `${week}:${airport}:${timeBucket}` -> people[]

function timeBucket(gameTime) {
  return Math.floor(gameTime / 15); // 15m buckets keep lists stable while browsing
}

function makeIdentity(rng) {
  return {
    name: seededPick(rng, FIRST_NAMES),
    age: seededInt(rng, 21, 55),
    avatar: seededPick(rng, AVATARS),
    background: seededPick(rng, BACKGROUNDS),
  };
}

function makeInterests(rng) {
  const pool = [...INTERESTS_ALL];
  // seeded shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const nVis = seededInt(rng, 2, 5);
  const nHid = seededInt(rng, 1, 3);
  return { interests: pool.slice(0, nVis), hiddenInterests: pool.slice(nVis, nVis + nHid) };
}

export function scoreTier(person, playerInterests) {
  if (!playerInterests || playerInterests.length === 0) return { shared: 0, score: 0, tier: 'Cold' };
  const all = new Set([...person.interests, ...person.hiddenInterests]);
  let shared = 0;
  for (const p of playerInterests) if (all.has(p)) shared++;
  const score = Math.min(1, shared / 3);
  const tier = shared >= 3 ? 'Hot' : shared >= 1 ? 'Warm' : 'Cold';
  return { shared, score, tier };
}

function buildPerson({ seedStr, inbound, outbound, availableFrom, availableUntil, gameTime, playerInterests }) {
  const rng = seededRng(seedStr);
  const id = makeIdentity(rng);
  const ints = makeInterests(rng);
  const person = {
    id: seedStr,
    ...id,
    ...ints,
    inboundFlight: inbound
      ? { id: inbound.id, from: inbound.from, flightNumber: inbound.flightNumber, actualArrival: inbound.actualArrival }
      : null,
    outboundFlight: {
      id: outbound.id, to: outbound.to, flightNumber: outbound.flightNumber,
      scheduledDeparture: outbound.scheduledDeparture,
    },
    availableFrom,
    availableUntil,
    minutesLeft: Math.max(0, Math.round(availableUntil - gameTime)),
  };
  const s = scoreTier(person, playerInterests);
  person.shared = s.shared;
  person.matchScore = s.score;
  person.tier = s.tier;
  return person;
}

export function getPeopleAt(airportId, gameTime, weekNum, playerInterests = []) {
  const key = `${weekNum}:${airportId}:${timeBucket(gameTime)}:${[...playerInterests].sort().join(',')}`;
  if (_cache.has(key)) return _cache.get(key);

  const ap = getAirportById(airportId);
  const isHub = !!(ap && ap.isHub);
  // Only departures in the next 6h can have people waiting; connections need
  // arrivals from the past 10h. Shorter window keeps hubs at 4–9 people.
  const departures = getFlightsFrom(airportId, gameTime, weekNum, 360);
  const arrivals = getArrivalsTo(airportId, gameTime, weekNum, MAX_LAYOVER, 30);
  const landed = arrivals.filter((a) => a.actualArrival <= gameTime);
  const people = [];

  for (const d of departures) {
    const rngD = seededRng(`dep-pax-${weekSeed(weekNum)}-${d.id}`);
    const until = d.scheduledDeparture - BOARDING_CUTOFF;

    // 1) Originating pax: show up 1–2h before their flight.
    const nOrig = isHub ? (rngD() < 0.4 ? (rngD() < 0.25 ? 2 : 1) : 0) : (rngD() < 0.35 ? 1 : 0);
    for (let i = 0; i < nOrig; i++) {
      const rng = seededRng(`orig-w-${weekSeed(weekNum)}-${d.id}-${i}`);
      const showUp = 60 + Math.floor(rng() * 60); // 60–120m before
      const from = d.scheduledDeparture - showUp;
      if (gameTime < from || gameTime >= until) continue;
      people.push(buildPerson({
        seedStr: `pax-${weekNum}-${airportId}-${d.id}-orig-${i}`,
        inbound: null, outbound: d, availableFrom: from, availableUntil: until,
        gameTime, playerInterests,
      }));
    }

    // 2) Connecting pax: sample up to 2 valid inbound arrivals per departure.
    const valid = landed.filter((a) => {
      const layover = d.scheduledDeparture - BOARDING_CUTOFF - a.actualArrival;
      return layover >= MIN_CONNECT && layover <= MAX_LAYOVER;
    });
    // seeded shuffle so the same connections win every load
    for (let i = valid.length - 1; i > 0; i--) {
      const j = Math.floor(rngD() * (i + 1));
      [valid[i], valid[j]] = [valid[j], valid[i]];
    }
    const maxConn = isHub ? 2 : 1;
    const roll = rngD();
    const nConn = roll < 0.55 ? 0 : roll < 0.85 ? 1 : maxConn;
    for (let i = 0; i < Math.min(nConn, valid.length); i++) {
      const a = valid[i];
      const from = a.actualArrival;
      if (gameTime < from || gameTime >= until) continue;
      people.push(buildPerson({
        seedStr: `pax-${weekNum}-${airportId}-${a.id}-${d.id}`,
        inbound: a, outbound: d, availableFrom: from, availableUntil: until,
        gameTime, playerInterests,
      }));
    }
    if (people.length >= 9) break;
  }

  // Sort: best match first, then least time left (urgency).
  const tierRank = { Hot: 0, Warm: 1, Cold: 2 };
  people.sort((x, y) => (tierRank[x.tier] - tierRank[y.tier]) || (x.minutesLeft - y.minutesLeft));
  _cache.set(key, people);
  if (_cache.size > 400) _cache.clear();
  return people;
}

// Global intel: counts + high-level vibe ONLY (no times, no interests, no names).
export function getIntel(airportId, gameTime, weekNum, playerInterests = []) {
  const people = getPeopleAt(airportId, gameTime, weekNum, playerInterests);
  let vibe = 'Quiet';
  if (people.some((p) => p.tier === 'Hot')) vibe = 'Hot';
  else if (people.some((p) => p.tier === 'Warm')) vibe = 'Warm';
  else if (people.length > 0) vibe = 'Cold';
  return { airportId, count: people.length, vibe };
}

export function getIntelForAll(gameTime, weekNum, playerInterests = []) {
  return AIRPORTS.map((a) => getIntel(a.id, gameTime, weekNum, playerInterests))
    .sort((x, y) => {
      const rank = { Hot: 0, Warm: 1, Cold: 2, Quiet: 3 };
      if (rank[x.vibe] !== rank[y.vibe]) return rank[x.vibe] - rank[y.vibe];
      return y.count - x.count;
    });
}

export function _clearPeopleCache() { _cache.clear(); }
