import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

type BadgeVariant = 'neutral' | 'positive' | 'negative' | 'warning' | 'info' | 'accent' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'border-line bg-surface-raised text-muted',
  positive: 'border-positive/30 bg-positive/10 text-positive',
  negative: 'border-negative/30 bg-negative/10 text-negative',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  info: 'border-info/30 bg-info/10 text-info',
  accent: 'border-accent/30 bg-accent/10 text-accent',
  outline: 'border-line bg-transparent text-muted',
};

export function Badge({ variant = 'neutral', dot = false, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        variantClasses[variant],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
