import 'server-only';
import { compare, hash } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NewUser } from '@/lib/db/schema';
import { getUserById } from '@/lib/db/users';
import { SESSION_TTL_MS } from './session-constants';

const key = new TextEncoder().encode(process.env.AUTH_SECRET);
const SALT_ROUNDS = 10;

export async function hashPassword(password: string) {
  return hash(password, SALT_ROUNDS);
}

export async function comparePasswords(
  plainTextPassword: string,
  hashedPassword: string
) {
  return compare(plainTextPassword, hashedPassword);
}

type SessionData = {
  user: { id: number, role: string };
  expires: string;
};

export async function signToken(payload: SessionData) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(key);
}

export async function verifyToken(input: string) {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload as SessionData;
}

export async function getSession() {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;
  const payload = await verifyToken(session);
  const user = await getUserById(payload.user.id);

  if (!user || !user.permission) {
    return null;
  }

  return payload;
}

export async function setSession(user: NewUser) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session: SessionData = {
    user: { id: user.id!, role: user.role! },
    expires: expiresAt.toISOString(),
  };
  const encryptedSession = await signToken(session);
  (await cookies()).set('session', encryptedSession, {
    expires: expiresAt,
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  });
}
