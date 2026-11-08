import { Bi } from '@/components/Lang';
import { fmtMYT, getElection, resultsVisible } from '@/lib/election';
import { tally } from '@/lib/tally';

export default async function Results() {
  const e = await getElection();
  if (!e) return <div className="note r">The election is not set up yet.</div>;
  // Nothing is queried or sent to the browser unless results are published.
  if (!resultsVisible(e)) return <div className="ok"><h2 style={{ border: 0, padding: 0 }}><Bi en="The official results will be announced soon." th="ผลการเลือกตั้งอย่างเป็นทางการจะประกาศเร็ว ๆ นี้" /></h2>
    <p style={{ color: 'var(--muted)' }}><Bi en={`Announcement: ${fmtMYT(e.results_at)}`} th={`ประกาศผล: ${fmtMYT(e.results_at)}`} /></p></div>;
  const t = await tally(), pct = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(1) : '0.0');
  return <>
    <h2><Bi en="Results" th="ผลการเลือกตั้ง" /></h2>
    <div className="stats"><div><b>{t.ballots}</b><small><Bi en="Ballots cast" th="บัตรที่ส่งแล้ว" /></small></div><div><b>{pct(t.ballots, t.eligible)}%</b><small><Bi en="Turnout" th="ผู้มาใช้สิทธิ์" /></small></div></div>
    {t.rounds.map(r => <section key={r.position.id}>
      <h2><Bi en={r.position.name_en} th={r.position.name_th || r.position.name_en} /></h2>
      {r.status === 'tie' && <div className="note r"><Bi en="Tie: the committee will decide before the next positions are counted." th="คะแนนเท่ากัน คณะกรรมการจะตัดสินก่อนนับตำแหน่งถัดไป" /></div>}
      {r.status === 'noVotes' && <div className="note r"><Bi en="No valid votes for this position." th="ไม่มีคะแนนที่ใช้ได้สำหรับตำแหน่งนี้" /></div>}
      {r.status === 'pending' ? <div className="note"><Bi en="Waiting for the previous position to be settled." th="รอการตัดสินตำแหน่งก่อนหน้า" /></div> :
        r.rows.map(c => <div key={c.id} className={`rk${r.winner === c.id ? ' first' : ''}`}>
          <span className="ph sm">{c.photo ? <img src={c.photo} alt="" /> : c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
          <div className="g"><b>{c.name}{r.winner === c.id ? ' ★' : ''}</b><div className="trk"><i style={{ width: `${r.rows[0].votes ? (c.votes / r.rows[0].votes) * 100 : 0}%`, background: r.winner === c.id ? 'var(--red)' : 'var(--navy)' }} /></div></div>
          <div className="v"><b>{c.votes}</b><small>{pct(c.votes, r.valid)}%</small></div></div>)}
    </section>)}
    <div className="bar"><a className="btn alt" href="/api/results/csv" download><Bi en="Download CSV" th="ดาวน์โหลด CSV" /></a></div>
  </>;
}
