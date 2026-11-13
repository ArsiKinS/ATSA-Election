import { z } from 'zod';
import { q } from '@/lib/db';
import { getElection, statusOf } from '@/lib/election';
import { handler, HttpError, json } from '@/lib/http';
import { hashCode } from '@/lib/remote';

// Lets an online voter check their code before filling in the ballot. It does not use the code up.
export const POST = handler(async req => {
  const { code } = z.object({ code: z.string().max(40) }).parse(await req.json());
  const e = await getElection();
  if (!e || statusOf(e) !== 'open') throw new HttpError(403, 'Voting is not open');
  if (!(await q('SELECT 1 FROM remote_codes WHERE code_hash=$1 AND used=false', [hashCode(code)])).length) throw new HttpError(403, 'This code is not valid or was already used');
  return json({ ok: true });
});
