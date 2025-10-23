// app/components/providers/ClientSWRProvider.tsx
'use client'

import { SWRConfig } from 'swr'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function ClientSWRProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 전역 SWR fetcher (Client에서만 동작)
  const fetcher = async (url: string) => {
    const res = await fetch(url, { credentials: 'include' })
    if (res.status === 401) {
      // 현재 위치를 next로 전달
      const qs = searchParams?.toString()
      const next = qs ? `${pathname}?${qs}` : pathname
      // next/navigation의 router를 이용한 클라이언트 리다이렉트
    //   router.replace(`/signin?next=${encodeURIComponent(next)}`)
      router.replace(`/sign-in`)
      throw Object.assign(new Error('Unauthenticated'), { code: 401 })
    }
    if (!res.ok) throw new Error('Request failed')
    return res.json()
  }

  return (
    <SWRConfig
      value={{
        fetcher,
        shouldRetryOnError: false,
        revalidateOnFocus: true,
        dedupingInterval: 1000,
        onError: (err: any) => {
          if (err?.code === 401) {
            const qs = searchParams?.toString()
            const next = qs ? `${pathname}?${qs}` : pathname
            // router.replace(`/signin?next=${encodeURIComponent(next)}`)
            router.replace(`/sign-in`)
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  )
}
