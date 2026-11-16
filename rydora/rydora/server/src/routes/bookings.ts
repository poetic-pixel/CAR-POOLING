import { Router } from 'express'; import { z } from 'zod';
import { pool, HttpError, notify } from '../db.js'; import { requireUser, wrap } from '../auth.js'; import { scoreRide } from '../matching.js';
const r = Router(); r.use(requireUser);
const place = z.object({ label: z.string().min(1).max(250), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

r.post('/rides/:id/bookings', wrap(async (req, res) => {
  const b = z.object({ seats: z.number().int().min(1).max(8), pickup: place, dropoff: place }).parse(req.body);
  const { rows: [ride] } = await pool.query(
    `SELECT r.*, r.seats_total - COALESCE((SELECT SUM(seats) FROM bookings WHERE ride_id=r.id AND status='confirmed'),0) AS seats_left FROM rides r WHERE r.id=$1`,
    [z.string().uuid().parse(req.params.id)]);
  if (!ride || ride.status !== 'open' || new Date(ride.departs_at) <= new Date()) throw new HttpError(404, 'Ride is not available');
  if (ride.driver_id === req.user.id) throw new HttpError(400, 'You cannot book your own ride');
  if (ride.seats_left < b.seats) throw new HttpError(409, 'Not enough seats left');
  const m = scoreRide(ride, b.pickup, b.dropoff, new Date(ride.departs_at));
  if (!m) throw new HttpError(400, 'This ride does not match your route');
  try {
    const ins = await pool.query(
      `INSERT INTO bookings(ride_id,passenger_id,seats,pickup_label,pickup_lat,pickup_lng,dropoff_label,dropoff_lat,dropoff_lng,fare_estimate,match_percent)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [ride.id, req.user.id, b.seats, b.pickup.label, b.pickup.lat, b.pickup.lng, b.dropoff.label, b.dropoff.lat, b.dropoff.lng, m.fare, m.percent]);
    await notify(pool, ride.driver_id, 'booking_request', `${req.user.display_name || 'A passenger'} requested ${b.seats} seat(s) on ${ride.origin_label} → ${ride.dest_label}.`);
    res.status(201).json({ id: ins.rows[0].id, fareEstimate: m.fare });
  } catch (e: any) { if (e.code === '23505') throw new HttpError(409, 'You already have an active request for this ride'); throw e; }
}));

// accept | reject | cancel | complete. Seats are only consumed on ACCEPT, under a row lock on the ride,
// so two concurrent accepts can never exceed seats_total.
r.patch('/bookings/:id', wrap(async (req, res) => {
  const { action } = z.object({ action: z.enum(['accept', 'reject', 'cancel', 'complete']) }).parse(req.body);
  const id = z.string().uuid().parse(req.params.id);
  const peek = await pool.query('SELECT ride_id FROM bookings WHERE id=$1', [id]);
  if (!peek.rowCount) throw new HttpError(404, 'Booking not found');
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows: [ride] } = await c.query('SELECT * FROM rides WHERE id=$1 FOR UPDATE', [peek.rows[0].ride_id]);
    const { rows: [bk] } = await c.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE', [id]);
    const isDriver = ride.driver_id === req.user.id, isPassenger = bk.passenger_id === req.user.id;
    if (!isDriver && !isPassenger) throw new HttpError(404, 'Booking not found');
    const trip = `${ride.origin_label} → ${ride.dest_label}`;
    let next: string, who: string, msg: string;
    if (action === 'accept' || action === 'reject') {
      if (!isDriver) throw new HttpError(403, 'Only the driver can do this');
      if (bk.status !== 'pending') throw new HttpError(409, 'Request is no longer pending');
      if (ride.status !== 'open') throw new HttpError(409, 'Ride is not open');
      if (action === 'accept') {
        const { rows: [s] } = await c.query(`SELECT COALESCE(SUM(seats),0)::int AS taken FROM bookings WHERE ride_id=$1 AND status='confirmed'`, [ride.id]);
        if (s.taken + bk.seats > ride.seats_total) throw new HttpError(409, 'Not enough seats left');
      }
      next = action === 'accept' ? 'confirmed' : 'rejected'; who = bk.passenger_id; msg = `Your request for ${trip} was ${next}.`;
    } else if (action === 'cancel') {
      if (!isPassenger) throw new HttpError(403, 'Only the passenger can cancel');
      if (!['pending', 'confirmed'].includes(bk.status)) throw new HttpError(409, 'Cannot cancel this booking');
      next = 'cancelled'; who = ride.driver_id; msg = `A passenger cancelled their booking on ${trip}.`;
    } else {
      if (!isDriver) throw new HttpError(403, 'Only the driver can do this');
      if (bk.status !== 'confirmed' || new Date(ride.departs_at) > new Date()) throw new HttpError(409, 'Only confirmed bookings of departed rides can be completed');
      next = 'completed'; who = bk.passenger_id; msg = `Your journey ${trip} is marked complete. You can now leave a review.`;
    }
    await c.query('UPDATE bookings SET status=$2 WHERE id=$1', [id, next]);
    await notify(c, who, `booking_${next}`, msg);
    await c.query('COMMIT'); res.json({ status: next });
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));

r.post('/bookings/:id/reviews', wrap(async (req, res) => {
  const b = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(500).optional() }).parse(req.body);
  const { rows: [bk] } = await pool.query(`SELECT b.*, r.driver_id FROM bookings b JOIN rides r ON r.id=b.ride_id WHERE b.id=$1`, [z.string().uuid().parse(req.params.id)]);
  if (!bk || ![bk.passenger_id, bk.driver_id].includes(req.user.id)) throw new HttpError(404, 'Booking not found');
  if (bk.status !== 'completed') throw new HttpError(409, 'Only completed journeys can be reviewed');
  const reviewee = req.user.id === bk.passenger_id ? bk.driver_id : bk.passenger_id;
  try { await pool.query('INSERT INTO reviews(booking_id,reviewer_id,reviewee_id,rating,comment) VALUES($1,$2,$3,$4,$5)', [bk.id, req.user.id, reviewee, b.rating, b.comment ?? null]); }
  catch (e: any) { if (e.code === '23505') throw new HttpError(409, 'Already reviewed'); throw e; }
  res.status(201).json({ ok: true });
}));
export default r;
