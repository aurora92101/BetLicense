// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { signToken, verifyToken } from '@/lib/auth/edge-session' // ← 변경!

const PROTECTED_PREFIXES = ['/dashboard', '/admin']
const SIGNIN_PATH = '/sign-in'

const cookieBase = {
  name: 'session',
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
}

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
}

function buildSigninURL(req: NextRequest) {
  const url = req.nextUrl.clone()
  url.pathname = SIGNIN_PATH
  url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search)
  return url
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const protectedRoute = isProtected(pathname)
  const sessionCookie = request.cookies.get('session')

  if (protectedRoute && !sessionCookie) {
    return NextResponse.redirect(buildSigninURL(request))
  }

  let res = NextResponse.next()

  if (sessionCookie) {
    try {
      const parsed: any = await verifyToken(sessionCookie.value)

      // 서버(노드)에서 DB 검증
      const guardURL = new URL('/api/auth/guard', request.url)
      const guard = await fetch(guardURL, {
        method: 'GET',
        headers: { cookie: `session=${sessionCookie.value}` },
        cache: 'no-store',
      })
      if (!guard.ok) {
        res.cookies.delete('session')
        return protectedRoute ? NextResponse.redirect(buildSigninURL(request)) : res
      }

      // 만료 임박 시 회전
      const exp = parsed?.expires ? new Date(parsed.expires).getTime() : 0
      if (exp && exp - Date.now() < 60 * 60 * 1000) {
        const newExpiry = new Date(Date.now() + 6 * 60 * 60 * 1000)
        const rotated = await signToken({ ...parsed, expires: newExpiry.toISOString() })
        res.cookies.set({
          ...cookieBase,
          value: rotated,
          secure: process.env.NODE_ENV === 'production',
          expires: newExpiry,
        })
      }
    } catch (e) {
      res.cookies.delete('session')
      if (protectedRoute) {
        return NextResponse.redirect(buildSigninURL(request))
      }
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
