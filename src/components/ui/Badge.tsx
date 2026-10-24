import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type BadgeVariant = 'default' | 'brand' | 'soil' | 'sage' | 'warning' | 'danger'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-white/5 text-muted border-white/10',
  brand:
    'bg-brand-soft text-amber-300 border-amber-400/25',
  soil: 'bg-soil text-amber-200 border-white/10',
  sage:
    'bg-slate-700/50 text-slate-200 border-white/10',
  warning:
    'bg-warning-soft text-warning border-amber-400/30',
  danger:
    'bg-danger-soft text-danger border-red-400/30',
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
        'inline-flex items-center gap-1 border px-2.5 py-0.5 text-xs font-medium rounded-full',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
