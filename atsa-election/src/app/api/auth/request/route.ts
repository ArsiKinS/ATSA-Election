import { z } from 'zod';
import { createHash, randomBytes } from 'node:crypto';
import { q } from '@/lib/db';
import { handler, json } from '@/lib/http';
import { sendMail } from '@/lib/mail';

// Always answers "ok" so the form cannot be used to discover who is on the voter list.
export const POST = handler(async req => {
  const { email } = z.object({ email: z.string().trim().toLowerCase().email().max(200) }).parse(await req.json());
  const [v] = await q<{ id: number }>('SELECT id FROM voters WHERE email=$1', [email]);
  if (v) {
    const [{ n }] = await q<{ n: number }>("SELECT count(*)::int n FROM login_tokens WHERE voter_id=$1 AND created_at>now()-interval '1 hour'", [v.id]);
    if (n < 5) { // rate limit: 5 links per hour per voter
      const token = randomBytes(32).toString('hex');
      await q("INSERT INTO login_tokens(token_hash,voter_id,expires_at) VALUES($1,$2,now()+interval '15 minutes')", [createHash('sha256').update(token).digest('hex'), v.id]);
      const link = `${process.env.APP_URL}/vote/signin?token=${token}`;
      await sendMail(email, 'Your ATSA election sign-in link', `Open this link to continue to the ballot (valid 15 minutes, works once):\n${link}\n\nลิงก์นี้ใช้ได้ 15 นาที และใช้ได้ครั้งเดียว`);
    }
  }
  return json({ ok: true });
});
