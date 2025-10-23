// app/api/admin/users/with-rooms/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { sql } from 'drizzle-orm'

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

  // 모든 users 를 베이스로 두고, 가장 최신 rooms 를 1:1로 붙여준다.
  // (유저당 방이 1개라고 가정. 다중이면 "최근 방" 기준)
  const rows = await db.execute(sql/*sql*/`
    with latest_room as (
      select r.*
      from rooms r
      join (
        select user_id, max(last_message_at) as mx
        from rooms
        group by user_id
      ) x on x.user_id = r.user_id and x.mx = r.last_message_at
    )
    select
      u.id as user_id,
      u.email,
      u.first_name,
      r.public_id as pid,
      r.last_message_at,
      -- 최근 메시지 스니펫
      (
        select m.body
        from room_messages m
        where m.room_id = r.id
        order by m.created_at desc
        limit 1
      ) as last_snippet,
      -- 관리자 입장에서의 미읽음: 유저가 보낸 메시지 중 admin의 last_read 이후
      coalesce((
        select count(*)::int
        from room_messages m
        where m.room_id = r.id
          and m.author_role = 'owner'
          and m.created_at > coalesce((
            select rar.last_read_at
            from room_admin_reads rar
            where rar.room_id = r.id
              and rar.admin_id = ${adminId}
            limit 1
          ), to_timestamp(0))
      ), 0) as unread
    from users u
    left join latest_room r on r.user_id = u.id
    ${q ? sql/*sql*/`where (u.first_name ilike ${'%' + q + '%'} or u.email ilike ${'%' + q + '%'})` : sql``}
    order by coalesce(r.last_message_at, to_timestamp(0)) desc, u.id asc
    limit 500
  `)

  const items = rows.map((r: any) => ({
    user: { id: Number(r.user_id), email: r.email ?? null, first_name: r.first_name ?? null },
    pid: r.pid ?? null,
    lastMessageAt: r.last_message_at ? new Date(r.last_message_at).toISOString() : null,
    lastSnippet: r.last_snippet ?? null,
    unread: Number(r.unread ?? 0),
  }))

  return NextResponse.json({ items })
}
