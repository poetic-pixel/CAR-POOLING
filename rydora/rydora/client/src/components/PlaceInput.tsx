import { useEffect, useState } from 'react'; import { Place } from '../api';
export default function PlaceInput({ label, value, onPick }: { label: string; value: Place | null; onPick: (p: Place | null) => void }) {
  const [text, setText] = useState(value?.label ?? ''); const [opts, setOpts] = useState<Place[]>([]); const [err, setErr] = useState('');
  useEffect(() => { setText(value?.label ?? ''); }, [value]);
  useEffect(() => {
    if (text.length < 3 || text === value?.label) { setOpts([]); return; }
    const t = setTimeout(async () => {
      try { const r = await fetch('/api/geo/search?q=' + encodeURIComponent(text)); if (!r.ok) throw 0; setOpts(await r.json()); setErr(''); }
      catch { setErr('Location search unavailable'); }
    }, 600); // debounce: public geocoders are rate limited
    return () => clearTimeout(t);
  }, [text]);
  return (<div className="relative"><label className="label">{label}</label>
    <input className="input" value={text} placeholder="Type a place…" onChange={e => { setText(e.target.value); onPick(null); }} aria-label={label} />
    {err && <p className="text-xs text-red-300 mt-1">{err}</p>}
    {opts.length > 0 && <ul className="absolute z-[1000] mt-1 w-full rounded-xl bg-midnight border border-white/15 max-h-56 overflow-auto">
      {opts.map(o => <li key={o.label}><button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-white/10" onClick={() => { onPick(o); setOpts([]); }}>{o.label}</button></li>)}
    </ul>}</div>);
}
