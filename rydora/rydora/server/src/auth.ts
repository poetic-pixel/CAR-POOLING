import { clerkMiddleware, getAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';
import { pool, HttpError } from './db.js';
export const authMw = clerkMiddleware();
type H = (req: any, res: Response, next: NextFunction) => Promise<any>;
export const wrap = (fn: H) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
// Authentication is verified server-side from the Clerk session token; the role comes from OUR database.
export const requireUser = wrap(async (req, _res, next) => {
  const { userId } = getAuth(req);
  if (!userId) throw new HttpError(401, 'Please sign in');
  const r = await pool.query(
    `INSERT INTO users(clerk_user_id) VALUES($1) ON CONFLICT (clerk_user_id) DO UPDATE SET clerk_user_id=EXCLUDED.clerk_user_id RETURNING *`, [userId]);
  req.user = r.rows[0]; next();
});
export const requireDriver = wrap(async (req, _res, next) => {
  if (!['driver', 'both'].includes(req.user.role)) throw new HttpError(403, 'Enable driver mode first');
  next();
});
