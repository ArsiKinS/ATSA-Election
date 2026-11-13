'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from './Lang';
export default function BottomNav() {
  const p = usePathname(), t = useT();
  const items: [string, string][] = [['/', t('Home', 'หน้าแรก')], ['/candidates', t('Candidates', 'ผู้สมัคร')], ['/vote', t('Vote', 'โหวต')], ['/results', t('Results', 'ผลคะแนน')]];
  return <nav className="tabs" aria-label="Main">{items.map(([h, l]) => <Link key={h} href={h} className={(h === '/' ? p === '/' : p.startsWith(h)) ? 'on' : ''}>{l}</Link>)}</nav>;
}
