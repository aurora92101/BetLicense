// lib/auth/password-reset.ts
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendMail } from '@/lib/mailer';
import { hashPassword } from '@/lib/auth/session';

function genNumericCode(len = 6) {
  const digits = '0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += digits[Math.floor(Math.random() * digits.length)];
  return out;
}

function genTempPassword(len = 12) {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const isProd = process.env.NODE_ENV === 'production';
// const isProd = process.env.NODE_ENV !== 'production';

export async function issueResetCode(email: string) {
  const code = genNumericCode(6);
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15분

  // 존재하지 않는 이메일이어도 동일 응답(개인정보 보호)
  const [updated] = await db
    .update(users)
    .set({ resetCode: code, resetExpires: expires })
    .where(eq(users.email, email))
    .returning({ id: users.id });

  if (updated) {
    await sendMail({
      to: email,
      subject: 'Your password reset code',
      text: `Your reset code is: ${code}\nThis code expires in 15 minutes.`,
    });
  }
  return true;
}

export async function verifyCodeAndReset(email: string, code: string) {
  const now = new Date();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !user.resetCode || !user.resetExpires) {
    return { ok: false, error: 'Invalid or expired code.' };
  }
  if (user.resetCode !== code || user.resetExpires < now) {
    return { ok: false, error: 'Invalid or expired code.' };
  }

  if (!isProd) {
    // 개발/스테이징: 고정 비번
    const fixedHash = await hashPassword('12345678');
    await db
      .update(users)
      .set({
        passwordHash: fixedHash,
        resetCode: null,
        resetExpires: null,
        tempPassword: null,
        mustChangePassword: false,
      })
      .where(eq(users.email, email));
    return { ok: true, tempPassword: '12345678' };
  }

  // 프로덕션: 랜덤 임시 비번 + 강제 변경
  const temp = genTempPassword();
  const hash = await hashPassword(temp);
  await db
    .update(users)
    .set({
      passwordHash: hash,
      resetCode: null,
      resetExpires: null,
      tempPassword: null, // (원한다면 해시만 보관; 평문 저장 금지)
      mustChangePassword: true,
    })
    .where(eq(users.email, email));

  // 임시 비번은 이메일로 안내
  await sendMail({
    to: email,
    subject: 'Your temporary password',
    text:
      `Your password has been reset.\n` +
      `Temporary password: ${temp}\n` +
      `Please sign in and change it immediately.`,
  });

  return { ok: true };
}