// End-to-end check of the polling-station flow against a running server:
//   npm run build && npm start -- -p 3100   then   npm run e2e http://localhost:3100
import pg from 'pg';
const base = process.argv[2] ?? 'http://localhost:3100', H = { 'Content-Type': 'application/json', Origin: base };
let bad = 0;
const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) bad = 1; };
class Jar { c = new Map<string, string>();
  take(r: Response) { for (const s of r.headers.getSetCookie()) { const [kv] = s.split(';'), i = kv.indexOf('='), k = kv.slice(0, i), v = kv.slice(i + 1); if (!v || /max-age=0|expires=Thu, 01 Jan 1970/i.test(s)) this.c.delete(k); else this.c.set(k, v); } }
  get h() { return [...this.c].map(([k, v]) => `${k}=${v}`).join('; '); } }
const call = async (jar: Jar, path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST') => {
  const r = await fetch(base + path, { method, headers: { ...H, cookie: jar.h }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' }); jar.take(r); return r; };

const admin = new Jar(), kiosk = new Jar(), anon = new Jar();
// 1. A computer that was not activated cannot vote
ok((await (await call(anon, '/vote')).text()).includes('polling station'), 'an ordinary visitor sees "voting takes place at the polling station"');
ok((await call(anon, '/api/vote/submit', { president: 1, board: [3, 4, 5] })).status === 403, 'an ordinary visitor cannot submit a ballot');
ok((await call(anon, '/api/admin')).status === 401, 'admin API needs a login');
// 2. Admin signs in, sets a limit of 3 ballots, opens the kiosk
ok((await call(admin, '/api/admin/login', { email: 'admin@example.com', password: 'correct-horse-battery' })).ok, 'admin signs in');
const st = await (await call(admin, '/api/admin')).json();
const e = st.election, save = { action: 'election.save', ...Object.fromEntries(Object.entries(e).filter(([k]) => !['verified_at', 'published_at'].includes(k))), max_ballots: 4 };
ok((await call(admin, '/api/admin', save)).ok, 'admin sets the ballot limit to 4');
const gen = await call(admin, '/api/admin', { action: 'remote.generate', count: 2 }), codes: string[] = (await gen.json()).codes ?? [];
ok(gen.ok && codes.length === 2 && /^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(codes[0]), 'admin creates 2 one-time online codes');
const ko = await call(admin, '/api/admin', { action: 'kiosk.open' }); kiosk.c.set('atsa_kiosk', ko.headers.getSetCookie().find(s => s.startsWith('atsa_kiosk='))!.split(';')[0].split('=')[1]);
ok(ko.ok && kiosk.c.has('atsa_kiosk'), 'admin turns a computer into the polling station kiosk');
ok(!admin.c.has('atsa_admin'), 'opening the kiosk signs the admin out of that computer');
ok((await call(admin, '/api/admin')).status === 401, '...so voters on that computer cannot reach admin');
ok((await (await call(kiosk, '/vote')).text()).includes('Start voting'), 'the kiosk shows the ballot');
// 3. Ballot rules
const bad1 = (b: unknown) => call(kiosk, '/api/vote/submit', b).then(r => r.status);
ok(await bad1({ president: 3, board: [4, 5, 6] }) === 400, 'President must be a presidential candidate');
ok(await bad1({ president: 1, board: [3, 4] }) === 400, 'board must have exactly 3 members');
ok(await bad1({ president: 1, board: [3, 3, 4] }) === 400, 'board members must be different');
ok(await bad1({ president: 1, board: [1, 3, 4] }) === 400, 'the chosen President cannot also be a board member');
ok((await call(kiosk, '/api/vote/submit', { president: 1, board: [3, 4, 5] })).ok, 'ballot 1 accepted');
ok((await call(kiosk, '/api/vote/submit', { president: 2, board: [3, 4, 6] })).ok, 'ballot 2 accepted');
ok((await call(kiosk, '/api/vote/submit', { president: 2, board: [3, 4, 5] })).ok, 'ballot 3 accepted');
ok((await call(anon, '/api/vote/code', { code: 'ZZZZZ-ZZZZZ' })).status === 403, 'a wrong online code is rejected');
ok((await call(anon, '/api/vote/code', { code: codes[0].toLowerCase().replace('-', ' ') })).ok, 'a valid code is accepted (any capitals, spaces or dash)');
ok((await call(anon, '/api/vote/submit', { president: 1, board: [1, 3, 4], code: codes[0] })).status === 400, 'online ballots follow the same rules as the kiosk');
ok((await call(anon, '/api/vote/submit', { president: 2, board: [3, 5, 6], code: codes[0] })).ok, 'online ballot 4 accepted with a code');
ok((await call(anon, '/api/vote/submit', { president: 2, board: [3, 5, 6], code: codes[0] })).status === 403, 'the same online code cannot be used twice');
ok(await bad1({ president: 2, board: [3, 4, 5] }) === 409, 'the 5th ballot is refused: the limit is shared by kiosk and online');
ok((await call(anon, '/api/vote/submit', { president: 2, board: [3, 5, 6], code: codes[1] })).status === 409, 'an online ballot refused by the limit...');
ok((await call(anon, '/api/vote/code', { code: codes[1] })).ok, '...does not use up the code');
ok((await fetch(base + '/api/vote/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', cookie: kiosk.h }, body: '{}' })).status === 403, 'a POST without a matching Origin is rejected (CSRF)');
// 4. Retired routes and hidden results
for (const p of ['/api/auth/request', '/api/vote/credential', '/api/results/csv']) ok((await call(anon, p, p === '/api/results/csv' ? undefined : {})).status === 410, `${p} is retired (410)`);
ok((await (await call(anon, '/results')).text()).includes('announced soon'), 'public results are hidden before publication');
const cp = await (await call(anon, '/candidates')).text();
ok(cp.includes('Candidates for President') && cp.includes('Candidates for the Board') && (cp.match(/class="chip">No\./g) ?? []).length === 9, 'candidates are shown in two sections (President, Board), each numbered in entry order');
// 5. Anonymity in the database
const db = new pg.Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
const cr = (await db.query("SELECT column_name n, data_type t FROM information_schema.columns WHERE table_name IN ('ballots','ballot_board')")).rows;
const rc = (await db.query("SELECT column_name n FROM information_schema.columns WHERE table_name='remote_codes'")).rows.map(r => r.n).sort().join();
ok(rc === 'code_hash,used', `online codes table holds only a hash and a used flag (${rc})`);
ok(cr.every(c => ['uuid', 'text', 'integer'].includes(c.t)) && !cr.some(c => /time|created|updated|^ip|email|voter|user|device/i.test(c.n)), `ballot tables hold no identity or time columns (${cr.map(c => c.n + ':' + c.t).join(' ')})`);
// 6. Close voting, admin sees full numbers, verify, publish
const st2 = await (await call((await call(admin, '/api/admin/login', { email: 'admin@example.com', password: 'correct-horse-battery' }), admin), '/api/admin')).json();
ok(st2.results === undefined, 'admin cannot see numbers while voting is open');
ok(st2.remote?.issued === 2 && st2.remote?.used === 1, 'admin sees only totals: 2 codes issued, 1 used');
ok((await call(admin, '/api/admin', { action: 'remote.cancel' })).ok && (await call(anon, '/api/vote/code', { code: codes[1] })).status === 403, 'cancelling unused codes invalidates them');
const kl = await call(admin, '/api/admin', { action: 'kiosk.links', count: 2 }), links: string[] = (await kl.json()).codes ?? [];
ok(kl.ok && links.length === 2, 'admin creates 2 one-time kiosk links (no admin login needed on the voting computers)');
const k2 = new Jar();
ok((await call(k2, '/api/kiosk/activate', { code: 'ZZZZZ-ZZZZZ' })).status === 403, 'a wrong kiosk link is rejected');
ok((await call(k2, '/api/kiosk/activate', { code: links[0] })).ok && k2.c.has('atsa_kiosk'), 'a kiosk link turns a computer into a polling-station computer');
ok((await call(new Jar(), '/api/kiosk/activate', { code: links[0] })).status === 403, 'the same kiosk link cannot be used on a second computer');
ok((await (await call(k2, '/vote')).text()).includes('Start voting'), 'that computer shows the ballot');
ok((await call(k2, '/api/vote/submit', { president: 2, board: [3, 4, 5] })).status === 409, 'it is accepted as a kiosk (refused only because the ballot limit is reached)');
ok((await call(admin, '/api/admin', { action: 'kiosk.revoke_all' })).ok, 'admin deactivates all polling-station computers');
ok((await call(k2, '/api/vote/submit', { president: 2, board: [3, 4, 5] })).status === 403 && (await call(kiosk, '/api/vote/submit', { president: 2, board: [3, 4, 5] })).status === 403, '...and none of them can vote any more');
const past = (m: number) => new Date(Date.now() - m * 60000).toISOString().replace(/\.\d+Z$/, '+00:00');
ok((await call(admin, '/api/admin', { ...save, open_at: past(180), close_at: past(1), results_at: new Date(Date.now() + 3600000).toISOString().replace(/\.\d+Z$/, '+00:00') })).ok, 'voting closes (schedule moved)');
const r = (await (await call(admin, '/api/admin')).json()).results;
ok(r?.ballots === 4 && r.outcome.president.winner === 2 && r.outcome.assistant === 1 && r.outcome.board.members.join() === '3,4,5' && r.outcome.board.status === 'complete', 'admin sees correct counts: President 2, Assistant Secretary 1, board 3,4,5');
ok((await (await call(admin, '/api/admin/csv')).text()).includes('President,"Candidate 2",3,75.0'), 'admin CSV has counts and percentages');
ok((await call(anon, '/api/admin/csv')).status === 401, 'CSV is closed to the public');
ok((await call(admin, '/api/admin', { action: 'results.publish' })).status === 409, 'cannot publish before verifying');
ok((await call(admin, '/api/admin', { action: 'results.verify' })).ok, 'results verified');
ok((await call(admin, '/api/admin', { action: 'results.publish' })).ok, 'results published');
const pub = await (await call(anon, '/results')).text();
ok(['Candidate 2', 'Candidate 1', 'Candidate 3', 'Candidate 4', 'Candidate 5'].every(n => pub.includes(n)) && !pub.includes('Candidate 6'), 'public sees President, Assistant Secretary and the 3 board members only');
ok(!/%|votes<|>\d+<\/b><small/.test(pub), 'public results show no numbers or percentages');
ok(pub.includes('Present on big screen') && pub.includes('To be announced'), 'results page has the big-screen button and a "?" card for the seat the committee decides');
const audit = (await (await call(admin, '/api/admin')).json()).audit;
ok(audit.chainOk === true, 'audit log chain is intact');
await db.end(); process.exit(bad);
