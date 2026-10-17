import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 py-12 text-center',
        className,
      )}
    >
      {icon ? <div className="mb-3 text-muted">{icon}</div> : null}
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-muted leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
