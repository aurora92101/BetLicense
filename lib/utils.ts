import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import crypto from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 완전 고유하고 예측 불가능한 32자 라이선스 키 생성기
 * - SHA256 해시 기반
 * - userId + 현재시간 + 랜덤시드 조합
 * - 하이픈(-) 구분으로 가독성 유지 (8-8-8-8 형식)
 */
export function generateLicenseKey(userId?: string | number): string {
  const randomSeed = crypto.randomBytes(32).toString("hex");
  const data = `${userId ?? "anonymous"}-${Date.now()}-${randomSeed}`;

  // SHA-256 해시 생성 후 32자리만 사용
  const hash = crypto.createHash("sha256").update(data).digest("hex").toUpperCase();
  const key = hash.slice(0, 32);

  // 8자리씩 나누어 가독성 향상 (예: XXXX-XXXX-XXXX-XXXX)
  return key.match(/.{1,8}/g)!.join("-");
}