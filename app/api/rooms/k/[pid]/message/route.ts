// app/api/rooms/k/[pid]/message/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { roomMessages, rooms } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { getRoomByPublicId, ensureAdminOrRoomOwner } from '@/lib/rooms'
import { publish } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ pid: string }> } // Promise 타입
) {
  const { pid } = await ctx.params               // 반드시 await
  const me = await getSession()
  if (!me?.user?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  // body 파싱(문자열만 허용)
  const body = await req.json().catch(() => ({} as any))
  const text = typeof body?.text === 'string' ? body.text : ''
  // text는 빈 문자열도 허용 — 완전 누락이면 400
  if (body?.text === undefined) {
    return NextResponse.json({ error: 'Bad body' }, { status: 400 })
  }

  const room = await getRoomByPublicId(pid)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  // 권한: 방 주인 또는 관리자
  await ensureAdminOrRoomOwner(me.user, room.userId)

  const authorRole: 'owner' | 'admin' = ((me.user.role === 'admin') || (me.user.role === 'super_admin')) ? 'admin' : 'owner'
  const [msg] = await db
    .insert(roomMessages)
    .values({
      roomId: room.id,
      authorId: Number(me.user.id),
      authorRole,
      body: text || null,
    })
    .returning()

  // 최근 메시지 시각 갱신
  await db.update(rooms).set({ lastMessageAt: new Date() }).where(eq(rooms.id, room.id))

  // SSE 방송 — 내부 id로 네임스페이스 고정
  publish(`room:${room.id}`, { type: 'message', payload: { ...msg, attachments: [] } })

  return NextResponse.json({ ...msg, attachments: [] }, { status: 201 })
}
