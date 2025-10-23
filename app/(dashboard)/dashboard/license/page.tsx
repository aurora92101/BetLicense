import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import LicenseUserTableClient from "./LicenseUserTableClient";
import { getUser } from "@/lib/db/queries";
import { Button } from '@/components/ui/button';

export default async function LicensePage() {
    const session = await getSession();
    if (!session?.user) {
        redirect("/sign-in");
    }
    const user = await getUser();
    return (
        <LicenseUserTableClient user={user} />
    );
}
