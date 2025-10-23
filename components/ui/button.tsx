import * as React from "react";
import { Slot as SlotPrimitive } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // 공통 인터랙션: 얇은 링, 살짝 떠오르는 호버, 눌림 감도, 글로우
  `
  relative overflow-hidden
  inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md
  text-sm font-medium
  transition-[transform,box-shadow,background-color,border-color,opacity] duration-200
  disabled:pointer-events-none disabled:opacity-50
  [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0
  outline-none
  focus-visible:ring-[0.5px] ring-offset-0
  hover:-translate-y-0.5 hover:shadow-md
  active:translate-y-0 active:shadow-sm active:scale-[0.99]
  // 포커스 글로우(얇은 외곽 그림자)
  focus-visible:shadow-[0_0_0_3px_rgba(255,165,0,0.15)]
  dark:focus-visible:shadow-[0_0_0_6px_rgba(85,182,255,0.16)]
  // 글래스 하이라이트(은은한 빛) - hover시에만 살짝 보임
  before:absolute before:inset-0 before:opacity-0 hover:before:opacity-100 before:transition-opacity
  before:pointer-events-none
  before:bg-[radial-gradient(120%_120%_at_30%_-10%,rgba(255,255,255,0.18),transparent_60%)]
  dark:before:bg-[radial-gradient(120%_120%_at_30%_-10%,rgba(255,255,255,0.06),transparent_60%)]
  `,
  {
    variants: {
      variant: {
        // 🌞 라이트: 기존 primary 토큰(오렌지) 유지
        // 🌙 다크: 시안톤 글래스(투명+보더+호버) + 블루 포커스
        default: cn(
          `
          bg-primary text-primary-foreground shadow-xs hover:bg-primary/90
          focus-visible:ring-orange-400 focus-visible:border-orange-400
          aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive
          `,
          `
          dark:bg-[rgba(106,208,255,0.20)]
          dark:text-[#6ad0ff]
          dark:border dark:border-[rgba(85,182,255,0.45)]
          dark:hover:bg-[rgba(106,208,255,0.50)]
          dark:focus-visible:ring-[rgba(85,182,255,0.55)]
          dark:focus-visible:border-[rgba(85,182,255,0.55)]
          dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)]
          `
        ),

        destructive: cn(
          `
          bg-destructive text-white shadow-xs hover:bg-destructive/90
          focus-visible:ring-red-400 focus-visible:border-red-400
          `,
          `
          dark:bg-destructive/70 dark:hover:bg-destructive/80
          dark:focus-visible:ring-red-300/60
          `
        ),

        // 🌙 다크: 글래스 톤(어두운 반투명 배경 + 얇은 보더)
        outline: cn(
          `
          border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground
          focus-visible:ring-orange-300/70 focus-visible:border-orange-300/80
          `,
          `
          dark:bg-[rgba(12,18,28,0.70)]
          dark:border-white/10
          dark:hover:bg-white/5 dark:text-slate-100
          dark:focus-visible:ring-[rgba(85,182,255,0.40)]
          dark:focus-visible:border-[rgba(85,182,255,0.45)]
          `
        ),

        secondary: cn(
          `
          bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80
          focus-visible:ring-orange-300/70
          `,
          `
          dark:bg-secondary/30 dark:hover:bg-secondary/40
          dark:focus-visible:ring-[rgba(85,182,255,0.35)]
          `
        ),

        // 🌙 다크에선 hover 배경을 살짝만
        ghost: cn(
          `
          hover:bg-accent hover:text-accent-foreground
          focus-visible:ring-orange-300/70
          `,
          `
          dark:text-slate-100 dark:hover:bg-white/5
          dark:focus-visible:ring-[rgba(85,182,255,0.35)]
          `
        ),

        // 링크는 다크에서 시안 텍스트로
        link:
          "text-primary underline-offset-4 hover:underline dark:text-[#6ad0ff] dark:hover:text-[#89dcff]"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? SlotPrimitive : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
