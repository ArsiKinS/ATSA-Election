import ResultsStage from '@/components/ResultsStage';
import { Bi } from '@/components/Lang';
import { fmtMYT, getElection, resultsVisible } from '@/lib/election';
import { tally } from '@/lib/tally';

// Public results show WHO won, never numbers or percentages (those are in the admin area).
export default async function Results() {
  const e = await getElection();
  if (!e) return <div className="note r">The election is not set up yet.</div>;
  if (!resultsVisible(e)) return <div className="ok"><h2 style={{ border: 0, padding: 0 }}><Bi en="The official results will be announced soon." th="ผลการเลือกตั้งอย่างเป็นทางการจะประกาศเร็ว ๆ นี้" /></h2>
    <p style={{ color: 'var(--muted)' }}><Bi en={`Announcement: ${fmtMYT(e.results_at)}`} th={`ประกาศผล: ${fmtMYT(e.results_at)}`} /></p></div>;
  const { cands, outcome: o } = await tally(), by = (id: number) => cands.find(c => c.id === id)!;
  const person = (id: number) => { const c = by(id); return { id: c.id, name: c.name, photo: c.photo }; };
  const president = o.president.status === 'won' ? person(o.president.winner!) : null, assistant = o.assistant ? person(o.assistant) : null, board = o.board.members.map(person);
  const pendingSeats = Math.max(0, o.board.seats - board.length); // seats still undecided because of a tie or too few votes
  let n = 0;
  const Person = ({ id, role, first }: { id: number; role: React.ReactNode; first?: boolean }) => { const c = by(id); return <div className={`rk${first ? ' first' : ''}`} style={{ animationDelay: `${(n++) * 0.15}s` }}>
    <span className="ph sm">{c.photo ? <img src={c.photo} alt="" /> : c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span><div className="g"><b>{c.name}</b><small>{role}</small></div></div>; };
  const Pending = ({ name, role }: { name: React.ReactNode; role: React.ReactNode }) => <div className="rk pend" style={{ animationDelay: `${(n++) * 0.15}s` }}><span className="ph sm q">?</span><div className="g"><b>{name}</b><small>{role}</small></div></div>;
  return <>
    <h2><Bi en="Results" th="ผลการเลือกตั้ง" /></h2>
    <ResultsStage titleEn={`${e.club_short} ${e.title} ${e.year}`} titleTh={`${e.title_th} ${e.club_short} ${e.year}`} president={president} assistant={assistant} board={board} pendingSeats={pendingSeats} />
    <h2><Bi en="President" th="ประธาน" /></h2>
    {president ? <Person id={president.id} first role={<Bi en="President" th="ประธาน" />} /> : <Pending name={<Bi en="To be announced" th="จะประกาศภายหลัง" />} role={<Bi en="Tie or no valid votes: the committee will decide." th="คะแนนเท่ากันหรือไม่มีคะแนน คณะกรรมการจะตัดสิน" />} />}
    {assistant && <><h2><Bi en="Assistant Secretary" th="ผู้ช่วยเลขานุการ" /></h2><Person id={assistant.id} role={<Bi en="Assistant Secretary" th="ผู้ช่วยเลขานุการ" />} /></>}
    <h2><Bi en="Board members" th="สมาชิกบอร์ด" /></h2>
    {board.map(b => <Person key={b.id} id={b.id} role={<Bi en="Board member" th="สมาชิกบอร์ด" />} />)}
    {Array.from({ length: pendingSeats }, (_, i) => <Pending key={'t' + i} name={<Bi en="To be announced" th="จะประกาศภายหลัง" />} role={<Bi en="Tie for this seat: the committee will decide." th="คะแนนเท่ากันในที่นั่งนี้ คณะกรรมการจะตัดสิน" />} />)}
    <Pending name={<Bi en="To be announced" th="จะประกาศภายหลัง" />} role={<Bi en="Assistant Secretary · the committee will decide" th="ผู้ช่วยเลขานุการ · คณะกรรมการจะตัดสิน" />} />
  </>;
}
