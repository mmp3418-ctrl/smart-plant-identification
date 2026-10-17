import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type BadgeVariant = 'default' | 'brand' | 'soil' | 'sage' | 'warning' | 'danger'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-canvas text-muted border-line',
  brand: 'bg-brand-soft text-brand border-transparent',
  soil: 'bg-soil text-soil-brown border-transparent',
  sage: 'bg-sage/70 text-brand-dark border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
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
