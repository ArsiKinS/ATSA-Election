'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import DateTimeField from './DateTimeField';

const post = (b: unknown) => fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
async function shrink(file: File, max: number, type: string) {
  const bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL(type, 0.85);
}
async function safeImage(file: File, max: number, type: string) {
  try { return await shrink(file, max, type); }
  catch { alert('This picture could not be read. Please choose a JPG or PNG file. (iPhone HEIC photos do not open in Chrome: export it as JPG first.)'); return null; }
}
type Act = (b: unknown, ok?: string) => Promise<boolean>;

export default function AdminApp() {
  const [s, setS] = useState<any>(null), [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null), [busy, setBusy] = useState(false), lock = useRef(false);
  const load = useCallback(async () => {
    const r = await fetch('/api/admin', { cache: 'no-store' });
    if (r.status === 401) { location.href = '/admin/login'; return; }
    setS(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);
  const act: Act = async (b, ok = 'Saved') => {
    if (lock.current) return false; // ignore extra clicks while a save is running
    lock.current = true; setBusy(true); setMsg({ ok: true, t: 'Saving… please wait' });
    try {
      const r = await post(b), j = await r.json().catch(() => ({}));
      setMsg({ ok: r.ok, t: r.ok ? ok : j.error || 'Error' });
      if (r.ok) await load();
      return r.ok;
    } catch { setMsg({ ok: false, t: 'Network problem. Please try again.' }); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  if (!s) return <p>Loading…</p>;
  const can = (p: string) => s.me.perms.includes(p), locked = new Date() >= new Date(s.election.open_at);
  return <div aria-busy={busy} style={busy ? { pointerEvents: 'none', opacity: 0.6 } : undefined}>
    <div className="panel" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <span>{s.me.email}</span><span className="chip">{s.me.role.replace('_', ' ')}</span>
      <button className="btn alt sm" style={{ marginLeft: 'auto' }} onClick={async () => { await post({ action: 'logout' }); location.href = '/admin/login'; }}>Sign out</button></div>
    {msg && <div className={'note' + (msg.ok ? '' : ' r')} role="status">{msg.t}</div>}
    <Overview s={s} act={act} can={can} />
    {can('kiosk:open') && <Kiosk s={s} act={act} reload={load} setMsg={setMsg} />}
    {can('remote:manage') && <Remote s={s} reload={load} setMsg={setMsg} />}
    {s.results && <Results r={s.results} />}
    {can('election:edit') && <ElectionForm key={JSON.stringify(s.election).length} e={s.election} act={act} />}
    {locked && can('candidates:edit') && <div className="note r">Voting has started, so candidates are locked.</div>}
    {can('candidates:edit') && <Candidates s={s} act={act} locked={locked} />}
    {can('admins:manage') && <Admins s={s} act={act} />}
    {s.audit && <Audit a={s.audit} />}
  </div>;
}

function Overview({ s, act, can }: { s: any; act: Act; can: (p: string) => boolean }) {
  const e = s.election, st = s.stats, label: Record<string, string> = { upcoming: 'Upcoming', open: 'Voting open', closed: 'Voting closed', results: 'Results published' };
  return <div className="panel"><h2>Overview</h2>
    <p><span className="chip">{label[s.status]}</span></p>
    <div className="stats" style={{ margin: '12px 0' }}><div><b>{st.ballots}</b><small>Ballots cast</small></div><div><b>{st.max_ballots ?? '–'}</b><small>Ballot limit</small></div></div>
    {can('results:publish') && <>
      {s.status === 'open' && <p className="note">Results can be verified after voting closes.</p>}
      {s.status === 'closed' && !e.verified_at && <button className="btn" onClick={() => confirm('Verify results? This checks that ballots do not exceed the limit.') && act({ action: 'results.verify' }, 'Results verified')}>Verify results</button>}
      {e.verified_at && !e.published_at && <>
        <p className="note">Verified. {e.auto_publish ? 'The winners will be published automatically at the announcement time.' : 'Auto-publish is off.'}</p>
        <button className="btn" onClick={() => confirm('Publish the winners to everyone now?') && act({ action: 'results.publish' }, 'Results published')}>Publish now</button></>}
      {e.published_at && <p className="note">Winners are published. Vote counts are only shown here, to admins.</p>}</>}
    {s.qr && <div className="qr" style={{ marginTop: 14 }}><b>Scan to open the website</b><div dangerouslySetInnerHTML={{ __html: s.qr }} /></div>}
  </div>;
}

function Remote({ s, reload, setMsg }: { s: any; reload: () => Promise<void>; setMsg: (m: { ok: boolean; t: string }) => void }) {
  const [n, setN] = useState(5), [codes, setCodes] = useState<string[]>([]), [busy, setBusy] = useState(false), st = s.remote ?? { issued: 0, used: 0, missing: false };
  async function call(body: unknown) {
    setBusy(true); const r = await post(body), j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setMsg({ ok: false, t: j.error || 'Error' }); return null; }
    await reload(); return j;
  }
  return <div className="panel"><h2>Online voting (approved members)</h2>
    {st.missing ? <p className="note r">The database needs one more step: run <b>migrate-v3.sql</b> in the Neon SQL Editor, then refresh this page.</p> : <>
      <p style={{ margin: '8px 0' }}>For members who cannot come in person and whom the committee has approved. Each person gets one code. It works once and the ballot is counted in the same ballot limit. <b>Issued {st.issued} · used {st.used}</b></p>
      <div className="fld"><label>How many codes to create<input type="number" min={1} max={50} value={n} onChange={x => setN(Math.max(1, Math.min(50, +x.target.value || 1)))} /></label></div>
      <button className="btn" disabled={busy} onClick={async () => { const j = await call({ action: 'remote.generate', count: n }); if (j) setCodes(j.codes); }}>Create codes</button>
      <button className="btn alt" disabled={busy || st.issued === st.used} onClick={async () => { if (confirm('Cancel every code that has not been used yet?') && (await call({ action: 'remote.cancel' }))) { setCodes([]); setMsg({ ok: true, t: 'Unused codes cancelled' }); } }}>Cancel unused codes</button>
      {codes.length > 0 && <div style={{ marginTop: 12 }}>
        <p className="note r"><b>Copy these now.</b> They are shown only once and are not saved anywhere. Send each code privately to one approved member, and keep your own private note of who received which code. The system never records names.</p>
        <pre style={{ fontSize: 18, lineHeight: 1.8, userSelect: 'all' }}>{codes.join('\n')}</pre>
        <button className="btn alt sm" onClick={() => navigator.clipboard?.writeText(codes.join('\n')).then(() => setMsg({ ok: true, t: 'Codes copied' }))}>Copy all</button></div>}
    </>}
  </div>;
}

function Kiosk({ s, act, reload, setMsg }: { s: any; act: Act; reload: () => Promise<void>; setMsg: (m: { ok: boolean; t: string }) => void }) {
  const [n, setN] = useState(5), [links, setLinks] = useState<string[]>([]), [busy, setBusy] = useState(false), k = s.kiosk ?? { issued: 0, used: 0, missing: false };
  async function call(body: unknown) {
    setBusy(true); const r = await post(body), j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setMsg({ ok: false, t: j.error || 'Error' }); return null; }
    await reload(); return j;
  }
  return <div className="panel"><h2>Polling station computers</h2>
    {k.missing ? <p className="note r">The database needs one more step: run <b>migrate-v4.sql</b> in the Neon SQL Editor, then refresh this page.</p> : <>
      <p style={{ margin: '8px 0' }}>Create one link for each voting computer. Send each link to the person who sets up that computer. Opening the link and pressing one button turns that computer into a voting computer, <b>with no admin login on it</b>. Each link works once. <b>Created {k.issued} · used {k.used}</b></p>
      <div className="fld"><label>How many links<input type="number" min={1} max={20} value={n} onChange={x => setN(Math.max(1, Math.min(20, +x.target.value || 1)))} /></label></div>
      <button className="btn" disabled={busy} onClick={async () => { const j = await call({ action: 'kiosk.links', count: n }); if (j) setLinks(j.codes.map((c: string) => `${location.origin}/kiosk?code=${c}`)); }}>Create links</button>
      <button className="btn alt" disabled={busy || k.issued === k.used} onClick={async () => { if (confirm('Cancel every link that has not been used yet?') && (await call({ action: 'kiosk.links_cancel' }))) { setLinks([]); setMsg({ ok: true, t: 'Unused links cancelled' }); } }}>Cancel unused links</button>
      <button className="btn alt" disabled={busy} onClick={async () => { if (confirm('Deactivate EVERY polling-station computer? They will stop accepting ballots until they are set up again with new links.') && (await call({ action: 'kiosk.revoke_all' }))) setMsg({ ok: true, t: 'All polling-station computers deactivated' }); }}>Deactivate all computers</button>
      {links.length > 0 && <div style={{ marginTop: 12 }}>
        <p className="note r"><b>Copy these now.</b> They are shown only once and are not saved. Send one link to each computer. Do not post them publicly.</p>
        <pre style={{ fontSize: 14, lineHeight: 1.7, userSelect: 'all', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{links.join('\n\n')}</pre>
        <button className="btn alt sm" onClick={() => navigator.clipboard?.writeText(links.join('\n')).then(() => setMsg({ ok: true, t: 'Links copied' }))}>Copy all</button></div>}
    </>}
    <p style={{ margin: '16px 0 8px', color: 'var(--muted)' }}>Or set up the computer you are using right now (you will be signed out of admin on it). To stop it later, sign in again on this same computer and press “Stop voting on this computer”.</p>
    <button className="btn alt" onClick={async () => { if (!confirm('Open the ballot on THIS computer? You will be signed out of admin here.')) return; const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'kiosk.open' }) }); if (r.ok) location.href = '/vote'; else alert((await r.json().catch(() => ({}))).error ?? 'Error'); }}>Open ballot on this computer</button>
    <button className="btn alt" onClick={() => act({ action: 'kiosk.close' }, 'This computer can no longer vote')}>Stop voting on this computer</button></div>;
}

function Results({ r }: { r: any }) {
  const pct = (v: number) => (r.ballots ? ((v / r.ballots) * 100).toFixed(1) : '0.0'), o = r.outcome, nm = (id: number) => r.cands.find((c: any) => c.id === id)?.name;
  const T = ({ rows }: { rows: any[] }) => <table><thead><tr><th>Candidate</th><th>Votes</th><th>% of ballots</th></tr></thead><tbody>{rows.map(x => <tr key={x.id}><td>{x.name}</td><td>{x.votes}</td><td>{pct(x.votes)}%</td></tr>)}</tbody></table>;
  return <div className="panel"><h2>Results (admins only)</h2>
    <p className="note">Total ballots: <b>{r.ballots}</b></p>
    <p><b>Outcome:</b> President: {o.president.status === 'won' ? nm(o.president.winner) : o.president.status === 'tie' ? 'TIE, committee decides' : 'no votes'}
      {o.assistant ? ` · Assistant Secretary: ${nm(o.assistant)}` : ''} · Board: {o.board.members.map(nm).join(', ') || 'none'}{o.board.status === 'tie' ? ` · TIE for the last seat between ${o.board.tied.map(nm).join(', ')}` : ''}</p>
    <h2 style={{ fontSize: 16 }}>President</h2><T rows={o.president.rows} />
    <h2 style={{ fontSize: 16 }}>Board (President and Assistant Secretary not counted)</h2><T rows={o.board.rows} />
    <div className="bar"><a className="btn alt" href="/api/admin/csv">Download CSV</a></div></div>;
}

function ElectionForm({ e, act }: { e: any; act: Act }) {
  const [f, setF] = useState<any>({ ...e }), set = (k: string, v: unknown) => setF((o: any) => ({ ...o, [k]: v }));
  const T = (k: string, label: string, props: any = {}) => <label>{label}<input value={f[k] ?? ''} onChange={x => set(k, props.type === 'number' ? +x.target.value : x.target.value)} {...props} /></label>;
  return <div className="panel fld"><h2>Election and branding</h2>
    {T('club_name', 'Club name')}{T('club_short', 'Short name')}{T('title', 'Title (English)')}{T('title_th', 'Title (Thai)')}{T('year', 'Year', { type: 'number' })}
    {T('board_seats', 'Board seats (how many board members each voter picks and the winners)', { type: 'number', min: 1 })}
    <label>Ballot limit (maximum number of voters; leave empty for no limit)<input type="number" min={1} value={f.max_ballots ?? ''} onChange={x => set('max_ballots', x.target.value === '' ? null : +x.target.value)} /></label>
    <label>Description<textarea value={f.description} onChange={x => set('description', x.target.value)} /></label>
    <label>Announcement (shown on Home)<textarea value={f.announcement} onChange={x => set('announcement', x.target.value)} /></label>
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>{(['color_primary', 'color_secondary', 'color_accent'] as const).map(k => <label key={k}>{k.replace('color_', '')}<br /><input type="color" value={f[k]} onChange={x => set(k, x.target.value)} /></label>)}</div>
    <label>Logo (leave empty to keep the ATSA logo)<input type="file" accept="image/*" onChange={async x => { const fl = x.target.files?.[0]; if (!fl) return; const ph = await safeImage(fl, 400, 'image/png'); if (ph) set('logo_data', ph); }} /></label>
    <DateTimeField label="Voting opens (Malaysia time)" value={f.open_at} onChange={v => set('open_at', v)} />
    <DateTimeField label="Voting closes (Malaysia time)" value={f.close_at} onChange={v => set('close_at', v)} />
    <DateTimeField label="Results announced (Malaysia time)" value={f.results_at} onChange={v => set('results_at', v)} />
    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={f.auto_publish} onChange={x => set('auto_publish', x.target.checked)} /> Publish verified results automatically at the announcement time</label>
    <button className="btn" onClick={() => { const { verified_at: _v, published_at: _p, ...rest } = f; act({ action: 'election.save', ...rest }); }}>Save</button></div>;
}

function Candidates({ s, act, locked }: { s: any; act: Act; locked: boolean }) {
  const blank = { id: undefined as number | undefined, name: '', bio: '', manifesto: '', photo: null as string | null, for_president: false, for_board: true };
  const [f, setF] = useState<any>(blank);
  const nums = (() => { let p = 0, b = 0; return s.candidates.map((c: any) => ({ p: c.for_president ? ++p : 0, b: c.for_board ? ++b : 0 })); })(); // numbers follow the order candidates were added
  return <div className="panel fld"><h2>Candidates ({s.candidates.length})</h2>
    <p className="note">Numbers follow the order you add candidates. Add the presidential candidates first (the first is No. 1, the second No. 2), then the board candidates, numbered 1, 2, 3… in the order added.</p>
    {s.candidates.map((c: any, i: number) => <div key={c.id} className="rk"><span className="ph sm">{c.photo ? <img src={c.photo} alt="" /> : c.name[0]}</span>
      <div className="g"><b>{c.name}</b><br />{c.for_president && <span className="chip">President No. {nums[i].p}</span>} {c.for_board && <span className="chip">Board No. {nums[i].b}</span>}</div>
      <button className="btn alt sm" disabled={locked} onClick={() => setF(c)}>Edit</button>
      <button className="btn alt sm" disabled={locked} onClick={() => confirm(`Delete ${c.name}?`) && act({ action: 'candidate.delete', id: c.id })}>Delete</button></div>)}
    <h2 style={{ fontSize: 16 }}>{f.id ? 'Edit candidate' : 'Add candidate'}</h2>
    <label>Name<input value={f.name} onChange={x => setF({ ...f, name: x.target.value })} disabled={locked} /></label>
    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={f.for_president} onChange={x => setF({ ...f, for_president: x.target.checked })} disabled={locked} /> Runs for President</label>
    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={f.for_board} onChange={x => setF({ ...f, for_board: x.target.checked })} disabled={locked} /> Can be chosen as a board member (untick for the two presidential candidates)</label>
    <label>About<textarea value={f.bio} onChange={x => setF({ ...f, bio: x.target.value })} disabled={locked} /></label>
    <label>Campaign statement<textarea value={f.manifesto} onChange={x => setF({ ...f, manifesto: x.target.value })} disabled={locked} /></label>
    <label>Photo<input type="file" accept="image/*" disabled={locked} onChange={async x => { const fl = x.target.files?.[0]; if (!fl) return; const ph = await safeImage(fl, 420, 'image/jpeg'); if (ph) setF((o: any) => ({ ...o, photo: ph })); }} /></label>
    {f.photo && <div className="ph sm"><img src={f.photo} alt="" /></div>}
    <div className="bar"><button className="btn" disabled={locked || !f.name.trim()} onClick={async () => {
      if (!f.id && s.candidates.some((c: any) => c.name.trim().toLowerCase() === f.name.trim().toLowerCase()) && !confirm('A candidate with this name already exists. Add another one?')) return;
      if (await act({ action: 'candidate.save', id: f.id, name: f.name, bio: f.bio, manifesto: f.manifesto, photo: f.photo, for_president: f.for_president, for_board: f.for_board })) setF(blank);
    }}>{f.id ? 'Save changes' : 'Add candidate'}</button>{f.id && <button className="btn alt" onClick={() => setF(blank)}>Cancel</button>}</div></div>;
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
