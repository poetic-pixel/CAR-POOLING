// RYDORA matching engine. Documented in README ("How matching works").
export interface Pt { lat: number; lng: number }
export const MAX_DEVIATION_KM = 5;
export const TIME_WINDOW_MIN = 90;
const KM_PER_DEG = 111.32;

// Distance from point p to segment a-b (local flat-earth approximation, fine for city/regional scale)
function seg(p: Pt, a: Pt, b: Pt) {
  const k = Math.cos((p.lat * Math.PI) / 180);
  const ax = (a.lng - p.lng) * KM_PER_DEG * k, ay = (a.lat - p.lat) * KM_PER_DEG;
  const bx = (b.lng - p.lng) * KM_PER_DEG * k, by = (b.lat - p.lat) * KM_PER_DEG;
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
  return { dist: Math.hypot(ax + t * dx, ay + t * dy), len: Math.sqrt(len2), t };
}
// Closest point on polyline: deviation (km), distance travelled along the path (km), total length
export function project(p: Pt, path: Pt[]) {
  let best = { dist: Infinity, along: 0 }, cum = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const s = seg(p, path[i], path[i + 1]);
    if (s.dist < best.dist) best = { dist: s.dist, along: cum + s.t * s.len };
    cum += s.len;
  }
  return { ...best, total: cum };
}
const r1 = (n: number) => Math.round(n * 10) / 10;

export function scoreRide(ride: any, pickup: Pt, drop: Pt, when: Date) {
  const coords = ride.route_geojson?.coordinates as number[][] | undefined;
  const path: Pt[] = coords && coords.length > 1
    ? coords.map(([lng, lat]) => ({ lat, lng }))
    : [{ lat: +ride.origin_lat, lng: +ride.origin_lng }, { lat: +ride.dest_lat, lng: +ride.dest_lng }];
  const a = project(pickup, path), b = project(drop, path);
  if (!a.total || a.dist > MAX_DEVIATION_KM || b.dist > MAX_DEVIATION_KM || b.along <= a.along) return null; // wrong direction / too far
  const timeDiffMin = Math.abs(+new Date(ride.departs_at) - +when) / 60000;
  if (timeDiffMin > TIME_WINDOW_MIN) return null;
  const overlap = Math.min(1, (b.along - a.along) / a.total);
  const score = 0.25 * (1 - a.dist / MAX_DEVIATION_KM) + 0.25 * (1 - b.dist / MAX_DEVIATION_KM)
    + 0.30 * overlap + 0.20 * (1 - timeDiffMin / TIME_WINDOW_MIN);
  return {
    percent: Math.round(score * 100),
    pickupDeviationKm: r1(a.dist), dropoffDeviationKm: r1(b.dist), sharedKm: r1(b.along - a.along),
    overlapPct: Math.round(overlap * 100), timeDiffMin: Math.round(timeDiffMin),
    // Estimated cost-sharing (NOT a payment): driver's full-route price scaled by shared distance, min 25%
    fare: Math.round(Number(ride.price_per_seat) * Math.max(overlap, 0.25) * 100) / 100,
    method: coords && coords.length > 1 ? 'road-route' : 'straight-line-approximation',
  };
}
