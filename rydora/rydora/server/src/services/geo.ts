// Geocoding + routing live here so providers can be swapped (Nominatim/OSRM public demos by default).
export interface Place { label: string; lat: number; lng: number }
export async function geocode(q: string): Promise<Place[]> {
  const u = new URL('/search', process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org');
  u.search = new URLSearchParams({ q, format: 'jsonv2', limit: '5' }).toString();
  const r = await fetch(u, { headers: { 'User-Agent': process.env.GEO_USER_AGENT || 'rydora-dev' } });
  if (!r.ok) throw new Error('Geocoding unavailable');
  return (await r.json() as any[]).map(x => ({ label: x.display_name, lat: +x.lat, lng: +x.lon }));
}
export async function getRoute(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const base = process.env.OSRM_URL || 'https://router.project-osrm.org';
  const r = await fetch(`${base}/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`);
  if (!r.ok) return null;
  const rt = (await r.json() as any).routes?.[0];
  return rt ? { geojson: rt.geometry, distanceKm: rt.distance / 1000, durationMin: rt.duration / 60 } : null;
}
