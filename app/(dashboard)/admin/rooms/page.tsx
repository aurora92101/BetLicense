'use client'

import { useEffect } from 'react'
import useSWR from 'swr'
import { useRouter, useSearchParams } from 'next/navigation'

const fetcher = async (u: string) => {
  const r = await fetch(u, { credentials: 'include' })
  if (r.status === 401 || r.status === 403) {
    if (typeof window !== 'undefined') window.location.href = '/sign-in'
    throw new Error('Unauthenticated')
  }
  if (!r.ok) throw new Error('Request failed')
  return r.json()
}

export default function AdminRoomsIndexPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const q = sp.get('q') ?? ''
  const { data } = useSWR<{ items: { pid: string }[] }>(
    `/api/admin/rooms${q ? `?q=${encodeURIComponent(q)}` : ''}`,
    fetcher,
    { fallbackData: { items: [] } },
  )

  useEffect(() => {
    const first = data?.items?.[0]?.pid
    // 이미 상세 경로에 있으면 리다이렉트 생략
    if (!first) return
    if (location.pathname.startsWith('/admin/rooms/k/')) return
    router.replace(`/admin/rooms/k/${encodeURIComponent(first)}`)
  }, [data?.items, router])

  return (
    <div className="h-full w-full flex items-center justify-center text-sm text-gray-500 dark:text-slate-400">
      Select a user on the left to start chatting.
    </div>
  )
}
