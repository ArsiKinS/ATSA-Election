import './globals.css';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { getElection } from '@/lib/election';
import { LangProvider, type Lang } from '@/components/Lang';
export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const e = await getElection();
  return { title: e ? `${e.club_short} ${e.title} ${e.year}` : 'Election' };
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const e = await getElection(), lang: Lang = (await cookies()).get('atsa_lang')?.value === 'th' ? 'th' : 'en';
  const vars = e ? ({ '--c1': e.color_primary, '--c2': e.color_secondary, '--c3': e.color_accent } as React.CSSProperties) : undefined;
  return <html lang={lang} style={vars}><body><LangProvider initial={lang}>{children}</LangProvider></body></html>;
}
