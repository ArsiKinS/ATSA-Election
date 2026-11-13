'use client';
import Link from 'next/link';
import { useLang } from './Lang';
export default function SiteHeader({ short, name }: { short: string; name: string }) {
  const { lang, set } = useLang();
  return <header>
    <Link href="/" className="brand"><img src="/api/logo" alt="" /><b>{short}<small>{name}</small></b></Link>
    <div className="lang" role="group" aria-label="Language">{(['en', 'th'] as const).map(l => <button key={l} className={lang === l ? 'on' : ''} aria-pressed={lang === l} onClick={() => set(l)}>{l.toUpperCase()}</button>)}</div>
  </header>;
}
