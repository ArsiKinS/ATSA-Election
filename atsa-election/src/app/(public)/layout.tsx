import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { getElection } from '@/lib/election';
// The PUBLIC site (voters). It has no link to the admin area.
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const e = await getElection(), short = e?.club_short ?? 'ATSA', name = e?.club_name ?? 'AIU Thai Student Association';
  return <><SiteHeader short={short} name={name} /><main>{children}</main><SiteFooter short={short} name={name} year={e?.year ?? new Date().getFullYear()} /></>;
}
