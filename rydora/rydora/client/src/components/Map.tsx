import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import { useEffect } from 'react'; import type { LatLngTuple } from 'leaflet';
export interface Marker { pos: LatLngTuple; label: string; color?: string }
export interface Line { coords: LatLngTuple[]; color?: string }
function Fit({ pts }: { pts: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => { if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30] }); else if (pts.length === 1) map.setView(pts[0], 13); }, [JSON.stringify(pts)]);
  return null;
}
export default function Map({ markers = [], lines = [] }: { markers?: Marker[]; lines?: Line[] }) {
  const pts = [...markers.map(m => m.pos), ...lines.flatMap(l => l.coords)];
  return (<div className="h-80 md:h-[28rem] rounded-2xl overflow-hidden border border-white/10">
    <MapContainer center={[20.59, 78.96]} zoom={4} className="h-full w-full" scrollWheelZoom={false}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {lines.map((l, i) => <Polyline key={i} positions={l.coords} pathOptions={{ color: l.color || '#72E6BB', weight: 4 }} />)}
      {markers.map((m, i) => <CircleMarker key={i} center={m.pos} radius={8} pathOptions={{ color: '#0B1420', fillColor: m.color || '#72E6BB', fillOpacity: 1 }}><Tooltip>{m.label}</Tooltip></CircleMarker>)}
      <Fit pts={pts} />
    </MapContainer></div>);
}
export const toLatLng = (geo?: { coordinates: number[][] } | null): LatLngTuple[] => (geo?.coordinates ?? []).map(([lng, lat]) => [lat, lng]);
