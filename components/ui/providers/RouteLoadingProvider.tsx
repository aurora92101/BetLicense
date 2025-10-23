'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type Ctx = {
  start: () => void;
  done: () => void;
  active: boolean;
  visible: boolean;
};

const RouteLoadingContext = createContext<Ctx | null>(null);

export function useRouteLoading() {
  const ctx = useContext(RouteLoadingContext);
  if (!ctx) throw new Error('useRouteLoading must be used within <RouteLoadingProvider>');
  return ctx;
}

/**
 * 설계:
 * - start(): 즉시 active=true. 120ms 뒤에 아직 active면 visible=true (짧은 네비는 안 보이게)
 * - 최소표시 400ms: 보여주기 시작한 시각 이후 400ms 이전에는 done()이 와도 바로 안 숨김
 * - 하드타임아웃 8s: 어떤 경우에도 8초 지나면 강제로 닫음(유실 대비)
 * - 경로 변경 감지 시 자동 done()
 */
export default function RouteLoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);

  const showDelayRef = useRef<NodeJS.Timeout | null>(null);
  const minHideRef  = useRef<NodeJS.Timeout | null>(null);
  const hardCapRef  = useRef<NodeJS.Timeout | null>(null);
  const visibleSinceRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (showDelayRef.current) clearTimeout(showDelayRef.current);
    if (minHideRef.current) clearTimeout(minHideRef.current);
    if (hardCapRef.current) clearTimeout(hardCapRef.current);
    showDelayRef.current = minHideRef.current = hardCapRef.current = null;
  };

  const start = () => {
    clearTimers();
    setActive(true);

    // 120ms 동안 끝나면 아예 표시 안 함 (깜빡임 방지)
    showDelayRef.current = setTimeout(() => {
      setVisible(true);
      visibleSinceRef.current = Date.now();

      // 하드타임아웃(네비 로스트/에러 대비)
      hardCapRef.current = setTimeout(() => {
        setActive(false);
        setVisible(false);
        visibleSinceRef.current = null;
      }, 8000);
    }, 120);
  };

  const done = () => {
    setActive(false);

    // 아직 안 보였으면 지연표시 타이머만 끄고 끝
    if (!visible) {
      if (showDelayRef.current) clearTimeout(showDelayRef.current);
      return;
    }

    // 최소표시 400ms 보장
    const elapsed = visibleSinceRef.current ? Date.now() - visibleSinceRef.current : 0;
    const remain = Math.max(0, 400 - elapsed);

    if (minHideRef.current) clearTimeout(minHideRef.current);
    minHideRef.current = setTimeout(() => {
      setVisible(false);
      visibleSinceRef.current = null;
      if (hardCapRef.current) clearTimeout(hardCapRef.current);
    }, remain);
  };

  // 경로 변경 시 자동 done() (서버/클라 혼합 내비에서 누락되는 케이스 커버)
  const lastPathRef = useRef(pathname);
  useEffect(() => {
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;
      // 다음 프레임에 완료 처리 (SSR→CSR 전환 직후 레이아웃 안정화용)
      requestAnimationFrame(() => done());
    }
  }, [pathname]);

  // 페이지 숨김/보임 전환 시 안전하게 닫기
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') done(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => () => clearTimers(), []);

  return (
    <RouteLoadingContext.Provider value={{ start, done, active, visible }}>
      {children}
    </RouteLoadingContext.Provider>
  );
}
