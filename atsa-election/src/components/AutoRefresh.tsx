'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Re-reads the page from the server every few seconds, so a screen updates by itself (voting opens, results are published).
// Nothing typed or selected on the page is lost: only the server-rendered parts are refreshed.
export default function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) router.refresh(); }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
