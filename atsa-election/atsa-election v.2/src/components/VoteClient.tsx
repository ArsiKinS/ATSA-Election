'use client';
import { useEffect, useRef, useState } from 'react';
import BallotBox from './BallotBox';
import { useT } from './Lang';
type C = { id: number; name: string; photo: string | null; bio: string; manifesto: string };
type Phase = 'welcome' | 'president' | 'board' | 'review' | 'done';
const Av = ({ c }: { c: C }) => c.photo ? <img src={c.photo} alt="" /> : <>{c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</>;

// Polling-station ballot: welcome -> President (1) -> Board (N) -> review -> submit -> next voter.
// Nothing is kept after a ballot is submitted, and an unfinished ballot is cleared after 90 seconds without touches.
export default function VoteClient({ presidents, pool, seats, code }: { presidents: C[]; pool: C[]; seats: number; code?: string }) {
  const t = useT(), [phase, setPhase] = useState<Phase>(code ? 'president' : 'welcome'), [pres, setPres] = useState<number | null>(null), [board, setBoard] = useState<number[]>([]);
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), touched = useRef(Date.now());
  const reset = () => { setPres(null); setBoard([]); setErr(''); setPhase('welcome'); };
  useEffect(() => {
    const bump = () => { touched.current = Date.now(); };
    addEventListener('pointerdown', bump); addEventListener('keydown', bump);
    const id = setInterval(() => { if (!code && phase !== 'welcome' && phase !== 'done' && Date.now() - touched.current > 90_000) reset(); }, 1000);
    return () => { removeEventListener('pointerdown', bump); removeEventListener('keydown', bump); clearInterval(id); };
  }, [phase]);
  useEffect(() => { if (phase !== 'done' || code) return; const id = setTimeout(reset, 8000); return () => clearTimeout(id); }, [phase]);

  async function submit() {
    if (pres === null || busy) return;
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/vote/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ president: pres, board, ...(code ? { code } : {}) }) });
      if (r.ok) { setPres(null); setBoard([]); setPhase('done'); } else setErr((await r.json().catch(() => ({}))).error ?? 'Error');
    } catch { setErr(t('Network problem. Please try again.', 'เครือข่ายมีปัญหา กรุณาลองอีกครั้ง')); }
    setBusy(false);
  }
  const byId = (id: number) => [...presidents, ...pool].find(c => c.id === id)!;
  const Card = ({ c, kind, on, off, onClick }: { c: C; kind: 'radio' | 'checkbox'; on: boolean; off?: boolean; onClick: () => void }) => <div>
    <label className="opt" style={off ? { opacity: 0.45 } : undefined}><input type={kind} checked={on} disabled={off} onChange={onClick} /><span className="ph sm"><Av c={c} /></span><b className="g">{c.name}</b></label>
    <details><summary>{t('Details', 'รายละเอียด')}</summary><p>{c.bio}</p><p>{c.manifesto}</p></details></div>;

  if (phase === 'welcome') return <div className="ok big"><BallotBox mode="loop" /><h2 style={{ border: 0, padding: 0, marginTop: 14 }}>{t('Ready to vote', 'พร้อมโหวต')}</h2>
    <button className="btn" onClick={() => { touched.current = Date.now(); setPhase('president'); }}>{t('Start voting', 'เริ่มโหวต')}</button>
    <p style={{ color: 'var(--muted)', marginTop: 12 }}>{t('One ballot per person. Ask the staff if you need help.', 'หนึ่งคนหนึ่งบัตร หากต้องการความช่วยเหลือ สอบถามเจ้าหน้าที่ได้ค่ะ')}</p></div>;

  if (phase === 'done') return <div className="ok big"><BallotBox mode="once" /><h2 style={{ border: 0, padding: 0, marginTop: 14 }}>{t('Your ballot is in the box', 'บัตรเลือกตั้งของคุณอยู่ในหีบแล้ว')}</h2>
    <p style={{ color: 'var(--muted)' }}>{code ? t('Thank you for voting. You can close this page.', 'ขอบคุณที่ใช้สิทธิ์ ปิดหน้านี้ได้เลยค่ะ') : t('Thank you for voting. This screen will reset for the next voter.', 'ขอบคุณที่ใช้สิทธิ์ หน้าจอจะรีเซ็ตสำหรับคนถัดไปเอง')}</p>
    {!code && <button className="btn alt" onClick={reset}>{t('Next voter', 'ผู้โหวตคนถัดไป')}</button>}</div>;

  if (phase === 'president') return <div className="big"><div className="prog">{t('Step 1 of 2', 'ขั้นที่ 1 จาก 2')}</div>
    <h2>{t('Choose your President', 'เลือกประธาน')}<small>{t('Choose one', 'เลือก 1 คน')}</small></h2>
    {presidents.map(c => <Card key={c.id} c={c} kind="radio" on={pres === c.id} onClick={() => { setPres(c.id); setBoard(b => b.filter(x => x !== c.id)); }} />)}
    <div className="bar">{!code && <button className="btn alt" onClick={reset}>{t('Cancel', 'ยกเลิก')}</button>}<button className="btn" disabled={pres === null} onClick={() => setPhase('board')}>{t('Next', 'ถัดไป')}</button></div></div>;

  const list = pool.filter(c => c.id !== pres);
  if (phase === 'board') return <div className="big"><div className="prog">{t('Step 2 of 2', 'ขั้นที่ 2 จาก 2')}</div>
    <h2>{t('Choose board members', 'เลือกสมาชิกบอร์ด')}<small>{t(`Choose exactly ${seats} · selected ${board.length}`, `เลือก ${seats} คน · เลือกแล้ว ${board.length}`)}</small></h2>
    {list.map(c => <Card key={c.id} c={c} kind="checkbox" on={board.includes(c.id)} off={!board.includes(c.id) && board.length >= seats} onClick={() => setBoard(b => b.includes(c.id) ? b.filter(x => x !== c.id) : b.length < seats ? [...b, c.id] : b)} />)}
    <div className="bar"><button className="btn alt" onClick={() => setPhase('president')}>{t('Back', 'ย้อนกลับ')}</button><button className="btn" disabled={board.length !== seats} onClick={() => setPhase('review')}>{t('Review', 'ตรวจสอบ')}</button></div></div>;

  return <div className="big"><h2>{t('Confirm your vote', 'ยืนยันการเลือก')}</h2>
    {pres !== null && <div className="opt" style={{ cursor: 'default' }}><span className="ph sm"><Av c={byId(pres)} /></span><span><small>{t('President', 'ประธาน')}</small><b>{byId(pres).name}</b></span></div>}
    {board.map(id => <div className="opt" style={{ cursor: 'default' }} key={id}><span className="ph sm"><Av c={byId(id)} /></span><span><small>{t('Board member', 'สมาชิกบอร์ด')}</small><b>{byId(id).name}</b></span></div>)}
    <div className="note r">{t('You cannot change your vote after submitting.', 'เมื่อส่งแล้วจะแก้ไขไม่ได้')}</div>
    {err && <div className="note r" role="alert">{err}</div>}
    <div className="bar"><button className="btn alt" onClick={() => setPhase('board')} disabled={busy}>{t('Back', 'กลับไปแก้ไข')}</button><button className="btn" onClick={submit} disabled={busy}>{busy ? t('Sending…', 'กำลังส่ง…') : t('Submit ballot', 'ส่งบัตรเลือกตั้ง')}</button></div></div>;
}
