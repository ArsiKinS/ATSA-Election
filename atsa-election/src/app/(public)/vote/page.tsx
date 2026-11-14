import VoteClient from '@/components/VoteClient';
import RemoteGate from '@/components/RemoteGate';
import Countdown from '@/components/Countdown';
import { Bi } from '@/components/Lang';
import { q } from '@/lib/db';
import { fmtMYT, getElection, statusOf } from '@/lib/election';
import { isKiosk } from '@/lib/kiosk';

export default async function VotePage() {
  const e = await getElection();
  if (!e) return <div className="note r">The election is not set up yet.</div>;
  const kiosk = await isKiosk(e), s = statusOf(e);
  if (s === 'upcoming') return <div className="ok"><h2 style={{ border: 0, padding: 0 }}><Bi en={`Voting opens ${fmtMYT(e.open_at)}`} th={`เปิดโหวต ${fmtMYT(e.open_at)}`} /></h2><Countdown target={e.open_at.toISOString()} /></div>;
  if (s !== 'open') return <div className="note r"><Bi en="Voting is closed." th="ปิดโหวตแล้ว" /></div>;
  const cands = await q<{ id: number; name: string; photo: string | null; bio: string; manifesto: string; for_president: boolean; for_board: boolean }>('SELECT id,name,photo,bio,manifesto,for_president,for_board FROM candidates ORDER BY sort,id');
  // Candidate numbers follow the order they were entered, separately for President and for the board.
  const presidents = cands.filter(c => c.for_president).map((c, i) => ({ ...c, no: i + 1 })), pool = cands.filter(c => c.for_board).map((c, i) => ({ ...c, no: i + 1 }));
  if (!presidents.length || !pool.length) return <div className="note"><Bi en="The ballot is not ready yet." th="บัตรเลือกตั้งยังไม่พร้อม" /></div>;
  const seats = Math.min(e.board_seats, pool.length);
  return kiosk ? <VoteClient presidents={presidents} pool={pool} seats={seats} /> : <RemoteGate presidents={presidents} pool={pool} seats={seats} />;
}
