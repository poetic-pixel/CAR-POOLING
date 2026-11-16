import { useState } from 'react'; import { useNavigate } from 'react-router-dom'; import { useAuth } from '@clerk/clerk-react'; import { ArrowUpDown } from 'lucide-react';
import { Place, useApi } from '../api'; import PlaceInput from '../components/PlaceInput'; import Map, { toLatLng } from '../components/Map';
export default function FindRide() {
  const api = useApi(), nav = useNavigate(), { isSignedIn } = useAuth();
  const [o, setO] = useState<Place | null>(null), [d, setD] = useState<Place | null>(null);
  const [date, setDate] = useState(''), [time, setTime] = useState('08:00'), [pax, setPax] = useState(1), [budget, setBudget] = useState('');
  const [rides, setRides] = useState<any[] | null>(null), [sel, setSel] = useState<any>(null), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  async function search(e: React.FormEvent) {
    e.preventDefault(); setMsg('');
    if (!o || !d) return setMsg('Pick a start and destination from the suggestions.');
    if (!date) return setMsg('Choose a date.');
    setBusy(true);
    try {
      const qs = new URLSearchParams({ oLat: String(o.lat), oLng: String(o.lng), dLat: String(d.lat), dLng: String(d.lng), when: new Date(`${date}T${time}`).toISOString(), passengers: String(pax), ...(budget ? { maxBudget: budget } : {}) });
      const r = await api('/rides/search?' + qs); setRides(r); setSel(r[0] ?? null);
    } catch (err: any) { setMsg(err.message); } finally { setBusy(false); }
  }
  async function join(ride: any) {
    if (!isSignedIn) return nav('/sign-in');
    try { const r = await api(`/rides/${ride.id}/bookings`, { method: 'POST', body: { seats: pax, pickup: o, dropoff: d } });
      setMsg(`Request sent. Estimated contribution ${r.fareEstimate}. The driver will accept or reject it.`); }
    catch (err: any) { setMsg(err.message); }
  }
  return (<div className="space-y-6"><h1 className="text-3xl font-bold">Find a Ride</h1>
    <form onSubmit={search} className="card grid md:grid-cols-6 gap-3 items-end">
      <div className="md:col-span-2"><PlaceInput label="Starting location" value={o} onPick={setO} /></div>
      <button type="button" className="btn-ghost justify-self-center" aria-label="Swap locations" onClick={() => { setO(d); setD(o); }}><ArrowUpDown size={18} /></button>
      <div className="md:col-span-2"><PlaceInput label="Destination" value={d} onPick={setD} /></div><span />
      <div><label className="label">Date</label><input className="input" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={e => setDate(e.target.value)} /></div>
      <div><label className="label">Departure time</label><input className="input" type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
      <div><label className="label">Passengers</label><input className="input" type="number" min={1} max={8} value={pax} onChange={e => setPax(Math.max(1, +e.target.value || 1))} /></div>
      <div><label className="label">Max budget (optional)</label><input className="input" type="number" min={0} value={budget} onChange={e => setBudget(e.target.value)} /></div>
      <button className="btn md:col-span-2" disabled={busy}>{busy ? 'Searching…' : 'Search rides'}</button></form>
    {msg && <p role="status" className="card text-softmint">{msg}</p>}
    <Map markers={[...(o ? [{ pos: [o.lat, o.lng] as [number, number], label: 'Your pickup' }] : []), ...(d ? [{ pos: [d.lat, d.lng] as [number, number], label: 'Your drop-off', color: '#B8F5DC' }] : [])]}
      lines={sel ? [{ coords: toLatLng(sel.route_geojson).length ? toLatLng(sel.route_geojson) : [[sel.origin_lat, sel.origin_lng], [sel.dest_lat, sel.dest_lng]] }] : []} />
    {rides && rides.length === 0 && <p className="card text-muted">No compatible rides with enough seats. Try a wider time or different date.</p>}
    <div className="grid md:grid-cols-2 gap-4">{rides?.map(r => (<div key={r.id} className={`card ${sel?.id === r.id ? 'border-mint' : ''}`}>
      <div className="flex justify-between"><div><div className="font-semibold">{r.driver_name || 'Driver'} {r.verification_status === 'verified' && <span className="text-xs text-mint">✓ Verified</span>}</div>
        <div className="text-sm text-muted">★ {r.rating ?? 'New'} · {r.vehicle_model ?? 'Vehicle n/a'}</div></div>
        <div className="text-right"><div className="text-2xl font-bold text-mint">{r.match.percent}%</div><div className="text-xs text-muted">route match</div></div></div>
      <p className="mt-2 text-sm">{r.origin_label} → {r.dest_label}</p>
      <p className="text-sm text-muted">{new Date(r.departs_at).toLocaleString()} · {r.seats_left} seat(s) left · est. {r.match.fare} / passenger</p>
      <p className="text-xs text-muted mt-1">Pickup {r.match.pickupDeviationKm} km off route · drop-off {r.match.dropoffDeviationKm} km off · {r.match.sharedKm} km shared · {r.match.method === 'road-route' ? 'road route' : 'approximate (straight line)'}</p>
      <div className="mt-3 flex gap-2"><button className="btn-ghost" onClick={() => setSel(r)}>VIEW DETAILS</button><button className="btn" onClick={() => join(r)}>REQUEST TO JOIN</button></div></div>))}</div>
    {sel && <div className="card"><h2 className="font-semibold mb-1">Ride details</h2><p className="text-sm text-muted">{sel.origin_label} → {sel.dest_label} · {sel.distance_km ? `${Number(sel.distance_km).toFixed(1)} km, ~${Math.round(sel.duration_min)} min (estimate)` : 'distance unavailable'} · Preferences: {Object.entries(sel.preferences).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}</p></div>}</div>);
}
