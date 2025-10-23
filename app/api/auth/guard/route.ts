// app/api/auth/guard/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { getSession } from '@/lib/auth/session' // ← 이건 Node 전용 버전이어야 함!
import { and, eq, isNull } from 'drizzle-orm'

export async function GET() {
  try {
    const me = await getSession()
    if (!me?.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.id, me.user.id), isNull(users.deletedAt), eq(users.permission, true))
      )
      .limit(1)
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Guard failed' }, { status: 500 })
  }
}
