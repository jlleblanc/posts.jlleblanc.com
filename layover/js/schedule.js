import { AIRPORTS, CONNECTIONS, AIRLINES, getAirlineById } from './data.js';
import { getFlightCost, getRealisticDuration } from './flights.js';
import { seededRng, seededInt } from './prng.js';

// Timetable templates: built once deterministically
let TIMETABLE = null; // { [airportId]: FlightTemplate[] }

function frequencyForAirport(airport) {
    if (airport.capacity >= 10) return { min:4, max:5 };
    if (airport.capacity >= 8) return { min:3, max:4 };
    if (airport.capacity >= 6) return { min:2, max:3 };
    if (airport.capacity >= 5) return { min:2, max:2 };
    return { min:1, max:2 };
}

function todBuckets(isLongHaul) {
    // returns weighted buckets
    if (isLongHaul) {
        return [
            { start: 360, end: 600, weight: 25, label:'morning' },   // 06:00-10:00
            { start: 660, end: 900, weight: 25, label:'midday' },    // 11:00-15:00
            { start: 960, end: 1290, weight: 35, label:'evening' },  // 16:00-21:30
            { start: 1320, end: 1440+90, weight: 15, label:'redeye' }, // 22:00-01:30 next day (wrapped later)
        ];
    }
    return [
        { start: 360, end: 600, weight: 30 },
        { start: 660, end: 900, weight: 30 },
        { start: 960, end: 1290, weight: 40 },
    ];
}

function pickBucket(rng, buckets) {
    const total = buckets.reduce((s,b)=>s+b.weight,0);
    let r = rng()*total;
    for (const b of buckets) {
        if (r < b.weight) return b;
        r -= b.weight;
    }
    return buckets[0];
}

function airlineForRoute(from, to) {
    // deterministic: prefer airline whose hub is `from`, else seeded among those serving from or to
    const hubsFrom = AIRLINES.filter(a => a.hubs.includes(from));
    if (hubsFrom.length > 0) {
        const rng = seededRng(`airline-hub-${from}-${to}`);
        return hubsFrom[Math.floor(rng()*hubsFrom.length)].id;
    }
    const hubsTo = AIRLINES.filter(a => a.hubs.includes(to));
    if (hubsTo.length > 0) {
        const rng = seededRng(`airline-hubTo-${from}-${to}`);
        return hubsTo[Math.floor(rng()*hubsTo.length)].id;
    }
    const rng = seededRng(`airline-any-${from}-${to}`);
    return AIRLINES[Math.floor(rng()*AIRLINES.length)].id;
}

export function buildTimetable() {
    if (TIMETABLE) return TIMETABLE;
    TIMETABLE = {};
    for (const ap of AIRPORTS) TIMETABLE[ap.id] = [];

    for (const from of Object.keys(CONNECTIONS)) {
        const fromAp = AIRPORTS.find(a=>a.id===from);
        if (!fromAp) continue;
        for (const to of CONNECTIONS[from]) {
            const toAp = AIRPORTS.find(a=>a.id===to);
            if (!toAp) continue;
            const freq = frequencyForAirport(fromAp);
            const rngFreq = seededRng(`freq-${from}-${to}`);
            const n = seededInt(rngFreq, freq.min, freq.max);
            const duration = getRealisticDuration(from, to);
            const cost = getFlightCost(from, to);
            const airlineId = airlineForRoute(from, to);
            const isLongHaul = duration >= 300;

            // keep stable ordering of slots
            for (let i=0; i<n; i++) {
                const rng = seededRng(`tod-${from}-${to}-${airlineId}-${i}`);
                const buckets = todBuckets(isLongHaul);
                const bucket = pickBucket(rng, buckets);
                let tod;
                if (bucket.end > 1440) {
                    // redeye bucket wrapping past midnight — cap to 1320-1439 or 0-90
                    const useNextDay = rng() < 0.5;
                    if (useNextDay) tod = seededInt(rng, 0, 90);
                    else tod = seededInt(rng, 1320, 1439);
                } else {
                    tod = seededInt(rng, bucket.start, bucket.end);
                    // snap to 0/15/30/45 but sometimes :05
                    const snap = rng() < 0.85 ? 15 : 5;
                    if (snap === 15) tod = Math.round(tod/15)*15;
                    tod = Math.max(bucket.start, Math.min(bucket.end, tod));
                }
                // ensure not 00:00-05:59 curfew already enforced by buckets
                const flightNumber = `${airlineId} ${100 + (hashSlot(from,to,i) % 900)}`;
                const templateId = `${from}-${to}-${airlineId}-${i}`;
                const gate = `A${1 + (hashSlot(from,to,i) % 20)}`;
                // slight gate letter variation seeded
                const letters = ['A','B','C'];
                const gateLetter = letters[hashSlot(from,to,i) % letters.length];
                TIMETABLE[from].push({
                    id: templateId,
                    from, to,
                    airline: airlineId,
                    flightNumber,
                    tod, // scheduled departure minutes 0-1439
                    duration,
                    cost,
                    gate: `${gateLetter}${1 + (hashSlot(from,to,i+7)% 24)}`,
                });
            }
        }
    }
    // sort each airport's templates by TOD for stability
    for (const k of Object.keys(TIMETABLE)) {
        TIMETABLE[k].sort((a,b)=> a.tod - b.tod);
    }
    return TIMETABLE;
}

function hashSlot(a,b,i) {
    let h=0;
    const s = `${a}-${b}-${i}`;
    for (let j=0;j<s.length;j++) h = (Math.imul(31,h) + s.charCodeAt(j))|0;
    return Math.abs(h);
}

export function getTimetable() {
    if (!TIMETABLE) buildTimetable();
    return TIMETABLE;
}

// Delay helpers — airport-tied, seeded per template per day

function delayForTemplate(template, dayNum) {
    const fromAp = AIRPORTS.find(a=>a.id===template.from);
    // use max of origin/dest risk? Spec says tie to airports — use origin's risk primarily
    const risk = fromAp ? fromAp.delayRisk : 0.12;
    const avg = fromAp ? fromAp.avgDelay : 40;
    const rng = seededRng(`delay-${template.id}-${dayNum}`);
    const delayed = rng() < risk;
    if (!delayed) return { delayed:false, delayMinutes:0 };
    // delay length: uniform 25-110 skewed toward avg
    // 70% within avg±15, 30% tail
    let delay;
    if (rng() < 0.7) {
        delay = seededInt(rng, Math.max(15, avg-15), avg+25);
    } else {
        delay = seededInt(rng, 35, 120);
    }
    return { delayed:true, delayMinutes: delay };
}

export function getFlightsFrom(airportId, gameTime, windowMinutes = 1440) {
    const tt = getTimetable();
    const templates = tt[airportId] || [];
    if (templates.length === 0) return [];
    const dayNum = Math.floor(gameTime / 1440);
    const dayStart = dayNum * 1440;
    const nextDayStart = dayStart + 1440;
    const flights = [];

    function materialize(dayStartVal, dayN) {
        for (const t of templates) {
            const scheduledDeparture = dayStartVal + t.tod;
            if (scheduledDeparture < gameTime) continue; // 24h only, no departed
            if (scheduledDeparture >= gameTime + windowMinutes) continue;
            const { delayed, delayMinutes } = delayForTemplate(t, dayN);
            const scheduledArrival = scheduledDeparture + t.duration;
            const actualDeparture = scheduledDeparture + (delayed ? delayMinutes : 0);
            const actualArrival = scheduledArrival + (delayed ? delayMinutes : 0);
            flights.push({
                id: `${t.id}-d${dayN}`,
                templateId: t.id,
                from: t.from,
                to: t.to,
                airline: t.airline,
                flightNumber: t.flightNumber,
                tod: t.tod,
                scheduledDeparture,
                scheduledArrival,
                actualDeparture,
                actualArrival,
                departure: scheduledDeparture, // alias for legacy compat
                arrival: actualArrival,
                duration: t.duration,
                cost: t.cost,
                gate: t.gate,
                delayed,
                delayMinutes,
            });
        }
    }
    materialize(dayStart, dayNum);
    // also materialize next day if window extends past midnight and we need flights after tomorrow 00:00
    if (gameTime + windowMinutes > nextDayStart) {
        materialize(nextDayStart, dayNum+1);
    }

    flights.sort((a,b)=> a.scheduledDeparture - b.scheduledDeparture);
    return flights;
}

// For testing determinism
export function _resetTimetable() { TIMETABLE = null; }
