import { q } from '@/lib/db';
// Serves the club logo from the database, or the bundled ATSA logo if none was uploaded.
export async function GET(req: Request) {
  const [e] = await q<{ logo_data: string | null }>('SELECT logo_data FROM election WHERE id=1').catch(() => []);
  const m = e?.logo_data?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!m) return Response.redirect(new URL('/atsa-logo.png', req.url), 302);
  return new Response(Buffer.from(m[2], 'base64'), { headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=300' } });
}
