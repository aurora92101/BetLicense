// lib/auth/edge-session.ts
import * as jose from 'jose'

// Edge 런타임에서도 사용 가능한 방식으로 시크릿을 가져옵니다.
// Next는 빌드 타임에 process.env.*를 인라인합니다. dotenv 금지!
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')

// payload: { user: { id, role, ... }, expires: ISO string }
export async function signToken(payload: any) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    // 여기서는 exp를 payload.expires로 관리하므로 setExpirationTime은 생략 가능
    .sign(secret)
}

export async function verifyToken(token: string) {
  const { payload } = await jose.jwtVerify(token, secret, {
    algorithms: ['HS256'],
  })
  // expires(ISO string) 기반 검증
  if (payload?.expires && Date.now() > new Date(payload.expires as string).getTime()) {
    throw new Error('Token expired')
  }
  return payload
}
