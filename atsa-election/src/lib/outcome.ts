// Counting rules for the ATSA board election (pure function, easy to test).
// 1. President: the presidential candidate with the most votes. Ties are never broken by software.
// 2. If exactly two candidates ran for President, the other one becomes Assistant Secretary.
// 3. Board: each voter picked N candidates. The President and the Assistant Secretary are removed from this count.
//    The N candidates with the most votes join the board. A tie for the last seat is reported, not guessed.
export type Cand = { id: number; name: string; photo: string | null; for_president: boolean; for_board: boolean };
export type Count = { id: number; n: number };
export type Row = { id: number; name: string; photo: string | null; votes: number };
export type Outcome = {
  president: { status: 'won' | 'tie' | 'none'; winner?: number; tied?: number[]; rows: Row[] };
  assistant?: number;
  board: { status: 'complete' | 'tie' | 'short'; seats: number; members: number[]; tied: number[]; rows: Row[] };
};
const rows = (cs: Cand[], counts: Count[]): Row[] =>
  cs.map(c => ({ id: c.id, name: c.name, photo: c.photo, votes: counts.find(x => x.id === c.id)?.n ?? 0 })).sort((a, b) => b.votes - a.votes || a.id - b.id);

export function computeOutcome(cands: Cand[], presCounts: Count[], boardCounts: Count[], seats: number): Outcome {
  const pr = rows(cands.filter(c => c.for_president), presCounts), top = pr[0];
  const tiedP = top ? pr.filter(r => r.votes === top.votes) : [];
  const president: Outcome['president'] = !top || top.votes === 0 ? { status: 'none', rows: pr }
    : tiedP.length > 1 ? { status: 'tie', tied: tiedP.map(r => r.id), rows: pr } : { status: 'won', winner: top.id, rows: pr };
  const assistant = president.status === 'won' && pr.length === 2 ? pr.find(r => r.id !== president.winner)!.id : undefined;
  const br = rows(cands.filter(c => c.for_board && c.id !== president.winner && c.id !== assistant), boardCounts);
  let members: number[], tied: number[] = [], status: Outcome['board']['status'];
  if (br.length <= seats) { members = br.filter(r => r.votes > 0).map(r => r.id); status = members.length === seats ? 'complete' : 'short'; }
  else if (br[seats - 1].votes === 0) { members = br.filter(r => r.votes > 0).map(r => r.id); status = 'short'; } // fewer than N candidates received any vote
  else if (br[seats - 1].votes === br[seats].votes) {
    const v = br[seats].votes; members = br.filter(r => r.votes > v).map(r => r.id); tied = br.filter(r => r.votes === v).map(r => r.id); status = 'tie';
  } else { members = br.slice(0, seats).map(r => r.id); status = 'complete'; }
  return { president, assistant, board: { status, seats, members, tied, rows: br } };
}
