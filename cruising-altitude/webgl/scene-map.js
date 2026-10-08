// Route-map scene — arc flights from current airport (next 24h window).
// Pure transform; renderer draws arcs + moving plane dots.

export function layoutMapArcs({ flights, width, height }) {
  const cx = width / 2;
  const cy = height * 0.72;
  const r = Math.min(width, height) * 0.38;
  const shown = flights.slice(0, 12);
  return shown.map((f, i) => {
    // Fan across the upper half-plane so no two arcs share an endpoint.
    const a = (Math.PI * (i + 1)) / (shown.length + 1); // (0, π)
    return {
      id: f.id || `${f.from}-${f.to}-${i}`,
      from: f.from,
      to: f.to,
      x1: cx,
      y1: cy,
      x2: cx + Math.cos(a) * r,
      y2: cy - Math.sin(a) * r * 0.9 - 20,
      deal: !!f.deal,
      delayed: !!f.delayed,
    };
  });
}
