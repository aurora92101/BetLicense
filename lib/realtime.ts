// lib/realtime.ts

// ① 이벤트 타입들
export type FeedbackEvent =
  | { type: 'message'; payload: any }
  | { type: 'attachment'; payload: any }
  | { type: 'status'; payload: { status: string } }
  | { type: 'attachment_updated'; payload: any }
  | { type: 'attachment_deleted'; payload: any }

export type RoomEvent =
  | { type: 'message'; payload: any }
  | { type: 'attachment'; payload: any }
  | { type: 'status'; payload: { status: string } }

// 모든 채널에서 쓸 수 있는 상위 유니온
export type AnyEvent = FeedbackEvent | RoomEvent

// ② 구독자 제네릭
export type Sub<E extends AnyEvent = AnyEvent> = { send: (evt: E) => void }

// ③ 글로벌 버스 (키: 채널명, 값: 구독자 집합)
//    내부 저장은 AnyEvent로 통일하되, 채널 접근 시 제네릭으로 안전하게 받도록 헬퍼 제공
const g = globalThis as any
g.__eventBus ??= new Map<string, Set<Sub<AnyEvent>>>()
const rawBus = g.__eventBus as Map<string, Set<Sub<AnyEvent>>>

// ④ 채널 헬퍼: 타입 안전하게 Set<Sub<E>> 반환
export function getChannel<E extends AnyEvent>(key: string): Set<Sub<E>> {
  let set = rawBus.get(key) as Set<Sub<E>> | undefined
  if (!set) {
    set = new Set<Sub<E>>()
    rawBus.set(key, set as unknown as Set<Sub<AnyEvent>>)
  }
  return set
}

// ⑤ 게시 헬퍼
export function publish<E extends AnyEvent>(key: string, evt: E) {
  const set = rawBus.get(key) as Set<Sub<E>> | undefined
  if (!set) return
  set.forEach((s) => s.send(evt))
}
