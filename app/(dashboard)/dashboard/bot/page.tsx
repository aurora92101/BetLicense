import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import BotUserTableClient from "./BotUserTableClient";

export default async function UserBotPage() {
    const session = await getSession();
    if (!session?.user) {
        redirect("/sign-in");
    }
    return (
        <div className="p-1">
            <h1 className="text-2xl font-bold mb-6">Bot Page</h1>
            <BotUserTableClient />
        </div>
    );
}
