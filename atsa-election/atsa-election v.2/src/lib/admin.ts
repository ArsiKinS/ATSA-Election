import { q } from './db';
import { getSession } from './session';
import { HttpError } from './http';
export type Role = 'SUPER_ADMIN' | 'COMMITTEE' | 'RESULTS_MANAGER';
export const PERMS: Record<Role, string[]> = {
  SUPER_ADMIN: ['stats:view', 'audit:view', 'election:edit', 'candidates:edit', 'kiosk:open', 'remote:manage', 'results:view', 'results:publish', 'admins:manage'],
  COMMITTEE: ['stats:view', 'audit:view', 'election:edit', 'candidates:edit', 'kiosk:open', 'remote:manage'],
  RESULTS_MANAGER: ['stats:view', 'audit:view', 'results:view', 'results:publish'],
};
/** Server-side authorization. The role is read from the database on every request, so changes apply immediately. */
export async function requireAdmin(perm?: string) {
  const s = await getSession<{ aid: number }>('admin');
  const [a] = s ? await q<{ id: number; email: string; role: Role }>('SELECT id,email,role FROM admins WHERE id=$1', [s.aid]) : [];
  if (!a) throw new HttpError(401, 'Sign in required');
  if (perm && !PERMS[a.role].includes(perm)) throw new HttpError(403, 'Your role cannot do this');
  return a;
}
