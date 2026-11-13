import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Election admin', robots: { index: false, follow: false } };
// The ADMIN area. Separate layout, separate login cookie (SameSite=Strict), role checks on the server.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="adm"><div className="admbar">Election admin</div><main>{children}</main></div>;
}
