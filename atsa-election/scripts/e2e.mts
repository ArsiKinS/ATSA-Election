// End-to-end check against a running server: tsx --env-file=.env.local scripts/e2e.ts http://localhost:3100 /tmp/server.log
import { readFileSync } from 'node:fs';
import { blind, unblind, big } from '../src/lib/blind';
const [base, log] = [process.argv[2], process.argv[3]];
const H = { 'Content-Type': 'application/json', Origin: base };
const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const j = (r: Response) => r.json().catch(() => ({}));
const pub = async () => { const { pubKey } = await import('../src/lib/signer'); return pubKey(); };

async function voter(email: string, picks: (ids: number[]) => number[]) {
  await fetch(base + '/api/auth/request', { method: 'POST', headers: H, body: JSON.stringify({ email }) });
  await new Promise(r => setTimeout(r, 400));
  const token = [...readFileSync(log, 'utf8').matchAll(new RegExp(`to=${email}[\\s\\S]*?token=([0-9a-f]{64})`, 'g'))].pop()![1];
  const v = await fetch(base + '/api/auth/verify', { method: 'POST', headers: H, body: JSON.stringify({ token }) });
  const cookie = (v.headers.get('set-cookie') ?? '').split(';')[0];
  const again = await fetch(base + '/api/auth/verify', { method: 'POST', headers: H, body: JSON.stringify({ token }) });
  ok(v.ok && again.status === 400, `${email}: sign-in link works once, second use rejected`);
  const k = await pub(), b = await blind(k.nBig, k.eBig);
  const c = await fetch(base + '/api/vote/credential', { method: 'POST', headers: { ...H, cookie }, body: JSON.stringify({ blinded: b.blinded }) });
  const sig = await unblind((await j(c)).sig, b, k.nBig, k.eBig);
  const b2 = await blind(k.nBig, k.eBig);
  const c2 = await fetch(base + '/api/vote/credential', { method: 'POST', headers: { ...H, cookie }, body: JSON.stringify({ blinded: b2.blinded }) });
  ok(c2.status === 409, `${email}: a second, different credential is refused`);
  return { token: b.token, sig };
}
const submit = (t: { token: string; sig: string }, choices: number[]) => fetch(base + '/api/vote/submit', { method: 'POST', headers: H, body: JSON.stringify({ ...t, choices }) });

const ids = [1, 2, 3, 4, 5, 6, 7, 8];
const t1 = await voter('voter1@example.com', x => x);
const t2 = await voter('voter2@example.com', x => x);
const t3 = await voter('voter3@example.com', x => x);
ok((await submit(t1, ids)).ok, 'ballot 1 accepted');
ok((await submit(t1, ids)).status === 409, 'the same credential cannot vote twice');
ok((await submit({ ...t2, sig: t1.sig }, ids)).status === 400, 'a signature for another token is rejected');
ok((await submit(t2, [1, 1, 3, 4, 5, 6, 7, 8])).status === 400, 'the same candidate twice on one ballot is rejected');
ok((await submit(t2, [2, 1, 3, 4, 5, 6, 7, 8])).ok, 'ballot 2 accepted');
ok((await submit(t3, [2, 1, 3, 4, 5, 6, 8, 7])).ok, 'ballot 3 accepted');
ok((await fetch(base + '/api/vote/submit', { method: 'POST', body: JSON.stringify({ ...t3, choices: ids }) })).status === 403, 'a POST without a matching Origin is rejected (CSRF)');
ok((await fetch(base + '/results')).status === 200 && !(await (await fetch(base + '/results')).text()).includes('Candidate 1'), 'results page shows no candidates before publication');
ok((await fetch(base + '/api/results/csv')).status === 403, 'results CSV is closed before publication');
ok((await fetch(base + '/api/admin')).status === 401, 'admin API requires login');
ok(big('0') === 0n, 'sanity');
