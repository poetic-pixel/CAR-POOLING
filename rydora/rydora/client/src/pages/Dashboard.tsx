import { useEffect, useState } from 'react'; import { useApi } from '../api';
export default function Dashboard() {
  const api = useApi(); const [d, setD] = useState<any>(null), [err, setErr] = useState(''), [prof, setProf] = useState({ displayName: '', phone: '', role: 'passenger' });
  const load = () => api('/me/dashboard').then(x => { setD(x); setProf({ displayName: x.me.display_name ?? '', phone: x.me.phone ?? '', role: x.me.role }); }).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);
  const act = (id: string, action: string) => api(`/bookings/${id}`, { method: 'PATCH', body: { action } }).then(load).catch(e => setErr(e.message));
  const review = (id: string, rating: number) => api(`/bookings/${id}/reviews`, { method: 'POST', body: { rating } }).then(load).catch(e => setErr(e.message));
  if (!d) return <p>{err || 'Loading…'}</p>;
  const when = (x: string) => new Date(x).toLocaleString();
  return (<div className="space-y-6"><h1 className="text-3xl font-bold">Dashboard</h1>{err && <p role="alert" className="card text-red-300">{err}</p>}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[['Completed rides', d.stats.rides], ['Distance (km)', d.stats.km.toFixed(1)], ['CO₂ avoided (est. kg)', d.stats.co2Kg.toFixed(1)], ['Est. earnings (cost-share)', d.stats.estimatedEarnings.toFixed(0)]]
      .map(([l, v]) => <div key={l as string} className="card text-center"><div className="text-2xl font-bold text-mint">{v}</div><div className="text-xs text-muted">{l}</div></div>)}</div>
    <section className="card grid md:grid-cols-4 gap-3 items-end"><div><label className="label">Name</label><input className="input" value={prof.displayName} onChange={e => setProf({ ...prof, displayName: e.target.value })} /></div>
      <div><label className="label">Phone</label><input className="input" value={prof.phone} onChange={e => setProf({ ...prof, phone: e.target.value })} /></div>
      <div><label className="label">Account type</label><select className="input" value={prof.role} onChange={e => setProf({ ...prof, role: e.target.value })}><option value="passenger">Passenger</option><option value="driver">Driver</option><option value="both">Both</option></select></div>
      <button className="btn" onClick={() => api('/me', { method: 'PATCH', body: prof }).then(load).catch(e => setErr(e.message))}>Save profile</button></section>
    <section><h2 className="text-xl font-semibold mb-2">Requests on my rides</h2>{d.incoming.length === 0 && <p className="text-muted">None yet.</p>}
      {d.incoming.map((b: any) => <div key={b.id} className="card mb-2 flex flex-wrap justify-between gap-2"><div><b>{b.passenger_name || 'Passenger'}</b> · {b.seats} seat(s) · {b.match_percent}% match<div className="text-sm text-muted">{b.origin_label} → {b.dest_label} · {when(b.departs_at)} · pickup {b.pickup_label}</div></div>
        <div className="flex gap-2 items-center"><span className="text-sm text-mint">{b.status}</span>
          {b.status === 'pending' && <><button className="btn" onClick={() => act(b.id, 'accept')}>Accept</button><button className="btn-ghost" onClick={() => act(b.id, 'reject')}>Reject</button></>}
          {b.status === 'confirmed' && new Date(b.departs_at) < new Date() && <button className="btn" onClick={() => act(b.id, 'complete')}>Mark complete</button>}</div></div>)}</section>
    <section><h2 className="text-xl font-semibold mb-2">My published rides</h2>{d.rides.length === 0 && <p className="text-muted">No rides published.</p>}
      {d.rides.map((r: any) => <div key={r.id} className="card mb-2 flex justify-between"><div>{r.origin_label} → {r.dest_label}<div className="text-sm text-muted">{when(r.departs_at)} · {r.seats_left}/{r.seats_total} seats left · {r.status}</div></div>
        {r.status === 'open' && <button className="btn-ghost" onClick={() => window.confirm('Cancel this ride and all its bookings?') && api(`/rides/${r.id}`, { method: 'DELETE' }).then(load).catch(e => setErr(e.message))}>Cancel ride</button>}</div>)}</section>
    <section><h2 className="text-xl font-semibold mb-2">My bookings</h2>{d.bookings.length === 0 && <p className="text-muted">No bookings yet.</p>}
      {d.bookings.map((b: any) => <div key={b.id} className="card mb-2 flex flex-wrap justify-between gap-2"><div>{b.origin_label} → {b.dest_label}<div className="text-sm text-muted">{when(b.departs_at)} · driver {b.driver_name || 'n/a'} · est. {b.fare_estimate} · <span className="text-mint">{b.status}</span></div></div>
        <div className="flex gap-2 items-center">{['pending', 'confirmed'].includes(b.status) && <button className="btn-ghost" onClick={() => window.confirm('Cancel this booking?') && act(b.id, 'cancel')}>Cancel</button>}
          {b.status === 'completed' && !b.reviewed && <select className="input w-auto" defaultValue="" onChange={e => e.target.value && review(b.id, +e.target.value)} aria-label="Rate driver"><option value="">Rate driver…</option>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}</select>}</div></div>)}</section>
    <section><div className="flex justify-between items-center mb-2"><h2 className="text-xl font-semibold">Notifications</h2><button className="btn-ghost text-sm" onClick={() => api('/me/notifications/read', { method: 'POST' }).then(load)}>Mark all read</button></div>
      {d.notifications.length === 0 && <p className="text-muted">Nothing yet.</p>}{d.notifications.map((n: any) => <div key={n.id} className={`card mb-2 ${n.read ? 'opacity-60' : 'border-mint'}`}>{n.body}<div className="text-xs text-muted">{when(n.created_at)}</div></div>)}</section>
    <button className="btn-ghost text-red-300" onClick={() => window.confirm('Permanently delete your account and data?') && api('/me', { method: 'DELETE' }).then(() => (window.location.href = '/')).catch(e => setErr(e.message))}>Delete my account</button></div>);
}
