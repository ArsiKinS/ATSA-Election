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
  const Person = ({ id, role, first }: { id: number; role: React.ReactNode; first?: boolean }) => { const c = by(id); return <div className={`rk${first ? ' first' : ''}`}>
    <span className="ph sm">{c.photo ? <img src={c.photo} alt="" /> : c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span><div className="g"><b>{c.name}</b><small>{role}</small></div></div>; };
  return <>
    <h2><Bi en="President" th="ประธาน" /></h2>
    {o.president.status === 'won' && <Person id={o.president.winner!} first role={<Bi en="President" th="ประธาน" />} />}
    {o.president.status === 'tie' && <div className="note r"><Bi en="Tie: the committee will decide." th="คะแนนเท่ากัน คณะกรรมการจะตัดสิน" /></div>}
    {o.president.status === 'none' && <div className="note r"><Bi en="No valid votes." th="ไม่มีคะแนนที่ใช้ได้" /></div>}
    {o.assistant && <><h2><Bi en="Assistant Secretary" th="ผู้ช่วยเลขานุการ" /></h2><Person id={o.assistant} role={<Bi en="Assistant Secretary" th="ผู้ช่วยเลขานุการ" />} /></>}
    <h2><Bi en="Board members" th="สมาชิกบอร์ด" /></h2>
    {o.board.members.map(id => <Person key={id} id={id} role={<Bi en="Board member" th="สมาชิกบอร์ด" />} />)}
    {o.board.status === 'tie' && <div className="note r"><Bi en="Tie for the last board seat: the committee will decide." th="คะแนนเท่ากันในที่นั่งบอร์ดสุดท้าย คณะกรรมการจะตัดสิน" /></div>}
    {o.board.status === 'short' && <div className="note r"><Bi en="Not enough valid votes to fill every board seat." th="คะแนนที่ใช้ได้ไม่พอสำหรับที่นั่งบอร์ดทุกที่" /></div>}
  </>;
}
