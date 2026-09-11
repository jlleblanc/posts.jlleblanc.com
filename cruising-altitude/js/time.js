// Week clock. Internal unit = absolute minutes since Week start (Mon 00:00 UTC).
// Display converts to airport-local standard time via tzOffsetStd (no DST ever).
import { getAirportById } from './data.js';

export const WEEK_MINUTES = 7 * 1440;
export const WEEK_START_HOUR_LOCAL = 6; // campaigns start Mon 06:00 at the starting airport

export function weekStartAbs() {
  return 0;
}

export function weekEndAbs() {
  return WEEK_MINUTES;
}

export function isWeekOver(gameTime) {
  return gameTime >= WEEK_MINUTES;
}

// UTC minutes -> airport-local wall minutes (STD offset applied, wrapped to day).
export function toLocalMinutes(absMinutes, airportId) {
  const ap = getAirportById(airportId);
  const off = ap ? ap.tzOffsetStd : 0;
  return absMinutes + off;
}

export function formatLocalTime(absMinutes, airportId) {
  const ap = getAirportById(airportId);
  const local = toLocalMinutes(absMinutes, airportId);
  const minsInDay = ((local % 1440) + 1440) % 1440;
  let h = Math.floor(minsInDay / 60);
  const m = minsInDay % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(m).padStart(2, '0')} ${ampm}${ap ? ' ' + ap.tzAbbr : ''}`;
}

export function formatDay(absMinutes) {
  const day = Math.floor(absMinutes / 1440) + 1;
  return `Day ${Math.min(day, 7)}`;
}

export function formatGameTime(absMinutes, airportId) {
  return `${formatDay(absMinutes)}, ${formatLocalTime(absMinutes, airportId)}`;
}

export function formatDuration(minutes) {
  const m = Math.round(minutes);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

// Starting clock: Monday 06:00 local at startAirport, expressed as absolute minutes.
// We anchor the week to UTC Monday 00:00, so local 06:00 = 360 - tzOffset.
export function startTimeForAirport(airportId) {
  const ap = getAirportById(airportId);
  const off = ap ? ap.tzOffsetStd : -300;
  return 360 - off;
}
