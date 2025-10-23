// app/api/password/request/route.ts
import { NextResponse } from 'next/server';
import { issueResetCode } from '@/lib/auth/password-reset';
import { z } from 'zod';

export const runtime = 'nodejs';        // nodemailer 필수
export const dynamic = 'force-dynamic';  // (선택) 캐싱 방지

const BodySchema = z.object({
  email: z.string().email().max(255),
});

// ---- (선택) 초간단 레이트리밋: IP+email 기준 10분에 3회 ----
const requests = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000; // 10분
const LIMIT = 3;

function rateLimit(key: string) {
  const now = Date.now();
  const arr = (requests.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= LIMIT) return false;
  arr.push(now);
  requests.set(key, arr);
  return true;
}
// --------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const email = parsed.data.email;

    // (선택) 레이트리밋 적용
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown';
    const key = `${ip}:${email}`;
    if (!rateLimit(key)) {
      // 의도적으로 동일한 응답 (유저 열거 방지)
      return NextResponse.json({ ok: true });
    }

    // 존재하지 않는 이메일이어도 내부적으로만 처리하고 동일 응답 반환
    await issueResetCode(email);

    // UX용으로는 200/ok만 주면 됨 (메일이 실제로 갔는지는 서버 로그로 확인)
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // SMTP 설정/네트워크 문제 등은 서버 로그로 남김
    console.error('[password/request] error:', e);
    // 보안상 상세 에러는 숨기고 동일 응답으로 처리해도 됨
    // return NextResponse.json({ ok: true });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
