import { q } from './db';
import { computeRounds, type Cand, type Count, type Pos } from './rounds';
export async function tally() {
  const [pos, cands, counts, st] = await Promise.all([
    q<Pos>('SELECT id,name_en,name_th FROM positions ORDER BY sort,id'),
    q<Cand>('SELECT id,name,photo FROM candidates ORDER BY sort,id'),
    q<Count>('SELECT position_id,candidate_id,count(*)::int AS n FROM ballot_choices GROUP BY 1,2'),
    q<{ ballots: number; eligible: number }>('SELECT (SELECT count(*)::int FROM ballots) ballots,(SELECT count(*)::int FROM voters) eligible'),
  ]);
  return { ...st[0], rounds: computeRounds(pos, cands, counts) };
}
