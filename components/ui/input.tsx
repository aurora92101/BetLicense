import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        `
        flex h-9 w-full min-w-0 rounded-full border bg-transparent px-3 py-2 text-base
        placeholder-gray-500 text-gray-900 border-gray-300
        outline-none transition-all shadow-xs

        focus-visible:ring-[0.5px] focus-visible:ring-orange-400 focus-visible:border-orange-400
        aria-invalid:ring-destructive/20 aria-invalid:border-destructive

        dark:bg-[rgba(12,18,28,0.70)]
        dark:text-slate-100
        dark:border-white/10
        dark:placeholder-slate-400
        dark:focus-visible:ring-[0.5px]
        dark:focus-visible:ring-[rgba(85,182,255,0.50)]
        dark:focus-visible:border-[rgba(85,182,255,0.50)]
        `,
        className
      )}
      {...props}
    />
  );
}

export { Input };
