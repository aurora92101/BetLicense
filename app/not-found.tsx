import Link from 'next/link';
import { CircleIcon } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      className="
        flex flex-col justify-center items-center min-h-[100dvh] px-4
        bg-gray-50 text-gray-900
        /* 다크: 로그인/결제모달과 동일한 글래스톤 */
        dark:bg-[rgba(10,15,25,0.88)] dark:text-slate-100 dark:backdrop-blur-md
      "
    >
      <div
        className="
          max-w-md w-full space-y-8 p-6 text-center
          rounded-2xl border
          bg-white shadow
          /* 다크: 같은 카드톤 */
          dark:bg-[rgba(12,18,28,0.72)] dark:border-white/10 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]
        "
      >
        {/* 아이콘 */}
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500 dark:text-[#6ad0ff]" />
        </div>

        {/* 제목 */}
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100">
          Page Not Found
        </h1>

        {/* 설명 */}
        <p className="text-base text-gray-600 dark:text-slate-300">
          The page you are looking for might have been removed,
          had its name changed, or is temporarily unavailable.
        </p>

        {/* 버튼 */}
        <Link
          href="/"
          className="
            w-full flex justify-center py-2 px-4 rounded-full shadow-sm text-sm font-medium
            text-gray-700 bg-white border border-gray-300 hover:bg-gray-50
            transition-colors

            /* 라이트: 오렌지 포커스/액티브 */
            focus:outline-none focus:ring-[0.5px] focus:ring-orange-400 focus:border-orange-400
            active:ring-[0.5px] active:ring-orange-400 active:border-orange-400

            /* 다크: 배경/텍스트/보더 */
            dark:bg-[rgba(106,208,255,0.10)]
            dark:text-[#6ad0ff]
            dark:border dark:border-[rgba(85,182,255,0.30)]
            dark:hover:bg-[rgba(85,182,255,0.25)]
            dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)]

            /* 다크: 오렌지 완전 무시 + 블루 강제 (focus / focus-visible / active 모두) */
            dark:!focus:ring-[0.5px] dark:!focus:ring-[rgba(85,182,255,0.45)] dark:!focus:border-[rgba(85,182,255,0.45)]
            dark:!focus-visible:ring-[0.5px] dark:!focus-visible:ring-[rgba(85,182,255,0.45)] dark:!focus-visible:border-[rgba(85,182,255,0.45)]
            dark:!active:ring-[0.5px] dark:!active:ring-[rgba(85,182,255,0.45)] dark:!active:border-[rgba(85,182,255,0.45)]

            /* 모바일 탭 하이라이트(색 번쩍임) 제거 */
            [-webkit-tap-highlight-color:transparent]
          "
        >
          Back to Home
        </Link>

      </div>
    </div>
  );
}
