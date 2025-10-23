'use client'

import AdminRoomSidebar from '@/components/admin/AdminRoomSidebar'

export default function AdminRoomsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex bg-slate-50/70 dark:bg-slate-900/60">
      <AdminRoomSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
