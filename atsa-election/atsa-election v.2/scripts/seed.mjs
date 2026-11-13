// Usage: npm run seed            -> election row and first Super Admin
//        npm run seed -- --demo  -> also 9 demo candidates (2 for President, 7 for the board)
//        npm run seed -- --demo --open -> and open voting right now (for testing)
import pg from 'pg';
import bcrypt from 'bcryptjs';
const demo = process.argv.includes('--demo'), open = process.argv.includes('--open');
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const H = 36e5, now = Date.now();
const [o, cl, r] = open ? [now - H, now + 24 * H, now + 48 * H] : [now + 24 * H, now + 48 * H, now + 72 * H];
await c.query('INSERT INTO election (id, open_at, close_at, results_at) VALUES (1,$1,$2,$3) ON CONFLICT DO NOTHING', [new Date(o), new Date(cl), new Date(r)]);
const { SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: pw } = process.env;
if (email && pw) await c.query("INSERT INTO admins(email,password_hash,role) VALUES($1,$2,'SUPER_ADMIN') ON CONFLICT DO NOTHING", [email.toLowerCase(), await bcrypt.hash(pw, 12)]);
if (demo && !(await c.query('SELECT 1 FROM candidates')).rowCount)
  for (let i = 1; i <= 9; i++) // candidates 1-2 run for President, 3-9 compete for the board seats
    await c.query('INSERT INTO candidates(sort,name,bio,manifesto,for_president,for_board) VALUES($1,$2,$3,$4,$5,$6)', [i, 'Candidate ' + i, 'Year 2 · Computer Science. Short introduction goes here.', 'Campaign statement goes here.', i <= 2, i > 2]);
await c.end();
console.log('Seed done.');
