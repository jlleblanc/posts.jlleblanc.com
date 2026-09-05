import { AIRLINES, getAirlineById } from './data.js';
import { getLoyaltyFor } from './loyalty.js';

export const LOUNGE_PASS_COST = 2;
export const LOUNGE_PASS_DURATION = 240; // minutes

export function getLoungesAt(airportId) {
    return AIRLINES.filter(a => a.hubs.includes(airportId));
}

export function hasLounge(airportId) {
    return getLoungesAt(airportId).length > 0;
}

export function canAccessLounge(char, airlineId, airportId) {
    // airline-specific hub only
    const airline = getAirlineById(airlineId);
    if (!airline || !airline.hubs.includes(airportId)) return false;
    const rec = getLoyaltyFor(char, airlineId);
    if (['gold','platinum'].includes(rec.tier)) return true;
    // check day pass
    if (char.loungePass && char.loungePass.airline === airlineId && char.loungePass.airport === airportId && char.loungePass.expires > char.world.gameTime) {
        return true;
    }
    return false;
}

export function hasAnyLoungeAccess(char) {
    const airportId = char.currentAirport;
    return getLoungesAt(airportId).some(a => canAccessLounge(char, a.id, airportId));
}

export function getAccessibleLounges(char) {
    const airportId = char.currentAirport;
    return getLoungesAt(airportId).filter(a => canAccessLounge(char, a.id, airportId));
}

export function getLoungeBonus(char) {
    // if any accessible lounge at current airport, +15% for gold/platinum, +10% for day-pass? We unify to 15 if accessible
    if (hasAnyLoungeAccess(char)) return 0.15;
    return 0;
}

export function purchaseLoungePass(char, airlineId) {
    if (char.credits < LOUNGE_PASS_COST) return { ok:false, reason:'Not enough credits' };
    const airportId = char.currentAirport;
    const airline = getAirlineById(airlineId);
    if (!airline || !airline.hubs.includes(airportId)) return { ok:false, reason:'No lounge for that airline here' };
    if (canAccessLounge(char, airlineId, airportId)) return { ok:false, reason:'Already have access' };
    char.credits -= LOUNGE_PASS_COST;
    char.loungePass = { airline: airlineId, airport: airportId, expires: char.world.gameTime + LOUNGE_PASS_DURATION };
    return { ok:true };
}

export function isLoungePassActive(char) {
    if (!char.loungePass) return false;
    return char.loungePass.expires > char.world.gameTime && char.loungePass.airport === char.currentAirport;
}

export function loungePassTimeLeft(char) {
    if (!isLoungePassActive(char)) return 0;
    return char.loungePass.expires - char.world.gameTime;
}
