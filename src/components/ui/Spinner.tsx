import { cn } from '@/lib/cn'

interface SpinnerProps {
  className?: string
  label?: string
}

export function Spinner({ className, label = 'جارٍ التحميل' }: SpinnerProps) {
  return (
    <div
      className={cn('inline-flex items-center gap-2 text-muted', className)}
      role="status"
      aria-live="polite"
    >
      <span
        className="size-5 animate-spin rounded-full border-2 border-line border-t-brand"
        aria-hidden
      />
      <span className="text-sm">{label}</span>
    </div>
  )
}
