import { z } from 'zod';
import { q } from '@/lib/db';
import { getElection } from '@/lib/election';
import { handler, HttpError, json } from '@/lib/http';
import { hashCode } from '@/lib/remote';
import { setSession } from '@/lib/session';

// Turns the computer that opens a one-time link into a polling-station computer. No admin login is needed on that computer.
// The link works once (marked used here). Only a hash is stored.
export const POST = handler(async req => {
  const { code } = z.object({ code: z.string().max(40) }).parse(await req.json());
  const used = await q('UPDATE kiosk_links SET used=true WHERE code_hash=$1 AND used=false RETURNING code_hash', [hashCode(code)]);
  if (!used.length) throw new HttpError(403, 'This link is not valid or was already used');
  const e = await getElection();
  await setSession('kiosk', { ep: e?.kiosk_epoch ?? 0 }, 24 * 3600);
  return json({ ok: true });
});
