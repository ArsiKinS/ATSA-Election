import KioskActivate from '@/components/KioskActivate';
export default async function KioskPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return code ? <KioskActivate code={code} /> : <div className="note r">This link is not valid. Ask the election committee for a new one.</div>;
}
