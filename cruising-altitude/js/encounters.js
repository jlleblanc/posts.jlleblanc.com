// Encounter engine — time is the cost, points are activity base × match multiplier.
// Success rolls use live randomness (the universe is seeded, the spark is not).
import { ACTIVITIES } from './data.js';

export const MEET_BASE_MINUTES = 15; // saying hi always costs a quarter hour
export const CONSOLATION_POINTS = 5; // all-fail encounters still earn a little
export const MAX_ACTIVITIES = 3;

// Multiplier agreed: 0.5x (no overlap) → 2.0x (full overlap).
export function matchMultiplier(matchScore) {
  const s = Math.max(0, Math.min(1, matchScore));
  return 0.5 + s * 1.5;
}

// Rush penalty when their flight is close: mirrors layover pressure.
export function rushPenalty(minutesLeft) {
  if (minutesLeft < 60) return 0.2;
  if (minutesLeft < 120) return 0.1;
  return 0;
}

export function eligibleActivities(person) {
  return ACTIVITIES.filter((a) => (a.requireMatch ?? 0) <= person.matchScore);
}

export function successChance(activity, person, loungeBonus = 0) {
  const sharedTag =
    person.interests.includes(activity.interestTag) ||
    person.hiddenInterests.includes(activity.interestTag);
  const p = 0.35 + person.matchScore * 0.45 + (sharedTag ? 0.1 : 0) - rushPenalty(person.minutesLeft) + loungeBonus;
  return Math.max(0.15, Math.min(0.95, p));
}

// Fit check: meet base + chosen activities must fit inside minutesLeft.
export function fitActivities(activityNames, minutesLeft) {
  const chosen = activityNames
    .map((n) => ACTIVITIES.find((a) => a.name === n))
    .filter(Boolean);
  let total = MEET_BASE_MINUTES;
  const fitted = [];
  for (const act of chosen) {
    if (total + act.duration <= minutesLeft) {
      fitted.push(act);
      total += act.duration;
    }
  }
  return { fitted, totalTime: fitted.length === 0 ? Math.min(MEET_BASE_MINUTES, minutesLeft) : total, trimmed: fitted.length < chosen.length };
}

export function runEncounter(person, activityNames, rand = Math.random, loungeBonus = 0) {
  const mult = matchMultiplier(person.matchScore);
  const { fitted, totalTime, trimmed } = fitActivities(activityNames, person.minutesLeft);
  const results = fitted.map((act) => {
    const success = rand() < successChance(act, person, loungeBonus);
    const points = success ? Math.round(act.basePoints * mult) : 0;
    return { name: act.name, duration: act.duration, basePoints: act.basePoints, success, points };
  });
  let totalPoints = results.reduce((s, r) => s + r.points, 0);
  const allFail = fitted.length > 0 && totalPoints === 0;
  if (allFail) totalPoints = CONSOLATION_POINTS;
  return {
    personId: person.id,
    personName: person.name,
    matchScore: person.matchScore,
    tier: person.tier,
    multiplier: Math.round(mult * 100) / 100,
    results,
    totalPoints,
    totalTime,
    trimmed,
    consolation: allFail,
    loungeBoost: loungeBonus > 0,
  };
}
