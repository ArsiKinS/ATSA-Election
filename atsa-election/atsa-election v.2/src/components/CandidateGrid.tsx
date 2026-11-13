'use client';
import { useEffect, useState } from 'react';
import { useT } from './Lang';
export type Cand = { id: number; name: string; photo: string | null; bio: string; manifesto: string; for_president?: boolean };
const ini = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2);
export default function CandidateGrid({ items }: { items: Cand[] }) {
  const [i, setI] = useState<number | null>(null), t = useT();
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && setI(null); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  const c = i === null ? null : items[i];
  return <>
    <div className="grid">{items.map((x, k) => <button key={x.id} className="cand" onClick={() => setI(k)}>
      <div className="ph">{x.photo ? <img src={x.photo} alt="" /> : ini(x.name)}</div><h3>{x.name}</h3>{x.for_president ? <span className="chip">{t('President candidate', 'ผู้สมัครประธาน')}</span> : <small>{t('Tap to view', 'แตะเพื่อดู')}</small>}</button>)}</div>
    {c && <div className="ov" role="dialog" aria-modal="true" aria-label={c.name} onClick={e => e.target === e.currentTarget && setI(null)}>
      <div className="sheet"><button className="x" aria-label={t('Close', 'ปิด')} onClick={() => setI(null)}>✕</button>
        <div className="ph">{c.photo ? <img src={c.photo} alt="" /> : ini(c.name)}</div><h3>{c.name}</h3>
        <h4>{t('About', 'ประวัติ')}</h4><p>{c.bio || '—'}</p><h4>{t('Campaign statement', 'นโยบาย')}</h4><p>{c.manifesto || '—'}</p></div></div>}
  </>;
}
