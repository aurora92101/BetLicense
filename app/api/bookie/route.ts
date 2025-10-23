import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  createBookie,
  getAllBookie,
  updateActiveState,
  updateBookie,
} from "@/lib/db/bookie";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bookies = await getAllBookie();
  return NextResponse.json(bookies);
}

export async function POST(req: Request) {
  const body = await req.json();
    const { bookieName, botVersion } = body;
    const create = await createBookie({ bookieName, botVersion });
    return NextResponse.json(create);
}

export async function PUT(req: Request) {
  const body = await req.json();
    const { id, bookieName, botVersion, isActive } = body;
    if (isActive !== undefined) {
      const updated = await updateActiveState(Number(id), isActive);
      return NextResponse.json(updated);
    }
    // 기본 update
    const updated = await updateBookie(Number(id), { bookieName, botVersion });
    return NextResponse.json(updated);
}