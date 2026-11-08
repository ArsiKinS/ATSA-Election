// Usage: npm run seed            -> election row, positions, first Super Admin
//        npm run seed -- --demo  -> also 8 demo candidates + 5 demo voters
//        npm run seed -- --demo --open -> and open voting right now (for testing)
import pg from 'pg';
import bcrypt from 'bcryptjs';
const demo = process.argv.includes('--demo'), open = process.argv.includes('--open');
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const H = 36e5, now = Date.now();
const [o, cl, r] = open ? [now - H, now + 24 * H, now + 48 * H] : [now + 24 * H, now + 48 * H, now + 72 * H];
await c.query('INSERT INTO election (id, open_at, close_at, results_at) VALUES (1,$1,$2,$3) ON CONFLICT DO NOTHING', [new Date(o), new Date(cl), new Date(r)]);
const roles = [['President','ประธาน'],['Vice President','รองประธาน'],['Secretary','เลขานุการ'],['Assistant Secretary','ผู้ช่วยเลขานุการ'],['Treasurer','เหรัญญิก'],['Assistant Treasurer','ผู้ช่วยเหรัญญิก'],['Public Relations','ประชาสัมพันธ์'],['Activities','กิจกรรม']];
if (!(await c.query('SELECT 1 FROM positions')).rowCount) for (const [i, [en, th]] of roles.entries()) await c.query('INSERT INTO positions(sort,name_en,name_th) VALUES($1,$2,$3)', [i, en, th]);
const { SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: pw } = process.env;
if (email && pw) await c.query("INSERT INTO admins(email,password_hash,role) VALUES($1,$2,'SUPER_ADMIN') ON CONFLICT DO NOTHING", [email.toLowerCase(), await bcrypt.hash(pw, 12)]);
if (demo) {
  if (!(await c.query('SELECT 1 FROM candidates')).rowCount) for (let i = 1; i <= 8; i++) await c.query('INSERT INTO candidates(sort,name,bio,manifesto) VALUES($1,$2,$3,$4)', [i, 'Candidate ' + i, 'Year 2 · Computer Science. Short introduction goes here.', 'Campaign statement goes here.']);
  for (let i = 1; i <= 5; i++) await c.query('INSERT INTO voters(email) VALUES($1) ON CONFLICT DO NOTHING', [`voter${i}@example.com`]);
}
await c.end();
console.log('Seed done.');
