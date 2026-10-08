// Avatar sprite mapping — soft-painted frames with emoji fallback.
// Identity order matches AVATARS in js/data.js; people.js identity stays stable.

export const AVATAR_FRAMES = [
  'traveler-01', 'traveler-02', 'traveler-03', 'traveler-04',
  'traveler-05', 'traveler-06', 'traveler-07', 'traveler-08',
  'traveler-09', 'traveler-10', 'traveler-11',
];

const EMOJI_TO_FRAME = new Map();

// Lazily built so Node smoke tests without DOM still import cleanly.
function ensureMap(emojiList) {
  if (EMOJI_TO_FRAME.size > 0 || !Array.isArray(emojiList)) return;
  emojiList.forEach((e, i) => EMOJI_TO_FRAME.set(e, AVATAR_FRAMES[i % AVATAR_FRAMES.length]));
}

export function frameForAvatar(emoji, emojiList) {
  ensureMap(emojiList);
  return EMOJI_TO_FRAME.get(emoji) || AVATAR_FRAMES[0];
}

export function spriteUrlForFrame(frame) {
  // Final soft-painted art lands here: assets/avatars/<frame>.webp (2x via @2x).
  // Until then boot() generates procedural soft placeholders at runtime.
  return `assets/avatars/${frame}.webp`;
}

export function shouldUseEmojiSprite(forceEmoji, textureAvailable) {
  if (forceEmoji) return true;
  return !textureAvailable;
}
