"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils"; // 선택: 없으면 제거하세요

type YouTubeEmbedProps = {
  videoId: string;
  className?: string;
};

export default function YouTubeEmbed({ videoId, className }: YouTubeEmbedProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div
      className={cn(
        "aspect-video rounded-xl overflow-hidden border shadow-lg",
        // 🌞 라이트: 기본 흰 배경
        "bg-white border-gray-200",
        // 🌙 다크: 글래스 + 시안 계열
        "dark:bg-[rgba(12,18,28,0.80)] dark:border-white/10 dark:backdrop-blur-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      <iframe
        className="w-full h-full rounded-none"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
