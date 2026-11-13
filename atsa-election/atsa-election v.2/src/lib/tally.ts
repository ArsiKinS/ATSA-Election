import { q } from './db';
import { getElection } from './election';
import { computeOutcome, type Cand, type Count } from './outcome';
export async function tally() {
  const [e, cands, pres, board, b] = await Promise.all([
    getElection(),
    q<Cand>('SELECT id,name,photo,for_president,for_board FROM candidates ORDER BY sort,id'),
    q<Count>('SELECT president_id AS id,count(*)::int AS n FROM ballots WHERE president_id IS NOT NULL GROUP BY 1'),
    q<Count>('SELECT candidate_id AS id,count(*)::int AS n FROM ballot_board GROUP BY 1'),
    q<{ n: number }>('SELECT count(*)::int n FROM ballots WHERE president_id IS NOT NULL'),
  ]);
  return { ballots: b[0].n, cands, outcome: computeOutcome(cands, pres, board, e?.board_seats ?? 3) };
}
