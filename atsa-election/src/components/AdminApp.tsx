'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import DateTimeField from './DateTimeField';

const post = (b: unknown) => fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
async function shrink(file: File, max: number, type: string) {
  const bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL(type, 0.85);
}
type Act = (b: unknown, ok?: string) => Promise<boolean>;

export default function AdminApp() {
  const [s, setS] = useState<any>(null), [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const load = useCallback(async () => {
    const r = await fetch('/api/admin', { cache: 'no-store' });
    if (r.status === 401) { location.href = '/admin/login'; return; }
    setS(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);
  const act: Act = async (b, ok = 'Saved') => {
    const r = await post(b), j = await r.json().catch(() => ({}));
    setMsg({ ok: r.ok, t: r.ok ? (j.added !== undefined ? `Added ${j.added}, skipped ${j.rejected} invalid or duplicate` : ok) : j.error || 'Error' });
    if (r.ok) await load();
    return r.ok;
  };
  if (!s) return <p>Loading…</p>;
  const can = (p: string) => s.me.perms.includes(p), locked = new Date() >= new Date(s.election.open_at);
  return <div>
    <div className="panel" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <span>{s.me.email}</span><span className="chip">{s.me.role.replace('_', ' ')}</span>
      <button className="btn alt sm" style={{ marginLeft: 'auto' }} onClick={async () => { await post({ action: 'logout' }); location.href = '/admin/login'; }}>Sign out</button></div>
    {msg && <div className={'note' + (msg.ok ? '' : ' r')} role="status">{msg.t}</div>}
    <Overview s={s} act={act} can={can} />
    {can('election:edit') && <ElectionForm key={JSON.stringify(s.election).length} e={s.election} act={act} />}
    {locked && can('candidates:edit') && <div className="note r">Voting has started, so positions, candidates and the voter list are locked.</div>}
    {can('candidates:edit') && <Positions s={s} act={act} locked={locked} />}
    {can('candidates:edit') && <Candidates s={s} act={act} locked={locked} />}
    {can('voters:edit') && <Voters s={s} act={act} locked={locked} />}
    {can('admins:manage') && <Admins s={s} act={act} />}
    {s.audit && <Audit a={s.audit} />}
  </div>;
}

function Overview({ s, act, can }: { s: any; act: Act; can: (p: string) => boolean }) {
  const e = s.election, st = s.stats, label: Record<string, string> = { upcoming: 'Upcoming', open: 'Voting open', closed: 'Voting closed', results: 'Results published' };
  return <div className="panel"><h2>Overview</h2>
    <p><span className="chip">{label[s.status]}</span></p>
    <div className="stats" style={{ margin: '12px 0' }}><div><b>{st.eligible}</b><small>Eligible voters</small></div><div><b>{st.issued}</b><small>Ballots issued</small></div><div><b>{st.ballots}</b><small>Ballots cast</small></div></div>
    {can('results:publish') && <>
      {s.status === 'open' && <p className="note">Results can be verified after voting closes.</p>}
      {s.status === 'closed' && !e.verified_at && <button className="btn" onClick={() => confirm('Verify results? This checks that ballots do not exceed issued credentials.') && act({ action: 'results.verify' }, 'Results verified')}>Verify results</button>}
      {e.verified_at && !e.published_at && <>
        <p className="note">Verified. {e.auto_publish ? 'They will be published automatically at the announcement time.' : 'Auto-publish is off.'}</p>
        <button className="btn" onClick={() => confirm('Publish the results to everyone now?') && act({ action: 'results.publish' }, 'Results published')}>Publish now</button></>}
      {e.published_at && <p className="note">Results are published.</p>}</>}
    {s.qr && <div className="qr" style={{ marginTop: 14 }}><b>Scan to open the vote page</b><div dangerouslySetInnerHTML={{ __html: s.qr }} /></div>}
  </div>;
}

function ElectionForm({ e, act }: { e: any; act: Act }) {
  const [f, setF] = useState<any>({ ...e }), set = (k: string, v: unknown) => setF({ ...f, [k]: v });
  const T = (k: string, label: string, props: any = {}) => <label>{label}<input value={f[k] ?? ''} onChange={x => set(k, props.type === 'number' ? +x.target.value : x.target.value)} {...props} /></label>;
  return <div className="panel fld"><h2>Election and branding</h2>
    {T('club_name', 'Club name')}{T('club_short', 'Short name')}{T('title', 'Title (English)')}{T('title_th', 'Title (Thai)')}{T('year', 'Year', { type: 'number' })}
    <label>Description<textarea value={f.description} onChange={x => set('description', x.target.value)} /></label>
    <label>Announcement (shown on Home)<textarea value={f.announcement} onChange={x => set('announcement', x.target.value)} /></label>
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>{(['color_primary', 'color_secondary', 'color_accent'] as const).map(k => <label key={k}>{k.replace('color_', '')}<br /><input type="color" value={f[k]} onChange={x => set(k, x.target.value)} /></label>)}</div>
    <label>Logo (leave empty to keep the ATSA logo)<input type="file" accept="image/*" onChange={async x => { const fl = x.target.files?.[0]; if (fl) set('logo_data', await shrink(fl, 400, 'image/png')); }} /></label>
    <DateTimeField label="Voting opens (Malaysia time)" value={f.open_at} onChange={v => set('open_at', v)} />
    <DateTimeField label="Voting closes (Malaysia time)" value={f.close_at} onChange={v => set('close_at', v)} />
    <DateTimeField label="Results announced (Malaysia time)" value={f.results_at} onChange={v => set('results_at', v)} />
    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={f.auto_publish} onChange={x => set('auto_publish', x.target.checked)} /> Publish verified results automatically at the announcement time</label>
    <button className="btn" onClick={() => { const { verified_at: _v, published_at: _p, ...rest } = f; act({ action: 'election.save', ...rest }); }}>Save</button></div>;
}

function Positions({ s, act, locked }: { s: any; act: Act; locked: boolean }) {
  const [t, setT] = useState(s.positions.map((p: any) => `${p.name_en} | ${p.name_th}`).join('\n'));
  return <div className="panel fld"><h2>Positions (in voting order)</h2>
    <label>One per line: English | Thai<textarea value={t} onChange={x => setT(x.target.value)} disabled={locked} rows={9} /></label>
    <button className="btn" disabled={locked} onClick={() => act({ action: 'positions.set', positions: t.split('\n').map((l: string) => l.trim()).filter(Boolean).map((l: string) => { const [en, th] = l.split('|'); return { name_en: en.trim(), name_th: (th ?? '').trim() }; }) })}>Save positions</button></div>;
}

function Candidates({ s, act, locked }: { s: any; act: Act; locked: boolean }) {
  const blank = { id: undefined as number | undefined, name: '', bio: '', manifesto: '', photo: null as string | null };
  const [f, setF] = useState<any>(blank);
  return <div className="panel fld"><h2>Candidates ({s.candidates.length})</h2>
    {s.candidates.map((c: any) => <div key={c.id} className="rk"><span className="ph sm">{c.photo ? <img src={c.photo} alt="" /> : c.name[0]}</span><b className="g">{c.name}</b>
      <button className="btn alt sm" disabled={locked} onClick={() => setF(c)}>Edit</button>
      <button className="btn alt sm" disabled={locked} onClick={() => confirm(`Delete ${c.name}?`) && act({ action: 'candidate.delete', id: c.id })}>Delete</button></div>)}
    <h2 style={{ fontSize: 16 }}>{f.id ? 'Edit candidate' : 'Add candidate'}</h2>
    <label>Name<input value={f.name} onChange={x => setF({ ...f, name: x.target.value })} disabled={locked} /></label>
    <label>About<textarea value={f.bio} onChange={x => setF({ ...f, bio: x.target.value })} disabled={locked} /></label>
    <label>Campaign statement<textarea value={f.manifesto} onChange={x => setF({ ...f, manifesto: x.target.value })} disabled={locked} /></label>
    <label>Photo<input type="file" accept="image/*" disabled={locked} onChange={async x => { const fl = x.target.files?.[0]; if (fl) setF({ ...f, photo: await shrink(fl, 420, 'image/jpeg') }); }} /></label>
    {f.photo && <div className="ph sm"><img src={f.photo} alt="" /></div>}
    <div className="bar"><button className="btn" disabled={locked || !f.name.trim()} onClick={async () => { if (await act({ action: 'candidate.save', id: f.id, name: f.name, bio: f.bio, manifesto: f.manifesto, photo: f.photo })) setF(blank); }}>{f.id ? 'Save changes' : 'Add candidate'}</button>
      {f.id && <button className="btn alt" onClick={() => setF(blank)}>Cancel</button>}</div></div>;
}

function Voters({ s, act, locked }: { s: any; act: Act; locked: boolean }) {
  const [t, setT] = useState(''), [rm, setRm] = useState('');
  return <div className="panel fld"><h2>Voter list ({s.stats.eligible})</h2>
    <label>Paste emails (one per line, or separated by commas or spaces)<textarea value={t} onChange={x => setT(x.target.value)} disabled={locked} rows={6} /></label>
    <button className="btn" disabled={locked || !t.trim()} onClick={async () => { if (await act({ action: 'voters.import', emails: t.split(/[\s,;]+/).filter(Boolean) })) setT(''); }}>Import emails</button>
    <label style={{ marginTop: 14 }}>Remove one email<input value={rm} onChange={x => setRm(x.target.value)} disabled={locked} /></label>
    <button className="btn alt" disabled={locked || !rm} onClick={async () => { if (await act({ action: 'voters.remove', email: rm })) setRm(''); }}>Remove</button>
    <p className="note" style={{ marginTop: 12 }}>For privacy, this page shows only the number of voters, never who has voted.</p></div>;
}

function Admins({ s, act }: { s: any; act: Act }) {
  const [f, setF] = useState({ email: '', password: '', role: 'COMMITTEE' });
  return <div className="panel fld"><h2>Admin accounts</h2>
    <table><tbody>{s.admins.map((a: any) => <tr key={a.id}><td>{a.email}</td><td>{a.role}</td><td><button className="btn alt sm" onClick={() => confirm(`Remove ${a.email}?`) && act({ action: 'admin.delete', id: a.id })}>Remove</button></td></tr>)}</tbody></table>
    <h2 style={{ fontSize: 16 }}>Add admin</h2>
    <label>Email<input type="email" value={f.email} onChange={x => setF({ ...f, email: x.target.value })} /></label>
    <label>Temporary password (10+ characters)<input type="password" value={f.password} onChange={x => setF({ ...f, password: x.target.value })} autoComplete="new-password" /></label>
    <label>Role<select value={f.role} onChange={x => setF({ ...f, role: x.target.value })}><option value="COMMITTEE">Election Committee</option><option value="RESULTS_MANAGER">Results Manager</option><option value="SUPER_ADMIN">Super Admin</option></select></label>
    <button className="btn" onClick={async () => { if (await act({ action: 'admin.create', ...f })) setF({ email: '', password: '', role: 'COMMITTEE' }); }}>Add admin</button></div>;
}

function Audit({ a }: { a: any }) {
  return <div className="panel"><h2>Audit log</h2>
    <p className={'note' + (a.chainOk ? '' : ' r')}>{a.chainOk ? 'Integrity check passed: no log entry has been altered.' : 'WARNING: the log failed its integrity check.'}</p>
    <table><thead><tr><th>Time</th><th>Who</th><th>Action</th><th>Details</th></tr></thead><tbody>{a.rows.map((r: any) => <tr key={r.id}><td>{new Date(r.at).toLocaleString('en-GB', { timeZone: 'Asia/Kuala_Lumpur' })}</td><td>{r.actor}</td><td>{r.action}</td><td>{r.details}</td></tr>)}</tbody></table></div>;
}
