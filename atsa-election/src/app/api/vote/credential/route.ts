import { z } from 'zod';
import { pool } from '@/lib/db';
import { getElection, statusOf } from '@/lib/election';
import { handler, HttpError, json } from '@/lib/http';
import { getSession } from '@/lib/session';
import { pubKey, signBlinded } from '@/lib/signer';

// Signs a BLINDED value for a signed-in, eligible voter. Exactly one per voter.
// Re-sending the same blinded value returns the same answer (safe retry after a network failure); a different one is refused.
export const POST = handler(async req => {
  const s = await getSession<{ vid: number }>('voter');
  if (!s) throw new HttpError(401, 'Please sign in with your email first');
  const { blinded } = z.object({ blinded: z.string().regex(/^[0-9a-f]{1,512}$/) }).parse(await req.json());
  const e = await getElection();
  if (!e || statusOf(e) !== 'open') throw new HttpError(403, 'Voting is not open');
  const norm = BigInt('0x' + blinded);
  if (norm <= 1n || norm >= pubKey().nBig) throw new HttpError(400, 'Invalid value');
  const canon = norm.toString(16);
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows: [v] } = await c.query('SELECT blinded_msg,blind_sig FROM voters WHERE id=$1 FOR UPDATE', [s.vid]);
    if (!v) throw new HttpError(401, 'Please sign in again');
    if (v.blinded_msg) {
      await c.query('COMMIT');
      if (v.blinded_msg !== canon) throw new HttpError(409, 'A ballot was already issued to this account');
      return json({ sig: v.blind_sig });
    }
    const sig = signBlinded(canon);
    await c.query('UPDATE voters SET blinded_msg=$2, blind_sig=$3 WHERE id=$1', [s.vid, canon, sig]);
    await c.query('COMMIT');
    return json({ sig });
  } catch (err) { await c.query('ROLLBACK').catch(() => {}); throw err; } finally { c.release(); }
});
