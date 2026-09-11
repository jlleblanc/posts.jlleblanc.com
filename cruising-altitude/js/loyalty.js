// Loyalty + wallet + lounge. State lives in the per-week trip object (see app.js).
import { AIRLINES, DIFFICULTIES, getAirlineById } from './data.js';
import { getMilesForFlight } from './schedule.js';

export const TIERS = ['member', 'silver', 'gold', 'platinum'];
export const TIER_THRESHOLDS = {
  silver: { miles: 4000, segments: 6 },
  gold: { miles: 12000, segments: 15 },
  platinum: { miles: 25000, segments: 30 },
};
export const TIER_BONUS_POINTS = { member: 1, silver: 1.25, gold: 1.5, platinum: 2 }; // pts per mile
export const LOUNGE_PASS_COST = 25; // dollars
export const LOUNGE_PASS_MINUTES = 240;

export function blankLoyalty() {
  const o = {};
  for (const al of AIRLINES) o[al.id] = { miles: 0, segments: 0, points: 0, tier: 'member', lastActiveWeek: null };
  return o;
}

// Fill gaps from older/partial saves so every airline always has a record.
export function ensureRecs(store) {
  if (!store.recs) store.recs = {};
  const fresh = blankLoyalty();
  for (const al of AIRLINES) {
    if (!store.recs[al.id]) store.recs[al.id] = fresh[al.id];
    else {
      const r = store.recs[al.id];
      if (r.miles == null) r.miles = 0;
      if (r.segments == null) r.segments = 0;
      if (r.points == null) r.points = 0;
      if (!r.tier) r.tier = 'member';
    }
  }
  return store;
}

export function tierFor(miles, segments) {
  if (miles >= TIER_THRESHOLDS.platinum.miles || segments >= TIER_THRESHOLDS.platinum.segments) return 'platinum';
  if (miles >= TIER_THRESHOLDS.gold.miles || segments >= TIER_THRESHOLDS.gold.segments) return 'gold';
  if (miles >= TIER_THRESHOLDS.silver.miles || segments >= TIER_THRESHOLDS.silver.segments) return 'silver';
  return 'member';
}

// Status erosion: skip a full week on an airline → miles halve, segments reset.
export function applyErosion(loyalty, weekNum) {
  const eroded = [];
  for (const al of AIRLINES) {
    const rec = loyalty[al.id];
    if (!rec || rec.lastActiveWeek == null) continue;
    if (rec.lastActiveWeek <= weekNum - 2 && (rec.miles > 0 || rec.segments > 0)) {
      rec.miles = Math.floor(rec.miles / 2);
      rec.segments = 0;
      rec.tier = tierFor(rec.miles, rec.segments);
      eroded.push(al.id);
    }
  }
  return eroded;
}

export function nextTierProgress(rec) {
  if (rec.tier === 'platinum') return { next: null, pct: 100, needMiles: 0, needSeg: 0 };
  const order = { member: 'silver', silver: 'gold', gold: 'platinum' };
  const next = order[rec.tier];
  const th = TIER_THRESHOLDS[next];
  return {
    next,
    pct: Math.round(Math.max(Math.min(1, rec.miles / th.miles), Math.min(1, rec.segments / th.segments)) * 100),
    needMiles: Math.max(0, th.miles - rec.miles),
    needSeg: Math.max(0, th.segments - rec.segments),
  };
}

// Points price for a free flight, by distance band.
export function pointsPriceForMiles(miles) {
  if (miles < 500) return 4000;
  if (miles < 1200) return 8000;
  return 12000;
}

export function earnForFlight(loyalty, airlineId, fromId, toId, weekNum) {
  const miles = getMilesForFlight(fromId, toId);
  const rec = loyalty[airlineId];
  const mult = TIER_BONUS_POINTS[rec.tier] ?? 1;
  const pts = Math.round(miles * mult);
  rec.miles += miles;
  rec.segments += 1;
  rec.points += pts;
  rec.lastActiveWeek = weekNum;
  rec.tier = tierFor(rec.miles, rec.segments);
  return { miles, points: pts, tier: rec.tier };
}

// ---- wallet ----
export function budgetFor(difficulty) {
  return DIFFICULTIES[difficulty]?.budget ?? null; // null = unlimited
}

export function canAffordCash(trip, price) {
  const budget = budgetFor(trip.difficulty);
  if (budget == null) return true;
  return trip.spent + price <= budget;
}

// ---- lounge ----
export function loungeAccess(trip, airlineId, airportId) {
  const airline = getAirlineById(airlineId);
  if (!airline || !airline.hubs.includes(airportId)) return { ok: false, via: null };
  const rec = trip.loyalty[airlineId];
  if (rec && (rec.tier === 'gold' || rec.tier === 'platinum')) return { ok: true, via: 'status' };
  if (trip.loungePass && trip.loungePass.airline === airlineId && trip.loungePass.expires > trip.gameTime) {
    return { ok: true, via: 'pass' };
  }
  return { ok: false, via: null };
}

export function anyLoungeAccess(trip, airportId) {
  return AIRLINES.filter((a) => a.hubs.includes(airportId))
    .map((a) => ({ airline: a, ...loungeAccess(trip, a.id, airportId) }))
    .find((x) => x.ok) || null;
}

export function loungeBonus(trip, airportId) {
  return anyLoungeAccess(trip, airportId) ? 0.15 : 0;
}

export function buyLoungePass(trip, airlineId) {
  const access = loungeAccess(trip, airlineId, trip.airport);
  if (access.ok) return { ok: false, reason: 'Already have access' };
  if (!canAffordCash(trip, LOUNGE_PASS_COST)) return { ok: false, reason: 'Over budget' };
  trip.spent += LOUNGE_PASS_COST;
  trip.loungePass = { airline: airlineId, expires: trip.gameTime + LOUNGE_PASS_MINUTES };
  return { ok: true };
}
