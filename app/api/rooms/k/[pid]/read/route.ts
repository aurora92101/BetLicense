// app/api/rooms/k/[pid]/read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { roomAdminReads, roomUserReads } from '@/lib/db/schema'
import { getRoomByPublicId, ensureAdminOrRoomOwner } from '@/lib/rooms'
import { and, eq, sql } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Next.js 15: params는 Promise여서 await 필요
export async function POST(_req: NextRequest, ctx: { params: Promise<{ pid: string }> }) {
  const me = await getSession()
  if (!me?.user?.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { pid } = await ctx.params

  const room = await getRoomByPublicId(pid)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  // 방 주인(유저) 또는 관리자만 허용
  await ensureAdminOrRoomOwner(me.user, room.userId)

  const nowSql = sql`now()`

  if ((me.user.role === 'admin') || (me.user.role === 'super_admin')) {
    // 관리자 읽음 마킹 (room_admin_reads)
    await db
      .insert(roomAdminReads)
      .values({ roomId: room.id, adminId: Number(me.user.id), lastReadAt: nowSql })
      .onConflictDoUpdate({
        target: [roomAdminReads.roomId, roomAdminReads.adminId], // UNIQUE(room_id, admin_id) 필요
        set: { lastReadAt: nowSql },
      })

    const [{ lastReadAt }] = await db
      .select({ lastReadAt: roomAdminReads.lastReadAt })
      .from(roomAdminReads)
      .where(and(eq(roomAdminReads.roomId, room.id), eq(roomAdminReads.adminId, Number(me.user.id))))
      .limit(1)

    return NextResponse.json({ ok: true, lastReadAt })
  }

  // 유저 읽음 마킹 (room_user_reads)
  await db
    .insert(roomUserReads)
    .values({ roomId: room.id, userId: Number(me.user.id), lastReadAt: nowSql })
    .onConflictDoUpdate({
      target: [roomUserReads.roomId, roomUserReads.userId], // UNIQUE(room_id, user_id) 필요
      set: { lastReadAt: nowSql },
    })

  const [{ lastReadAt }] = await db
    .select({ lastReadAt: roomUserReads.lastReadAt })
    .from(roomUserReads)
    .where(and(eq(roomUserReads.roomId, room.id), eq(roomUserReads.userId, Number(me.user.id))))
    .limit(1)

  return NextResponse.json({ ok: true, lastReadAt })
}
