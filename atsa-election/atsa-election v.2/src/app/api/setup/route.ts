import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { createHash, timingSafeEqual } from 'node:crypto';
import { pool, q } from '@/lib/db';
import { audit } from '@/lib/audit';
import { handler, HttpError, json } from '@/lib/http';

// One-time first-run setup: creates the first Super Admin and the election row.
// Needs SETUP_TOKEN (set in the hosting environment) and only works while there are no admins.
const h = (s: string) => createHash('sha256').update(s).digest();
export const POST = handler(async req => {
  const b = z.object({ token: z.string().max(200), email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(10).max(100) }).parse(await req.json());
  const expected = process.env.SETUP_TOKEN ?? '';
  if (expected.length < 12 || !timingSafeEqual(h(b.token), h(expected))) throw new HttpError(403, 'Wrong setup token');
  const c = await pool.connect();
  try {
    await c.query('BEGIN'); await c.query('SELECT pg_advisory_xact_lock(7002)');
    if ((await c.query('SELECT 1 FROM admins')).rowCount) throw new HttpError(409, 'Setup was already completed');
    const day = 864e5, now = Date.now();
    await c.query('INSERT INTO election (id, open_at, close_at, results_at) VALUES (1,$1,$2,$3) ON CONFLICT DO NOTHING', [new Date(now + day), new Date(now + 2 * day), new Date(now + 3 * day)]);
    await c.query("INSERT INTO admins(email,password_hash,role) VALUES($1,$2,'SUPER_ADMIN')", [b.email, await bcrypt.hash(b.password, 12)]);
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
  await audit(b.email, 'setup');
  return json({ ok: true });
});
