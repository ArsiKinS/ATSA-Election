import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { pool, q } from '@/lib/db';
import { PERMS, requireAdmin } from '@/lib/admin';
import { audit, chain } from '@/lib/audit';
import { getElection, statusOf, type Election } from '@/lib/election';
import { handler, HttpError, json } from '@/lib/http';
import { clearSession } from '@/lib/session';
import QRCode from 'qrcode';

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const img = z.string().regex(/^data:image\/(png|jpeg|webp);base64,/).max(400_000).nullable();
const dt = z.string().datetime({ offset: true }).refine(s => !isNaN(Date.parse(s)));
const A = z.discriminatedUnion('action', [
  z.object({ action: z.literal('election.save'), club_name: z.string().min(1).max(120), club_short: z.string().min(1).max(20), title: z.string().max(120), title_th: z.string().max(120), year: z.number().int().min(2000).max(2100), description: z.string().max(2000), announcement: z.string().max(1000), color_primary: hex, color_secondary: hex, color_accent: hex, logo_data: img, open_at: dt, close_at: dt, results_at: dt, auto_publish: z.boolean() }),
  z.object({ action: z.literal('positions.set'), positions: z.array(z.object({ name_en: z.string().trim().min(1).max(60), name_th: z.string().trim().max(60) })).min(1).max(20) }),
  z.object({ action: z.literal('candidate.save'), id: z.number().int().optional(), name: z.string().trim().min(1).max(100), bio: z.string().max(1500), manifesto: z.string().max(3000), photo: img }),
  z.object({ action: z.literal('candidate.delete'), id: z.number().int() }),
  z.object({ action: z.literal('voters.import'), emails: z.array(z.string()).max(5000) }),
  z.object({ action: z.literal('voters.remove'), email: z.string().trim().toLowerCase().max(200) }),
  z.object({ action: z.literal('results.verify') }),
  z.object({ action: z.literal('results.publish') }),
  z.object({ action: z.literal('admin.create'), email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(10).max(100), role: z.enum(['SUPER_ADMIN', 'COMMITTEE', 'RESULTS_MANAGER']) }),
  z.object({ action: z.literal('admin.delete'), id: z.number().int() }),
  z.object({ action: z.literal('logout') }),
]);
const NEED: Record<string, string> = {
  'election.save': 'election:edit', 'positions.set': 'candidates:edit', 'candidate.save': 'candidates:edit', 'candidate.delete': 'candidates:edit',
  'voters.import': 'voters:edit', 'voters.remove': 'voters:edit', 'results.verify': 'results:publish', 'results.publish': 'results:publish',
  'admin.create': 'admins:manage', 'admin.delete': 'admins:manage',
};
const notStarted = (e: Election) => { if (new Date() >= e.open_at) throw new HttpError(409, 'Voting has started. This can no longer be changed.'); };
const counts = async () => (await q<{ eligible: number; issued: number; ballots: number }>(
  'SELECT (SELECT count(*)::int FROM voters) eligible,(SELECT count(*)::int FROM voters WHERE blinded_msg IS NOT NULL) issued,(SELECT count(*)::int FROM ballots) ballots'))[0];

export const GET = handler(async () => {
  const me = await requireAdmin('stats:view'), perms = PERMS[me.role];
  const [e, stats, positions, candidates, admins, all, qr] = await Promise.all([
    getElection(),
    counts(),
    q('SELECT id,name_en,name_th FROM positions ORDER BY sort,id'),
    q('SELECT id,name,bio,manifesto,photo FROM candidates ORDER BY sort,id'),
    perms.includes('admins:manage') ? q('SELECT id,email,role FROM admins ORDER BY id') : Promise.resolve(undefined),
    perms.includes('audit:view') ? q<{ id: number; at: Date; actor: string; action: string; details: string; prev_hash: string; hash: string }>('SELECT * FROM audit_log ORDER BY id') : Promise.resolve(undefined),
    process.env.APP_URL ? QRCode.toString(process.env.APP_URL + '/vote', { type: 'svg', margin: 1 }) : Promise.resolve(undefined),
  ]);
  if (!e) throw new HttpError(404, 'No election found. Run the first-time setup.');
  const out: Record<string, unknown> = { me: { email: me.email, role: me.role, perms }, election: e, status: statusOf(e), stats, positions, candidates };
  if (qr) out.qr = qr;
  if (admins) out.admins = admins;
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
      await q(`UPDATE election SET club_name=$1,club_short=$2,title=$3,title_th=$4,year=$5,description=$6,announcement=$7,color_primary=$8,color_secondary=$9,color_accent=$10,logo_data=$11,open_at=$12,close_at=$13,results_at=$14,auto_publish=$15 WHERE id=1`,
        [f.club_name, f.club_short, f.title, f.title_th, f.year, f.description, f.announcement, f.color_primary, f.color_secondary, f.color_accent, f.logo_data, f.open_at, f.close_at, f.results_at, f.auto_publish]);
      await audit(me.email, 'election.save', { open_at: f.open_at, close_at: f.close_at, results_at: f.results_at, auto_publish: f.auto_publish });
      break;
    }
    case 'positions.set': {
      notStarted(e);
      const c = await pool.connect();
      try {
        await c.query('BEGIN'); await c.query('DELETE FROM positions');
        for (const [i, p] of b.positions.entries()) await c.query('INSERT INTO positions(sort,name_en,name_th) VALUES($1,$2,$3)', [i, p.name_en, p.name_th]);
        await c.query('COMMIT');
      } catch (err) { await c.query('ROLLBACK').catch(() => {}); throw err; } finally { c.release(); }
      await audit(me.email, 'positions.set', { count: b.positions.length });
      break;
    }
    case 'candidate.save':
      notStarted(e);
      if (b.id) await q('UPDATE candidates SET name=$2,bio=$3,manifesto=$4,photo=$5 WHERE id=$1', [b.id, b.name, b.bio, b.manifesto, b.photo]);
      else await q('INSERT INTO candidates(sort,name,bio,manifesto,photo) VALUES((SELECT coalesce(max(sort),0)+1 FROM candidates),$1,$2,$3,$4)', [b.name, b.bio, b.manifesto, b.photo]);
      await audit(me.email, 'candidate.save', { name: b.name });
      break;
    case 'candidate.delete':
      notStarted(e);
      await q('DELETE FROM candidates WHERE id=$1', [b.id]);
      await audit(me.email, 'candidate.delete', { id: b.id });
      break;
    case 'voters.import': {
      notStarted(e);
      const ok = [...new Set(b.emails.map(x => x.trim().toLowerCase()).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x) && x.length <= 200))];
      const added = ok.length ? (await q('INSERT INTO voters(email) SELECT unnest($1::text[]) ON CONFLICT DO NOTHING RETURNING id', [ok])).length : 0;
      await audit(me.email, 'voters.import', { submitted: b.emails.length, valid: ok.length, added });
      return json({ ok: true, added, rejected: b.emails.length - ok.length });
    }
    case 'voters.remove':
      notStarted(e);
      await q('DELETE FROM voters WHERE email=$1', [b.email]);
      await audit(me.email, 'voters.remove');
      break;
    case 'results.verify': {
      if (statusOf(e) !== 'closed') throw new HttpError(409, 'Results can only be verified after voting has closed');
      const c = await counts();
      if (c.ballots > c.issued) throw new HttpError(409, `Integrity check failed: ${c.ballots} ballots but only ${c.issued} credentials issued`);
      await q('UPDATE election SET verified_at=now() WHERE id=1');
      await audit(me.email, 'results.verify', c);
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
