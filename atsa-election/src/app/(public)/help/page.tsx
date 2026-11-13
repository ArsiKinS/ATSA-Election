import { Bi } from '@/components/Lang';
export default function Help() {
  return <div className="help"><h2><Bi en="How voting works" th="วิธีการโหวต" /></h2>
    <ul>
      <li><Bi en="Voting takes place on the computer at the polling station. Show your ID to the staff, who check your name on the voter list." th="การโหวตทำที่คอมพิวเตอร์ ณ จุดเลือกตั้ง แสดงบัตรให้เจ้าหน้าที่ตรวจชื่อในรายชื่อผู้มีสิทธิ์" /></li>
      <li><Bi en="Choose one President, then choose your board members. Review your choices and press Submit." th="เลือกประธาน 1 คน แล้วเลือกสมาชิกบอร์ด ตรวจสอบแล้วกดส่ง" /></li>
      <li><Bi en="Your ballot has no name, email or time stored with it, so nobody can tell who you voted for." th="บัตรของคุณไม่มีชื่อ อีเมล หรือเวลาเก็บไว้ จึงไม่มีใครรู้ว่าคุณเลือกใคร" /></li>
      <li><Bi en="The screen clears for the next voter after you submit." th="หลังส่งแล้ว หน้าจอจะล้างข้อมูลสำหรับผู้โหวตคนถัดไป" /></li>
      <li><Bi en="Only the President, the Assistant Secretary and the board members are announced. Vote counts stay with the election committee." th="ประกาศเฉพาะประธาน ผู้ช่วยเลขานุการ และสมาชิกบอร์ด คะแนนอยู่กับคณะกรรมการจัดการเลือกตั้งเท่านั้น" /></li>
    </ul></div>;
}
