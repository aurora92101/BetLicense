// app/api/rooms/me/unread/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { sql } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Row = {
  pid: string | null
  last_read_at: string | null
  unread: number | null
  last_admin_msg_at: string | null
  last_snippet: string | null
}

export async function GET(_req: NextRequest) {
  const me = await getSession()
  if (!me?.user?.id || (me.user.role === 'admin') || (me.user.role === 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const userId = Number(me.user.id)

  // 유저는 방이 1개이므로 해당 방 기준으로:
  //  - room_user_reads.last_read_at 이후의 관리자 메시지 수(unread)
  //  - 마지막 관리자 메시지 시각(last_admin_msg_at)
  //  - 마지막 관리자 메시지 내용 스니펫(last_snippet)
  //  - 모든 FROM/WHERE 에 명시적 테이블/별칭 사용 → missing FROM 방지
  const rows = await db.execute<Row>(sql/*sql*/`
    select
      r.public_id as pid,
      coalesce(lur.last_read_at, to_timestamp(0)) as last_read_at,
      (
        select count(*)::int
        from room_messages m
        where
          m.room_id = r.id
          and m.author_role = 'admin'
          and m.created_at > coalesce(lur.last_read_at, to_timestamp(0))
      ) as unread,
      (
        select max(m2.created_at)
        from room_messages m2
        where m2.room_id = r.id
          and m2.author_role = 'admin'
      ) as last_admin_msg_at,
      (
        select m3.body
        from room_messages m3
        where m3.room_id = r.id
          and m3.author_role = 'admin'
        order by m3.created_at desc
        limit 1
      ) as last_snippet
    from rooms r
    left join room_user_reads lur
      on lur.room_id = r.id
     and lur.user_id = ${userId}
    where r.user_id = ${userId}
    limit 1
  `)

  const row = rows?.[0]
  const unread = Number(row?.unread ?? 0)

  return NextResponse.json({
    pid: row?.pid ?? null,
    unread,
    hasUnread: unread > 0,
    lastReadAt: row?.last_read_at ?? null,
    lastAdminMessageAt: row?.last_admin_msg_at ?? null,
    lastSnippet: row?.last_snippet ?? null,
  })
}
