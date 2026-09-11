// Timetable + fares. Timetables vary per week (seeded); fares vary per flight + deals.
import { AIRPORTS, CONNECTIONS, AIRLINES, getAirportById } from './data.js';
import { seededRng, seededInt, weekSeed } from './seed.js';

export function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getRealisticDuration(fromId, toId) {
  const from = getAirportById(fromId);
  const to = getAirportById(toId);
  if (!from || !to) return 120;
  const miles = haversineMiles(from.lat, from.lon, to.lat, to.lon);
  const raw = (miles / 475) * 60 + 30;
  return Math.max(60, Math.min(420, Math.round(raw / 15) * 15));
}

export function getMilesForFlight(fromId, toId) {
  const from = getAirportById(fromId);
  const to = getAirportById(toId);
  if (!from || !to) return 500;
  return Math.round(haversineMiles(from.lat, from.lon, to.lat, to.lon) / 100) * 100;
}

// ---- Fares: base bands + seeded variability + deals ----
// Bands (agreed ranges): <500mi $129 / <1200 $229 / <2800 $349 / long-haul $499.
export function baseFareForMiles(miles) {
  if (miles < 500) return 129;
  if (miles < 1200) return 229;
  if (miles < 2800) return 349;
  return 499;
}

const AIRLINE_FARE_FACTOR = { VL: 1.1, BF: 0.95, PR: 1.0, AD: 0.95, HR: 1.0 };

function dayOfWeekFactor(dayNum) {
  const dow = dayNum % 7; // 0=Mon
  if (dow === 4 || dow === 6) return 1.15; // Fri / Sun peak
  if (dow === 1 || dow === 2) return 0.9; // Tue / Wed cheap
  return 1.0;
}

function todFactor(tod) {
  if (tod >= 360 && tod < 540) return 1.05; // morning peak
  if (tod >= 1020 && tod < 1290) return 1.1; // evening peak
  if (tod < 360) return 0.85; // redeye special
  return 1.0;
}

function charmPrice(dollars) {
  // Round to $X9 endings for realism ($129, $189...), min $49.
  const rounded = Math.max(49, Math.round(dollars / 10) * 10 - 1);
  return rounded;
}

export function fareForFlight({ from, to, airline, tod, weekNum, dayNum, templateId }) {
  const a = getAirportById(from);
  const b = getAirportById(to);
  const miles = a && b ? haversineMiles(a.lat, a.lon, b.lat, b.lon) : 800;
  const base = baseFareForMiles(miles);
  const rng = seededRng(`fare-${weekSeed(weekNum)}-${templateId}-d${dayNum}`);
  const jitter = 0.8 + rng() * 0.4; // ±20%
  const airlineF = AIRLINE_FARE_FACTOR[airline] ?? 1.0;
  let price = base * jitter * airlineF * dayOfWeekFactor(dayNum) * todFactor(tod);

  // Deals: ~12% of flights get a 30–50% cut, flagged for the UI.
  let deal = false;
  let dealLabel = '';
  if (rng() < 0.12) {
    const cut = 0.3 + rng() * 0.2;
    price = price * (1 - cut);
    deal = true;
    const labels = ['Deal', 'Flash sale', 'Red-eye special', 'Off-peak deal'];
    dealLabel = tod < 360 ? 'Red-eye special' : labels[Math.floor(rng() * labels.length)];
  } else if (rng() < 0.05) {
    // Rare last-minute premium on peak flights.
    price = price * 1.25;
    dealLabel = '';
  }
  const finalPrice = charmPrice(price);
  return { price: finalPrice, basePrice: base, deal, dealLabel, miles: Math.round(miles) };
}

// ---- Timetable (per-week seeded) ----
let TT_CACHE = {}; // weekNum -> { airportId: templates[] }

function frequencyForAirport(airport) {
  if (airport.capacity >= 10) return { min: 2, max: 3 };
  if (airport.capacity >= 8) return { min: 2, max: 3 };
  if (airport.capacity >= 6) return { min: 1, max: 2 };
  if (airport.capacity >= 5) return { min: 1, max: 2 };
  return { min: 1, max: 1 };
}

// Redeyes are rare in real life: mostly long flights heading east (land in the
// morning) or leaving Hawaii/Alaska. Short hops and westbound flights don't
// get a post-midnight bucket at all.
function isRedeyeEligible(fromId, toId, duration) {
  if (duration < 330) return false;
  const from = getAirportById(fromId);
  const to = getAirportById(toId);
  if (!from || !to) return false;
  if (from.region === 'hawaii' || from.region === 'alaska') return true;
  return to.tzOffsetStd > from.tzOffsetStd; // flying east
}

const MAX_REDEYES_PER_AIRPORT = 3;

function todBuckets(isRedeyeEligible) {
  if (isRedeyeEligible) {
    return [
      { start: 360, end: 600, weight: 30 },
      { start: 660, end: 900, weight: 30 },
      { start: 960, end: 1290, weight: 32 },
      { start: 1320, end: 1530, weight: 8 },
    ];
  }
  return [
    { start: 360, end: 600, weight: 30 },
    { start: 660, end: 900, weight: 30 },
    { start: 960, end: 1290, weight: 40 },
  ];
}

function pickBucket(rng, buckets) {
  const total = buckets.reduce((s, b) => s + b.weight, 0);
  let r = rng() * total;
  for (const b of buckets) {
    if (r < b.weight) return b;
    r -= b.weight;
  }
  return buckets[0];
}

function hashSlot(s) {
  let h = 0;
  for (let j = 0; j < s.length; j++) h = (Math.imul(31, h) + s.charCodeAt(j)) | 0;
  return Math.abs(h);
}

function airlineForRoute(from, to, weekNum) {
  const hubsFrom = AIRLINES.filter((a) => a.hubs.includes(from));
  if (hubsFrom.length > 0) {
    const rng = seededRng(`airline-${weekSeed(weekNum)}-hub-${from}-${to}`);
    return hubsFrom[Math.floor(rng() * hubsFrom.length)].id;
  }
  const hubsTo = AIRLINES.filter((a) => a.hubs.includes(to));
  if (hubsTo.length > 0) {
    const rng = seededRng(`airline-${weekSeed(weekNum)}-hubTo-${from}-${to}`);
    return hubsTo[Math.floor(rng() * hubsTo.length)].id;
  }
  const rng = seededRng(`airline-${weekSeed(weekNum)}-any-${from}-${to}`);
  return AIRLINES[Math.floor(rng() * AIRLINES.length)].id;
}

export function buildTimetable(weekNum) {
  if (TT_CACHE[weekNum]) return TT_CACHE[weekNum];
  const tt = {};
  for (const ap of AIRPORTS) tt[ap.id] = [];
  for (const from of Object.keys(CONNECTIONS)) {
    const fromAp = getAirportById(from);
    if (!fromAp) continue;
    for (const to of CONNECTIONS[from]) {
      const toAp = getAirportById(to);
      if (!toAp) continue;
      const freq = frequencyForAirport(fromAp);
      const rngFreq = seededRng(`freq-${weekSeed(weekNum)}-${from}-${to}`);
      const n = seededInt(rngFreq, freq.min, freq.max);
      const duration = getRealisticDuration(from, to);
      const airlineId = airlineForRoute(from, to, weekNum);
      const redeyeOk = isRedeyeEligible(from, to, duration);
      for (let i = 0; i < n; i++) {
        const rng = seededRng(`tod-${weekSeed(weekNum)}-${from}-${to}-${airlineId}-${i}`);
        const bucket = pickBucket(rng, todBuckets(redeyeOk));
        let tod;
        if (bucket.end > 1440) {
          tod = rng() < 0.5 ? seededInt(rng, 0, 90) : seededInt(rng, 1320, 1439);
        } else {
          tod = seededInt(rng, bucket.start, bucket.end);
          if (rng() < 0.85) tod = Math.round(tod / 15) * 15;
          tod = Math.max(bucket.start, Math.min(bucket.end, tod));
        }
        const hsh = hashSlot(`${weekNum}-${from}-${to}-${i}`);
        const letters = ['A', 'B', 'C'];
        tt[from].push({
          id: `${from}-${to}-${airlineId}-${i}`,
          from, to, airline: airlineId,
          flightNumber: `${airlineId} ${100 + (hsh % 900)}`,
          tod, duration,
          gate: `${letters[hsh % letters.length]}${1 + (hashSlot(`${from}-${to}-${i + 7}`) % 24)}`,
        });
      }
    }
  }
  for (const k of Object.keys(tt)) {
    // Hard cap: no airport gets more than a few post-midnight departures.
    // Overflow redeyes slide into the evening bank so route frequency is kept.
    const redeyes = tt[k].filter((t) => t.tod < 120);
    if (redeyes.length > MAX_REDEYES_PER_AIRPORT) {
      const rngCap = seededRng(`redeye-cap-${weekSeed(weekNum)}-${k}`);
      for (let i = redeyes.length - 1; i > 0; i--) {
        const j = Math.floor(rngCap() * (i + 1));
        [redeyes[i], redeyes[j]] = [redeyes[j], redeyes[i]];
      }
      for (const t of redeyes.slice(MAX_REDEYES_PER_AIRPORT)) {
        const evening = 960 + (hashSlot(`eve-${t.id}`) % 330); // 4:00–9:30 PM
        t.tod = Math.round(evening / 15) * 15;
      }
    }
    tt[k].sort((a, b) => a.tod - b.tod);
  }
  TT_CACHE[weekNum] = tt;
  return tt;
}

function delayForTemplate(template, weekNum, dayNum) {
  const fromAp = getAirportById(template.from);
  const risk = fromAp ? fromAp.delayRisk : 0.12;
  const avg = fromAp ? fromAp.avgDelay : 40;
  const rng = seededRng(`delay-${weekSeed(weekNum)}-${template.id}-d${dayNum}`);
  if (rng() >= risk) return { delayed: false, delayMinutes: 0 };
  const delay = rng() < 0.7
    ? seededInt(rng, Math.max(15, avg - 15), avg + 25)
    : seededInt(rng, 35, 120);
  return { delayed: true, delayMinutes: delay };
}

export function getFlightsFrom(airportId, gameTime, weekNum, windowMinutes = 1440) {
  const tt = buildTimetable(weekNum);
  const templates = tt[airportId] || [];
  const dayNum = Math.floor(gameTime / 1440);
  const flights = [];
  function materialize(dayStartVal, dayN) {
    for (const t of templates) {
      const scheduledDeparture = dayStartVal + t.tod;
      if (scheduledDeparture < gameTime) continue;
      if (scheduledDeparture >= gameTime + windowMinutes) continue;
      const { delayed, delayMinutes } = delayForTemplate(t, weekNum, dayN);
      const fare = fareForFlight({ ...t, weekNum, dayNum: dayN, templateId: t.id });
      flights.push({
        ...t,
        scheduledDeparture,
        scheduledArrival: scheduledDeparture + t.duration,
        actualDeparture: scheduledDeparture + (delayed ? delayMinutes : 0),
        actualArrival: scheduledDeparture + t.duration + (delayed ? delayMinutes : 0),
        delayed, delayMinutes,
        ...fare,
      });
    }
  }
  materialize(dayNum * 1440, dayNum);
  if (gameTime + windowMinutes > (dayNum + 1) * 1440) materialize((dayNum + 1) * 1440, dayNum + 1);
  flights.sort((a, b) => a.scheduledDeparture - b.scheduledDeparture);
  return flights;
}

// Arrivals into an airport whose wheels-down falls in [gameTime - pastMinutes, gameTime + futureMinutes).
// Needed by the people engine: connecting pax arrive on these, terminating pax vanish on these.
export function getArrivalsTo(airportId, gameTime, weekNum, pastMinutes = 720, futureMinutes = 120) {
  const tt = buildTimetable(weekNum);
  const arrivals = [];
  const lo = gameTime - pastMinutes;
  const hi = gameTime + futureMinutes;
  // Allow day -1 (Sunday) so Monday-morning connectors exist at week start.
  const dayLo = Math.floor(lo / 1440);
  const dayHi = Math.floor(hi / 1440);
  for (const from of Object.keys(tt)) {
    for (const t of tt[from]) {
      if (t.to !== airportId) continue;
      for (let dayN = dayLo; dayN <= dayHi; dayN++) {
        const scheduledDeparture = dayN * 1440 + t.tod;
        const { delayed, delayMinutes } = delayForTemplate(t, weekNum, dayN);
        const actualArrival = scheduledDeparture + t.duration + (delayed ? delayMinutes : 0);
        if (actualArrival < lo || actualArrival >= hi) continue;
        arrivals.push({
          ...t,
          scheduledDeparture,
          scheduledArrival: scheduledDeparture + t.duration,
          actualDeparture: scheduledDeparture + (delayed ? delayMinutes : 0),
          actualArrival,
          delayed, delayMinutes,
        });
      }
    }
  }
  arrivals.sort((a, b) => a.actualArrival - b.actualArrival);
  return arrivals;
}

export function _resetTimetable() { TT_CACHE = {}; }
