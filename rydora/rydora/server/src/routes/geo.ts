import { Router } from 'express'; import { z } from 'zod'; import rateLimit from 'express-rate-limit';
import { wrap } from '../auth.js'; import { geocode, getRoute } from '../services/geo.js';
const r = Router();
r.use(rateLimit({ windowMs: 60_000, limit: 40 })); // be polite to public geocoders
r.get('/search', wrap(async (req, res) => {
  const { q } = z.object({ q: z.string().min(3).max(120) }).parse(req.query);
  res.json(await geocode(q));
}));
r.get('/route', wrap(async (req, res) => {
  const q = z.object({ oLat: z.coerce.number(), oLng: z.coerce.number(), dLat: z.coerce.number(), dLng: z.coerce.number() }).parse(req.query);
  const rt = await getRoute({ lat: q.oLat, lng: q.oLng }, { lat: q.dLat, lng: q.dLng });
  if (!rt) return res.status(502).json({ error: 'Routing service unavailable' });
  res.json(rt);
}));
export default r;
