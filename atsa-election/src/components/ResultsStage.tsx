'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from './Lang';
type P = { id: number; name: string; photo: string | null };
type Person = P & { role: 'president' | 'board' };
const ini = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2);
const lefts = (n: number) => (n === 1 ? [50] : n === 2 ? [33, 67] : Array.from({ length: n }, (_, i) => 14 + (72 * i) / (n - 1))); // board positions, % of the screen width

const Crown = () => <svg className="crown" viewBox="0 0 100 72" aria-hidden="true"><defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe9a0" /><stop offset=".5" stopColor="#e6b422" /><stop offset="1" stopColor="#b8860b" /></linearGradient></defs>
  <path d="M8 58 L3 14 L29 35 L50 6 L71 35 L97 14 L92 58 Z" fill="url(#gold)" stroke="#8a6508" strokeWidth="3" strokeLinejoin="round" />
  <rect x="8" y="58" width="84" height="11" rx="3" fill="url(#gold)" stroke="#8a6508" strokeWidth="3" />
  <circle cx="3" cy="14" r="5" fill="#fff4c2" /><circle cx="50" cy="6" r="5" fill="#fff4c2" /><circle cx="97" cy="14" r="5" fill="#fff4c2" /></svg>;

// Buttons for the Results page + the full-screen "Present on big screen" reveal.
export default function ResultsStage(p: { titleEn: string; titleTh: string; president: P | null; board: P[] }) {
  const t = useT(), title = t(p.titleEn, p.titleTh), congrats = t('Congratulations!', 'ขอแสดงความยินดี!');
  const people: Person[] = useMemo(() => [...(p.president ? [{ ...p.president, role: 'president' as const }] : []), ...p.board.map(b => ({ ...b, role: 'board' as const }))], [p]);
  const n = people.length, boardLeft = lefts(p.board.length);
  const [open, setOpen] = useState(false), [idx, setIdx] = useState(0), [phase, setPhase] = useState<'center' | 'placed'>('placed'), [auto, setAuto] = useState(false);
  const confetti = useMemo(() => Array.from({ length: 90 }, (_, i) => ({ l: Math.random() * 100, d: Math.random() * 1.5, s: 2.6 + Math.random() * 2.6, c: ['#d93a2f', '#f2c230', '#2e8b3a', '#ffffff', '#8fa2ee'][i % 5], r: Math.random() * 360 })), [open]);
  const roleLabel = (r: Person['role']) => (r === 'president' ? t('President', 'ประธาน') : t('Board member', 'สมาชิกบอร์ด'));
  const fs = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
  const close = () => { if (document.fullscreenElement) document.exitFullscreen(); setOpen(false); setAuto(false); };
  const reset = () => { setIdx(0); setPhase('placed'); setAuto(false); };

  // One press: the next person appears BIG in the middle; after a moment (or another press) they glide to their place.
  const next = useCallback(() => {
    if (phase === 'center') setPhase('placed');
    else if (idx < n) { setIdx(idx + 1); setPhase('center'); }
  }, [idx, phase, n]);

  useEffect(() => { if (!open || phase !== 'center') return; const id = setTimeout(() => setPhase('placed'), 2800); return () => clearTimeout(id); }, [open, phase, idx]);
  useEffect(() => { if (!open || !auto || phase !== 'placed' || idx >= n) return; const id = setTimeout(next, idx === 0 ? 900 : 1500); return () => clearTimeout(id); }, [open, auto, phase, idx, n, next]);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const h = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'enter' || k === 'arrowright') { e.preventDefault(); next(); }
      else if (k === 'arrowleft') { setIdx(v => Math.max(0, v - 1)); setPhase('placed'); }
      else if (k === 'r') reset();
      else if (k === 'p') setAuto(a => !a);
      else if (k === 'f') fs();
      else if (k === 'escape') close();
    };
    addEventListener('keydown', h);
    return () => { removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open, next]);

  const state = (i: number) => (i >= idx ? 'hid' : i === idx - 1 && phase === 'center' ? 'center' : 'placed');
  const slot = (i: number) => (people[i].role === 'president' ? { left: '50%', top: '33%' } : { left: `${boardLeft[i - (p.president ? 1 : 0)]}%`, top: '77%' });

  // ---------- pictures ----------
  const load = (src: string | null) => new Promise<HTMLImageElement | null>(r => { if (!src) return r(null); const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
  const F = 'system-ui, -apple-system, "Segoe UI", "Noto Sans Thai", sans-serif';
  const save = (cv: HTMLCanvasElement, name: string) => cv.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
  const fit = (g: CanvasRenderingContext2D, txt: string, max: number, size: number, w: number) => { let s = size; do { g.font = `${w} ${s}px ${F}`; s -= 2; } while (g.measureText(txt).width > max && s > 14); };
  const circle = async (g: CanvasRenderingContext2D, x: number, y: number, r: number, who: P, ring: string) => {
    const im = await load(who.photo);
    g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.closePath(); g.fillStyle = '#0b1026'; g.fill(); g.lineWidth = Math.max(6, r * 0.05); g.strokeStyle = ring; g.stroke(); g.clip();
    if (im) { const s = Math.max((2 * r) / im.width, (2 * r) / im.height); g.drawImage(im, x - (im.width * s) / 2, y - (im.height * s) / 2, im.width * s, im.height * s); }
    else { g.fillStyle = '#fff'; g.font = `800 ${Math.round(r * 0.8)}px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ini(who.name), x, y + 4); }
    g.restore(); g.textBaseline = 'alphabetic';
  };
  const drawCrown = (g: CanvasRenderingContext2D, x: number, y: number, w: number) => {
    g.save(); g.translate(x, y); g.rotate(0.35); g.scale(w / 100, w / 100);
    const gr = g.createLinearGradient(0, 0, 100, 70); gr.addColorStop(0, '#ffe9a0'); gr.addColorStop(0.5, '#e6b422'); gr.addColorStop(1, '#b8860b');
    g.fillStyle = gr; g.strokeStyle = '#8a6508'; g.lineWidth = 3; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(8, 58); g.lineTo(3, 14); g.lineTo(29, 35); g.lineTo(50, 6); g.lineTo(71, 35); g.lineTo(97, 14); g.lineTo(92, 58); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(8, 58, 84, 11, 3); g.fill(); g.stroke();
    g.fillStyle = '#fff4c2'; for (const [cx, cy] of [[3, 14], [50, 6], [97, 14]]) { g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill(); }
    g.restore();
  };
  // Picture 1 (big-screen "Save picture"): the pyramid, 1920x1080.
  async function pyramidPng() {
    const W = 1920, H = 1080, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d')!;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2b3b7e'); bg.addColorStop(0.65, '#0f1736'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; const tg = g.createLinearGradient(W / 2 - 400, 0, W / 2 + 400, 0); tg.addColorStop(0, '#ffe08a'); tg.addColorStop(0.5, '#ffffff'); tg.addColorStop(1, '#ffe08a');
    g.fillStyle = tg; fit(g, congrats, W - 200, 104, 800); g.fillText(congrats, W / 2, 130);
    g.fillStyle = '#a9b4e8'; fit(g, title, W - 200, 40, 600); g.fillText(title, W / 2, 190);
    const put = async (who: P, x: number, y: number, r: number, role: string, ring: string) => {
      await circle(g, x, y, r, who, ring); g.textAlign = 'center';
      g.fillStyle = '#fff'; fit(g, who.name, r * 3.4, Math.round(r * 0.34), 800); g.fillText(who.name, x, y + r + r * 0.42);
      g.fillStyle = '#a9b4e8'; fit(g, role, r * 3.4, Math.round(r * 0.22), 600); g.fillText(role, x, y + r + r * 0.74);
    };
    if (p.president) { await put(p.president, W / 2, 440, 140, roleLabel('president'), '#d93a2f'); drawCrown(g, W / 2 + 60, 215, 150); }
    for (const [i, b] of p.board.entries()) await put(b, (W * boardLeft[i]) / 100, 800, 110, roleLabel('board'), '#d93a2f');
    save(cv, 'atsa-results-bigscreen.png');
  }
  // Picture 2 (Results page "Save as picture"): the same look as the Results page, portrait, ready to post.
  async function pagePng() {
    const W = 1080, H = Math.max(1350, 700 + p.board.length * 190 + 120), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d')!;
    g.fillStyle = '#f6f7fb'; g.fillRect(0, 0, W, H); g.fillStyle = '#d93a2f'; g.fillRect(0, 0, W, 16);
    g.textAlign = 'center'; g.fillStyle = '#d93a2f'; fit(g, congrats, W - 120, 92, 800); g.fillText(congrats, W / 2, 150);
    g.fillStyle = '#1b2a5e'; fit(g, title, W - 120, 40, 700); g.fillText(title, W / 2, 215);
    const head = (txt: string, y: number) => { g.fillStyle = '#d93a2f'; g.fillRect(60, y - 36, 8, 48); g.fillStyle = '#1b2a5e'; g.textAlign = 'left'; g.font = `800 42px ${F}`; g.fillText(txt, 86, y); };
    const card = async (who: P, y: number, role: string, first: boolean) => {
      g.fillStyle = '#ffffff'; g.strokeStyle = first ? '#d93a2f' : '#e1e4ee'; g.lineWidth = first ? 5 : 3; g.beginPath(); g.roundRect(60, y, W - 120, 170, 34); g.fill(); g.stroke();
      await circle(g, 160, y + 85, 62, who, first ? '#d93a2f' : '#cfd4e6'); g.textAlign = 'left';
      g.fillStyle = '#14182b'; fit(g, who.name, W - 380, 46, 800); g.fillText(who.name, 250, y + 88);
      g.fillStyle = '#5d6480'; g.font = `600 30px ${F}`; g.fillText(role, 250, y + 132);
    };
    let y = 330; head(roleLabel('president'), y);
    if (p.president) await card(p.president, y + 30, roleLabel('president'), true);
    y = 600; head(t('Board members', 'สมาชิกบอร์ด'), y);
    for (const [i, b] of p.board.entries()) await card(b, y + 30 + i * 190, roleLabel('board'), false);
    g.textAlign = 'center'; g.fillStyle = '#5d6480'; g.font = `600 28px ${F}`; g.fillText(title, W / 2, H - 50);
    save(cv, 'atsa-results.png');
  }

  return <>
    <div className="bar" style={{ justifyContent: 'center' }}>
      <button className="btn" onClick={() => { reset(); setOpen(true); }}>{t('Present on big screen', 'แสดงบนจอใหญ่')}</button>
      <button className="btn alt" onClick={pagePng}>{t('Save as picture', 'บันทึกเป็นรูปภาพ')}</button></div>
    {open && <div className="stage" onClick={next}>
      <div className="stbar" onClick={e => e.stopPropagation()}>
        <button onClick={() => setAuto(a => !a)}>{auto ? t('Pause (P)', 'หยุด (P)') : t('Auto-play (P)', 'เล่นอัตโนมัติ (P)')}</button>
        <button onClick={reset}>{t('Replay (R)', 'เล่นใหม่ (R)')}</button><button onClick={() => { setIdx(n); setPhase('placed'); }}>{t('Show all', 'แสดงทั้งหมด')}</button>
        <button onClick={fs}>{t('Full screen (F)', 'เต็มจอ (F)')}</button><button onClick={pyramidPng}>{t('Save picture', 'บันทึกรูป')}</button><button onClick={close}>{t('Close (Esc)', 'ปิด (Esc)')}</button></div>
      <div className="sthead"><h1>{congrats}</h1><p>{title}</p></div>
      <div className="arena">{people.map((who, i) => <div key={who.id + who.role} className={`pc ${state(i)}${who.role === 'president' ? ' pres' : ''}`} style={slot(i)}>
        <div className="pcw"><div className="pcc">{who.photo ? <img src={who.photo} alt="" /> : ini(who.name)}</div>{who.role === 'president' && i < idx && <Crown />}</div>
        <div className="pcn">{who.name}</div><div className="pcr">{roleLabel(who.role)}</div></div>)}</div>
      <div className="sthint">{idx === 0 ? t('Press Space or click to start', 'กด Space หรือคลิก เพื่อเริ่ม') : idx < n || phase === 'center' ? t('Press Space or click for the next name', 'กด Space หรือคลิก เพื่อชื่อถัดไป') : t('Congratulations to everyone!', 'ขอแสดงความยินดีกับทุกคน!')}</div>
      {idx >= 1 && p.president && <div className="confetti">{confetti.map((c, i) => <span key={i} style={{ left: `${c.l}%`, animationDelay: `${c.d}s`, animationDuration: `${c.s}s`, background: c.c, transform: `rotate(${c.r}deg)` }} />)}</div>}
    </div>}
  </>;
}
