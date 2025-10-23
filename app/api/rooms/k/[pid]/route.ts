// app/api/rooms/k/[pid]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { rooms, roomMessages, roomAttachments, users } from '@/lib/db/schema'
import { eq, asc, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { getRoomByPublicId, ensureAdminOrRoomOwner } from '@/lib/rooms'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_req: NextRequest, ctx: { params: Promise<{ pid: string }> }) {
  // Next App Router: params는 Promise이므로 반드시 await
  const { pid } = await ctx.params

  const me = await getSession()
  if (!me?.user?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  // 방 조회 (publicId)
  const room = await getRoomByPublicId(pid)
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  // 권한: 관리자이거나 방 주인만 접근
  try {
    await ensureAdminOrRoomOwner(me.user, room.userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 방 주인(표시용)
  const [owner] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.first_name,
    })
    .from(users)
    .where(eq(users.id, room.userId))
    .limit(1)

  // 메시지(오래된 → 최신)
  const msgs = await db
    .select()
    .from(roomMessages)
    .where(eq(roomMessages.roomId, room.id))
    .orderBy(asc(roomMessages.createdAt))

  // 첨부: 메시지 id 묶어서 가져오기
  const msgIds = msgs.map(m => m.id)
  const atts = msgIds.length
    ? await db
        .select()
        .from(roomAttachments)
        .where(inArray(roomAttachments.messageId, msgIds))
    : []

  // 메시지에 첨부 병합
  const attachmentsByMessage = new Map<number, any[]>()
  for (const a of atts) {
    const arr = attachmentsByMessage.get(a.messageId) ?? []
    arr.push(a)
    attachmentsByMessage.set(a.messageId, arr)
  }
  const messages = msgs.map(m => ({
    ...m,
    attachments: attachmentsByMessage.get(m.id) ?? [],
  }))

  return NextResponse.json({
    room: {
      publicId: room.publicId,
      title: room.title,
      status: room.status,
      owner: owner ? { id: owner.id, email: owner.email, firstName: owner.firstName } : null,
    },
    messages,
    // 필요시 클라에서 별도 머지 로직이 있다면 아래 줄도 함께 내려줄 수 있습니다.
    // attachments: atts,
  })
}
