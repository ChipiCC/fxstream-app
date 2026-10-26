import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-accent bg-accent text-canvas hover:border-accent-strong hover:bg-accent-strong disabled:hover:bg-accent',
  secondary: 'border-line bg-surface-raised text-ink hover:border-line hover:bg-surface-hover',
  ghost: 'border-transparent bg-transparent text-muted hover:bg-surface-hover hover:text-ink',
  danger:
    'border-negative/30 bg-negative/10 text-negative hover:border-negative/50 hover:bg-negative/15',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
};

export function buttonClassName({
  variant = 'secondary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45',
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}
