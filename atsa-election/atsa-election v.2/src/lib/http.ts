import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }
/** CSRF defence for cookie-authenticated POSTs: the browser's Origin header must match our host. */
function sameOrigin(req: Request) {
  const o = req.headers.get('origin'), host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try { return !!o && new URL(o).host === host; } catch { return false; }
}
export function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      if (req.method !== 'GET' && !sameOrigin(req)) throw new HttpError(403, 'Bad origin');
      return await fn(req);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      if (err instanceof ZodError) return json({ error: 'Invalid input' }, 400);
      console.error('route error:', (err as Error).message); // never log request bodies
      return json({ error: 'Server error' }, 500);
    }
  };
}
