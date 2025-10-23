// app/_hooks/useAutoLogout.ts
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SESSION_TTL_MS } from '@/lib/auth/session-constants'

export function useAutoLogout({
  idleMs = SESSION_TTL_MS,          // 무활동 허용 시간 (3 시간)
  checkEveryMs = 15_000,     // 폴링 간격
  redirectTo = '/sign-in',
} = {}) {
  const router = useRouter()
  const lastActiveRef = useRef<number>(Date.now())
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const touch = () => { lastActiveRef.current = Date.now() }
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'visibilitychange', 'focus']
    events.forEach(e => window.addEventListener(e, touch, { passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, touch as any))
  }, [])

  useEffect(() => {
    const tick = async () => {
      const idle = Date.now() - lastActiveRef.current
      if (idle >= idleMs) {
        // 세션 서버검증
        const res = await fetch('/api/session/valid', { credentials: 'include' })
        if (!res.ok) {
          router.push(`${redirectTo}?reason=expired`)
          return
        }
        // 여전히 유효하면(서버에서 롤링) 활동시각만 초기화
        lastActiveRef.current = Date.now()
      }
    }
    timerRef.current = window.setInterval(tick, checkEveryMs) as unknown as number
    return () => { if (timerRef.current) window.clearInterval(timerRef.current) }
  }, [idleMs, checkEveryMs, redirectTo, router])
}
