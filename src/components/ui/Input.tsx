import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  success?: string
  leftAddon?: ReactNode
  rightAddon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      className,
      label,
      hint,
      error,
      success,
      leftAddon,
      rightAddon,
      id,
      ...props
    },
    ref,
  ) {
    const inputId = id || props.name

    return (
      <label className="block w-full">
        {label ? (
          <span className="mb-1.5 block text-sm font-medium text-ink">
            {label}
          </span>
        ) : null}
        <span
          className={cn(
            'flex min-h-11 items-center gap-2 rounded-xl px-3 transition-all duration-200',
            'glass-panel',
            error
              ? 'border-danger! shadow-[0_0_0_1px_rgba(248,113,113,0.45)]'
              : success
                ? 'border-emerald-400/40!'
                : 'focus-within:border-amber-400/50 focus-within:shadow-[0_0_0_1px_rgba(245,158,11,0.35)]',
          )}
        >
          {leftAddon ? (
            <span className="shrink-0 text-muted">{leftAddon}</span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full min-w-0 bg-transparent py-2.5 text-sm',
              'text-ink placeholder:text-muted/70',
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
        ) : success ? (
          <span className="mt-1.5 block text-xs text-emerald-400">{success}</span>
        ) : hint ? (
          <span className="mt-1.5 block text-xs text-muted">{hint}</span>
        ) : null}
      </label>
    )
  },
)
