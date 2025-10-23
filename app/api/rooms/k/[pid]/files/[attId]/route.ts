// app/api/rooms/k/[pid]/files/[attId]/route.ts
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
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const FILE_URL_SECRET = process.env.FILE_URL_SECRET || 'dev-secret'

// HMAC 서명 검증 (만료 포함)
function verifySig(attId: number, sig: string, expStr: string) {
  const exp = Number(expStr || 0)
  if (!exp || exp < Math.floor(Date.now() / 1000)) return false
  const payload = `${attId}.${exp}`
  const expect = crypto.createHmac('sha256', FILE_URL_SECRET).update(payload).digest('hex')
  if (sig.length !== expect.length) return false // timingSafeEqual 보호
  return crypto.timingSafeEqual(Buffer.from(expect), Buffer.from(sig))
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ pid: string; attId: string }> }
) {
  const { pid, attId } = await ctx.params

  const me = await getSession()
  if (!me?.user?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  // 서명 + 만료 검증
  const { searchParams } = new URL(req.url)
  const sig = searchParams.get('sig') || ''
  const exp = searchParams.get('exp') || ''
  if (!sig || !exp || !verifySig(Number(attId), sig, exp)) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 })
  }

  // 강제 다운로드 파라미터 (?dl=1 이면 attachment)
  const forceDownload = searchParams.get('dl') === '1'

  // 방 및 첨부 검증
  const room = await getRoomByPublicId(pid)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const [att] = await db
    .select()
    .from(roomAttachments)
    .where(eq(roomAttachments.id, Number(attId)))
    .limit(1)
  if (!att) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })

  const [msg] = await db
    .select()
    .from(roomMessages)
    .where(eq(roomMessages.id, att.messageId))
    .limit(1)
  if (!msg || msg.roomId !== room.id) {
    return NextResponse.json({ error: 'Mismatched room/message' }, { status: 400 })
  }

  // 접근 권한 (admin 또는 룸 owner)
  await ensureAdminOrRoomOwner(me.user, room.userId)

  // 실제 파일 경로: /private/rooms/{room.id}/{att.id}/{filename}
  const filePath = path.join(process.cwd(), 'private', 'rooms', String(room.id), String(att.id), att.filename)

  try {
    const st = await stat(filePath)
    if (!st.isFile()) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const headers = new Headers()
    headers.set('Content-Type', att.mime || 'application/octet-stream')
    headers.set('Cache-Control', 'private, max-age=60') // 짧은 캐시(서명 URL)
    headers.set('Content-Length', String(st.size))
    headers.set('X-Content-Type-Options', 'nosniff')

    // 이미지면 기본 inline, ?dl=1 이면 무조건 attachment
    const disposition = forceDownload
      ? 'attachment'
      : (/^image\//.test(att.mime || '') ? 'inline' : 'attachment')
    headers.set('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(att.filename)}`)

    // Node Readable → Web ReadableStream
    const nodeStream = createReadStream(filePath)
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>

    return new Response(webStream, { status: 200, headers })
  } catch {
    return NextResponse.json({ error: 'File read error' }, { status: 500 })
  }
}
