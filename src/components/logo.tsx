export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" className="text-foreground" />
      <circle cx="11" cy="16" r="2.6" fill="var(--color-primary)" />
      <path
        d="M15.5 10.64a7 7 0 0 1 0 10.72"
        fill="none"
        stroke="var(--color-background)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M18.7 6.81a12 12 0 0 1 0 18.38"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark className="size-7" />
      <span className="font-display text-xl tracking-[-0.03em] italic">Hoorspel</span>
    </span>
  );
}
