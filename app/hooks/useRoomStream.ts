// app/hooks/useRoomStream.ts
'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

type RoomMessage = {
  id: number
  // ...필요한 필드(roomId, authorId 등) – 서버 payload와 맞추세요
}
type RoomAttachment = {
  id: number
  messageId: number
  // ...
}
type RoomStatus = { status: 'open' | 'closed' }

type RoomEvent =
  | { type: 'message'; payload: RoomMessage }
  | { type: 'attachment'; payload: RoomAttachment }
  | { type: 'status'; payload: RoomStatus }
  | { type: string; payload: any }

// 중복 방지용: 메시지/첨부 id를 기억
const makeSeen = () => new Set<string>()
const keyOf = (e: RoomEvent) =>
  e?.type === 'message' && e.payload?.id
    ? `m:${e.payload.id}`
    : e?.type === 'attachment' && e.payload?.id
    ? `a:${e.payload.id}`
    : ''

export function useRoomStream(
  publicId: string,
  basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
) {
  const [events, setEvents] = useState<RoomEvent[]>([])
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const seenRef = useRef<Set<string>>(makeSeen())

  const url = useMemo(
    () => (publicId ? `${basePath}/api/rooms/k/${publicId}/stream` : ''),
    [basePath, publicId]
  )

  useEffect(() => {
    if (!publicId || !url) return

    // publicId 바뀔 때 이전 히스토리 초기화(선택)
    setEvents([])
    seenRef.current = makeSeen()

    const es = new EventSource(url, { withCredentials: true })
    esRef.current = es

    es.onopen = () => setConnected(true)

    es.onerror = () => {
      setConnected(false)
      // 세션 만료 등으로 연결이 곧바로 닫히는 케이스 대응
      // EventSource는 status 코드를 직접 못 읽으니,
      // 가벼운 인증 체크로 리다이렉트 트리거(선택)
      fetch('/api/user', { credentials: 'include' })
        .then((r) => {
          if (r.status === 401 || r.status === 403) {
            if (typeof window !== 'undefined') window.location.href = '/sign-in'
          }
        })
        .catch(() => {})
    }

    es.onmessage = (ev) => {
      // 서버 keep-alive 주석은 onmessage로 안 오지만 혹시 모를 쓰레기 데이터 방어
      const s = String(ev.data || '').trim()
      if (!s || s.startsWith(':')) return

      try {
        const parsed = JSON.parse(s) as RoomEvent
        const dedupeKey = keyOf(parsed)
        if (dedupeKey) {
          const seen = seenRef.current
          if (seen.has(dedupeKey)) return
          seen.add(dedupeKey)
        }
        setEvents((prev) => [...prev, parsed])
      } catch {
        // 무시
      }
    }

    return () => {
      es.close()
      setConnected(false)
    }
  }, [url, publicId])

  return { events, connected }
}

export function useAdminRoomStream(
  pid: string,
  basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
) {
  const [events, setEvents] = useState<RoomEvent[]>([])
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const seenRef = useRef<Set<string>>(makeSeen())

  const url = useMemo(
    () => (pid ? `${basePath}/api/admin/rooms/k/${pid}/stream` : ''),
    [basePath, pid]
  )

  useEffect(() => {
    if (!pid || !url) return
    setEvents([])
    seenRef.current = makeSeen()

    const es = new EventSource(url, { withCredentials: true })
    esRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => {
      setConnected(false)
      fetch('/api/user', { credentials: 'include' })
        .then((r) => {
          if (r.status === 401 || r.status === 403) {
            if (typeof window !== 'undefined') window.location.href = '/sign-in'
          }
        })
        .catch(() => {})
    }

    es.onmessage = (ev) => {
      const s = String(ev.data || '').trim()
      if (!s || s.startsWith(':')) return
      try {
        const parsed = JSON.parse(s) as RoomEvent
        const k = keyOf(parsed)
        if (k) {
          const seen = seenRef.current
          if (seen.has(k)) return
          seen.add(k)
        }
        setEvents((prev) => [...prev, parsed])
      } catch {}
    }

    return () => { es.close(); setConnected(false) }
  }, [url, pid])

  return { events, connected }
}