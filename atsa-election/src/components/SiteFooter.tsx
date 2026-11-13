import Link from 'next/link';
import { Bi } from './Lang';
export default function SiteFooter({ short, name, year }: { short: string; name: string; year: number }) {
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return <footer className="foot"><div className="in">
    <div className="brand"><img src="/api/logo" alt="" /><b>{short}</b></div>
    <p style={{ color: 'var(--muted)', marginTop: 10 }}><Bi en="Vote for your board in a few taps." th="โหวตเลือกคณะกรรมการได้ในไม่กี่ขั้นตอน" /></p>
    <div className="cols">
      <div><h4><Bi en="Election" th="การเลือกตั้ง" /></h4><Link href="/candidates"><Bi en="Candidates" th="ผู้สมัคร" /></Link><Link href="/vote"><Bi en="Vote" th="โหวต" /></Link><Link href="/results"><Bi en="Results" th="ผลคะแนน" /></Link></div>
      <div><h4><Bi en="Get help" th="ขอความช่วยเหลือ" /></h4><Link href="/help"><Bi en="How voting works" th="วิธีการโหวต" /></Link>{contact && <a href={`mailto:${contact}`}><Bi en="Contact the committee" th="ติดต่อคณะกรรมการ" /></a>}</div>
      <div><h4><Bi en="Organisation" th="หน่วยงาน" /></h4><span className="l">{name}</span><span className="l">Albukhary International University</span></div>
    </div>
    <div className="base"><span>© {year} {short}</span><span><Bi en="Ballots are anonymous: no name is stored with a vote." th="บัตรเลือกตั้งไม่ระบุตัวตน ไม่มีการเก็บชื่อไว้กับคะแนน" /></span></div>
  </div></footer>;
}
