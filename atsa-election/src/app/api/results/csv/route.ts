import { getElection, resultsVisible } from '@/lib/election';
import { tally } from '@/lib/tally';

export async function GET() {
  const e = await getElection();
  if (!e || !resultsVisible(e)) return new Response('Results are not published yet', { status: 403 });
  const t = await tally();
  const esc = (s: string) => '"' + s.replaceAll('"', '""') + '"';
  const lines = ['position,candidate,votes,percent,winner'];
  for (const r of t.rounds) for (const c of r.rows)
    lines.push([esc(r.position.name_en), esc(c.name), c.votes, r.valid ? ((c.votes / r.valid) * 100).toFixed(1) : '0.0', r.winner === c.id ? 'yes' : ''].join(','));
  lines.push('', `total ballots,${t.ballots}`, `eligible voters,${t.eligible}`);
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="election-results.csv"', 'Cache-Control': 'no-store' } });
}
