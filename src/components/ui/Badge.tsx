import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type BadgeVariant = 'default' | 'brand' | 'soil' | 'sage' | 'warning' | 'danger'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-canvas text-muted border-line dark:bg-stone-800 dark:text-stone-300 dark:border-stone-600',
  brand:
    'bg-brand-soft text-brand border-transparent dark:text-emerald-300',
  soil: 'bg-soil text-soil-brown border-transparent dark:text-[#e7c6a5]',
  sage:
    'bg-sage/70 text-brand-dark border-transparent dark:bg-emerald-900/60 dark:text-emerald-200',
  warning:
    'bg-warning-soft text-warning border-transparent dark:text-amber-300',
  danger:
    'bg-danger-soft text-danger border-transparent dark:text-red-300',
}

export function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-medium rounded',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
