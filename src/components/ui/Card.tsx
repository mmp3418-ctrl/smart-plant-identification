import { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
} as const

export function Card({
  className,
  padding = 'md',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface',
        paddingStyles[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  action?: ReactNode
}

export function CardHeader({
  className,
  title,
  description,
  action,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn('mb-3 flex items-start justify-between gap-3', className)}
      {...props}
    >
      <div className="min-w-0">
        <h3 className="text-base font-bold text-ink sm:text-lg">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-muted leading-relaxed">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function CardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-sm text-muted leading-relaxed', className)} {...props}>
      {children}
    </div>
  )
}
