import { cn } from '@/lib/cn'

interface LeafSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const sizeMap = {
  sm: 'size-5',
  md: 'size-8',
  lg: 'size-12',
} as const

export function LeafSpinner({
  className,
  size = 'md',
  label = 'جارٍ التحميل',
}: LeafSpinnerProps) {
  return (
    <div
      className={cn('inline-flex flex-col items-center gap-2', className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <svg
        viewBox="0 0 48 48"
        className={cn(sizeMap[size], 'leaf-spin text-brand')}
        fill="none"
        aria-hidden
      >
        <path
          d="M24 6c-2 6-2 11 0 16 2.5-5 7.5-8 13-9-5.5 1.5-9 5.5-10 11 5.5-.8 10.5.8 14.5 4.5-6-1.5-10.5.2-13.5 4.5 0 4.5-.8 8.5-3 11-2.2-2.5-3-6.5-3-11-3-4.3-7.5-6-13.5-4.5 4-3.7 9-5.3 14.5-4.5-1-5.5-4.5-9.5-10-11 5.5 1 10.5 4 13 9C26 17 26 12 24 6z"
          fill="currentColor"
          opacity="0.9"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  )
}
