// app/api/rooms/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { rooms, users, roomMessages } from '@/lib/db/schema'
import { desc, eq, ilike, and, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const me = await getSession()
  if (!me?.user?.id || ((me.user.role !== 'admin') && (me.user.role !== 'super_admin'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const page = Number(searchParams.get('page') || '1')
  const pageSize = Math.min(Number(searchParams.get('pageSize') || '30'), 100)
  const offset = (page - 1) * pageSize

  const where = and(q ? ilike(users.email, `%${q}%`) : undefined)

  // 목록 + 유저 메타 + 마지막 메시지 시각 기준 정렬
  const rows = await db
    .select({
      id: rooms.id,
      userId: rooms.userId,
      title: rooms.title,
      status: rooms.status,
      lastMessageAt: rooms.lastMessageAt,
      userEmail: users.email,
      userName: users.first_name,
    })
    .from(rooms)
    .leftJoin(users, eq(users.id, rooms.userId))
    .where(where)
    .orderBy(desc(rooms.lastMessageAt))
    .limit(pageSize)
    .offset(offset)

  const [{ count }] = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count
    FROM ${rooms}
    LEFT JOIN ${users} ON ${users.id} = ${rooms.userId}
    ${where ? sql`WHERE ${where}` : sql``}
  `)

  return NextResponse.json({
    items: rows,
    page,
    pageSize,
    total: Number(count),
  })
}
