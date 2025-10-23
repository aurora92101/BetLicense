import { db } from './drizzle';
import { users, bookie, licenseKey, price } from "@/lib/db/schema";
import { isNull, eq, asc, and, gt, lt } from "drizzle-orm";
import { alias } from 'drizzle-orm/pg-core';
import { hashPassword } from "@/lib/auth/session";
import { permission } from 'process';

// 전체 라이선스 조회
export async function getAllLicense(status = "Live", substatus = "Running", userId : number = -1) {
  console.log(`🟢 GET: status=${status}, substatus=${substatus}, userId=${userId}`);
  const introducer = alias(users, "introducer");
  const now = new Date();

  console.log(`status=${status}, substatus=${substatus}`);

  const filters: any[] = [];

  // Live 상태 처리
  if (status === "Live") {
    filters.push(eq(licenseKey.isBlocked, false));
    filters.push(gt(licenseKey.endTime, now));

    if (substatus === "Running") {
      filters.push(eq(licenseKey.isRunning, true));
    } else if (substatus === "Closed") {
      filters.push(eq(licenseKey.isRunning, false));
    } else if (substatus === "All") {
      // Live + All: isRunning 조건 없음
    }
  } else if (status === "Expired") {
    filters.push(eq(licenseKey.isBlocked, false));
    filters.push(lt(licenseKey.endTime, now));
  } else if (status === "Blocked") {
    filters.push(eq(licenseKey.isBlocked, true));
  } // "All"은 필터 없음

  if (userId >= 0) {
    filters.push(eq(licenseKey.userId, userId));
  }
  // 바로 체이닝 실행
  const results = await db
    .select({
      id: licenseKey.id,
      userId: licenseKey.userId,
      userEmail: users.email,
      bookieId: licenseKey.bookieId,
      bookieName: bookie.bookieName,
      keyName: licenseKey.keyName,
      introducerId: licenseKey.introducerId,
      introducerEmail: introducer.email,
      purchaseRoute: licenseKey.purchaseRoute,
      usePeriod: licenseKey.usePeriod,
      startTime: licenseKey.startTime,
      endTime: licenseKey.endTime,
      lastUsedTime: licenseKey.lastUsedTime,
      isRunning: licenseKey.isRunning,
      isBlocked: licenseKey.isBlocked,
    })
    .from(licenseKey)
    .leftJoin(users, eq(users.id, licenseKey.userId))
    .leftJoin(introducer, eq(introducer.id, licenseKey.introducerId))
    .leftJoin(bookie, eq(bookie.id, licenseKey.bookieId))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(asc(licenseKey.id))
    .execute();

  console.log(`${results.length} rows fetched`);
  return results;
}

// 단일 유저
export async function getLicenseById(id: number) {
  const introducer = alias(users, 'introducer');
  const [user] = await db
    .select({
      id: licenseKey.id,
      userId: licenseKey.userId,
      userEmail: users.email,
      bookieId: licenseKey.bookieId,
      bookieName: bookie.bookieName,
      keyName: licenseKey.keyName,
      introducerId: licenseKey.introducerId,
      introducerEmail: introducer.email,
      purchaseRoute: licenseKey.purchaseRoute,
      usePeriod: licenseKey.usePeriod,
      startTime: licenseKey.startTime,
      endTime: licenseKey.endTime,
      lastUsedTime: licenseKey.lastUsedTime,
      isRunning: licenseKey.isRunning,
      isBlocked: licenseKey.isBlocked,
    })
    .from(licenseKey)
    .leftJoin(users, eq(users.id, licenseKey.userId))
    .leftJoin(introducer, eq(introducer.id, licenseKey.introducerId))
    .leftJoin(bookie, eq(bookie.id, licenseKey.bookieId))
    .where(
      and(
        eq(licenseKey.id, id),  
        eq(licenseKey.isBlocked, false)
      )
    );
  return user;
}

export async function createLicense(
  {
    userId,
    bookieId,
    keyName,
    introducerId,
    purchaseRoute,
    usePeriod,
    startTime,
    endTime,
  }: {
    userId?: number;
    bookieId?: number;
    keyName?: string;
    introducerId?: number;
    purchaseRoute?: string;
    usePeriod?: number;
    startTime?: Date | string | null;
    endTime?: Date | string | null;
  }
) {
  console.log("createLicense payload:", JSON.stringify({
  userId,
  bookieId,
  keyName,
  introducerId,
  purchaseRoute,
  usePeriod,
  startTime,
  endTime,
}, null, 2));

  // 안전한 Date 변환 유틸
  const safeDate = (v: any) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const createData: any = {};
  if (userId !== undefined) createData.userId = userId;
  if (bookieId !== undefined) createData.bookieId = bookieId;
  if (keyName !== undefined) createData.keyName = keyName;
  if (introducerId !== undefined) createData.introducerId = introducerId;
  if (purchaseRoute !== undefined) createData.purchaseRoute = purchaseRoute;
  if (usePeriod !== undefined) createData.usePeriod = usePeriod;

  // Date 변환 적용
  if (startTime !== undefined) createData.startTime = safeDate(startTime);
  if (endTime !== undefined) createData.endTime = safeDate(endTime);

  createData.lastUsedTime = new Date();
  createData.isBlocked = false;
  createData.isRunning = false;

  const [createdKey] = await db
  .insert(licenseKey)
  .values(createData)
  .returning({
    id: licenseKey.id,
    userId: licenseKey.userId,
    bookieId: licenseKey.bookieId,
    introducerId: licenseKey.introducerId,
  });


  if (!createdKey) return null;

  // join으로 다시 조회
  const introducer = alias(users, 'introducer');

  const [fullData] = await db
    .select({
      id: licenseKey.id,
      userId: licenseKey.userId,
      userEmail: users.email,
      bookieId: licenseKey.bookieId,
      bookieName: bookie.bookieName,
      keyName: licenseKey.keyName,
      introducerId: licenseKey.introducerId,
      introducerEmail: introducer.email,
      purchaseRoute: licenseKey.purchaseRoute,
      usePeriod: licenseKey.usePeriod,
      startTime: licenseKey.startTime,
      endTime: licenseKey.endTime,
      lastUsedTime: licenseKey.lastUsedTime,
      isRunning: licenseKey.isRunning,
      isBlocked: licenseKey.isBlocked,
    })
    .from(licenseKey)
    .leftJoin(users, eq(users.id, licenseKey.userId))
    .leftJoin(introducer, eq(introducer.id, licenseKey.introducerId))
    .leftJoin(bookie, eq(bookie.id, licenseKey.bookieId))
    .where(eq(licenseKey.id, createdKey.id));

  return fullData;
}

// 유저 수정 (name, email만)
export async function updateLicense(
  id: number,
  {
    userId,
    bookieId,
    keyName,
    introducerId,
    purchaseRoute,
    usePeriod,
    startTime,
    endTime,
  }: {
    userId?: number;
    bookieId?: number;
    keyName?: string;
    introducerId?: number;
    purchaseRoute?: string;
    usePeriod?: number;
    startTime?: Date | string | null;
    endTime?: Date | string | null;
  }
) {
  console.log("🧩 updateLicense payload:", JSON.stringify({
  id,
  userId,
  bookieId,
  keyName,
  introducerId,
  purchaseRoute,
  usePeriod,
  startTime,
  endTime,
}, null, 2));

  // 안전한 Date 변환 유틸
  const safeDate = (v: any) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const updateData: any = {};
  if (userId !== undefined) updateData.userId = userId;
  if (bookieId !== undefined) updateData.bookieId = bookieId;
  if (keyName !== undefined) updateData.keyName = keyName;
  if (introducerId !== undefined) updateData.introducerId = introducerId;
  if (purchaseRoute !== undefined) updateData.purchaseRoute = purchaseRoute;
  if (usePeriod !== undefined) updateData.usePeriod = usePeriod;

  // Date 변환 적용
  if (startTime !== undefined) updateData.startTime = safeDate(startTime);
  if (endTime !== undefined) updateData.endTime = safeDate(endTime);

  updateData.updated_at = new Date();

  // DB 업데이트
  const [updatedKey] = await db
    .update(licenseKey)
    .set(updateData)
    .where(eq(licenseKey.id, id))
    .returning({
      id: licenseKey.id,
      userId: licenseKey.userId,
      bookieId: licenseKey.bookieId,
      introducerId: licenseKey.introducerId,
    });

  if (!updatedKey) return null;

  // join으로 다시 조회
  const introducer = alias(users, 'introducer');

  const [fullData] = await db
    .select({
      id: licenseKey.id,
      userId: licenseKey.userId,
      userEmail: users.email,
      bookieId: licenseKey.bookieId,
      bookieName: bookie.bookieName,
      keyName: licenseKey.keyName,
      introducerId: licenseKey.introducerId,
      introducerEmail: introducer.email,
      purchaseRoute: licenseKey.purchaseRoute,
      usePeriod: licenseKey.usePeriod,
      startTime: licenseKey.startTime,
      endTime: licenseKey.endTime,
      lastUsedTime: licenseKey.lastUsedTime,
      isRunning: licenseKey.isRunning,
      isBlocked: licenseKey.isBlocked,
    })
    .from(licenseKey)
    .leftJoin(users, eq(users.id, licenseKey.userId))
    .leftJoin(introducer, eq(introducer.id, licenseKey.introducerId))
    .leftJoin(bookie, eq(bookie.id, licenseKey.bookieId))
    .where(eq(licenseKey.id, updatedKey.id));

  return fullData;
}


// 유저 삭제 (deletedAt에 timestamp 기록)
export async function blockLicense( id: number, reason: string, isBlocked: boolean ) {
  const [deleted] = await db
    .update(licenseKey)
    .set({ 
      lastUsedTime: new Date(),
      isBlocked: isBlocked,
      isRunning: false,
      comment: reason,
    })
    .where(eq(licenseKey.id, id))
    .returning({
      id: licenseKey.id,
    });
  return deleted;
}

// permission 필드 변경
export async function updateRunningState(id: number, isRunning: boolean) {
  const [updated] = await db
    .update(licenseKey)
    .set({ isRunning })
    .where(eq(licenseKey.id, id))
    .returning({
      id: licenseKey.id,
      isRunning: licenseKey.isRunning
    });
  return updated;
}

// Change UserRome (권한변경)
export async function updateUserRole(id: number, role: string) {
  const [updated] = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      first_name: users.last_name,
      last_name: users.last_name,
      role: users.role,
      email: users.email,
      permission: users.permission,
    });
    return updated;
}

export async function invalidateUserSessions(userId: number) {
  // permission을 false로 바꿔서 로그인 금지
  const [updated] = await db
    .update(users)
    .set({ permission: false })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}