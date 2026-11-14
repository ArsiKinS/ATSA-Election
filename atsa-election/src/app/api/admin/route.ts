import { z } from 'zod';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { q } from '@/lib/db';
import { PERMS, requireAdmin } from '@/lib/admin';
import { audit, chain } from '@/lib/audit';
import { getElection, statusOf, type Election } from '@/lib/election';
import { handler, HttpError, json } from '@/lib/http';
import { clearSession, setSession } from '@/lib/session';
import { tally } from '@/lib/tally';
import { newCode, hashCode } from '@/lib/remote';

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const img = z.string().regex(/^data:image\/(png|jpeg|webp);base64,/).max(400_000).nullable();
const dt = z.string().datetime({ offset: true }).refine(s => !isNaN(Date.parse(s)));
const A = z.discriminatedUnion('action', [
  z.object({ action: z.literal('election.save'), club_name: z.string().min(1).max(120), club_short: z.string().min(1).max(20), title: z.string().max(120), title_th: z.string().max(120), year: z.number().int().min(2000).max(2100), description: z.string().max(2000), announcement: z.string().max(1000), color_primary: hex, color_secondary: hex, color_accent: hex, logo_data: img, open_at: dt, close_at: dt, results_at: dt, auto_publish: z.boolean(), board_seats: z.number().int().min(1).max(20), max_ballots: z.number().int().min(1).max(100000).nullable() }),
  z.object({ action: z.literal('candidate.save'), id: z.number().int().optional(), name: z.string().trim().min(1).max(100), bio: z.string().max(1500), manifesto: z.string().max(3000), photo: img, for_president: z.boolean(), for_board: z.boolean() }),
  z.object({ action: z.literal('candidate.delete'), id: z.number().int() }),
  z.object({ action: z.literal('kiosk.open') }),
  z.object({ action: z.literal('kiosk.close') }),
  z.object({ action: z.literal('kiosk.links'), count: z.number().int().min(1).max(20) }),
  z.object({ action: z.literal('kiosk.links_cancel') }),
  z.object({ action: z.literal('kiosk.revoke_all') }),
  z.object({ action: z.literal('remote.generate'), count: z.number().int().min(1).max(50) }),
  z.object({ action: z.literal('remote.cancel') }),
  z.object({ action: z.literal('results.verify') }),
  z.object({ action: z.literal('results.publish') }),
  z.object({ action: z.literal('admin.create'), email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(10).max(100), role: z.enum(['SUPER_ADMIN', 'COMMITTEE', 'RESULTS_MANAGER']) }),
  z.object({ action: z.literal('admin.delete'), id: z.number().int() }),
  z.object({ action: z.literal('logout') }),
]);
const NEED: Record<string, string> = {
  'election.save': 'election:edit', 'candidate.save': 'candidates:edit', 'candidate.delete': 'candidates:edit', 'kiosk.open': 'kiosk:open', 'kiosk.close': 'kiosk:open', 'kiosk.links': 'kiosk:open', 'kiosk.links_cancel': 'kiosk:open', 'kiosk.revoke_all': 'kiosk:open', 'remote.generate': 'remote:manage', 'remote.cancel': 'remote:manage',
  'results.verify': 'results:publish', 'results.publish': 'results:publish', 'admin.create': 'admins:manage', 'admin.delete': 'admins:manage',
};
const notStarted = (e: Election) => { if (new Date() >= e.open_at) throw new HttpError(409, 'Voting has started. This can no longer be changed.'); };
const ballotCount = async () => (await q<{ n: number }>('SELECT count(*)::int n FROM ballots WHERE president_id IS NOT NULL'))[0].n;

export const GET = handler(async () => {
  const me = await requireAdmin('stats:view'), perms = PERMS[me.role];
  const [e, ballots, candidates, admins, all, qr, remote, links] = await Promise.all([
    getElection(),
    ballotCount(),
    q('SELECT id,name,bio,manifesto,photo,for_president,for_board FROM candidates ORDER BY sort,id'),
    perms.includes('admins:manage') ? q('SELECT id,email,role FROM admins ORDER BY id') : Promise.resolve(undefined),
    perms.includes('audit:view') ? q<{ id: number; at: Date; actor: string; action: string; details: string; prev_hash: string; hash: string }>('SELECT * FROM audit_log ORDER BY id') : Promise.resolve(undefined),
    process.env.APP_URL ? QRCode.toString(process.env.APP_URL + '/', { type: 'svg', margin: 1 }) : Promise.resolve(undefined),
    q<{ issued: number; used: number }>('SELECT count(*)::int issued, (count(*) FILTER (WHERE used))::int used FROM remote_codes').then(r => ({ ...r[0], missing: false })).catch(() => ({ issued: 0, used: 0, missing: true })), // missing = migrate-v3.sql not run yet
    q<{ issued: number; used: number }>('SELECT count(*)::int issued, (count(*) FILTER (WHERE used))::int used FROM kiosk_links').then(r => ({ ...r[0], missing: false })).catch(() => ({ issued: 0, used: 0, missing: true })), // missing = migrate-v4.sql not run yet
  ]);
  if (!e) throw new HttpError(404, 'No election found. Run the first-time setup.');
  const out: Record<string, unknown> = { me: { email: me.email, role: me.role, perms }, election: e, status: statusOf(e), stats: { ballots, max_ballots: e.max_ballots }, candidates };
  if (qr) out.qr = qr;
  if (perms.includes('remote:manage')) out.remote = remote;
  if (perms.includes('kiosk:open')) out.kiosk = links;
  if (admins) out.admins = admins;
  if (perms.includes('results:view') && new Date() >= e.close_at) out.results = await tally(); // numbers: admins only, after voting closes
  if (all) {
    let prev = '', ok = true;
    for (const r of all) { if (r.prev_hash !== prev || r.hash !== chain(prev, r.at.toISOString(), r.actor, r.action, r.details)) ok = false; prev = r.hash; }
    out.audit = { chainOk: ok, rows: all.slice(-100).reverse().map(r => ({ id: r.id, at: r.at, actor: r.actor, action: r.action, details: r.details })) };
  }
  return json(out);
});

export const POST = handler(async req => {
  const b = A.parse(await req.json());
  if (b.action === 'logout') { await clearSession('admin'); return json({ ok: true }); }
  const me = await requireAdmin(NEED[b.action]);
  const e = await getElection();
  if (!e) throw new HttpError(404, 'No election found');
  switch (b.action) {
    case 'election.save': {
      const { action: _a, ...f } = b;
      if (!(new Date(f.open_at) < new Date(f.close_at) && new Date(f.close_at) <= new Date(f.results_at))) throw new HttpError(400, 'Dates must be in order: opens, then closes, then results');
      await q(`UPDATE election SET club_name=$1,club_short=$2,title=$3,title_th=$4,year=$5,description=$6,announcement=$7,color_primary=$8,color_secondary=$9,color_accent=$10,logo_data=$11,open_at=$12,close_at=$13,results_at=$14,auto_publish=$15,board_seats=$16,max_ballots=$17 WHERE id=1`,
        [f.club_name, f.club_short, f.title, f.title_th, f.year, f.description, f.announcement, f.color_primary, f.color_secondary, f.color_accent, f.logo_data, f.open_at, f.close_at, f.results_at, f.auto_publish, f.board_seats, f.max_ballots]);
      await audit(me.email, 'election.save', { open_at: f.open_at, close_at: f.close_at, results_at: f.results_at, auto_publish: f.auto_publish, board_seats: f.board_seats, max_ballots: f.max_ballots });
      break;
    }
    case 'candidate.save':
      notStarted(e);
      if (b.id) await q('UPDATE candidates SET name=$2,bio=$3,manifesto=$4,photo=$5,for_president=$6,for_board=$7 WHERE id=$1', [b.id, b.name, b.bio, b.manifesto, b.photo, b.for_president, b.for_board]);
      else await q('INSERT INTO candidates(sort,name,bio,manifesto,photo,for_president,for_board) VALUES((SELECT coalesce(max(sort),0)+1 FROM candidates),$1,$2,$3,$4,$5,$6)', [b.name, b.bio, b.manifesto, b.photo, b.for_president, b.for_board]);
      await audit(me.email, 'candidate.save', { name: b.name, for_president: b.for_president, for_board: b.for_board });
      break;
    case 'candidate.delete':
      notStarted(e);
      await q('DELETE FROM candidates WHERE id=$1', [b.id]);
      await audit(me.email, 'candidate.delete', { id: b.id });
      break;
    case 'kiosk.open':
      // Turns THIS computer into the polling-station computer, and signs the admin out of it so voters cannot reach the admin area.
      await setSession('kiosk', { ep: e.kiosk_epoch ?? 0 }, 24 * 3600);
      await clearSession('admin');
      await audit(me.email, 'kiosk.open');
      break;
    case 'kiosk.links': {
      if (new Date() >= e.close_at) throw new HttpError(409, 'Voting has closed');
      const codes = Array.from({ length: b.count }, newCode);
      await q('INSERT INTO kiosk_links(code_hash) SELECT unnest($1::text[])', [codes.map(hashCode)]);
      await audit(me.email, 'kiosk.links', { count: b.count }); // the links themselves are never stored or logged
      return json({ ok: true, codes }); // shown once
    }
    case 'kiosk.links_cancel': {
      const gone = await q('DELETE FROM kiosk_links WHERE used=false RETURNING code_hash');
      await audit(me.email, 'kiosk.links_cancel', { cancelled: gone.length });
      break;
    }
    case 'kiosk.revoke_all':
      await q('UPDATE election SET kiosk_epoch = kiosk_epoch + 1 WHERE id=1');
      await audit(me.email, 'kiosk.revoke_all');
      break;
    case 'kiosk.close':
      await clearSession('kiosk');
      await audit(me.email, 'kiosk.close');
      break;
    case 'remote.generate': {
      if (new Date() >= e.close_at) throw new HttpError(409, 'Voting has closed');
      const total = (await q<{ n: number }>('SELECT count(*)::int n FROM remote_codes'))[0].n;
      if (total + b.count > 200) throw new HttpError(400, 'Too many codes in total (maximum 200)');
      const codes = Array.from({ length: b.count }, newCode);
      await q('INSERT INTO remote_codes(code_hash) SELECT unnest($1::text[])', [codes.map(hashCode)]);
      await audit(me.email, 'remote.generate', { count: b.count }); // codes themselves are never logged or stored
      return json({ ok: true, codes }); // shown once
    }
    case 'remote.cancel': {
      const gone = await q('DELETE FROM remote_codes WHERE used=false RETURNING code_hash');
      await audit(me.email, 'remote.cancel', { cancelled: gone.length });
      break;
    }
    case 'results.verify': {
      if (statusOf(e) !== 'closed') throw new HttpError(409, 'Results can only be verified after voting has closed');
      const n = await ballotCount();
      if (e.max_ballots !== null && n > e.max_ballots) throw new HttpError(409, `Integrity check failed: ${n} ballots but the limit is ${e.max_ballots}`);
      await q('UPDATE election SET verified_at=now() WHERE id=1');
      await audit(me.email, 'results.verify', { ballots: n, max_ballots: e.max_ballots });
      break;
    }
    case 'results.publish':
      if (!e.verified_at) throw new HttpError(409, 'Verify the results first');
      if (new Date() < e.close_at) throw new HttpError(409, 'Voting is still open');
      await q('UPDATE election SET published_at=now() WHERE id=1');
      await audit(me.email, 'results.publish');
      break;
    case 'admin.create':
      try { await q('INSERT INTO admins(email,password_hash,role) VALUES($1,$2,$3)', [b.email, await bcrypt.hash(b.password, 12), b.role]); }
      catch (err) { if ((err as { code?: string }).code === '23505') throw new HttpError(409, 'That email already has an admin account'); throw err; }
      await audit(me.email, 'admin.create', { email: b.email, role: b.role });
      break;
    case 'admin.delete': {
      if (b.id === me.id) throw new HttpError(400, 'You cannot remove your own account');
      const left = (await q<{ n: number }>("SELECT count(*)::int n FROM admins WHERE role='SUPER_ADMIN' AND id<>$1", [b.id]))[0].n;
      if (!left) throw new HttpError(409, 'There must be at least one Super Admin');
      await q('DELETE FROM admins WHERE id=$1', [b.id]);
      await audit(me.email, 'admin.delete', { id: b.id });
      break;
    }
  }
  return json({ ok: true });
});
