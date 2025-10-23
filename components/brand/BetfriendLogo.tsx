// components/brand/BetfriendLogo.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';

type Props = {
  /** 컴포넌트 전체 너비(px) */
  width?: number;
  /** 클릭 시 '/'로 이동 */
  asLink?: boolean;
  /** 추가 클래스 (텍스트색 등) */
  className?: string;
  /** 심볼이 차지하는 비율 (0.2~0.4 권장) */
  symbolRatio?: number;
};

export default function BetfriendLogo({
  width = 360,          // 기본 크기 ↑
  asLink = true,
  className = '',
  symbolRatio = 0.26,   // 심볼 비율 ↓ (워드마크를 더 크게 보이게)
}: Props) {
  // 간격(px) — 전체 width에 비례
  const gap = Math.max(8, Math.round(width * 0.04));

  // 심볼(정사각)
  const symbolW = Math.round(width * symbolRatio);
  const symbolH = symbolW;

  // 워드마크: 원본 비율 560:96 → h = w * (96/560)
  const WORDMARK_RATIO = 96 / 560;
  const wordW = Math.max(80, width - symbolW - gap);
  const wordH = Math.round(wordW * WORDMARK_RATIO);

  const content = (
    <div
      className={`flex items-center select-none ${className}`}
      style={{ color: 'currentColor', width }}
    >
      {/* 심볼 */}
      <div className="relative shrink-0" style={{ width: symbolW, height: symbolH }}>
        <Image
          src="/images/brand/betfriend-logomark.svg"
          alt="BetFriend"
          fill
          className="object-contain"
          priority
          sizes={`${symbolW}px`}
        />
      </div>

      {/* gap */}
      <div style={{ width: gap }} />

      {/* 워드마크 */}
      <div className="relative" style={{ width: wordW, height: wordH }}>
        <Image
          src="/images/brand/betfriend-wordmark.svg"
          alt="BetFriend"
          fill
          className="object-contain"
          priority
          sizes={`${wordW}px`}
        />
      </div>
    </div>
  );

  return asLink ? (
    <Link href="/" aria-label="Go to home" className="inline-block">
      {content}
    </Link>
  ) : (
    content
  );
}
