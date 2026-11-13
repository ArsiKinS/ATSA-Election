import { redirect } from 'next/navigation';
import AdminApp from '@/components/AdminApp';
import { getSession } from '@/lib/session';
export default async function AdminHome() {
  if (!(await getSession('admin'))) redirect('/admin/login');
  return <AdminApp />;
}
