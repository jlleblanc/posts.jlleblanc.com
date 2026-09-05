import { AIRPORTS, REGION_DISTANCES, CONNECTIONS } from './data.js';

export function getFlightCost(fromAirport, toAirport) {
    const from = AIRPORTS.find(a => a.id === fromAirport);
    const to = AIRPORTS.find(a => a.id === toAirport);
    if (!from || !to) return 2;
    if (fromAirport === toAirport) return 0;
    const direct = CONNECTIONS[fromAirport] && CONNECTIONS[fromAirport].includes(toAirport);
    if (direct) {
        const dist = REGION_DISTANCES[from.region][to.region];
        return dist <= 1 ? 1 : dist <= 2 ? 2 : 3;
    }
    return 4;
}

// Haversine distance in miles
export function haversineMiles(lat1, lon1, lat2, lon2) {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

export function getRealisticDuration(fromId, toId) {
    const from = AIRPORTS.find(a => a.id === fromId);
    const to = AIRPORTS.find(a => a.id === toId);
    if (!from || !to) return 120;
    const miles = haversineMiles(from.lat, from.lon, to.lat, to.lon);
    // 475 mph block speed + 30 min ground/taxi/board, round to 15
    const raw = (miles / 475) * 60 + 30;
    const rounded = Math.round(raw / 15) * 15;
    return Math.max(60, Math.min(420, rounded));
}

export function getMilesForFlight(fromId, toId) {
    const from = AIRPORTS.find(a => a.id === fromId);
    const to = AIRPORTS.find(a => a.id === toId);
    if (!from || !to) return 500;
    const miles = haversineMiles(from.lat, from.lon, to.lat, to.lon);
    // loyalty miles = actual miles, rounded to 100
    return Math.round(miles / 100) * 100;
}
