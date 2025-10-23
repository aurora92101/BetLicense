// app/api/rooms/k/[pid]/stream/route.ts
import { NextRequest } from 'next/server'
import { getRoomByPublicId } from '@/lib/rooms'
import { getChannel } from '@/lib/realtime' // getChannel<T>(key) 형태라면 제네릭으로 타입도 넣을 수 있음

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// params는 Promise일 수 있으므로 반드시 await 해서 사용
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ pid: string }> }
) {
  const { pid } = await ctx.params

  const room = await getRoomByPublicId(pid)
  if (!room) return new Response('Not found', { status: 404 })

  const enc = new TextEncoder()

  // 필요하면 제네릭으로 이벤트 타입 지정: getChannel<RoomEvent>(`room:${room.id}`)
  const subs = getChannel(`room:${room.id}`)

  let cleaned = false
  let sub: { send: (evt: any) => void } | null = null
  let ping: ReturnType<typeof setInterval> | null = null

  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    if (ping) clearInterval(ping)
    if (sub) subs.delete(sub)
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      sub = { send: (evt) => controller.enqueue(enc.encode(`data: ${JSON.stringify(evt)}\n\n`)) }
      subs.add(sub)

      // keep-alive
      ping = setInterval(() => {
        controller.enqueue(enc.encode(`: keep-alive ${Date.now()}\n\n`))
      }, 15_000)

      // 연결 종료 시 정리
      req.signal?.addEventListener('abort', cleanup)

      // 일부 런타임에서 close 감지용 (있으면)
      ;(controller as any).closed?.finally?.(cleanup)
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
