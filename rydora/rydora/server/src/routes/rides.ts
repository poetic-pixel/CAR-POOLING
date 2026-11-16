import { Router } from 'express'; import { z } from 'zod';
import { pool, HttpError, notify } from '../db.js'; import { requireUser, requireDriver, wrap } from '../auth.js';
import { scoreRide } from '../matching.js'; import { getRoute } from '../services/geo.js';
const r = Router();
const place = z.object({ label: z.string().min(1).max(250), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
// Public ride view: no phone, no registration number, no licence data.
const BASE = `SELECT r.id, r.driver_id, r.origin_label, r.origin_lat, r.origin_lng, r.dest_label, r.dest_lat, r.dest_lng,
  r.route_geojson, r.distance_km, r.duration_min, r.departs_at, r.seats_total, r.price_per_seat, r.preferences, r.status,
  u.display_name AS driver_name, u.avatar_url, v.model AS vehicle_model, dp.verification_status,
  r.seats_total - COALESCE((SELECT SUM(b.seats) FROM bookings b WHERE b.ride_id=r.id AND b.status='confirmed'),0) AS seats_left,
  (SELECT ROUND(AVG(rating),1) FROM reviews rv WHERE rv.reviewee_id=r.driver_id) AS rating
  FROM rides r JOIN users u ON u.id=r.driver_id LEFT JOIN vehicles v ON v.id=r.vehicle_id LEFT JOIN driver_profiles dp ON dp.user_id=r.driver_id`;

r.get('/search', wrap(async (req, res) => {
  const q = z.object({ oLat: z.coerce.number(), oLng: z.coerce.number(), dLat: z.coerce.number(), dLng: z.coerce.number(),
    when: z.coerce.date(), passengers: z.coerce.number().int().min(1).max(8).default(1), maxBudget: z.coerce.number().min(0).optional() }).parse(req.query);
  const { rows } = await pool.query(
    `SELECT * FROM (${BASE} WHERE r.status='open' AND r.departs_at > now()) x
     WHERE seats_left >= $2 AND ($3::numeric IS NULL OR price_per_seat <= $3)
       AND departs_at BETWEEN $1::timestamptz - interval '90 minutes' AND $1::timestamptz + interval '90 minutes'`,
    [q.when, q.passengers, q.maxBudget ?? null]);
  const results = rows.map(row => ({ ...row, match: scoreRide(row, { lat: q.oLat, lng: q.oLng }, { lat: q.dLat, lng: q.dLng }, q.when) }))
    .filter(x => x.match && (q.maxBudget === undefined || x.match.fare <= q.maxBudget))
    .sort((a, b) => b.match!.percent - a.match!.percent);
  res.json(results);
}));

r.get('/:id', wrap(async (req, res) => {
  const { rows } = await pool.query(`${BASE} WHERE r.id=$1`, [z.string().uuid().parse(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Ride not found');
  res.json(rows[0]);
}));

r.post('/', requireUser, requireDriver, wrap(async (req, res) => {
  const b = z.object({ origin: place, dest: place, departsAt: z.coerce.date(), seats: z.number().int().min(1).max(8),
    price: z.number().min(0).max(100000), vehicleId: z.string().uuid().optional(),
    preferences: z.record(z.boolean()).default({}) }).parse(req.body);
  if (b.departsAt <= new Date()) throw new HttpError(400, 'Departure must be in the future');
  if (b.vehicleId) {
    const v = await pool.query('SELECT 1 FROM vehicles WHERE id=$1 AND owner_id=$2', [b.vehicleId, req.user.id]);
    if (!v.rowCount) throw new HttpError(400, 'Unknown vehicle');
  }
  const rt = await getRoute(b.origin, b.dest).catch(() => null); // computed server-side; never trust client geometry
  const ins = await pool.query(
    `INSERT INTO rides(driver_id,vehicle_id,origin_label,origin_lat,origin_lng,dest_label,dest_lat,dest_lng,route_geojson,distance_km,duration_min,departs_at,seats_total,price_per_seat,preferences)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
    [req.user.id, b.vehicleId ?? null, b.origin.label, b.origin.lat, b.origin.lng, b.dest.label, b.dest.lat, b.dest.lng,
     rt?.geojson ?? null, rt?.distanceKm ?? null, rt?.durationMin ?? null, b.departsAt, b.seats, b.price, b.preferences]);
  res.status(201).json({ id: ins.rows[0].id, routeFound: !!rt });
}));

r.delete('/:id', requireUser, wrap(async (req, res) => {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows: [ride] } = await c.query('SELECT * FROM rides WHERE id=$1 FOR UPDATE', [z.string().uuid().parse(req.params.id)]);
    if (!ride || ride.driver_id !== req.user.id) throw new HttpError(404, 'Ride not found');
    if (ride.status !== 'open') throw new HttpError(409, 'Ride is not open');
    await c.query(`UPDATE rides SET status='cancelled' WHERE id=$1`, [ride.id]);
    const { rows } = await c.query(`UPDATE bookings SET status='cancelled' WHERE ride_id=$1 AND status IN ('pending','confirmed') RETURNING passenger_id`, [ride.id]);
    for (const b of rows) await notify(c, b.passenger_id, 'ride_cancelled', `The ride ${ride.origin_label} → ${ride.dest_label} was cancelled by the driver.`);
    await c.query('COMMIT'); res.json({ ok: true });
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));
export default r;
