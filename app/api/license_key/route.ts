import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getAllLicense,
  createLicense,
  updateLicense,
  blockLicense,
  updateRunningState,
  updateUserRole,
} from "@/lib/db/license_key";
import { stat } from "fs";

// GET 요청 핸들러
export async function GET(req: Request) {
  const url = new URL(req.url);

  const userId = url.searchParams.get("userId");
  const isBlocked = url.searchParams.get("isBlocked");
  const endAfterNow = url.searchParams.get("endAfterNow");
  const isRunning = url.searchParams.get("isRunning");
  let licenses = [];
  let status = "";
  let substatus = "";


  // 상태 판별 로직
  if (isBlocked === null) {
    status = "All";
    substatus = "";
  } else if (isBlocked === "true") {
    status = "Blocked";
  } else if (isBlocked === "false") {
    if (endAfterNow === "true") {
      status = "Live";
      if (isRunning === "true") substatus = "Running";
      else if (isRunning === "false") substatus = "Closed";
      else substatus = "All"; // Live / All
    } else if (endAfterNow === "false") {
      status = "Expired";
    }
  }
  
  // 단일 항목 요청
  if (userId) {
    licenses = await getAllLicense(status, substatus, Number(userId));
    return NextResponse.json(licenses);
  }
  else{
    licenses = await getAllLicense(status, substatus);
  }
  return NextResponse.json(licenses);
}

export async function POST(req: Request) {
  const body = await req.json();
  console.log(body);
  const { userId, bookieId, keyName, introducerId, purchaseRoute, usePeriod, startTime, endTime } = body;
  const license = await createLicense({ userId, bookieId, keyName, introducerId, purchaseRoute, usePeriod, startTime, endTime });
  return NextResponse.json(license, { status: 201 });
}

// export async function PUT(req: Request) {
//   const body = await req.json();
//   const { id, ...rest } = body;
//   const updated = await updateUser(Number(id), rest);
//   return NextResponse.json(updated);
// }

export async function PUT(req: Request) {
  const body = await req.json();
  const { id, userId, bookieId, keyName, introducerId, purchaseRoute, usePeriod, startTime, endTime, isRunning } = body;
  if (isRunning !== undefined) {
    const updated = await updateRunningState(Number(id), isRunning);
    return NextResponse.json(updated);
  }
  // 기본 update
  const updated = await updateLicense(Number(id), { userId, bookieId, keyName, introducerId, purchaseRoute, usePeriod, startTime, endTime });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const { reason, isBlocked } = await req.json().catch(() => ({}));

  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  console.log(`🗑️ User ${id} deleted. Reason: ${reason ?? "(none)"}`);

  const deleted = await blockLicense(Number(id), reason, isBlocked);
  return NextResponse.json(deleted);
}