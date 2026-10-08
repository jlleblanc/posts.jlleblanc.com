// Day/night tint from gameTime (absolute minutes since Mon 00:00 UTC).
// Keeps scenes in sync with the sim clock without touching time.js.

export function daylightFactor(gameTime) {
  const minsInDay = ((gameTime % 1440) + 1440) % 1440;
  // Peak noon, trough midnight — smooth cosine.
  const t = (minsInDay / 1440) * Math.PI * 2;
  return 0.5 + 0.5 * Math.cos(t - Math.PI);
}

// Local-time daylight: pass the airport's tzOffsetStd (minutes east of UTC)
// so 6 AM shows dawn, not noon. Pure — tested in webgl/smoke.mjs.
export function localDaylight(gameTime, tzOffsetStd) {
  return daylightFactor(gameTime + (tzOffsetStd || 0));
}

export function tintForTime(gameTime) {
  const d = daylightFactor(gameTime);
  const night = [0x2a3a5e, 0x16233f];
  const day = [0x9fd4ff, 0x4a7fb8];
  // Return lerp factor; renderer applies actual color mix.
  return { daylight: d, top: d > 0.5 ? day[0] : night[0], bottom: d > 0.5 ? day[1] : night[1] };
}

// Urgency pulse for people about to board (mirrors minutesLeft pressure).
export function urgencyPulse(minutesLeft, nowMs) {
  if (minutesLeft >= 60) return 0;
  const speed = minutesLeft < 30 ? 6 : 3;
  return 0.5 + 0.5 * Math.sin((nowMs / 1000) * speed);
}
