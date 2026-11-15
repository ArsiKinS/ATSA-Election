import ResultsStage from '@/components/ResultsStage';
import { Bi } from '@/components/Lang';
import { fmtMYT, getElection, resultsVisible } from '@/lib/election';
import { tally } from '@/lib/tally';

// Public results show only WHO won: the President and the board members. No numbers, no percentages (those are in the admin area).
export default async function Results() {
  const e = await getElection();
  if (!e) return <div className="note r">The election is not set up yet.</div>;
  if (!resultsVisible(e)) return <div className="ok"><h2 style={{ border: 0, padding: 0 }}><Bi en="The official results will be announced soon." th="ผลการเลือกตั้งอย่างเป็นทางการจะประกาศเร็ว ๆ นี้" /></h2>
    <p style={{ color: 'var(--muted)' }}><Bi en={`Announcement: ${fmtMYT(e.results_at)}`} th={`ประกาศผล: ${fmtMYT(e.results_at)}`} /></p></div>;
  const { cands, outcome: o } = await tally(), by = (id: number) => cands.find(c => c.id === id)!;
  const person = (id: number) => { const c = by(id); return { id: c.id, name: c.name, photo: c.photo }; };
  const president = o.president.status === 'won' ? person(o.president.winner!) : null, board = o.board.members.map(person);
  const pendingSeats = Math.max(0, o.board.seats - board.length); // seats still undecided because of a tie or too few votes
  let n = 0;
  const Person = ({ p, role, first }: { p: { id: number; name: string; photo: string | null }; role: React.ReactNode; first?: boolean }) =>
    <div className={`rk${first ? ' first' : ''}`} style={{ animationDelay: `${(n++) * 0.15}s` }}>
      <span className="ph sm">{p.photo ? <img src={p.photo} alt="" /> : p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span><div className="g"><b>{p.name}</b><small>{role}</small></div></div>;
  return <>
    <div className="congrats"><h1><Bi en="Congratulations!" th="ขอแสดงความยินดี!" /></h1><p><Bi en={`${e.club_short} ${e.title} ${e.year}`} th={`${e.title_th} ${e.club_short} ${e.year}`} /></p></div>
    <ResultsStage titleEn={`${e.club_short} ${e.title} ${e.year}`} titleTh={`${e.title_th} ${e.club_short} ${e.year}`} president={president} board={board} />
    <h2><Bi en="President" th="ประธาน" /></h2>
    {president ? <Person p={president} first role={<Bi en="President" th="ประธาน" />} /> : <div className="note"><Bi en="The President will be announced by the committee." th="คณะกรรมการจะประกาศประธานภายหลัง" /></div>}
    <h2><Bi en="Board members" th="สมาชิกบอร์ด" /></h2>
    {board.map(b => <Person key={b.id} p={b} role={<Bi en="Board member" th="สมาชิกบอร์ด" />} />)}
    <div className="rk pend" style={{ animationDelay: `${(n++) * 0.15}s` }}><span className="ph sm q">?</span><div className="g"><b><Bi en="To be announced" th="จะประกาศภายหลัง" /></b><small><Bi en="Assistant Secretary · the committee will decide" th="ผู้ช่วยเลขานุการ · คณะกรรมการจะตัดสิน" /></small></div></div>
    {pendingSeats > 0 && <div className="note"><Bi en={`${pendingSeats} board seat(s) will be decided by the committee.`} th={`ที่นั่งบอร์ด ${pendingSeats} ที่นั่ง คณะกรรมการจะเป็นผู้ตัดสิน`} /></div>}
  </>;
}
