import { cn } from '@/lib/utils';

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'span'> & { variant?: 'default' | 'warning' | 'success' | 'outline' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-primary text-primary-foreground',
        variant === 'warning' && 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
        variant === 'success' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
        variant === 'outline' && 'border border-border text-foreground',
        className,
      )}
      {...props}
    />
  );
}
