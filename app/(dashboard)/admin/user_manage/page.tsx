import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import UsersTableClient from "./UsersTableClient";

export default async function AdminUsersPage() {
    const session = await getSession();
    if (!session?.user) {
        redirect("/sign-in");
    }
    const isSuperAdmin = session.user.role === "super_admin";
    return (
        <div className="p-1">
            <h1 className="text-2xl font-bold mb-6">User Management</h1>
            <UsersTableClient isSuperAdmin = {isSuperAdmin}/>
        </div>
    );
}
