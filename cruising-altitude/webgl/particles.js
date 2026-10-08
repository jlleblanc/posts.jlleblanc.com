// Soft-particle pool — takeoff puffs, lounge shimmer, encounter sparkles.
// Single shared soft-dot texture keeps draw calls flat on low-end phones.

export function makeParticlePool(max) {
  return {
    max,
    live: 0,
    spawn(n) {
      this.live = Math.min(this.max, this.live + n);
      return this.live;
    },
    clear() { this.live = 0; },
  };
}

// Soft radial dot painted procedurally (placeholder for final soft-painted art).
export function paintSoftDot(ctx, size, inner, outer) {
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
}
