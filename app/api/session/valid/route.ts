// app/api/session/valid/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, signToken } from '@/lib/auth/session'
import { ROLLING_THRESHOLD_MS, SESSION_TTL_MS } from '@/lib/auth/session-constants'

export async function GET() {
  const c = (await cookies()).get('session')?.value
  if (!c) return new NextResponse(null, { status: 401 })

  try {
    const s = await verifyToken(c) as { expires: string, user: any }
    const exp = new Date(s.expires).getTime()
    if (Date.now() >= exp) {
      // 만료되었으면 쿠키 제거
      (await cookies()).set('session', '', { expires: new Date(0), httpOnly: true, sameSite: 'lax', path: '/' })
      return new NextResponse(null, { status: 401 })
    }

    // (옵션) 활동 있으면 롤링 연장
    const remaining = exp - Date.now()
    if (remaining < ROLLING_THRESHOLD_MS) {
      const newExpires = new Date(Date.now() + SESSION_TTL_MS)
      const newToken = await signToken({ ...s, expires: newExpires.toISOString() })
      ;(await cookies()).set('session', newToken, {
        expires: newExpires,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
      return NextResponse.json({ valid: true, expiresAt: newExpires.toISOString() })
    }

    return NextResponse.json({ valid: true, expiresAt: s.expires })
  } catch {
    return new NextResponse(null, { status: 401 })
  }
}
