import { handler, json } from '@/lib/http';
import { clearSession } from '@/lib/session';
export const POST = handler(async () => { await clearSession('voter'); return json({ ok: true }); });
