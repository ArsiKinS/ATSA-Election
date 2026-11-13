import Link from 'next/link';
import BallotBox from '@/components/BallotBox';
import Countdown from '@/components/Countdown';
import { Bi } from '@/components/Lang';
import { getElection, statusOf } from '@/lib/election';

export default async function Home() {
  const e = await getElection();
  if (!e) return <div className="note r">The election is not set up yet.</div>;
  const s = statusOf(e);
  const badge = { upcoming: ['Upcoming', 'ยังไม่เปิด'], open: ['Voting open', 'เปิดโหวต'], closed: ['Voting closed', 'ปิดโหวตแล้ว'], results: ['Results published', 'ประกาศผลแล้ว'] }[s];
  const next = { upcoming: [e.open_at, 'Voting opens in', 'เปิดโหวตใน'], open: [e.close_at, 'Voting closes in', 'ปิดโหวตใน'], closed: [e.results_at, 'Results announced in', 'ประกาศผลใน'], results: null }[s] as [Date, string, string] | null;
  return <div className="hero">
    <BallotBox mode="loop" />
    <h1><Bi en={`${e.club_short} ${e.title} ${e.year}`} th={`${e.title_th} ${e.club_short} ${e.year}`} /></h1>
    <span className={`badge ${s === 'open' ? 'open' : s === 'closed' ? 'closed' : ''}`}><Bi en={badge[0]} th={badge[1]} /></span>
    {next && <><Countdown target={next[0].toISOString()} /><p style={{ color: 'var(--muted)', marginBottom: 14 }}><Bi en={next[1]} th={next[2]} /></p></>}
    <div style={{ marginTop: 14 }}>
      <Link className="btn" href="/vote"><Bi en="Vote now" th="โหวตเลย" /></Link>
      <Link className="btn alt" href="/candidates"><Bi en="View candidates" th="ดูผู้สมัคร" /></Link>
    </div>
    {e.description && <p style={{ margin: '18px auto 0', maxWidth: 560, color: 'var(--muted)' }}>{e.description}</p>}
    {e.announcement && <div className="note" style={{ textAlign: 'left', maxWidth: 560, margin: '18px auto 0' }}>{e.announcement}</div>}
  </div>;
}
