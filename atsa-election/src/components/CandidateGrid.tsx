'use client';
import { useEffect, useState } from 'react';
import { useT } from './Lang';
export type Cand = { id: number; name: string; photo: string | null; bio: string; manifesto: string; no?: number };
const ini = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2);

// The details window, used on the Candidates page and on the ballot (the "Details" button).
export function CandidateSheet({ c, onClose }: { c: Cand; onClose: () => void }) {
  const t = useT();
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [onClose]);
  return <div className="ov" role="dialog" aria-modal="true" aria-label={c.name} onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="sheet"><button className="x" aria-label={t('Close', 'ปิด')} onClick={onClose}>✕</button>
      <div className="ph">{c.photo ? <img src={c.photo} alt="" /> : ini(c.name)}</div><h3>{c.name}</h3>
      {c.no ? <span className="chip">{t('No.', 'เบอร์')} {c.no}</span> : null}
      <h4>{t('About', 'ประวัติ')}</h4><p>{c.bio || '—'}</p><h4>{t('Campaign statement', 'นโยบาย')}</h4><p>{c.manifesto || '—'}</p></div></div>;
}

export default function CandidateGrid({ items }: { items: Cand[] }) {
  const [i, setI] = useState<number | null>(null), t = useT();
  return <>
    <div className="grid">{items.map((x, k) => <button key={x.id} className="cand" onClick={() => setI(k)}>
      <div className="ph">{x.photo ? <img src={x.photo} alt="" /> : ini(x.name)}</div><h3>{x.name}</h3>
      {x.no ? <span className="chip">{t('No.', 'เบอร์')} {x.no}</span> : null}<small>{t('Tap to view', 'แตะเพื่อดู')}</small></button>)}</div>
    {i !== null && <CandidateSheet c={items[i]} onClose={() => setI(null)} />}
  </>;
}
