'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bi } from './Lang';
export default function SignIn({ token }: { token: string }) {
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false), router = useRouter();
  async function go() {
    setBusy(true); setErr('');
    const r = await fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    if (r.ok) router.push('/vote'); else { setErr((await r.json()).error ?? 'Error'); setBusy(false); }
  }
  return <div className="ok"><h2 style={{ border: 0, padding: 0 }}><Bi en="Continue to your ballot" th="ไปที่บัตรเลือกตั้งของคุณ" /></h2>
    {err && <div className="note r">{err}</div>}
    <button className="btn" onClick={go} disabled={busy}><Bi en="Continue" th="ดำเนินการต่อ" /></button></div>;
}
