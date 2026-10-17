import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftAddon?: ReactNode
  rightAddon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { className, label, hint, error, leftAddon, rightAddon, id, ...props },
    ref,
  ) {
    const inputId = id || props.name

    return (
      <label className="block w-full">
        {label ? (
          <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
        ) : null}
        <span
          className={cn(
            'flex min-h-11 items-center gap-2 rounded-md border bg-surface px-3 transition-colors',
            error ? 'border-danger' : 'border-line focus-within:border-brand',
          )}
        >
          {leftAddon ? (
            <span className="shrink-0 text-muted">{leftAddon}</span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full min-w-0 bg-transparent py-2.5 text-sm text-ink placeholder:text-muted/80',
              'outline-none border-0 focus:ring-0',
              className,
            )}
            {...props}
          />
          {rightAddon ? (
            <span className="shrink-0 text-muted">{rightAddon}</span>
          ) : null}
        </span>
        {error ? (
          <span className="mt-1.5 block text-xs text-danger">{error}</span>
        ) : hint ? (
          <span className="mt-1.5 block text-xs text-muted">{hint}</span>
        ) : null}
      </label>
    )
  },
)
