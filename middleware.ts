// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { signToken, verifyToken } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { z } from 'zod'

// ===== 설정 =====
const PROTECTED_PREFIXES = ['/dashboard/license']      // 보호해야 할 경로들
const SESSION_TTL_MS = 3 * 60 * 60 * 1000             // 3시간
const ROLLING_THRESHOLD_MS = 5 * 60 * 1000            // 남은 5분 미만이면 연장
const isProd = process.env.NODE_ENV === 'production'

const SessionSchema = z.object({
  user: z.object({
    id: z.number(),
    role: z.string(),     // 반드시 string
  }),
  // toISOString()는 RFC3339/ISO8601로 들어오므로 .datetime() OK
  expires: z.string().datetime(),
})
type SessionData = z.infer<typeof SessionSchema>

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))

  // 보호 경로가 아니면 통과
  if (!isProtected) return NextResponse.next()

  const cookie = request.cookies.get('session')?.value

  // 보호 경로인데 쿠키 없으면 로그인으로
  if (!cookie) {
    const url = new URL('/sign-in', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  let res = NextResponse.next()

  try {
    // 👉 1) 토큰 디코드 + Zod로 런타임 검증/내로잉
    const raw = await verifyToken(cookie)
    const session: SessionData = SessionSchema.parse(raw)

    // 👉 2) 만료 검사 (확정 타입이라 옵셔널 이슈 없음)
    const expMs = new Date(session.expires).getTime()
    if (Number.isNaN(expMs) || Date.now() >= expMs) {
      const url = new URL('/sign-in', request.url)
      url.searchParams.set('reason', 'expired')
      url.searchParams.set('redirect', pathname)
      const r = NextResponse.redirect(url)
      r.cookies.set('session', '', { expires: new Date(0), path: '/', httpOnly: true, sameSite: 'lax', secure: isProd })
      return r
    }

    // 3) DB 권한 확인 (permission=true, 삭제되지 않은 유저)
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.user.id), isNull(users.deletedAt), eq(users.permission, true)))
      .limit(1)

    if (!user) {
      const url = new URL('/sign-in', request.url)
      url.searchParams.set('reason', 'no-permission')
      url.searchParams.set('redirect', pathname)
      const r = NextResponse.redirect(url)
      r.cookies.set('session', '', { expires: new Date(0), path: '/', httpOnly: true, sameSite: 'lax', secure: isProd })
      return r
    }

    // 👉 4) (옵션) 롤링 세션: 남은 시간이 적으면 3시간으로 재발급
    const remaining = expMs - Date.now()
    if (remaining < ROLLING_THRESHOLD_MS) {
      const newExpires = new Date(Date.now() + SESSION_TTL_MS)
      const nextSession: SessionData = {
        user: { id: session.user.id, role: session.user.role }, // 확정 필드만
        expires: newExpires.toISOString(),
      }
      const newToken = await signToken(nextSession)
      res.cookies.set('session', newToken, {
        expires: newExpires,
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        path: '/',
      })
    }

    return res
  } catch (err) {
    console.error('middleware auth error:', err)
    const url = new URL('/sign-in', request.url)
    url.searchParams.set('reason', 'invalid-token')
    url.searchParams.set('redirect', pathname)
    const r = NextResponse.redirect(url)
    r.cookies.set('session', '', { expires: new Date(0), path: '/', httpOnly: true, sameSite: 'lax', secure: isProd })
    return r
  }
}

// 필요에 따라 여기서 보호 경로만 매칭하도록 좁혀도 됩니다.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
  runtime: 'nodejs',
}
