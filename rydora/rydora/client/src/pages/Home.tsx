import { useEffect, useState } from 'react'; import { Link } from 'react-router-dom'; import { motion } from 'framer-motion'; import { Search, Users, Car, Leaf } from 'lucide-react';
export default function Home() {
  const [s, setS] = useState<any>(null);
  useEffect(() => { fetch('/api/public/stats').then(r => r.json()).then(setS).catch(() => setS(null)); }, []);
  const stat = (label: string, v: string) => <motion.div whileHover={{ y: -3 }} className="card text-center"><div className="text-3xl font-bold text-mint">{v}</div><div className="text-sm text-muted">{label}</div></motion.div>;
  return (<div className="space-y-16">
    <section className="grid md:grid-cols-2 gap-8 items-center pt-6">
      <div><h1 className="text-4xl md:text-5xl font-bold leading-tight">Your Journey, Shared for a Better Tomorrow.</h1>
        <p className="mt-4 text-muted">Travel smarter, spend less, and make every journey count. Find people heading your way and turn everyday commutes into affordable, sustainable shared journeys.</p>
        <div className="mt-6 flex gap-3"><Link className="btn" to="/find">FIND A RIDE</Link><Link className="btn-ghost" to="/offer">OFFER A RIDE</Link></div></div>
      <svg viewBox="0 0 400 240" className="w-full" role="img" aria-label="Illustrated shared route between two locations">
        <motion.path d="M40 190 C 120 40, 240 220, 360 50" fill="none" stroke="#72E6BB" strokeWidth="4" strokeDasharray="2 12" strokeLinecap="round"
          animate={{ strokeDashoffset: [0, -56] }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }} />
        <circle cx="40" cy="190" r="10" fill="#B8F5DC" /><circle cx="360" cy="50" r="10" fill="#72E6BB" /></svg></section>
    <section><h2 className="text-2xl font-semibold mb-1">Impact so far</h2>
      <p className="text-xs text-muted mb-4">Live aggregates of completed bookings on this platform (estimates use 0.12 kg CO₂/km and 0.08 L fuel/km). Zero until journeys are completed.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stat('Shared journeys', String(s?.journeys ?? 0))}{stat('Cost shared (est.)', (s?.sharedCost ?? 0).toFixed(0))}
        {stat('Fuel saved (est., L)', (s?.fuelLitres ?? 0).toFixed(1))}{stat('CO₂ avoided (est., kg)', (s?.co2Kg ?? 0).toFixed(1))}</div></section>
    <section><h2 className="text-2xl font-semibold mb-4">How RYDORA Works</h2>
      <div className="grid md:grid-cols-3 gap-4">{[[Search, 'Enter Your Journey', 'Tell us where and when you travel.'], [Users, 'Find Compatible Travellers', 'We rank rides by route overlap, deviation and timing.'], [Car, 'Share Your Ride', 'Request, get confirmed, and split the cost.']]
        .map(([I, t, d]: any) => <div key={t} className="card"><I className="text-mint mb-2" /><h3 className="font-semibold">{t}</h3><p className="text-sm text-muted">{d}</p></div>)}</div></section>
    <section className="card"><Leaf className="text-mint mb-2" /><h2 className="text-2xl font-semibold">Small Shared Journeys. Big Environmental Impact.</h2>
      <p className="text-muted mt-2">Sharing a car cuts the number of vehicles on the road, which reduces congestion, fuel use, carbon emissions and what each traveller spends.</p></section></div>);
}
