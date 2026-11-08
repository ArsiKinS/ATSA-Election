import { createHash } from 'node:crypto';
import { pool } from './db';
export const chain = (prev: string, at: string, actor: string, action: string, details: string) =>
  createHash('sha256').update([prev, at, actor, action, details].join('|')).digest('hex');
/** Append-only, hash-chained log (the database also blocks UPDATE/DELETE). Never put ballot data or voter emails in details. */
export async function audit(actor: string, action: string, details: Record<string, unknown> = {}) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock(7001)');
    const prev = (await c.query('SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1')).rows[0]?.hash ?? '';
    const at = new Date().toISOString(), d = JSON.stringify(details);
    await c.query('INSERT INTO audit_log(at,actor,action,details,prev_hash,hash) VALUES($1,$2,$3,$4,$5,$6)', [at, actor, action, d, prev, chain(prev, at, actor, action, d)]);
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
}
