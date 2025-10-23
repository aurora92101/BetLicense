// app/api/rooms/k/[pid]/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { roomMessages, roomAttachments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { getRoomByPublicId, ensureAdminOrRoomOwner } from '@/lib/rooms'
import { publish } from '@/lib/realtime'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const FILE_URL_SECRET = process.env.FILE_URL_SECRET || 'dev-secret' // 꼭 환경변수로 교체

function sign(attId: number, expiresInSec = 60 * 10) {
  const exp = Math.floor(Date.now() / 1000) + expiresInSec
  const payload = `${attId}.${exp}`
  const sig = crypto.createHmac('sha256', FILE_URL_SECRET).update(payload).digest('hex')
  return { sig, exp }
}

const toSafeName = (name: string) => name.replace(/[^\w.\-()\[\] ]+/g, '_')

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ pid: string }> }
) {
  const { pid } = await ctx.params
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

  // ===== 1) 임시로 첨부 레코드 생성해 id 확보 (URL/파일경로는 이후 업데이트) =====
  const kind: 'image' | 'file' = /^image\//.test(mime) ? 'image' : 'file'
  const safeName = toSafeName(file.name || 'file')
  const sizeMbStr = `${(file.size / 1024 / 1024).toFixed(2)}MB`

  const [created] = await db
    .insert(roomAttachments)
    .values({
      messageId,
      kind,
      filename: safeName, // 원본 파일명
      url: '',            // 나중에 다운로드 URL로 업데이트
      mime,
      size: sizeMbStr,
    })
    .returning()

  // ===== 2) 비공개 경로에 저장 (사용자ID를 경로에 넣지 않음) =====
  // {projectRoot}/private/rooms/{room.id}/{att.id}/{filename}
  const dir = path.join(process.cwd(), 'private', 'rooms', String(room.id), String(created.id))
  await mkdir(dir, { recursive: true })
  const filePath = path.join(dir, safeName)
  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buf)

  // ===== 3) 서명된 다운로드 URL 생성 & DB 업데이트 =====
  const { sig, exp } = sign(created.id)
  const downloadUrl = `/api/rooms/k/${encodeURIComponent(pid)}/files/${created.id}?sig=${sig}&exp=${exp}`

  const [att] = await db
    .update(roomAttachments)
    .set({ url: downloadUrl, filename: safeName, mime, size: sizeMbStr })
    .where(eq(roomAttachments.id, created.id))
    .returning()

  // SSE 방송 — 이제 url은 공개폴더 경로가 아닌 다운로드 엔드포인트
  publish(`room:${room.id}`, { type: 'attachment', payload: att })

  return NextResponse.json(att, { status: 201 })
}
