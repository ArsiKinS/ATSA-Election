// Sequential counting: position by position; someone who won an earlier position is removed from later ones.
// A tie (or no votes) stops the sequence so the committee decides, instead of the software picking a winner.
export type Cand = { id: number; name: string; photo: string | null };
export type Pos = { id: number; name_en: string; name_th: string };
export type Row = Cand & { votes: number };
export type Round = { position: Pos; status: 'won' | 'tie' | 'noVotes' | 'pending'; winner?: number; tied?: number[]; rows: Row[]; valid: number };
export type Count = { position_id: number; candidate_id: number; n: number };

export function computeRounds(pos: Pos[], cands: Cand[], counts: Count[]): Round[] {
  const won = new Set<number>(); let stopped = false;
  return pos.map((p): Round => {
    if (stopped) return { position: p, status: 'pending', rows: [], valid: 0 };
    const rows = cands.filter(c => !won.has(c.id))
      .map(c => ({ ...c, votes: counts.find(x => x.position_id === p.id && x.candidate_id === c.id)?.n ?? 0 }))
      .sort((a, b) => b.votes - a.votes);
    const valid = rows.reduce((a, r) => a + r.votes, 0), top = rows[0];
    if (!top || top.votes === 0) { stopped = true; return { position: p, status: 'noVotes', rows, valid }; }
    const tied = rows.filter(r => r.votes === top.votes);
    if (tied.length > 1) { stopped = true; return { position: p, status: 'tie', rows, valid, tied: tied.map(t => t.id) }; }
    won.add(top.id);
    return { position: p, status: 'won', winner: top.id, rows, valid };
  });
}
