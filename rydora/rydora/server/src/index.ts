import 'dotenv/config';
import express from 'express'; import cors from 'cors'; import helmet from 'helmet'; import rateLimit from 'express-rate-limit';
import { authMw } from './auth.js'; import { HttpError } from './db.js';
import rides from './routes/rides.js'; import bookings from './routes/bookings.js'; import me, { publicRouter } from './routes/me.js'; import geo from './routes/geo.js';
const app = express();
app.use(helmet()); app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 150 }));
app.use(authMw);
app.use('/api/public', publicRouter); app.use('/api/geo', geo); app.use('/api/rides', rides); app.use('/api/me', me); app.use('/api', bookings);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.name === 'ZodError') return res.status(400).json({ error: 'Invalid input', details: err.issues });
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  console.error(err); res.status(500).json({ error: 'Server error' });
});
app.listen(Number(process.env.PORT) || 4000, () => console.log('RYDORA API up'));
