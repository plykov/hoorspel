import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] bg-card p-5 text-foreground shadow-[var(--shadow-border)]",
        className,
      )}
      {...props}
    />
  );
}
