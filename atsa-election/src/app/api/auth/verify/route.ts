import { z } from 'zod';
import { createHash } from 'node:crypto';
import { q } from '@/lib/db';
import { handler, HttpError, json } from '@/lib/http';
import { setSession } from '@/lib/session';

// POST (not GET) so mail scanners that pre-open links cannot use up the one-time token.
export const POST = handler(async req => {
  const { token } = z.object({ token: z.string().regex(/^[0-9a-f]{64}$/) }).parse(await req.json());
  const [t] = await q<{ voter_id: number }>(
    'UPDATE login_tokens SET used_at=now() WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() RETURNING voter_id',
    [createHash('sha256').update(token).digest('hex')]);
  if (!t) throw new HttpError(400, 'This link is invalid, expired or already used');
  await setSession('voter', { vid: t.voter_id }, 60 * 60);
  return json({ ok: true });
});
