"use client";

import UsersTable from "@/components/table/UsersTable";

export default function UsersTableClient({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  return <UsersTable isSuperAdmin={isSuperAdmin} />;
}