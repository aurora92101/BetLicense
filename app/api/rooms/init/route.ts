// app/api/rooms/init/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { rooms } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'

export async function POST() {
  const me = await getSession()
  if (!me?.user?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const uid = Number(me.user.id)

  const [existing] = await db.select().from(rooms).where(eq(rooms.userId, uid)).limit(1)
  if (existing) return NextResponse.json(existing)

  const [created] = await db.insert(rooms).values({
    userId: uid,
    title: 'Direct chat',
    status: 'open',
  }).returning()

  return NextResponse.json(created, { status: 201 })
}
