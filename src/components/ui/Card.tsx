import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-line bg-surface/90 rounded-xl border shadow-[0_18px_50px_-32px_rgb(0_0_0/0.9)] backdrop-blur',
        className,
      )}
      {...props}
    />
  );
}
