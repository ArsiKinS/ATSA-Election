import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { q } from '@/lib/db';
import { audit } from '@/lib/audit';
import { handler, HttpError, json } from '@/lib/http';
import { setSession } from '@/lib/session';

const DUMMY = bcrypt.hashSync('not-a-real-password', 12); // keeps timing similar for unknown emails
export const POST = handler(async req => {
  const { email, password } = z.object({ email: z.string().trim().toLowerCase().max(200), password: z.string().max(200) }).parse(await req.json());
  const [{ n }] = await q<{ n: number }>("SELECT count(*)::int n FROM audit_log WHERE action='login_failed' AND actor=$1 AND at>now()-interval '15 minutes'", [email]);
  if (n >= 5) throw new HttpError(429, 'Too many attempts. Try again in 15 minutes.');
  const [a] = await q<{ id: number; password_hash: string }>('SELECT id,password_hash FROM admins WHERE email=$1', [email]);
  const ok = await bcrypt.compare(password, a?.password_hash ?? DUMMY);
  if (!a || !ok) { if (a) await audit(email, 'login_failed'); throw new HttpError(401, 'Wrong email or password'); }
  await setSession('admin', { aid: a.id }, 8 * 3600);
  await audit(email, 'login');
  return json({ ok: true });
});
