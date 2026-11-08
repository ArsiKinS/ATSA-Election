'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from './Lang';
export default function Countdown({ target }: { target: string }) {
  const [left, setLeft] = useState<number | null>(null), router = useRouter(), t = useT(), refreshed = useRef(false);
  useEffect(() => {
    const end = new Date(target).getTime();
    const tick = () => { const s = Math.max(0, Math.floor((end - Date.now()) / 1000)); setLeft(s); if (s === 0 && !refreshed.current) { refreshed.current = true; router.refresh(); } };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [target, router]);
  const s = left ?? 0, v = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
  const labels = [t('Days', 'วัน'), t('Hrs', 'ชม.'), t('Min', 'นาที'), t('Sec', 'วิ')];
  return <div className="cd">{labels.map((l, i) => <div key={i}><b>{left === null ? '–' : v[i]}</b><span>{l}</span></div>)}</div>;
}
