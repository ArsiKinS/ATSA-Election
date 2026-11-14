import CandidateGrid from '@/components/CandidateGrid';
import { Bi } from '@/components/Lang';
import { q } from '@/lib/db';
type Row = { id: number; name: string; photo: string | null; bio: string; manifesto: string; for_president: boolean; for_board: boolean };
export default async function Candidates() {
  const rows = await q<Row>('SELECT id,name,photo,bio,manifesto,for_president,for_board FROM candidates ORDER BY sort,id').catch(() => []);
  // Numbers follow the order the committee entered the candidates, separately for President and for the board.
  const presidents = rows.filter(c => c.for_president).map((c, i) => ({ ...c, no: i + 1 })), board = rows.filter(c => c.for_board).map((c, i) => ({ ...c, no: i + 1 }));
  if (!presidents.length && !board.length) return <><h2><Bi en="Candidates" th="ผู้สมัคร" /></h2><div className="note"><Bi en="Candidates will be announced soon." th="จะประกาศรายชื่อผู้สมัครเร็ว ๆ นี้" /></div></>;
  return <>
    {presidents.length > 0 && <><h2><Bi en="Candidates for President" th="ผู้สมัครประธาน" /></h2><CandidateGrid items={presidents} /></>}
    {board.length > 0 && <><h2 style={{ marginTop: 28 }}><Bi en="Candidates for the Board" th="ผู้สมัครสมาชิกบอร์ด" /></h2><CandidateGrid items={board} /></>}
  </>;
}
