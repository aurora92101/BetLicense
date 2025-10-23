// app/api/admin/rooms/k/[pid]/read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { roomAdminReads } from '@/lib/db/schema'
import { getRoomByPublicId, ensureAdminOrRoomOwner } from '@/lib/rooms'
import { and, eq, sql } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// export async function POST(_req: NextRequest, ctx: { params: Promise<{ pid: string }> }) {
//   const me = await getSession()
//   if (!me?.user?.id || me.user.role !== 'admin') {
//     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
//   }

//   // Next 15의 async params 대응
//   const { pid } = await ctx.params

//   const room = await getRoomByPublicId(pid)
//   if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

//   // 안전하게(실제론 관리자면 충분)
//   await ensureAdminOrRoomOwner(me.user, room.userId)

//   const adminId = Number(me.user.id)

//   // upsert with now()
//   // room_admin_reads 테이블에 (room_id, admin_id) UNIQUE(혹은 PK) 있어야 동작합니다.
//   await db
//     .insert(roomAdminReads)
//     .values({ roomId: room.id, adminId, lastReadAt: sql`now()` })
//     .onConflictDoUpdate({
//       target: [roomAdminReads.roomId, roomAdminReads.adminId],
//       set: { lastReadAt: sql`now()` },
//     })

//   // 방금 기록된 값을 반환(옵션)
//   const [{ lastReadAt }] = await db
//     .select({ lastReadAt: roomAdminReads.lastReadAt })
//     .from(roomAdminReads)
//     .where(and(eq(roomAdminReads.roomId, room.id), eq(roomAdminReads.adminId, adminId)))
//     .limit(1)

//   return NextResponse.json({ ok: true, lastReadAt })
// }

export async function POST(req: NextRequest, ctx: { params: Promise<{ pid: string }> }) {
  const { pid } = await ctx.params
  // 내부적으로 공용 라우트로 프록시
  return fetch(new URL(`/api/rooms/k/${encodeURIComponent(pid)}/read`, req.url), {
    method: 'POST',
    headers: { cookie: req.headers.get('cookie') ?? '' },
  })
}