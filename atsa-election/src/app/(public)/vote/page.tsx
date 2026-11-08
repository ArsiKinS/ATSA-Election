import VoteClient from '@/components/VoteClient';
import { Bi } from '@/components/Lang';
import { q } from '@/lib/db';
import { fmtMYT, getElection, statusOf } from '@/lib/election';
import { getSession } from '@/lib/session';
import { pubKey } from '@/lib/signer';

export default async function VotePage() {
  const e = await getElection();
  if (!e) return <div className="note r">The election is not set up yet.</div>;
  const s = statusOf(e);
  if (s !== 'open') return <div className="note r">{s === 'upcoming'
    ? <Bi en={`Voting opens ${fmtMYT(e.open_at)}.`} th={`เปิดโหวต ${fmtMYT(e.open_at)}`} />
    : <Bi en="Voting is closed." th="ปิดโหวตแล้ว" />}</div>;
  const sess = await getSession<{ vid: number }>('voter');
  const [positions, candidates, v] = await Promise.all([
    q<{ id: number; name_en: string; name_th: string }>('SELECT id,name_en,name_th FROM positions ORDER BY sort,id'),
    q<{ id: number; name: string; photo: string | null; bio: string; manifesto: string }>('SELECT id,name,photo,bio,manifesto FROM candidates ORDER BY sort,id'),
    sess ? q<{ issued: boolean }>('SELECT blinded_msg IS NOT NULL AS issued FROM voters WHERE id=$1', [sess.vid]) : Promise.resolve([]),
  ]);
  if (!candidates.length || !positions.length) return <div className="note"><Bi en="The ballot is not ready yet." th="บัตรเลือกตั้งยังไม่พร้อม" /></div>;
  const k = pubKey();
  return <VoteClient positions={positions} candidates={candidates} n={k.n} e={k.e} signedIn={v.length > 0} issued={!!v[0]?.issued} />;
}
