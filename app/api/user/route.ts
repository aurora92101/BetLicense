import { getUser } from '@/lib/db/queries';
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const user = await getUser();
   if (!user) {
    // 여기서는 쿠키 삭제 가능
    (await cookies()).delete("session");
    return NextResponse.json(null, { status: 401 });
  }
  return Response.json(user);
}
