// app/api/rooms/k/[pid]/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { rooms, roomMessages, roomAttachments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { getRoomByPublicId, ensureAdminOrRoomOwner } from '@/lib/rooms'
import { publish } from '@/lib/realtime'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ pid: string }> } // Promise 형태로 받고
) {
  const { pid } = await ctx.params                 // 반드시 await
  const me = await getSession()
  if (!me?.user?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const uploaderUserId = Number(me.user.id)

  // 방 확인 + 권한 체크
  const room = await getRoomByPublicId(pid)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  await ensureAdminOrRoomOwner(me.user, room.userId)

  // 폼 파싱
  const form = await req.formData()
  const file = form.get('file') as File | null
  const messageIdStr = form.get('messageId') as string | null
  if (!file || !messageIdStr) {
    return NextResponse.json({ error: 'Missing file or messageId' }, { status: 400 })
  }

  const messageId = Number(messageIdStr)
  const [msg] = await db.select().from(roomMessages).where(eq(roomMessages.id, messageId)).limit(1)
  if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  if (msg.roomId !== room.id) return NextResponse.json({ error: 'Mismatched room/message' }, { status: 400 })
  if (((me.user.role !== 'admin') && (me.user.role !== 'super_admin')) && msg.authorId !== uploaderUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ===== MIME 정책 =====
  const MAX_MB = 20
  const mime = file.type || ''

  const allowImage = /^image\//
  const allowAudio = /^audio\//
  const allowVideo = /^(video\/mp4|video\/webm|video\/quicktime)$/

  const allowDocs = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
  ])

  const allowArchives = new Set([
    'application/zip',
    'application/x-zip-compressed',
    'application/x-7z-compressed',
    'application/x-rar-compressed',
    'application/vnd.rar',
    'application/gzip',
    'application/x-tar',
    'application/x-bzip2',
  ])

  const denyList = new Set([
    'application/x-msdownload',
    'application/x-dosexec',
    'application/x-sh',
    'application/x-bat',
    'application/x-executable',
  ])

  const allowed =
    !denyList.has(mime) &&
    (allowImage.test(mime) ||
      allowAudio.test(mime) ||
      allowVideo.test(mime) ||
      allowDocs.has(mime) ||
      allowArchives.has(mime))

  if (!allowed) return NextResponse.json({ error: `Blocked MIME: ${mime || 'unknown'}` }, { status: 415 })
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `File too large (>${MAX_MB}MB)` }, { status: 413 })
  }

  // ===== 저장 경로 =====
  // public/rooms/{room.id}/{uploaderUserId}/{timestamp-filename}
  const dir = path.join(process.cwd(), 'public', 'rooms', String(room.id), String(uploaderUserId))
  await mkdir(dir, { recursive: true })

  const safeName = file.name.replace(/[^\w.\-()\[\] ]+/g, '_')
  const fileName = `${Date.now()}-${safeName}`
  const filePath = path.join(dir, fileName)

  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buf)

  const publicUrl = `/rooms/${room.id}/${uploaderUserId}/${fileName}`
  const kind: 'image' | 'file' = /^image\//.test(mime) ? 'image' : 'file'

  const [att] = await db
    .insert(roomAttachments)
    .values({
      messageId,
      kind,
      filename: file.name,
      url: publicUrl,
      mime,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    })
    .returning()

  // SSE 방송 — 내부 room.id 네임스페이스 사용
  publish(`room:${room.id}`, { type: 'attachment', payload: att })

  return NextResponse.json(att, { status: 201 })
}
