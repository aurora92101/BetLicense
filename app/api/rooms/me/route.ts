// app/api/rooms/me/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { rooms } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'

export async function GET() {
  const me = await getSession()
  if (!me?.user?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  // 내 방 찾기
  const [r] = await db
    .select({ publicId: rooms.publicId })
    .from(rooms)
    .where(eq(rooms.userId, Number(me.user.id)))
    .limit(1)

  if (r) return NextResponse.json({ pid: r.publicId })

  // 없으면 생성 (DB defaultRandom()으로 UUID 생성)
  const [created] = await db
    .insert(rooms)
    .values({
      userId: Number(me.user.id),
      // publicId: crypto.randomUUID(), // ← 직접 넣고 싶으면 이걸 쓰세요
      title: 'Direct chat',
      status: 'open',
    })
    .returning({ publicId: rooms.publicId })

  return NextResponse.json({ pid: created.publicId })
}
