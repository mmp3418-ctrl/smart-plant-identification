import { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  glass?: boolean
  hoverable?: boolean
}

const paddingStyles = {
  none: '',
  sm: 'p-3.5',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-7',
} as const

export function Card({
  className,
  padding = 'md',
  glass = true,
  hoverable = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl sm:rounded-3xl',
        glass
          ? 'glass-panel'
          : 'border border-line bg-surface shadow-[0_8px_30px_-18px_rgba(20,45,33,0.18)]',
        hoverable && 'hover-lift cursor-pointer',
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
      className={cn('mb-4 flex items-start justify-between gap-3', className)}
      {...props}
    >
      <div className="min-w-0">
        <h3 className="text-base font-extrabold tracking-tight text-ink sm:text-lg">
          {title}
        </h3>
        {description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {description}
          </p>
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
    <div
      className={cn('text-sm leading-relaxed text-muted', className)}
      {...props}
    >
      {children}
    </div>
  )
}
