import pg from 'pg';
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function notify(q: { query: Function }, userId: string, type: string, body: string) {
  await q.query('INSERT INTO notifications(user_id,type,body) VALUES($1,$2,$3)', [userId, type, body]);
}
