import { db } from './drizzle';
import { users } from "@/lib/db/schema";
import { isNull, eq, asc } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/session";
import { permission } from 'process';

// 모든 유저 가져오기 (삭제 안 된 것만)
export async function getAllUsers() {
  return db
    .select({
      id: users.id,
      first_name: users.first_name,
      last_name: users.last_name,
      email: users.email,
      role: users.role,
      deletedAt: users.deletedAt,
      permission: users.permission,
    })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.id));
}
// 모든 유저 가져오기 (삭제 된 것포함)
export async function getUserForLicense() {
  return db
    .select({
      id: users.id,
      email: users.email,
    })
    .from(users)
    .orderBy(asc(users.id));
}

// 단일 유저
export async function getUserById(id: number) {
  const [user] = await db
    .select({
      id: users.id,
      first_name: users.first_name,
      last_name: users.last_name,
      role: users.role,
      email: users.email,
      deletedAt: users.deletedAt,
      permission: users.permission,
    })
    .from(users)
    .where(eq(users.id, id));
  return user;
}

// 유저 수정 (name, email만)
export async function updateUser(
  id: number,
  { first_name, last_name, email }: { first_name?: string; last_name?: string; email?: string }
) {
  const updateData: any = {};
  if (first_name !== undefined) updateData.first_name = first_name;
  if (last_name !== undefined) updateData.last_name = last_name;
  if (email !== undefined) updateData.email = email;
  updateData.updated_at = new Date();
  
  const [updated] = await db
    .update(users)
    .set(updateData)
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

// 유저 삭제 (deletedAt에 timestamp 기록)
export async function deleteUser(id: number) {
  const [deleted] = await db
    .update(users)
    .set({ 
      deletedAt: new Date(),
      permission: false,
    })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      deletedAt: users.deletedAt,
    });
  return deleted;
}

// permission 필드 변경
export async function updateUserPermission(id: number, permission: boolean) {
  const [updated] = await db
    .update(users)
    .set({ permission })
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

export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  return user;
}

export async function updateUserStripeId(userId: string, stripeCustomerId: string) {
  const [updated] = await db
    .update(users)
    .set({ stripeCustomerId, updatedAt: new Date() })
    .where(eq(users.id, Number(userId)))
    .returning();
  return updated;
}