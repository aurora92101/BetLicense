// app/(dashboard)/rooms/page.tsx
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { rooms } from '@/lib/db/schema'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs' // middleware의 Edge 제약 회피용(선택)

export default async function Page() {
  // 1) 세션 확인
  const me = await getSession()
  const userId = Number(me?.user?.id)

  if (!userId) {
    redirect('/sign-in')
  }

  // 2) 기존 방 조회 (1 user = 1 room)
  const existing = await db
    .select({ pid: rooms.publicId })
    .from(rooms)
    .where(eq(rooms.userId, userId))
    .limit(1)

  let pid = existing[0]?.pid

  // 3) 없으면 생성 (publicId는 DB default 사용)
  if (!pid) {
    const created = await db
      .insert(rooms)
      .values({
        userId,
        title: 'Direct chat',
        status: 'open',
        // publicId는 스키마에서 default(예: uuid_generate_v4(), gen_random_uuid(), defaultRandom())가 있다고 가정
      })
      .returning({ pid: rooms.publicId })

    pid = created[0]?.pid
    if (!pid) {
      // 방 생성 실패 시 대체 UX
      redirect('/dashboard')
    }
  }

  // 4) 내 방으로 이동
  redirect(`/dashboard/rooms/k/${pid}`)
}
