import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';

export default async function DaashboardPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }
  redirect('/dashboard/license');
}