// app/api/admin/rooms/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { rooms, users } from '@/lib/db/schema' // roomMessages/roomAdminReads는 서브쿼리에서 raw SQL로 다룹니다.
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const me = await getSession()
  if (!me?.user?.id || ((me.user.role !== 'admin') && (me.user.role !== 'super_admin'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const adminId = Number(me.user.id)

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() || ''
  const page = Number(url.searchParams.get('page') || '1')
  const pageSize = Math.min(Number(url.searchParams.get('pageSize') || '50'), 100)
  const offset = (page - 1) * pageSize

  const where = and(
    q
      ? or(
          ilike(users.first_name, `%${q}%`),
          ilike(users.email, `%${q}%`),
        )
      : undefined
  )

  // ⚠️ 여기서는 Drizzle 컬럼 객체 대신 "순수 SQL 식별자" 사용 (alias 포함)
  const lastSnippetSql = sql<string>`(
    select m.body
    from room_messages m
    where m.room_id = ${rooms.id}
    order by m.created_at desc
    limit 1
  )`

  const unreadSql = sql<number>`(
    select count(*)::int
    from room_messages m
    where
      m.room_id = ${rooms.id}
      and m.author_role = 'owner'
      and m.created_at > coalesce((
        select r.last_read_at
        from room_admin_reads r
        where r.room_id = ${rooms.id}
          and r.admin_id = ${adminId}
        limit 1
      ), to_timestamp(0))
  )`

  const rows = await db
    .select({
      pid: rooms.publicId,
      lastMessageAt: rooms.lastMessageAt,
      userId: users.id,
      userEmail: users.email,
      userFirstName: users.first_name,
      lastSnippet: lastSnippetSql,
      unread: unreadSql,
    })
    .from(rooms)
    .leftJoin(users, eq(users.id, rooms.userId))
    .where(where)
    .orderBy(desc(rooms.lastMessageAt))
    .limit(pageSize)
    .offset(offset)

  const items = rows.map(r => ({
    pid: String(r.pid),
    user: r.userId
      ? { id: r.userId, email: r.userEmail, first_name: r.userFirstName }
      : null,
    lastMessageAt: r.lastMessageAt ? new Date(r.lastMessageAt).toISOString() : null,
    lastSnippet: r.lastSnippet ?? null,
    unread: Number(r.unread ?? 0),
  }))

  const [{ count }] = await db.execute<{ count: string }>(sql`
    select count(*)::text as count
    from rooms
    left join users on users.id = rooms.user_id
    ${where ? sql`where ${where}` : sql``}
  `)

  return NextResponse.json({
    items,
    page,
    pageSize,
    total: Number(count),
  })
}
