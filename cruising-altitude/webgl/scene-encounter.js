// Encounter scene backdrop — close-up tint by match tier + lounge.
// Pure transform; keeps sparkle budget low on small phones.

const TIER_BG = { Hot: '#3a1420', Warm: '#3a2f10', Cold: '#16233f' };

export function encounterBackdrop({ tier, loungeAccess, smallScreen }) {
  return {
    scene: 'encounter',
    bg: TIER_BG[tier] || TIER_BG.Cold,
    shimmer: loungeAccess ? 1 : 0,
    sparkles: smallScreen ? 12 : 30,
  };
}
