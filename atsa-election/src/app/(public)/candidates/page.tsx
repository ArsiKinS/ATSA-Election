import CandidateGrid from '@/components/CandidateGrid';
import { Bi } from '@/components/Lang';
import { q } from '@/lib/db';
export default async function Candidates() {
  const items = await q<{ id: number; name: string; photo: string | null; bio: string; manifesto: string }>('SELECT id,name,photo,bio,manifesto FROM candidates ORDER BY sort,id').catch(() => []);
  return <><h2><Bi en="Candidates" th="ผู้สมัคร" /></h2>
    {items.length ? <CandidateGrid items={items} /> : <div className="note"><Bi en="Candidates will be announced soon." th="จะประกาศรายชื่อผู้สมัครเร็ว ๆ นี้" /></div>}</>;
}
