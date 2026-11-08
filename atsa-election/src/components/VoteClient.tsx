'use client';
import { useEffect, useRef, useState } from 'react';
import { blind, big, unblind } from '@/lib/blind';
import { useLang, useT } from './Lang';
import BallotBox from './BallotBox';
import type { Cand } from './CandidateGrid';
type Pos = { id: number; name_en: string; name_th: string };
type Cred = { token: string; r: string; blinded: string; sig?: string };
type Phase = 'init' | 'signin' | 'sent' | 'vote' | 'review' | 'done' | 'lost' | 'error';
const KEY = 'atsa-credential';
const post = (url: string, body: unknown, anon = false) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: anon ? 'omit' : 'same-origin', body: JSON.stringify(body) });
const Av = ({ c }: { c: Cand }) => c.photo ? <img src={c.photo} alt="" /> : <>{c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</>;

export default function VoteClient({ positions, candidates, n, e, signedIn, issued }: { positions: Pos[]; candidates: Cand[]; n: string; e: string; signedIn: boolean; issued: boolean }) {
  const t = useT(), { lang } = useLang(), pn = (p: Pos) => (lang === 'th' && p.name_th ? p.name_th : p.name_en);
  const [phase, setPhase] = useState<Phase>('init'), [cred, setCred] = useState<Cred | null>(null), [err, setErr] = useState('');
  const [step, setStep] = useState(0), [sel, setSel] = useState<number[]>([]), [busy, setBusy] = useState(false), [email, setEmail] = useState('');
  const ran = useRef(false), N = Math.min(positions.length, candidates.length), byId = (id: number) => candidates.find(c => c.id === id)!;

  useEffect(() => {
    if (ran.current) return; ran.current = true;
    (async () => {
      try {
        const nn = big(n), ee = big(e);
        let c: Cred | null = null; try { c = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* ignore */ }
        if (c?.sig) { setCred(c); setPhase('vote'); return; }
        if (!signedIn) { setPhase('signin'); return; }
        if (c && !issued) { c = null; localStorage.removeItem(KEY); } // leftover from an attempt that never reached the server
        if (!c) {
          if (issued) { setPhase('lost'); return; }
          const b = await blind(nn, ee); c = { token: b.token, r: b.r, blinded: b.blinded };
          localStorage.setItem(KEY, JSON.stringify(c)); // saved BEFORE asking, so a refresh can resume
        }
        const res = await post('/api/vote/credential', { blinded: c.blinded }), j = await res.json();
        if (!res.ok) throw new Error(j.error);
        c = { ...c, sig: await unblind(j.sig, c, nn, ee) };
        localStorage.setItem(KEY, JSON.stringify(c)); setCred(c);
        post('/api/auth/logout', {}).catch(() => {}); // from here on the server no longer knows who this browser is
        setPhase('vote');
      } catch (x) { setErr((x as Error).message); setPhase('error'); }
    })();
  }, [n, e, signedIn, issued]);

  async function sendLink() { setBusy(true); await post('/api/auth/request', { email }); setBusy(false); setPhase('sent'); }
  async function submit() {
    if (!cred?.sig) return;
    setBusy(true); setErr('');
    const r = await post('/api/vote/submit', { token: cred.token, sig: cred.sig, choices: sel }, true); // sent without cookies
    if (r.ok || r.status === 409) { localStorage.removeItem(KEY); setPhase('done'); } else setErr((await r.json()).error ?? 'Error');
    setBusy(false);
  }
  const H = ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>;

  if (phase === 'init') return <p className="ok">{t('Preparing your ballot…', 'กำลังเตรียมบัตรเลือกตั้ง…')}</p>;
  if (phase === 'signin' || phase === 'sent') return <div><H>{t('Sign in to vote', 'เข้าสู่ระบบเพื่อโหวต')}</H>
    {phase === 'sent' ? <div className="note">{t('If this email is on the voter list, a sign-in link is on its way. Check your inbox and spam folder.', 'หากอีเมลนี้อยู่ในรายชื่อผู้มีสิทธิ์ ระบบจะส่งลิงก์เข้าสู่ระบบให้ ตรวจสอบกล่องจดหมายและสแปม')}</div> :
      <div className="fld"><label>{t('Your email', 'อีเมลของคุณ')}<input type="email" inputMode="email" autoComplete="email" value={email} onChange={x => setEmail(x.target.value)} placeholder="name@example.com" /></label>
        <div className="bar"><button className="btn" onClick={sendLink} disabled={busy || !email.includes('@')}>{t('Send sign-in link', 'ส่งลิงก์เข้าสู่ระบบ')}</button></div></div>}</div>;
  if (phase === 'lost') return <div className="note r">{t('A ballot was already issued to this account. If you have voted, thank you. If you started on another device or browser, continue there.', 'บัญชีนี้ได้รับบัตรเลือกตั้งแล้ว หากโหวตเสร็จแล้ว ขอบคุณค่ะ หากเริ่มโหวตบนอุปกรณ์หรือเบราว์เซอร์อื่น กรุณากลับไปทำต่อที่นั่น')}</div>;
  if (phase === 'error') return <div className="note r"><b>{err}</b></div>;
  if (phase === 'done') return <div className="ok"><BallotBox mode="once" /><h2 style={{ border: 0, padding: 0, marginTop: 14 }}>{t('Your ballot is in the box', 'บัตรเลือกตั้งของคุณอยู่ในหีบแล้ว')}</h2>
    <p style={{ color: 'var(--muted)' }}>{t('Thank you for voting.', 'ขอบคุณที่ใช้สิทธิ์ค่ะ')}</p></div>;

  if (phase === 'review') return <div><H>{t('Confirm your vote', 'ยืนยันการเลือก')}</H>
    {sel.map((id, k) => <div className="opt" style={{ cursor: 'default' }} key={k}><span className="ph sm"><Av c={byId(id)} /></span><span><small>{pn(positions[k])}</small><b>{byId(id).name}</b></span></div>)}
    <div className="note r">{t('You cannot change your vote after submitting.', 'เมื่อส่งแล้วจะแก้ไขไม่ได้')}</div>
    {err && <div className="note r">{err}</div>}
    <div className="bar"><button className="btn alt" onClick={() => setPhase('vote')} disabled={busy}>{t('Back', 'กลับไปแก้ไข')}</button>
      <button className="btn" onClick={submit} disabled={busy}>{t('Submit ballot', 'ส่งบัตรเลือกตั้ง')}</button></div></div>;

  const pos = positions[step], taken = sel.slice(0, step);
  return <div>
    <div className="prog">{t('Step', 'ขั้นที่')} {step + 1} {t('of', 'จาก')} {N}<div className="trk"><i style={{ width: `${((step + 1) / N) * 100}%`, background: 'var(--green)' }} /></div></div>
    <h2>{t('Vote for ', 'โหวตเลือก')}{pn(pos)}<small>{t('Choose one candidate', 'เลือกผู้สมัคร 1 คน')}</small></h2>
    {candidates.filter(c => !taken.includes(c.id)).map(c => <div key={c.id}>
      <label className="opt"><input type="radio" name="p" checked={sel[step] === c.id} onChange={() => { const s = sel.slice(0, step); s[step] = c.id; setSel(s); }} />
        <span className="ph sm"><Av c={c} /></span><b className="g">{c.name}</b></label>
      <details><summary>{t('Details', 'รายละเอียด')}</summary><p>{c.bio}</p><p>{c.manifesto}</p></details></div>)}
    <div className="bar">{step > 0 && <button className="btn alt" onClick={() => setStep(step - 1)}>{t('Back', 'ย้อนกลับ')}</button>}
      <button className="btn" disabled={sel[step] === undefined} onClick={() => step < N - 1 ? setStep(step + 1) : setPhase('review')}>
        {step < N - 1 ? t('Next vote', 'โหวตตำแหน่งถัดไป') : t('Review', 'ตรวจสอบก่อนส่ง')}</button></div></div>;
}
