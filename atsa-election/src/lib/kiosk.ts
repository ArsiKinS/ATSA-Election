import { getSession } from './session';
// A computer counts as a polling-station computer only while its cookie matches the current "epoch".
// Pressing "Deactivate all polling-station computers" in admin raises the epoch and invalidates every cookie at once.
export async function isKiosk(e: { kiosk_epoch?: number | null }) {
  const s = await getSession<{ ep?: number }>('kiosk');
  return !!s && (s.ep ?? 0) === (e.kiosk_epoch ?? 0);
}
