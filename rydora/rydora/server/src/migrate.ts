import 'dotenv/config';
import fs from 'node:fs'; import path from 'node:path';
import { pool } from './db.js';
const dir = path.resolve('migrations');
await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY)');
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
  const done = await pool.query('SELECT 1 FROM schema_migrations WHERE name=$1', [f]);
  if (done.rowCount) continue;
  const c = await pool.connect();
  try { await c.query('BEGIN'); await c.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    await c.query('INSERT INTO schema_migrations VALUES($1)', [f]); await c.query('COMMIT'); console.log('applied', f);
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
await pool.end();
