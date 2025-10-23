// app/(admin)/admin/rooms/k/[pid]/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import useSWR, { useSWRConfig } from 'swr'
import { useRoomStream } from '@/app/hooks/useRoomStream'
import { Paperclip, RadioTower, Send, Download } from 'lucide-react'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'

type RoomOwner = { id: number; email: string | null; firstName?: string | null }

type Room = {
  id?: number
  publicId?: string
  pid?: string
  userId?: number
  title?: string | null
  status?: 'open' | 'closed' | null
  owner?: RoomOwner | null
}

type RoomAttachment = {
  id: number
  messageId: number
  kind: 'image' | 'file'
  filename: string
  url: string
  mime: string
  size: string // 서버에서 "1.23MB" 형태로 내려옴
  createdAt?: string
}

type RoomMessage = {
  id: number
  roomId: number
  authorId: number
  authorRole: 'owner' | 'admin'
  body?: string | null
  createdAt?: string
  attachments?: RoomAttachment[]
}

type RoomEvent =
  | { type: 'message'; payload: RoomMessage }
  | { type: 'attachment'; payload: RoomAttachment }
  | { type: 'status'; payload: { status: string } }
  | { type: string; payload: any }

const toArray = <T,>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : [])

const fetcher = async (u: string) => {
  const r = await fetch(u, { credentials: 'include' })
  if (r.status === 401 || r.status === 403) {
    if (typeof window !== 'undefined') window.location.href = '/sign-in'
    throw new Error('Unauthenticated')
  }
  if (!r.ok) throw new Error('Request failed')
  return r.json()
}

const looksLikeImage = (a: RoomAttachment) =>
  a.kind === 'image' ||
  /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(a.filename || '') ||
  /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(a.url || '')

// dl=1 파라미터 추가(강제 다운로드)
function asDownloadUrl(url: string) {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    u.searchParams.set('dl', '1')
    return u.toString()
  } catch {
    return url
  }
}

// "0.00MB" 같은 값을 보기 좋게 보정
// - 0.01MB 미만이면 KB로 표시, 0.00MB는 "<5KB"로
function prettySize(s?: string) {
  if (!s) return ''
  const m = s.match(/([\d.]+)\s*MB/i)
  if (!m) return s
  const mb = parseFloat(m[1])
  if (Number.isNaN(mb)) return s
  if (mb === 0) return '<5KB' // 서버에서 toFixed(2) 기준이면 5KB 미만
  if (mb < 0.01) {
    const kb = Math.max(1, Math.round(mb * 1024))
    return `${kb}KB`
  }
  return `${mb.toFixed(2)}MB`
}

// ⬇️ 만료 없는 이미지 뷰 URL(세션/권한 검증 기반)
function imageViewUrl(pid: string, attId: number) {
  return `/api/rooms/k/${encodeURIComponent(pid)}/files/${attId}/view`
}

export default function AdminRoomDetailByPidPage() {
  const { pid } = useParams<{ pid: string }>()
  const listRef = useRef<HTMLDivElement>(null)
  const { mutate: mutateGlobal } = useSWRConfig()

  const { data, mutate } = useSWR<{ room: Room; messages: RoomMessage[]; attachments?: RoomAttachment[] }>(
    `/api/rooms/k/${encodeURIComponent(pid)}`,
    fetcher,
    { fallbackData: { room: { pid, title: 'Direct chat', owner: null }, messages: [], attachments: [] } }
  )

  const { events, connected } = useRoomStream(pid)

  const messages = useMemo(() => {
    const byId = new Map<number, RoomMessage>()
    for (const m of toArray(data?.messages)) byId.set(m.id, { ...m, attachments: toArray(m.attachments) })
    for (const a of toArray(data?.attachments)) {
      const m = byId.get(a.messageId)
      if (m) {
        const atts = toArray(m.attachments)
        if (!atts.some((x) => x.id === a.id)) m.attachments = [...atts, a]
        byId.set(m.id, m)
      }
    }
    for (const e of toArray(events) as RoomEvent[]) {
      if (e.type === 'message' && e.payload?.id) {
        const m = e.payload
        const prev = byId.get(m.id)
        byId.set(m.id, { ...(prev ?? ({} as any)), ...m, attachments: toArray(prev?.attachments ?? m.attachments) })
      } else if (e.type === 'attachment' && e.payload?.messageId) {
        const a = e.payload
        const m = byId.get(a.messageId)
        if (m) {
          const atts = toArray(m.attachments)
          if (!atts.some((x) => x.id === a.id)) m.attachments = [...atts, a]
          byId.set(m.id, m)
        }
      }
    }
    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
    )
  }, [data?.messages, data?.attachments, events])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  // 읽음 처리
  useEffect(() => {
    if (!pid) return
    let cancelled = false
    const markRead = async () => {
      try {
        await fetch(`/api/admin/rooms/k/${encodeURIComponent(pid)}/read`, { method: 'POST', credentials: 'include' })
        if (!cancelled) {
          await mutateGlobal((key: string) => typeof key === 'string' && key.startsWith('/api/admin/rooms'))
        }
      } catch { }
    }
    void markRead()
    const onFocus = () => void markRead()
    window.addEventListener('focus', onFocus)
    return () => { cancelled = true; window.removeEventListener('focus', onFocus) }
  }, [pid, events.length, mutateGlobal])

  // compose
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [fileKey, setFileKey] = useState(() => String(Date.now()))
  const fileRef = useRef<HTMLInputElement | null>(null)

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setFiles(Array.from(e.target.files))
  }

  async function send() {
    if (!text.trim() && files.length === 0) return
    const res = await fetch(`/api/rooms/k/${encodeURIComponent(pid)}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text }),
    })
    if (res.status === 401 || res.status === 403) {
      if (typeof window !== 'undefined') window.location.href = '/sign-in'
      return
    }
    const msg = await res.json()
    if (!res.ok) { alert(msg?.error || 'Send failed'); return }
    const messageId = msg.id as number

    if (files.length > 0) {
      for (const f of files) {
        const fd = new FormData()
        fd.set('file', f)
        fd.set('messageId', String(messageId))
        const up = await fetch(`/api/rooms/k/${encodeURIComponent(pid)}/upload`, { method: 'POST', credentials: 'include', body: fd })
        if (up.status === 401 || up.status === 403) { if (typeof window !== 'undefined') window.location.href = '/sign-in'; return }
        const uj = await up.json()
        if (!up.ok) { alert(uj?.error || 'Upload failed'); return }
      }
      setFiles([])
      setFileKey(String(Date.now()))
    }

    setText('')
    await mutate()
    await mutateGlobal((key: string) => typeof key === 'string' && key.startsWith('/api/admin/rooms'))
  }

  // 첨부 렌더러(이미지: 만료없는 view URL + 우상단 다운로드 + 좌하단 용량 / 파일: 칩 + 용량 + 다운로드)
  const AttachmentChip = ({ a, mine }: { a: RoomAttachment; mine: boolean }) => {
    const isImg = looksLikeImage(a)
    const downloadHref = asDownloadUrl(a.url)
    const sz = prettySize(a.size)

    if (isImg) {
      const viewUrl = imageViewUrl(pid, a.id) // ✅ 만료 없는 이미지 뷰 URL
      return (
        <div className="relative group inline-block">
          <a
            href={viewUrl}
            target="_blank"
            rel="noreferrer"
            className="block"
            title={`${a.filename}${sz ? ` · ${sz}` : ''}`}
          >
            <img
              src={viewUrl} // ✅ 썸네일도 view URL 사용
              alt={a.filename}
              className="h-24 w-24 object-cover rounded-lg border border-black/10 dark:border-white/10"
            />
          </a>

          {/* 좌하단 용량 배지 */}
          {sz && (
            <div
              className={[
                'absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] leading-none',
                mine
                  ? 'bg-black/30 text-white backdrop-blur'
                  : 'bg-white/85 text-gray-900 dark:bg-slate-700/90 dark:text-slate-50',
                'border border-black/10 dark:border-white/10'
              ].join(' ')}
              title={sz}
            >
              {sz}
            </div>
          )}

          {/* 우상단 다운로드 오버레이 */}
          <Tooltip title="Download">
            <a
              href={downloadHref}
              download={a.filename}
              className={[
                'absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity',
                'inline-flex items-center justify-center h-7 w-7 rounded-full border',
                mine
                  ? 'border-white/25 bg-white/20 hover:bg-white/30 text-white backdrop-blur'
                  : 'border-black/10 bg-white/90 hover:bg-white text-gray-900 dark:border-white/10 dark:bg-slate-700/90 dark:hover:bg-slate-600 dark:text-slate-50',
              ].join(' ')}
            >
              <Download className="h-4 w-4" />
            </a>
          </Tooltip>
        </div>
      )
    }

    // 일반 파일: 파일칩(용량 표시) + 다운로드 원형버튼
    return (
      <div className="inline-flex items-center gap-1.5">
        <a
          href={a.url}
          target="_blank"
          rel="noreferrer"
          className={[
            'inline-flex items-center gap-1.5',
            'text-[13px] no-underline',
            mine ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-white hover:bg-gray-50 text-gray-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-50',
            'px-2 py-1 rounded-full border border-black/10 dark:border-white/10',
          ].join(' ')}
          title={`${a.filename}${sz ? ` · ${sz}` : ''}`}
        >
          <Paperclip className="h-4 w-4 shrink-0" />
          <span className="truncate max-w-[11rem]">{a.filename}</span>
          {sz && (
            <span
              className={[
                'ml-1 text-[11px] px-1 py-[1px] rounded',
                mine ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-100'
              ].join(' ')}
              aria-hidden
            >
              {sz}
            </span>
          )}
        </a>

        <Tooltip title="Download">
          <a
            href={downloadHref}
            download={a.filename}
            className={[
              'inline-flex items-center justify-center',
              'h-8 w-8 rounded-full border',
              mine
                ? 'border-white/20 bg-white/15 hover:bg-white/25 text-white'
                : 'border-black/10 bg-white hover:bg-gray-50 text-gray-900 dark:border-white/10 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-50',
            ].join(' ')}
          >
            <Download className="h-4 w-4" />
          </a>
        </Tooltip>
      </div>
    )
  }

  const Bubble = ({ m }: { m: RoomMessage }) => {
    const mine = (m.authorRole !== 'owner')
    return (
      <div className={`w-full flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[86%] sm:max-w-[72%] md:max-w-[62%]">
          <div
            className={[
              'rounded-2xl px-3 py-2 shadow-sm',
              mine ? 'bg-sky-400/90 text-white dark:bg-sky-500/80' : 'bg-gray-50/90 text-gray-900 dark:bg-slate-800/80 dark:text-slate-50',
            ].join(' ')}
          >
            {m.body && <div className="whitespace-pre-wrap text-[0.93rem] leading-relaxed">{m.body}</div>}
            {toArray(m.attachments).length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-2">
                {toArray(m.attachments).map((a) => (
                  <AttachmentChip key={`att-${m.id}-${a.id}`} a={a} mine={mine} />
                ))}
              </div>
            )}
          </div>
          <div className={['mt-1 text-[10px]', mine ? 'text-right text-gray-500' : 'text-left text-gray-500', 'dark:text-slate-400'].join(' ')}>
            {new Date(m.createdAt ?? Date.now()).toLocaleString()}
          </div>
        </div>
      </div>
    )
  }

  const ownerEmail = data?.room?.owner?.email ?? 'Unknown user'

  return (
    <div className="h-full min-h-0 w-full flex flex-col bg-white/40 dark:bg-slate-950/30 backdrop-blur rounded-lg">
      {/* Header (compact) */}
      <div className="flex items-center gap-2 px-3 sm:px-3 py-1.5 bg-white/60 dark:bg-slate-950/40 border-b border-black/5 dark:border-white/10">
        <div className="min-w-0 flex-1">
          <div className="text-[0.95rem] font-semibold truncate">{ownerEmail}</div>
          <div className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
            Room PID: <span className="font-mono">{pid}</span>
          </div>
        </div>
        <span className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded ${connected ? 'bg-green-200 text-green-900' : 'bg-gray-200 text-gray-700'}`}>
          <RadioTower className="inline h-3.5 w-3.5 mr-1" />
          {connected ? 'live' : 'offline'}
        </span>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto scrollable px-2 sm:px-3 py-2 space-y-2">
        {messages.map((m) => (
          <div key={`msg-${m.id}`}>
            <Bubble m={m} />
          </div>
        ))}
      </div>

      {/* Composer (compact) */}
      <div className="border-t border-black/5 dark:border-white/10 px-2 sm:px-3 py-1.5 bg-white/70 dark:bg-slate-950/50">
        <div className="max-w-5xl mx-auto flex items-end gap-2 sm:gap-2.5">
          <input ref={fileRef} key={fileKey} type="file" multiple onChange={onFiles} className="hidden" />
          <Tooltip title="Attach files">
            <IconButton
              aria-label="Attach files"
              onClick={() => fileRef.current?.click()}
              size="small"
              sx={(t) => (t.palette.mode === 'dark'
                ? { color: '#e2eefb', borderRadius: '9999px', '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' } }
                : { borderRadius: '9999px' })}
            >
              <Paperclip className="h-5 w-5" />
            </IconButton>
          </Tooltip>

          <textarea
            className="h-9 flex-1 resize-none border border-black/10 dark:border-white/10 rounded-2xl px-3 py-1.5
                       bg-white/90 dark:bg-slate-900/60 text-[0.9rem] leading-5
                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
            placeholder={`Message ${ownerEmail}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
          />

          <Tooltip title="Send">
            <IconButton
              aria-label="Send"
              onClick={() => void send()}
              size="small"
              sx={(t) => (t.palette.mode === 'dark'
                ? { color: '#e2eefb', borderRadius: '9999px', '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' } }
                : { borderRadius: '9999px' })}>
              <Send className="h-5 w-5" />
            </IconButton>
          </Tooltip>
        </div>

        {files.length > 0 && (
          <div className="max-w-5xl mx-auto mt-1.5 flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <div
                key={`sel-${i}`}
                className="text-[11px] px-2 py-0.5 rounded-full border border-black/10 dark:border-white/10 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200"
              >
                {f.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
