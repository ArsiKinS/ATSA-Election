import { requireAdmin } from '@/lib/admin';
import { getElection } from '@/lib/election';
import { handler, HttpError } from '@/lib/http';
import { tally } from '@/lib/tally';

// Full numbers are for admins only (Super Admin, Results Manager). Never public.
export const GET = handler(async () => {
  await requireAdmin('results:view');
  const e = await getElection();
  if (!e) throw new HttpError(404, 'No election found');
  const t = await tally(), pct = (v: number) => (t.ballots ? ((v / t.ballots) * 100).toFixed(1) : '0.0');
  const esc = (s: string) => '"' + s.replaceAll('"', '""') + '"';
  const L = ['contest,candidate,votes,percent_of_ballots'];
  for (const r of t.outcome.president.rows) L.push(['President', esc(r.name), r.votes, pct(r.votes)].join(','));
  for (const r of t.outcome.board.rows) L.push(['Board', esc(r.name), r.votes, pct(r.votes)].join(','));
  L.push('', `total ballots,${t.ballots}`);
  return new Response(L.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="election-results-admin.csv"', 'Cache-Control': 'no-store' } });
});
