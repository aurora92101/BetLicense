import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import LicenseTableClient from "./LicenseTableClient";

export default async function AdminLicensePage() {
    const session = await getSession();
    if (!session?.user) {
        redirect("/sign-in");
    }
    return (
        <div className="p-1">
            <h1 className="text-2xl font-bold mb-6">License Key Management</h1>
            <LicenseTableClient />
        </div>
    );
}
