'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function AuthForm({ mode }: { mode: 'login' | 'setup' }) {
  const [f, setF] = useState({ email: '', password: '', token: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false), router = useRouter();
  async function go(ev: React.FormEvent) {
    ev.preventDefault(); setBusy(true); setErr('');
    const r = await fetch(mode === 'login' ? '/api/admin/login' : '/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mode === 'login' ? { email: f.email, password: f.password } : f) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? 'Error'); setBusy(false); } else router.push(mode === 'login' ? '/admin' : '/admin/login');
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return <form className="panel fld" style={{ maxWidth: 420, margin: '24px auto' }} onSubmit={go}>
    <h2>{mode === 'login' ? 'Admin sign in' : 'First-time setup'}</h2>
    {mode === 'setup' && <label>Setup token<input value={f.token} onChange={set('token')} autoComplete="off" required /></label>}
    <label>Email<input type="email" value={f.email} onChange={set('email')} autoComplete="username" required /></label>
    <label>Password{mode === 'setup' && ' (at least 10 characters)'}<input type="password" value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'setup' ? 10 : undefined} required /></label>
    {err && <div className="note r" role="alert">{err}</div>}
    <button className="btn" disabled={busy}>{mode === 'login' ? 'Sign in' : 'Create Super Admin'}</button>
  </form>;
}
