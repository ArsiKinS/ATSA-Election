import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { pool, q } from '@/lib/db';
import { getElection, statusOf } from '@/lib/election';
import { handler, HttpError, json } from '@/lib/http';
import { big, tokenHash, verifySig } from '@/lib/blind';
import { pubKey } from '@/lib/signer';

// ANONYMOUS endpoint: it never reads cookies or sessions. It only checks the blind signature on the token.
// The ballot row has no voter id and no timestamp. A reused token violates a UNIQUE constraint.
const Body = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/),
  sig: z.string().regex(/^[0-9a-f]{1,512}$/),
  choices: z.array(z.number().int().positive()).min(1).max(50),
});
export const POST = handler(async req => {
  const { token, sig, choices } = Body.parse(await req.json());
  const e = await getElection();
  if (!e || statusOf(e) !== 'open') throw new HttpError(403, 'Voting is not open');
  const k = pubKey();
  if (big(sig) >= k.nBig || !(await verifySig(token, sig, k.nBig, k.eBig))) throw new HttpError(400, 'Invalid ballot credential');
  const [pos, cands] = await Promise.all([q<{ id: number }>('SELECT id FROM positions ORDER BY sort,id'), q<{ id: number }>('SELECT id FROM candidates')]);
  const need = Math.min(pos.length, cands.length), ids = new Set(cands.map(c => c.id));
  if (choices.length !== need || new Set(choices).size !== need || !choices.every(c => ids.has(c))) throw new HttpError(400, 'Please choose one different candidate for each position');
  const id = randomUUID(), c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('INSERT INTO ballots(id,token_hash) VALUES($1,$2)', [id, await tokenHash(token)]);
    for (const [i, cand] of choices.entries()) await c.query('INSERT INTO ballot_choices(ballot_id,position_id,candidate_id) VALUES($1,$2,$3)', [id, pos[i].id, cand]);
    await c.query('COMMIT');
  } catch (err) {
    await c.query('ROLLBACK').catch(() => {});
    if ((err as { code?: string }).code === '23505') throw new HttpError(409, 'This ballot was already submitted');
    throw err;
  } finally { c.release(); }
  return json({ ok: true });
});
