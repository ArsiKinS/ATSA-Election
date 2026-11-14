'use client';
import { useState } from 'react';
import { useT } from './Lang';
// Opened from the one-time link the committee sends to each polling-station computer. A button is required (not an automatic
// load) so that chat apps or mail scanners that preview links cannot use the link up.
export default function KioskActivate({ code }: { code: string }) {
  const t = useT(), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/kiosk/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      if (r.ok) { location.href = '/vote'; return; }
      setErr(t('This link is not valid or was already used.', 'ลิงก์นี้ไม่ถูกต้อง หรือถูกใช้ไปแล้ว'));
    } catch { setErr(t('Network problem. Please try again.', 'เครือข่ายมีปัญหา กรุณาลองอีกครั้ง')); }
    setBusy(false);
  }
  return <div className="ok"><h2 style={{ border: 0, padding: 0 }}>{t('Set up this computer for voting?', 'ตั้งค่าเครื่องนี้เป็นเครื่องโหวต?')}</h2>
    <p style={{ color: 'var(--muted)', margin: '8px 0 14px' }}>{t('Press the button only on the computer at the polling station. The link works once.', 'กดปุ่มนี้เฉพาะบนคอมพิวเตอร์ที่จุดเลือกตั้ง ลิงก์ใช้ได้ครั้งเดียว')}</p>
    {err && <div className="note r" role="alert">{err}</div>}
    <button className="btn lg" onClick={go} disabled={busy || !code}>{t('Yes, use this computer for voting', 'ใช่ ใช้เครื่องนี้เป็นเครื่องโหวต')}</button></div>;
}
