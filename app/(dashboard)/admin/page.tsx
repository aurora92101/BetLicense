import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';

export default async function AdminPage() {
    const session = await getSession();
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    const user = await getUser();
    
    if ((user?.role === 'admin') || ((user?.role === 'super_admin'))) {
        redirect('/dashboard/license');
    }
    else
    {
        redirect('/admin/user_manage');
    }
    // return (
    //     <div className="flex-1 p-6">
    //     <h1 className="text-2xl font-semibold mb-4">Admin Panel</h1>
    //     <p>Welcome to the admin panel. Here you can manage the application settings and users.</p>
    //     </div>
    // );
}