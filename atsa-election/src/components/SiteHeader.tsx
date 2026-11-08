'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLang, useT } from './Lang';
export default function SiteHeader({ short, name }: { short: string; name: string }) {
  const { lang, set } = useLang(), t = useT(), path = usePathname(), [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const items: [string, string][] = [['/', t('Home', 'หน้าแรก')], ['/candidates', t('Candidates', 'ผู้สมัคร')], ['/vote', t('Vote', 'โหวต')], ['/results', t('Results', 'ผลคะแนน')], ['/help', t('How it works', 'วิธีการโหวต')]];
  return <header>
    <Link href="/" className="brand"><img src="/api/logo" alt="" /><b>{short}<small>{name}</small></b></Link>
    <div className="tools">
      <div className="lang" role="group" aria-label="Language">{(['en', 'th'] as const).map(l => <button key={l} className={lang === l ? 'on' : ''} aria-pressed={lang === l} onClick={() => set(l)}>{l.toUpperCase()}</button>)}</div>
      <button className="burger" aria-label={t('Menu', 'เมนู')} aria-expanded={open} onClick={() => setOpen(!open)}><span /><span /><span /></button>
    </div>
    {open && <div className="menu">{items.map(([h, l]) => <Link key={h} href={h} className={(h === '/' ? path === '/' : path.startsWith(h)) ? 'on' : ''}>{l}</Link>)}</div>}
  </header>;
}
