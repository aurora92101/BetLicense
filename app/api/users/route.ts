import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getAllUsers,
  getUserById,
  getUserForLicense,
//   createUser,
  updateUser,
  deleteUser,
  updateUserPermission,
  updateUserRole,
} from "@/lib/db/users";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const flag = url.searchParams.get("flag");
  if (flag === "1") {
    const users = await getUserForLicense();
    return NextResponse.json(users);
  }
  if (id) {
    const user = await getUserById(Number(id));
    return NextResponse.json(user);
  } else {
    const users = await getAllUsers();
    return NextResponse.json(users);
  }
}

// export async function POST(req: Request) {
//   const body = await req.json();
//   const user = await createUser(body);
//   return NextResponse.json(user, { status: 201 });
// }

// export async function PUT(req: Request) {
//   const body = await req.json();
//   const { id, ...rest } = body;
//   const updated = await updateUser(Number(id), rest);
//   return NextResponse.json(updated);
// }

export async function PUT(req: Request) {
  const body = await req.json();
  const { id, first_name, last_name, role, email, permission } = body;

  if (permission !== undefined) {
    const updated = await updateUserPermission(Number(id), permission);
    return NextResponse.json(updated);
  }
  else if ( role !== undefined) {
    const updated = await updateUserRole(Number(id), role);
    return NextResponse.json(updated);
  }

  // 기본 update (name/email)
  const updated = await updateUser(Number(id), { first_name, last_name, email });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const deleted = await deleteUser(Number(id));
  return NextResponse.json(deleted);
}