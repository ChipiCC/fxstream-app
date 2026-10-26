import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface StatePanelProps {
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
  compact?: boolean;
  className?: string;
}

export function StatePanel({
  title,
  description,
  action,
  tone = 'neutral',
  compact = false,
  className,
}: StatePanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 text-center',
        compact ? 'py-8' : 'py-14',
        tone === 'error' ? 'border-negative/30 bg-negative/5' : 'border-line bg-surface/40',
        className,
      )}
    >
      <div className={cn('size-2 rounded-full', tone === 'error' ? 'bg-negative' : 'bg-faint')} />
      <div className="space-y-1">
        <p className="text-ink text-sm font-medium">{title}</p>
        {description ? (
          <p className="text-muted max-w-md text-xs leading-5">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
