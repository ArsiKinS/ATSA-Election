import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { pool, q } from '@/lib/db';
import { getElection, statusOf } from '@/lib/election';
import { handler, HttpError, json } from '@/lib/http';
import { getSession } from '@/lib/session';
import { hashCode } from '@/lib/remote';
import { isKiosk } from '@/lib/kiosk';

// Ballot from the polling-station computer (activated by an admin) OR from an approved member with a one-time online code.
// The code is only marked as used; it is not stored with the ballot.
// The ballot has no name, no email, no timestamp and no device id: nothing identifies the voter.
const Body = z.object({ president: z.number().int().positive(), board: z.array(z.number().int().positive()).max(30), code: z.string().max(40).optional() });
export const POST = handler(async req => {
  const { president, board, code } = Body.parse(await req.json());
  const e = await getElection();
  if (!e || statusOf(e) !== 'open') throw new HttpError(403, 'Voting is not open');
  const kiosk = await isKiosk(e);
  if (!kiosk && !code) throw new HttpError(403, 'Voting is only available on the polling station computer, or with an online voting code');
  const cands = await q<{ id: number; for_president: boolean; for_board: boolean }>('SELECT id,for_president,for_board FROM candidates');
  const presidents = new Set(cands.filter(c => c.for_president).map(c => c.id)), boardPool = new Set(cands.filter(c => c.for_board).map(c => c.id));
  const need = Math.min(e.board_seats, boardPool.size);
  if (!presidents.has(president)) throw new HttpError(400, 'Please choose one of the presidential candidates');
  if (board.length !== need || new Set(board).size !== need || !board.every(id => boardPool.has(id)) || board.includes(president))
    throw new HttpError(400, `Please choose exactly ${need} different board members`);
  const id = randomUUID(), c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock(7003)'); // makes the ballot limit exact even with simultaneous submits
    if (!kiosk && !(await c.query('UPDATE remote_codes SET used=true WHERE code_hash=$1 AND used=false', [hashCode(code!)])).rowCount)
      throw new HttpError(403, 'This code is not valid or was already used'); // rolled back below if the ballot limit refuses the ballot
    if (e.max_ballots !== null) {
      const { rows: [{ n }] } = await c.query('SELECT count(*)::int n FROM ballots WHERE president_id IS NOT NULL');
      if (n >= e.max_ballots) throw new HttpError(409, 'The ballot limit has been reached. Please see the staff.');
    }
    await c.query('INSERT INTO ballots(id,president_id) VALUES($1,$2)', [id, president]);
    for (const cand of board) await c.query('INSERT INTO ballot_board(ballot_id,candidate_id) VALUES($1,$2)', [id, cand]);
    await c.query('COMMIT');
  } catch (err) { await c.query('ROLLBACK').catch(() => {}); throw err; } finally { c.release(); }
  return json({ ok: true });
});
