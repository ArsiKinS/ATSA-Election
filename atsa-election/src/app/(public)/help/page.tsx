import { Bi } from '@/components/Lang';
export default function Help() {
  return <div className="help"><h2><Bi en="How voting works" th="วิธีการโหวต" /></h2>
    <ul>
      <li><Bi en="Only members on the voter list can vote, and each person can vote once." th="เฉพาะสมาชิกที่อยู่ในรายชื่อเท่านั้นที่โหวตได้ และโหวตได้คนละหนึ่งครั้ง" /></li>
      <li><Bi en="Enter your email. We send you a one-time sign-in link." th="กรอกอีเมลของคุณ ระบบจะส่งลิงก์เข้าสู่ระบบแบบใช้ครั้งเดียวให้" /></li>
      <li><Bi en="Vote one position at a time, starting with President. Someone you already chose is not shown again." th="โหวตทีละตำแหน่ง เริ่มจากประธาน ผู้สมัครที่คุณเลือกไปแล้วจะไม่แสดงซ้ำ" /></li>
      <li><Bi en="Your email is used only to check you are eligible and to stop double voting. Your ballot is stored separately, without your email." th="อีเมลใช้เพื่อตรวจสิทธิ์และกันการโหวตซ้ำเท่านั้น บัตรเลือกตั้งถูกเก็บแยกต่างหาก ไม่ผูกกับอีเมลของคุณ" /></li>
      <li><Bi en="Results stay hidden until the official announcement." th="ผลคะแนนจะซ่อนไว้จนถึงเวลาประกาศอย่างเป็นทางการ" /></li>
    </ul></div>;
}
