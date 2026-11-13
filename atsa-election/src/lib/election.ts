import { q } from './db';
export type Election = {
  club_name: string; club_short: string; title: string; title_th: string; year: number; description: string; announcement: string;
  color_primary: string; color_secondary: string; color_accent: string; logo_data: string | null;
  open_at: Date; close_at: Date; results_at: Date; auto_publish: boolean; verified_at: Date | null; published_at: Date | null; board_seats: number; max_ballots: number | null;
};
export type Status = 'upcoming' | 'open' | 'closed' | 'results';
export async function getElection() {
  try { return (await q<Election>('SELECT * FROM election WHERE id=1'))[0] ?? null; } catch { return null; }
}
/** Results are public only after manual publication, or (if auto-publish is on) after verification AND the announcement time. */
export const resultsVisible = (e: Election, now = new Date()) => !!e.published_at || (e.auto_publish && !!e.verified_at && now >= e.results_at);
export function statusOf(e: Election, now = new Date()): Status {
  if (resultsVisible(e, now)) return 'results';
  if (now < e.open_at) return 'upcoming';
  return now < e.close_at ? 'open' : 'closed';
}
export const fmtMYT = (d: Date | string) =>
  new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' }) + ' MYT';
