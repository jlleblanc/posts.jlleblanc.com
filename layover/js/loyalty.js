import { AIRLINES } from './data.js';

export const TIERS = ['member','silver','gold','platinum'];

export const TIER_THRESHOLDS = {
    silver:   { miles: 5000, segments: 8 },
    gold:     { miles: 15000, segments: 25 },
    platinum: { miles: 30000, segments: 50 },
};

export const TIER_DISCOUNT = {
    member: 0,
    silver: 0.10,
    gold: 0.20,
    platinum: 0.30,
};

export function getTier(miles, segments) {
    if (miles >= TIER_THRESHOLDS.platinum.miles || segments >= TIER_THRESHOLDS.platinum.segments) return 'platinum';
    if (miles >= TIER_THRESHOLDS.gold.miles || segments >= TIER_THRESHOLDS.gold.segments) return 'gold';
    if (miles >= TIER_THRESHOLDS.silver.miles || segments >= TIER_THRESHOLDS.silver.segments) return 'silver';
    return 'member';
}

export function getLoyaltyFor(char, airlineId) {
    if (!char.loyalty) return { miles:0, segments:0, tier:'member' };
    const rec = char.loyalty[airlineId];
    if (!rec) return { miles:0, segments:0, tier:'member' };
    return { miles: rec.miles||0, segments: rec.segments||0, tier: rec.tier||'member' };
}

export function ensureLoyalty(char) {
    if (!char.loyalty) char.loyalty = {};
    for (const al of AIRLINES) {
        if (!char.loyalty[al.id]) char.loyalty[al.id] = { miles:0, segments:0, tier:'member' };
        else {
            if (char.loyalty[al.id].miles == null) char.loyalty[al.id].miles = 0;
            if (char.loyalty[al.id].segments == null) char.loyalty[al.id].segments = 0;
            if (!char.loyalty[al.id].tier) char.loyalty[al.id].tier = 'member';
        }
    }
    // also migrate legacy where loyalty values may be missing tier
    for (const k of Object.keys(char.loyalty)) {
        const r = char.loyalty[k];
        r.tier = getTier(r.miles||0, r.segments||0);
    }
}

export function addLoyaltyMiles(char, airlineId, miles) {
    ensureLoyalty(char);
    if (!char.loyalty[airlineId]) char.loyalty[airlineId] = { miles:0, segments:0, tier:'member' };
    char.loyalty[airlineId].miles += miles;
    char.loyalty[airlineId].segments += 1;
    char.loyalty[airlineId].tier = getTier(char.loyalty[airlineId].miles, char.loyalty[airlineId].segments);
}

export function getEffectiveCost(baseCost, char, airlineId) {
    ensureLoyalty(char);
    const rec = char.loyalty[airlineId];
    const tier = rec ? rec.tier : 'member';
    const disc = TIER_DISCOUNT[tier] || 0;
    const discounted = baseCost * (1 - disc);
    // at least 1 credit, and discount caps to 1 credit off for cheap flights
    // apply floor but ensure min 1
    const floored = Math.max(1, Math.floor(discounted + 0.0001)); // floor rather than round to feel earned
    // alternative: if disc >0 and baseCost>1, ensure at least 1 off at gold+
    if (tier === 'gold' && floored === baseCost && baseCost > 1) return baseCost - 1;
    if (tier === 'platinum' && floored >= baseCost && baseCost > 1) return Math.max(1, baseCost - 1);
    return floored;
}

export function getNextTierProgress(char, airlineId) {
    const rec = getLoyaltyFor(char, airlineId);
    const tier = rec.tier;
    if (tier === 'platinum') return { next: null, pct: 100, needMiles: 0, needSeg: 0 };
    const order = { member:'silver', silver:'gold', gold:'platinum' };
    const next = order[tier];
    const th = TIER_THRESHOLDS[next];
    const needMiles = Math.max(0, th.miles - rec.miles);
    const needSeg = Math.max(0, th.segments - rec.segments);
    const pctMiles = Math.min(1, rec.miles / th.miles);
    const pctSeg = Math.min(1, rec.segments / th.segments);
    const pct = Math.max(pctMiles, pctSeg) * 100;
    return { next, pct: Math.round(pct), needMiles, needSeg, th };
}
