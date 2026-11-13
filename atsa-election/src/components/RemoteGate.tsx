'use client';
import { useState } from 'react';
import { useT } from './Lang';
import VoteClient from './VoteClient';
type C = { id: number; name: string; photo: string | null; bio: string; manifesto: string };
// Shown on every computer that is not the polling-station computer. Approved members type their one-time code here.
export default function RemoteGate(props: { presidents: C[]; pool: C[]; seats: number }) {
  const t = useT(), [code, setCode] = useState(''), [ok, setOk] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  if (ok) return <VoteClient {...props} code={code} />;
  async function check() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/vote/code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      if (r.ok) setOk(true); else setErr(t('This code is not valid or was already used.', 'รหัสนี้ไม่ถูกต้อง หรือถูกใช้ไปแล้ว'));
    } catch { setErr(t('Network problem. Please try again.', 'เครือข่ายมีปัญหา กรุณาลองอีกครั้ง')); }
    setBusy(false);
  }
  return <div>
    <div className="note">{t('Voting takes place on the computer at the polling station.', 'การโหวตทำที่คอมพิวเตอร์ ณ จุดเลือกตั้ง')}</div>
    <h2>{t('Online voting', 'โหวตออนไลน์')}<small>{t('Only for members approved by the election committee', 'เฉพาะสมาชิกที่คณะกรรมการอนุมัติ')}</small></h2>
    <div className="fld"><label>{t('Your voting code', 'รหัสโหวตของคุณ')}
      <input value={code} onChange={e => setCode(e.target.value)} autoComplete="off" autoCapitalize="characters" placeholder="XXXXX-XXXXX" style={{ textTransform: 'uppercase', letterSpacing: '.12em' }} /></label></div>
    {err && <div className="note r" role="alert">{err}</div>}
    <div className="bar"><button className="btn" onClick={check} disabled={busy || code.replace(/[^A-Za-z0-9]/g, '').length < 10}>{t('Continue', 'ดำเนินการต่อ')}</button></div>
    <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 12 }}>{t('Your code works once. You cannot change your vote after you submit.', 'รหัสใช้ได้ครั้งเดียว และแก้ไขไม่ได้หลังส่งบัตร')}</p>
  </div>;
}
