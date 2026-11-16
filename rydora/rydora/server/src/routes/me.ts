import { Router } from 'express'; import { z } from 'zod'; import { clerkClient, getAuth } from '@clerk/express';
import { pool } from '../db.js'; import { requireUser, requireDriver, wrap } from '../auth.js';
export const publicRouter = Router();
const CO2_KG_PER_KM = 0.12, FUEL_L_PER_KM = 0.08; // assumptions, shown as estimates in the UI
publicRouter.get('/stats', wrap(async (_req, res) => {
  const { rows: [s] } = await pool.query(
    `SELECT COUNT(*)::int AS journeys, COALESCE(SUM(b.fare_estimate*b.seats),0)::float AS shared_cost, COALESCE(SUM(r.distance_km),0)::float AS km
     FROM bookings b JOIN rides r ON r.id=b.ride_id WHERE b.status='completed'`);
  res.json({ journeys: s.journeys, sharedCost: s.shared_cost, fuelLitres: s.km * FUEL_L_PER_KM, co2Kg: s.km * CO2_KG_PER_KM });
}));

const r = Router(); r.use(requireUser);
r.get('/', wrap(async (req, res) => res.json(req.user)));
r.patch('/', wrap(async (req, res) => {
  const b = z.object({ displayName: z.string().min(1).max(80).optional(), phone: z.string().max(30).optional(), role: z.enum(['passenger', 'driver', 'both']).optional() }).parse(req.body);
  const { rows } = await pool.query(`UPDATE users SET display_name=COALESCE($2,display_name), phone=COALESCE($3,phone), role=COALESCE($4,role) WHERE id=$1 RETURNING *`,
    [req.user.id, b.displayName ?? null, b.phone ?? null, b.role ?? null]);
  res.json(rows[0]);
}));
r.delete('/', wrap(async (req, res) => { // removes app data (cascade) AND the Clerk identity
  await pool.query('DELETE FROM users WHERE id=$1', [req.user.id]);
  await clerkClient.users.deleteUser(getAuth(req).userId!); res.json({ ok: true });
}));
// Verification: records a SUBMISSION only. "verified" must be set by a human/ID-check provider, never by this API.
r.put('/driver-profile', requireDriver, wrap(async (req, res) => {
  const b = z.object({ licenceRef: z.string().min(4).max(40) }).parse(req.body);
  await pool.query(`INSERT INTO driver_profiles(user_id,licence_ref,verification_status,submitted_at) VALUES($1,$2,'pending',now())
    ON CONFLICT (user_id) DO UPDATE SET licence_ref=$2, verification_status='pending', submitted_at=now()`, [req.user.id, b.licenceRef]);
  res.json({ status: 'pending' });
}));
r.post('/vehicles', requireDriver, wrap(async (req, res) => {
  const b = z.object({ model: z.string().min(1).max(80), registration: z.string().min(3).max(20), seats: z.number().int().min(1).max(8) }).parse(req.body);
  const { rows } = await pool.query('INSERT INTO vehicles(owner_id,model,registration,seats) VALUES($1,$2,$3,$4) RETURNING *', [req.user.id, b.model, b.registration, b.seats]);
  res.status(201).json(rows[0]);
}));
r.get('/vehicles', wrap(async (req, res) => res.json((await pool.query('SELECT * FROM vehicles WHERE owner_id=$1', [req.user.id])).rows)));
r.get('/emergency-contacts', wrap(async (req, res) => res.json((await pool.query('SELECT * FROM emergency_contacts WHERE user_id=$1', [req.user.id])).rows)));
r.post('/emergency-contacts', wrap(async (req, res) => {
  const b = z.object({ name: z.string().min(1).max(80), phone: z.string().min(5).max(30) }).parse(req.body);
  res.status(201).json((await pool.query('INSERT INTO emergency_contacts(user_id,name,phone) VALUES($1,$2,$3) RETURNING *', [req.user.id, b.name, b.phone])).rows[0]);
}));
r.post('/notifications/read', wrap(async (req, res) => { await pool.query('UPDATE notifications SET read=true WHERE user_id=$1', [req.user.id]); res.json({ ok: true }); }));
r.get('/dashboard', wrap(async (req, res) => {
  const u = req.user.id;
  const [bookings, rides, incoming, notes, st, earn] = await Promise.all([
    pool.query(`SELECT b.*, r.origin_label, r.dest_label, r.departs_at, r.distance_km, u.display_name AS driver_name,
        EXISTS(SELECT 1 FROM reviews rv WHERE rv.booking_id=b.id AND rv.reviewer_id=$1) AS reviewed
      FROM bookings b JOIN rides r ON r.id=b.ride_id JOIN users u ON u.id=r.driver_id WHERE b.passenger_id=$1 ORDER BY r.departs_at DESC`, [u]),
    pool.query(`SELECT r.*, r.seats_total - COALESCE((SELECT SUM(seats) FROM bookings WHERE ride_id=r.id AND status='confirmed'),0) AS seats_left FROM rides r WHERE driver_id=$1 ORDER BY departs_at DESC`, [u]),
    pool.query(`SELECT b.*, r.origin_label, r.dest_label, r.departs_at, p.display_name AS passenger_name FROM bookings b JOIN rides r ON r.id=b.ride_id JOIN users p ON p.id=b.passenger_id
      WHERE r.driver_id=$1 AND b.status IN ('pending','confirmed') ORDER BY b.status DESC, r.departs_at`, [u]),
    pool.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30', [u]),
    pool.query(`SELECT COUNT(*)::int AS rides, COALESCE(SUM(r.distance_km),0)::float AS km FROM bookings b JOIN rides r ON r.id=b.ride_id WHERE b.passenger_id=$1 AND b.status='completed'`, [u]),
    pool.query(`SELECT COALESCE(SUM(b.fare_estimate*b.seats),0)::float AS e FROM bookings b JOIN rides r ON r.id=b.ride_id WHERE r.driver_id=$1 AND b.status IN ('confirmed','completed')`, [u]),
  ]);
  res.json({ me: req.user, bookings: bookings.rows, rides: rides.rows, incoming: incoming.rows, notifications: notes.rows,
    stats: { rides: st.rows[0].rides, km: st.rows[0].km, co2Kg: st.rows[0].km * CO2_KG_PER_KM, estimatedEarnings: earn.rows[0].e } });
}));
export default r;
