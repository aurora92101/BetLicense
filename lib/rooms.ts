// lib/rooms.ts
import { db } from '@/lib/db/drizzle'
import { rooms, users } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function getOrCreateRoomForUser(userId: number) {
  const [found] = await db.select().from(rooms).where(eq(rooms.userId, userId)).limit(1)
  if (found) return found
  const [inserted] = await db.insert(rooms).values({ userId }).returning()
  return inserted
}

export async function getRoomByPublicId(publicId: string) {
  const [r] = await db.select().from(rooms).where(eq(rooms.publicId, publicId)).limit(1)
  return r ?? null
}

export async function ensureAdminOrRoomOwner(user: { id: number; role: string }, roomUserId: number) {
  const isAdmin = ((user.role === 'admin') || (user.role === 'super_admin'))
  if (!isAdmin && user.id !== roomUserId) throw Object.assign(new Error('Forbidden'), { status: 403 })
}

export async function ensureUserExists(userId: number) {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return u ?? null
}
