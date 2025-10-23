'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button, type buttonVariants } from '@/components/ui/button';
import { useRouteLoading } from './providers/RouteLoadingProvider';

type Props = React.ComponentProps<typeof Button> & { href: string };

export default function SmartButton({ href, onClick, ...rest }: Props) {
  const router = useRouter();
  const { start } = useRouteLoading();

  return (
    <Button
      {...rest}
      onClick={(e) => {
        start();
        onClick?.(e);
        router.push(href);
      }}
    />
  );
}
