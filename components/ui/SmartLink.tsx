'use client';

import Link, { LinkProps } from 'next/link';
import React from 'react';
import { useRouteLoading } from './providers/RouteLoadingProvider';

type Props = LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>;

export default function SmartLink({ onClick, ...props }: Props) {
    const { start } = useRouteLoading();

    return (
        <Link
            {...props}
            onClick={(e) => {
                // cmd/ctrl+클릭은 새 탭 → 로딩바 굳이 안 켬
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                    start();
                }
                onClick?.(e);
            }}
            prefetch
        />
    );
}
