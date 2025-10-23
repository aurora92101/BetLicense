// app/api/admin/rooms/ensure/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { rooms, users } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Body = { userId?: number | string | null }

export async function POST(req: NextRequest) {
  const me = await getSession()
  if (!me?.user?.id || ((me.user.role !== 'admin') && (me.user.role !== 'super_admin'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Body = {}
  try { body = await req.json() } catch {}
  const uid = Number(body.userId)
  if (!uid || Number.isNaN(uid) || uid <= 0) {
    return NextResponse.json({ error: 'Bad userId' }, { status: 400 })
  }

  // 유저 존재 확인(선택)
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, uid)).limit(1)
  if (!u?.id) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // 트랜잭션 + advisory lock으로 레이스 방지
  const pid = await db.transaction(async (tx) => {
    // 같은 uid에 대해 동시 요청 직렬화
    await tx.execute(sql`select pg_advisory_xact_lock(${uid})`)

    // 1) 이미 있으면 반환
    const [exists] = await tx
      .select({ publicId: rooms.publicId })
      .from(rooms)
      .where(eq(rooms.userId, uid))
      .limit(1)

    if (exists?.publicId) return String(exists.publicId)

    // 2) 없으면 생성
    const inserted = await tx
      .insert(rooms)
      .values({ userId: uid, title: 'Direct chat', status: 'open' })
      .returning({ publicId: rooms.publicId })

    // 혹시 반환이 비어있으면 재조회
    if (inserted.length > 0 && inserted[0]?.publicId) {
      return String(inserted[0].publicId)
    }

    const [createdOrExisting] = await tx
      .select({ publicId: rooms.publicId })
      .from(rooms)
      .where(eq(rooms.userId, uid))
      .limit(1)

    if (!createdOrExisting?.publicId) throw new Error('Failed to ensure room')
    return String(createdOrExisting.publicId)
  })

  return NextResponse.json({ pid })
}
