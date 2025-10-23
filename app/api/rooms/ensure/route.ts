// app/api/admin/rooms/ensure/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { rooms, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Body = { userId?: number | string }

export async function POST(req: NextRequest) {
  const me = await getSession()
  if (!me?.user?.id || ((me.user.role !== 'admin') && (me.user.role !== 'super_admin'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Body | null = null
  try {
    body = await req.json()
  } catch {
    // 무시: 아래에서 검증
  }

  const uidNum = Number(body?.userId)
  if (!uidNum || Number.isNaN(uidNum) || uidNum <= 0) {
    return NextResponse.json({ error: 'Bad userId' }, { status: 400 })
  }

  try {
    // (선택) 유저 존재 확인
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, uidNum)).limit(1)
    if (!u?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 1) 기존 방 탐색
    const [exists] = await db
      .select({ publicId: rooms.publicId })
      .from(rooms)
      .where(eq(rooms.userId, uidNum))
      .limit(1)

    if (exists?.publicId) {
      return NextResponse.json({ pid: String(exists.publicId) })
    }

    // 2) 없으면 생성 시도 (동시성 안전)
    const inserted = await db
      .insert(rooms)
      .values({
        userId: uidNum,
        title: 'Direct chat',
        status: 'open',
      })
      // NOTE: rooms.userId에 UNIQUE 제약이 잡혀있어야 안전합니다.
      .onConflictDoNothing({ target: rooms.userId })
      .returning({ publicId: rooms.publicId })

    if (inserted.length > 0 && inserted[0]?.publicId) {
      return NextResponse.json({ pid: String(inserted[0].publicId) })
    }

    // 3) 레이스로 다른 트랜잭션이 먼저 만들었을 수 있음 → 재조회
    const [createdOrExisting] = await db
      .select({ publicId: rooms.publicId })
      .from(rooms)
      .where(and(eq(rooms.userId, uidNum)))
      .limit(1)

    if (createdOrExisting?.publicId) {
      return NextResponse.json({ pid: String(createdOrExisting.publicId) })
    }

    return NextResponse.json({ error: 'Failed to ensure room' }, { status: 500 })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Internal error' },
      { status: 500 },
    )
  }
}
