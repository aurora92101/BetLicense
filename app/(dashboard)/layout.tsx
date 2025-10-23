'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import SmartLink from "@/components/ui/SmartLink";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding =
    pathname === "/";

  // 로그인 여부 확인
  const { data: user, isLoading } = useSWR("/api/user", fetcher, {
    revalidateOnFocus: false,
  });
  const isLoggedIn = !!user && !!user.id;

  return (
    <div
      className={
        isLanding
          ? "min-h-screen flex flex-col bg-transparent text-gray-900 dark:text-gray-100"
          : "min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      }
    >
      {/* 랜딩에서만 보이는 헤더(투명, 경계/보더 없음) */}
      {isLanding && (
        <header className="fixed inset-x-0 top-0 z-50 bg-transparent px-4 py-3">
          <div className="flex justify-end items-center">
            {/* 로딩 중엔 깜빡임 방지로 숨김 */}
            {!isLoading && (
              <>
                {isLoggedIn ? (
                  <Button asChild className="rounded-full">
                    <SmartLink key="Go to Dashboard" href="/dashboard/license">
                      Dashboard
                    </SmartLink>
                  </Button>
                ) : (
                  <Button asChild className="rounded-full">
                    <SmartLink key="Sign In" href="/sign-in">
                      Sign In
                    </SmartLink>
                  </Button>
                )}
              </>
            )}
          </div>
        </header>
      )
      }

      <main className="flex-1">{children}</main>
    </div >
  );
}
