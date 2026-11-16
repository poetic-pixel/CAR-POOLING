import { useParams } from 'react-router-dom';
const pages: Record<string, [string, string[]]> = {
  'how-it-works': ['How It Works', ['1. Enter your journey and see ranked matches.', '2. Request to join; the driver accepts or rejects.', '3. Seats are reserved only when the driver accepts, so a seat can never be double-booked.',
    'Match % = 25% pickup closeness + 25% drop-off closeness + 30% route overlap + 20% time closeness, only for rides heading the same direction within 5 km of your points and 90 minutes of your time. Rides with a stored road route use it; otherwise a straight line is used and labelled "approximate".',
    'Fares are cost-sharing ESTIMATES. RYDORA does not process payments.']],
  safety: ['Safety', ['Driver verification: drivers submit licence details for review. A driver shows "Verified" only after a real review marks them verified; until then you will see Unverified or Pending.',
    'Reviews are only possible after a journey is marked completed.', 'Your phone number and vehicle registration are never shown on public ride listings.',
    'Emergency: contact local emergency services directly (India: 112). RYDORA does not provide live emergency response.', 'Trip sharing: send your trusted contact the route, time and driver name yourself; automated sharing is not yet implemented.']],
  about: ['About Us', ['RYDORA connects people travelling along similar routes to cut cost, congestion and emissions.', 'Travel smarter. Share better. Live greener.']],
};
export default function Info() {
  const [title, items] = pages[useParams().page ?? ''] ?? ['Not found', ['This page does not exist.']];
  return <div className="max-w-2xl space-y-3"><h1 className="text-3xl font-bold">{title}</h1>{items.map(t => <p key={t} className="text-muted">{t}</p>)}</div>;
}
