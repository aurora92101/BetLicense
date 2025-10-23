// app/api/password/verify/route.ts
import { NextResponse } from 'next/server';
import { verifyCodeAndReset } from '@/lib/auth/password-reset';

export async function POST(req: Request) {
  const { email, code } = await req.json().catch(() => ({}));
  if (!email || !code) return NextResponse.json({ error: 'Email and code required' }, { status: 400 });

  const result = await verifyCodeAndReset(email, code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // 개발환경이면 고정 비번 알려주기(UX용)
  if (result.tempPassword) {
    return NextResponse.json({ ok: true, tempPassword: result.tempPassword });
  }
  return NextResponse.json({ ok: true });
}
