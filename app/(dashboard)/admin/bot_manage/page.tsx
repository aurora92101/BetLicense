import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import BotTableClient from "./BotTableClient";

export default async function AdminBotPage() {
    const session = await getSession();
    if (!session?.user) {
        redirect("/sign-in");
    }
    return (
        <div className="p-1">
            <h1 className="text-2xl font-bold mb-6">Bot Management</h1>
            <BotTableClient />
        </div>
    );
}
