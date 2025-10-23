// app/api/rooms/k/[pid]/files/[attId]/view/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { roomAttachments, roomMessages } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { getRoomByPublicId, ensureAdminOrRoomOwner } from '@/lib/rooms'
import path from 'path'
import { stat } from 'fs/promises'
import { createReadStream } from 'fs'
import { Readable } from 'stream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ pid: string; attId: string }> }
) {
  const { pid, attId } = await ctx.params

  // 세션 확인
  const me = await getSession()
  if (!me?.user?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  // 방/첨부/권한 체크
  const room = await getRoomByPublicId(pid)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const [att] = await db.select().from(roomAttachments).where(eq(roomAttachments.id, Number(attId))).limit(1)
  if (!att) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })

  const [msg] = await db.select().from(roomMessages).where(eq(roomMessages.id, att.messageId)).limit(1)
  if (!msg || msg.roomId !== room.id) {
    return NextResponse.json({ error: 'Mismatched room/message' }, { status: 400 })
  }

  // 권한 (admin 또는 방 주인)
  await ensureAdminOrRoomOwner(me.user, room.userId)

  // 이미지만 뷰 허용 (보안/의도된 사용)
  if (!/^image\//.test(att.mime || '')) {
    return NextResponse.json({ error: 'Preview not allowed' }, { status: 415 })
  }

  const filePath = path.join(process.cwd(), 'private', 'rooms', String(room.id), String(att.id), att.filename)

  try {
    const st = await stat(filePath)
    if (!st.isFile()) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const headers = new Headers()
    headers.set('Content-Type', att.mime || 'application/octet-stream')
    headers.set('Cache-Control', 'private, max-age=60')          // 세션 기반 짧은 캐시
    headers.set('Content-Length', String(st.size))
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(att.filename)}`)

    const nodeStream = createReadStream(filePath)
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>

    return new Response(webStream, { status: 200, headers })
  } catch {
    return NextResponse.json({ error: 'File read error' }, { status: 500 })
  }
}
