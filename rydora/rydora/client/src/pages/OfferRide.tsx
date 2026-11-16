import { useEffect, useState } from 'react'; import { Place, useApi } from '../api'; import PlaceInput from '../components/PlaceInput'; import Map, { toLatLng } from '../components/Map';
const PREFS = ['noSmoking', 'noPets', 'musicOk', 'luggageOk'];
export default function OfferRide() {
  const api = useApi(); const [me, setMe] = useState<any>(null); const [vehicles, setVehicles] = useState<any[]>([]);
  const [o, setO] = useState<Place | null>(null), [d, setD] = useState<Place | null>(null), [route, setRoute] = useState<any>(null);
  const [f, setF] = useState({ date: '', time: '08:00', seats: 3, price: 0, vehicleId: '' }); const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [lic, setLic] = useState(''), [veh, setVeh] = useState({ model: '', registration: '', seats: 4 }), [msg, setMsg] = useState('');
  const load = () => api('/me').then(setMe); useEffect(() => { load(); }, []);
  useEffect(() => { if (me && ['driver', 'both'].includes(me.role)) api('/me/vehicles').then(setVehicles); }, [me?.role]);
  const run = (fn: () => Promise<any>) => fn().catch((e: any) => setMsg(e.message));
  if (!me) return <p>Loading…</p>;
  if (!['driver', 'both'].includes(me.role)) return <div className="card space-y-3"><p>Enable driver mode to publish rides.</p>
    <button className="btn" onClick={() => run(async () => { setMe(await api('/me', { method: 'PATCH', body: { role: 'both' } })); })}>Enable driver mode</button></div>;
  const preview = () => run(async () => { if (!o || !d) return setMsg('Pick both locations first.'); setMsg(''); setRoute(await api(`/geo/route?oLat=${o.lat}&oLng=${o.lng}&dLat=${d.lat}&dLng=${d.lng}`)); });
  const publish = () => run(async () => {
    if (!o || !d || !f.date) return setMsg('Fill in locations and date.');
    if (!window.confirm('Publish this ride?')) return;
    const r = await api('/rides', { method: 'POST', body: { origin: o, dest: d, departsAt: new Date(`${f.date}T${f.time}`).toISOString(), seats: f.seats, price: f.price, vehicleId: f.vehicleId || undefined, preferences: prefs } });
    setMsg(r.routeFound ? 'Ride published.' : 'Ride published, but no road route was found; matching will use a straight-line approximation.');
  });
  return (<div className="space-y-6"><h1 className="text-3xl font-bold">Your Car. Your Route. Shared Opportunities.</h1>
    <div className="card grid md:grid-cols-2 gap-3"><PlaceInput label="Starting location" value={o} onPick={setO} /><PlaceInput label="Destination" value={d} onPick={setD} />
      <div><label className="label">Date</label><input className="input" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></div>
      <div><label className="label">Departure time</label><input className="input" type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></div>
      <div><label className="label">Passenger seats</label><input className="input" type="number" min={1} max={8} value={f.seats} onChange={e => setF({ ...f, seats: +e.target.value })} /></div>
      <div><label className="label">Price per passenger (full route)</label><input className="input" type="number" min={0} value={f.price} onChange={e => setF({ ...f, price: +e.target.value })} /></div>
      <div><label className="label">Vehicle</label><select className="input" value={f.vehicleId} onChange={e => setF({ ...f, vehicleId: e.target.value })}><option value="">None selected</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.model} ({v.registration})</option>)}</select></div>
      <fieldset className="flex flex-wrap gap-3 items-end">{PREFS.map(p => <label key={p} className="text-sm"><input type="checkbox" className="mr-1" checked={!!prefs[p]} onChange={e => setPrefs({ ...prefs, [p]: e.target.checked })} />{p}</label>)}</fieldset>
      <div className="flex gap-2 md:col-span-2"><button className="btn-ghost" onClick={preview}>Preview route</button><button className="btn" onClick={publish}>Publish ride</button></div></div>
    {msg && <p role="status" className="card text-softmint">{msg}</p>}
    {route && <p className="text-sm text-muted">Estimated {route.distanceKm.toFixed(1)} km, ~{Math.round(route.durationMin)} min (routing estimate, not live traffic).</p>}
    <Map markers={[...(o ? [{ pos: [o.lat, o.lng] as [number, number], label: 'Start' }] : []), ...(d ? [{ pos: [d.lat, d.lng] as [number, number], label: 'Destination', color: '#B8F5DC' }] : [])]} lines={route ? [{ coords: toLatLng(route.geojson) }] : []} />
    <div className="grid md:grid-cols-2 gap-4"><div className="card space-y-2"><h2 className="font-semibold">Add a vehicle</h2>
      <input className="input" placeholder="Model" value={veh.model} onChange={e => setVeh({ ...veh, model: e.target.value })} /><input className="input" placeholder="Registration" value={veh.registration} onChange={e => setVeh({ ...veh, registration: e.target.value })} />
      <button className="btn" onClick={() => run(async () => { await api('/me/vehicles', { method: 'POST', body: veh }); setVehicles(await api('/me/vehicles')); setMsg('Vehicle added.'); })}>Save vehicle</button></div>
      <div className="card space-y-2"><h2 className="font-semibold">Driver verification</h2><p className="text-sm text-muted">Submitting starts a review. You are not marked Verified until it is completed.</p>
        <input className="input" placeholder="Licence number" value={lic} onChange={e => setLic(e.target.value)} />
        <button className="btn" onClick={() => run(async () => { await api('/me/driver-profile', { method: 'PUT', body: { licenceRef: lic } }); setLic(''); setMsg('Submitted: status Pending review.'); })}>Submit for review</button></div></div></div>);
}
