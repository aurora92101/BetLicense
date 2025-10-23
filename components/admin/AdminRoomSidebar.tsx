// app/(admin)/admin/rooms/_components/AdminRoomSidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import useSWR, { useSWRConfig } from 'swr'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'

type UserRow = {
  user: { id: number; email: string | null; first_name: string | null }
  pid?: string | null
  lastMessageAt?: string | null
  lastSnippet?: string | null
  unread?: number | null
}

type ApiResp = { items: UserRow[] }

const fetcher = async (u: string) => {
  const r = await fetch(u, { credentials: 'include' })
  if (r.status === 401 || r.status === 403) {
    if (typeof window !== 'undefined') window.location.href = '/sign-in'
    throw new Error('Unauthenticated')
  }
  if (!r.ok) throw new Error('Request failed')
  return r.json()
}

export default function AdminRoomSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const sp = useSearchParams()
  const { mutate: mutateGlobal } = useSWRConfig()

  // URL ↔︎ 입력 상태 동기화
  const qFromUrl = (sp.get('q') ?? '').trim()
  const [term, setTerm] = useState(qFromUrl)
  const debounceRef = useRef<number | null>(null)

  // URL이 외부 변경되면 입력값 동기화
  useEffect(() => {
    setTerm(qFromUrl)
  }, [qFromUrl])

  // 현재 pathname을 유지하면서 쿼리만 갱신
  const replaceQuery = (nextQ: string) => {
    const params = new URLSearchParams(sp.toString())
    if (nextQ) params.set('q', nextQ)
    else params.delete('q')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  // 디바운스하며 URL 갱신 → SWR 재요청 유도
  useEffect(() => {
    if (term === qFromUrl) return // 불필요한 replace 방지
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      replaceQuery(term.trim())
    }, 300)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [term, qFromUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // API URL (항상 최신 searchParams 기반)
  const apiUrl = useMemo(
    () => (`/api/admin/users/with-rooms${qFromUrl ? `?q=${encodeURIComponent(qFromUrl)}` : ''}`),
    [qFromUrl]
  )

  const { data, isLoading, mutate } = useSWR<ApiResp>(apiUrl, fetcher, {
    revalidateOnFocus: true,
    fallbackData: { items: [] },
  })

  const [pendingUserId, setPendingUserId] = useState<number | null>(null)

  // 정규화 + userId dedup
  const items = useMemo(() => {
    const raw = Array.isArray(data?.items) ? data!.items : []
    const map = new Map<number, UserRow>()
    for (const it of raw) {
      const uid = it?.user?.id
      if (!uid) continue
      if (!map.has(uid)) map.set(uid, it!)
    }
    return Array.from(map.values())
  }, [data?.items])

  const total = items.length

  // ensure(+pid) → read → SWR 낙관적 업데이트(unread=0, pid 세팅) → push
  const openAndMarkRead = async (userId?: number, pid?: string | null) => {
    if (!userId) return
    try {
      setPendingUserId(userId)

      // 1) pid 확보(없으면 ensure)
      let usePid = pid ?? undefined
      if (!usePid) {
        const r = await fetch(`/api/admin/rooms/ensure`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ userId }),
        })
        if (r.status === 401 || r.status === 403) {
          if (typeof window !== 'undefined') window.location.href = '/sign-in'
          return
        }
        const j = await r.json().catch(() => ({}))
        if (!r.ok || !j?.pid) { alert(j?.error || 'Failed to create room'); return }
        usePid = j.pid as string
      }

      // 2) 읽음 처리
      await fetch(`/api/admin/rooms/k/${encodeURIComponent(usePid)}/read`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {})

      // 3) 사이드바 캐시 낙관적 업데이트
      await mutate((current) => {
        if (!current?.items) return current
        return {
          ...current,
          items: current.items.map((it) =>
            it.user?.id === userId ? { ...it, pid: usePid!, unread: 0 } : it
          ),
        }
      }, { revalidate: false })
      void mutateGlobal((key: string) => typeof key === 'string' && key.startsWith('/api/admin/rooms'))

      // 4) 이동
      router.push(`/admin/rooms/k/${encodeURIComponent(usePid)}`)
    } finally {
      setPendingUserId(null)
    }
  }

  return (
    <aside className="w-full sm:w-72 md:w-80 lg:w-88 xl:w-96 shrink-0 border-r border-black/5 dark:border-white/10 bg-white/70 dark:bg-slate-950/40 backdrop-blur">
      {/* Header + search */}
      <div className="p-3 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">Users</div>
          <div
            className={[
              'text-[11px] px-1.5 py-0.5 rounded',
              'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-slate-200',
              isLoading ? 'opacity-60' : ''
            ].join(' ')}
            title={isLoading ? 'Loading…' : `${total} users`}
            aria-label="total users"
          >
            {isLoading ? '…' : total}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
          <input
            value={term}
            placeholder="Search user (name or email)"
            className="w-full pl-8 pr-3 py-1.5 rounded-md text-sm
              border border-black/10 dark:border-white/10
              bg-white/90 dark:bg-slate-900/60
              focus:outline-none focus:ring-2 focus:ring-sky-400/40"
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (debounceRef.current) window.clearTimeout(debounceRef.current)
                replaceQuery(term.trim())
              }
            }}
            aria-label="Search users"
          />
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto scrollable">
        {isLoading && (
          <div className="p-3 text-xs text-gray-500 dark:text-slate-400">Loading…</div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="p-3 text-xs text-gray-500 dark:text-slate-400">
            No users found.
          </div>
        )}

        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {items.map((it) => {
            const pid = it.pid ?? undefined
            const userId = it.user?.id
            const href = pid ? `/admin/rooms/k/${encodeURIComponent(pid)}` : '#'
            const active = pid ? pathname === href : false

            const firstInitial = (it.user?.first_name?.[0] || it.user?.email?.[0] || '?').toUpperCase()
            const displayName = it.user?.first_name || it.user?.email || 'Unknown user'
            const unread = Number(it.unread || 0)
            const reactKey = `${userId ?? 'nouser'}-${pid ?? 'nopid'}`
            const pending = pendingUserId === userId

            return (
              <li key={reactKey}>
                <Link
                  href={href}
                  onClick={(e) => {
                    e.preventDefault() // 항상 가로채서 ensure+read+push
                    void openAndMarkRead(userId, pid)
                  }}
                  className={[
                    'block px-3 py-2.5 hover:bg-slate-50/70 dark:hover:bg-white/5 transition',
                    active ? 'bg-sky-50/70 dark:bg-slate-900/60' : '',
                    pending ? 'opacity-60 pointer-events-none' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2">
                    {/* Avatar initial */}
                    <div
                      className="h-8 w-8 rounded-full bg-sky-200/70 dark:bg-white/10 flex items-center justify-center text-xs font-semibold text-sky-900 dark:text-sky-100"
                      aria-hidden
                    >
                      {firstInitial}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {displayName}
                        {!pid && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 align-middle">
                            create on click
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                        {it.lastSnippet || (pid ? '-' : 'No room yet')}
                      </div>
                    </div>

                    {/* Unread badge */}
                    {unread > 0 && (
                      <span
                        className="ml-2 shrink-0 min-w-[18px] h-[18px] text-[11px] px-1 rounded-full bg-red-500 text-white flex items-center justify-center"
                        aria-label={`${unread} unread`}
                        title={`${unread} unread`}
                      >
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
