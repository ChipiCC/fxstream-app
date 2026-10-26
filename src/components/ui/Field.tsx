import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export const controlClassName =
  'h-10 w-full rounded-lg border border-line bg-canvas/70 px-3 text-sm text-ink placeholder:text-faint transition-colors hover:border-line focus:border-accent/70 disabled:cursor-not-allowed disabled:opacity-50';

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, optional, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-muted text-xs font-medium">
          {label}
        </label>
        {optional ? <span className="text-faint text-[10px]">optional</span> : null}
      </div>
      {children}
      {error ? (
        <p className="text-negative text-[11px]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-faint text-[11px]">{hint}</p>
      ) : null}
    </div>
  );
}
