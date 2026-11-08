import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? '');
type Name = 'voter' | 'admin';
export async function setSession(name: Name, payload: Record<string, unknown>, maxAge: number) {
  if ((process.env.SESSION_SECRET ?? '').length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  const jwt = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${maxAge}s`).sign(key());
  (await cookies()).set('atsa_' + name, jwt, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: name === 'admin' ? 'strict' : 'lax', path: '/', maxAge });
}
export async function getSession<T>(name: Name): Promise<T | null> {
  const c = (await cookies()).get('atsa_' + name)?.value;
  if (!c) return null;
  try { return (await jwtVerify(c, key(), { algorithms: ['HS256'] })).payload as T; } catch { return null; }
}
export async function clearSession(name: Name) { (await cookies()).delete('atsa_' + name); }
