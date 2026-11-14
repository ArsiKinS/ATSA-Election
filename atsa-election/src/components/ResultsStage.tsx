'use client';
import { useEffect, useMemo, useState } from 'react';
import { useT } from './Lang';
type P = { id: number; name: string; photo: string | null };
const ini = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2);

// "Present on big screen": shows the org chart and reveals the names one by one (Space / click). Also saves the final chart as a picture.
export default function ResultsStage(p: { titleEn: string; titleTh: string; president: P | null; assistant: P | null; board: P[]; pendingSeats: number }) {
  const t = useT(), title = t(p.titleEn, p.titleTh), [open, setOpen] = useState(false), [k, setK] = useState(0);
  const steps = useMemo(() => [...p.board.map((_, i) => 'b' + i), ...(p.assistant ? ['a'] : []), ...(p.president ? ['p'] : [])], [p]);
  const shown = (key: string) => { const i = steps.indexOf(key); return i >= 0 && i < k; };
  const confetti = useMemo(() => Array.from({ length: 90 }, (_, i) => ({ l: Math.random() * 100, d: Math.random() * 1.5, s: 2.6 + Math.random() * 2.6, c: ['#d93a2f', '#f2c230', '#2e8b3a', '#ffffff', '#8fa2ee'][i % 5], r: Math.random() * 360 })), [open]);
  const fs = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
  const close = () => { if (document.fullscreenElement) document.exitFullscreen(); setOpen(false); };

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const h = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); setK(v => Math.min(steps.length, v + 1)); }
      else if (e.key === 'ArrowLeft') setK(v => Math.max(0, v - 1));
      else if (e.key.toLowerCase() === 'r') setK(0);
      else if (e.key.toLowerCase() === 'f') fs();
      else if (e.key === 'Escape') close();
    };
    addEventListener('keydown', h);
    return () => { removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open, steps.length]);

  const card = (key: string, who: P | null, show: boolean, role: string, big?: boolean) => <div key={key} className={`sc${big ? ' big' : ''}${show ? ' on' : ''}`}>
    <div className="sph">{show && who ? (who.photo ? <img src={who.photo} alt="" /> : ini(who.name)) : ''}</div>
    <div className="sn">{show && who ? who.name : '• • •'}</div><div className="sr">{role}</div></div>;
  const pend = (key: string, note: string, role: string) => <div key={key} className="sc on pend"><div className="sph q">?</div><div className="sn">{note}</div><div className="sr">{role}</div></div>;
  const tbd = t('To be announced', 'จะประกาศภายหลัง');

  async function savePng() {
    const W = 1920, H = 1080, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d')!, bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0f1736'); bg.addColorStop(1, '#25346f'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const F = 'system-ui, -apple-system, "Segoe UI", "Noto Sans Thai", sans-serif';
    const load = (src: string | null) => new Promise<HTMLImageElement | null>(r => { if (!src) return r(null); const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
    const fit = (txt: string, max: number, size: number, w: number) => { let s = size; do { g.font = `${w} ${s}px ${F}`; s -= 2; } while (g.measureText(txt).width > max && s > 14); };
    g.textAlign = 'center'; g.fillStyle = '#fff'; fit(title, W - 160, 62, 800); g.fillText(title, W / 2, 100);
    async function person(x: number, y: number, r: number, who: P | null, role: string, label?: string) {
      const im = who ? await load(who.photo) : null;
      g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.closePath(); g.fillStyle = '#0b0b10'; g.fill(); g.lineWidth = 8; g.strokeStyle = who ? '#d93a2f' : '#f2c230'; g.stroke(); g.clip();
      if (im) { const s = Math.max((2 * r) / im.width, (2 * r) / im.height); g.drawImage(im, x - (im.width * s) / 2, y - (im.height * s) / 2, im.width * s, im.height * s); }
      else { g.fillStyle = who ? '#fff' : '#f2c230'; g.font = `800 ${Math.round(r * 0.9)}px ${F}`; g.textBaseline = 'middle'; g.fillText(who ? ini(who.name) : '?', x, y + 4); }
      g.restore(); g.textBaseline = 'alphabetic'; g.textAlign = 'center';
      g.fillStyle = '#fff'; fit(label ?? who?.name ?? '', r * 3.2, Math.round(r * 0.34), 800); g.fillText(label ?? who?.name ?? '', x, y + r + r * 0.45);
      g.fillStyle = '#a9b4e8'; fit(role, r * 3.2, Math.round(r * 0.22), 600); g.fillText(role, x, y + r + r * 0.78);
    }
    if (p.president) await person(480, 360, 140, p.president, t('President', 'ประธาน')); else await person(480, 360, 140, null, t('President', 'ประธาน'), tbd);
    g.fillStyle = '#a9b4e8'; g.font = `700 54px ${F}`; g.fillText('↓', 480, 700);
    if (p.assistant) await person(480, 830, 95, p.assistant, t('Assistant Secretary', 'ผู้ช่วยเลขานุการ'));
    const slots: (P | null)[] = [...p.board, ...Array(p.pendingSeats).fill(null), null].slice(0, 4);
    const xy = [[1200, 380], [1620, 380], [1200, 790], [1620, 790]];
    for (const [i, w] of slots.entries()) await person(xy[i][0], xy[i][1], 95, w, w ? t('Board member', 'สมาชิกบอร์ด') : t('Assistant Secretary · the committee will decide', 'ผู้ช่วยเลขานุการ · คณะกรรมการจะตัดสิน'), w ? undefined : tbd);
    cv.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'atsa-results.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
  }

  return <>
    <div className="bar"><button className="btn" onClick={() => { setK(0); setOpen(true); }}>{t('Present on big screen', 'แสดงบนจอใหญ่')}</button>
      <button className="btn alt" onClick={savePng}>{t('Save as picture', 'บันทึกเป็นรูปภาพ')}</button></div>
    {open && <div className="stage" onClick={() => setK(v => Math.min(steps.length, v + 1))}>
      <div className="stbar" onClick={e => e.stopPropagation()}>
        <button onClick={() => setK(0)}>{t('Replay (R)', 'เล่นใหม่ (R)')}</button><button onClick={() => setK(steps.length)}>{t('Show all', 'แสดงทั้งหมด')}</button>
        <button onClick={fs}>{t('Full screen (F)', 'เต็มจอ (F)')}</button><button onClick={savePng}>{t('Save picture', 'บันทึกรูป')}</button><button onClick={close}>{t('Close (Esc)', 'ปิด (Esc)')}</button></div>
      <div className="sttitle">{title}</div>
      <div className="chart">
        <div className="col1">
          {p.president ? card('p', p.president, shown('p'), t('President', 'ประธาน'), true) : pend('p', tbd, t('President', 'ประธาน'))}
          {p.assistant && <><div className="arrow">↓</div>{card('a', p.assistant, shown('a'), t('Assistant Secretary', 'ผู้ช่วยเลขานุการ'))}</>}
        </div>
        <div className="col2">
          {p.board.map((b, i) => card('b' + i, b, shown('b' + i), t('Board member', 'สมาชิกบอร์ด')))}
          {Array.from({ length: p.pendingSeats }, (_, i) => pend('t' + i, t('Tie: the committee decides', 'เท่ากัน คณะกรรมการตัดสิน'), t('Board member', 'สมาชิกบอร์ด')))}
          {pend('last', tbd, t('Assistant Secretary · the committee will decide', 'ผู้ช่วยเลขานุการ · คณะกรรมการจะตัดสิน'))}
        </div>
      </div>
      <div className="sthint">{k < steps.length ? t('Press Space, → or click to reveal the next name', 'กด Space, → หรือคลิก เพื่อเปิดเผยชื่อถัดไป') : t('All names revealed', 'เปิดเผยครบทุกคนแล้ว')}</div>
      {shown('p') && <div className="confetti">{confetti.map((c, i) => <span key={i} style={{ left: `${c.l}%`, animationDelay: `${c.d}s`, animationDuration: `${c.s}s`, background: c.c, transform: `rotate(${c.r}deg)` }} />)}</div>}
    </div>}
  </>;
}
