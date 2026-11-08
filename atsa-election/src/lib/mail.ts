import nodemailer from 'nodemailer';
/** Sends the sign-in link. Order: SMTP (e.g. a Gmail app password) -> Resend -> console (development only). */
export async function sendMail(to: string, subject: string, text: string) {
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    await t.sendMail({ from: process.env.MAIL_FROM ?? process.env.SMTP_USER, to, subject, text });
    return;
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.log(`[mail:dev] to=${to} subject=${subject}\n${text}`); return; }
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, text }) });
  if (!r.ok) throw new Error('mail provider rejected the message');
}
