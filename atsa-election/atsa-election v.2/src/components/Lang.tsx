'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
export type Lang = 'en' | 'th';
const Ctx = createContext<{ lang: Lang; set: (l: Lang) => void }>({ lang: 'en', set: () => {} });
export function LangProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initial);
  const set = (l: Lang) => { setLang(l); document.cookie = `atsa_lang=${l};path=/;max-age=31536000;samesite=lax`; document.documentElement.lang = l; };
  return <Ctx.Provider value={{ lang, set }}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);
export const useT = () => { const { lang } = useLang(); return (en: string, th: string) => (lang === 'th' ? th : en); };
/** One language at a time, chosen with the EN / TH switch. */
export const Bi = ({ en, th }: { en: string; th: string }) => <>{useT()(en, th)}</>;
