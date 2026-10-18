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
          <span className="mb-1.5 block text-sm font-medium text-ink dark:text-stone-100">
            {label}
          </span>
        ) : null}
        <span
          className={cn(
            'flex min-h-11 items-center gap-2 rounded-xl px-3 transition-all duration-200',
            'backdrop-blur-md bg-white/70 dark:bg-stone-900/75',
            'border border-white/30 dark:border-stone-700/55 shadow-lg',
            error
              ? 'border-danger'
              : 'focus-within:border-brand focus-within:shadow-xl',
          )}
        >
          {leftAddon ? (
            <span className="shrink-0 text-muted dark:text-stone-300">
              {leftAddon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full min-w-0 bg-transparent py-2.5 text-sm',
              'text-ink dark:text-stone-100',
              'placeholder:text-muted/80 dark:placeholder:text-stone-400',
              'outline-none border-0 focus:ring-0',
              className,
            )}
            {...props}
          />
          {rightAddon ? (
            <span className="shrink-0 text-muted dark:text-stone-300">
              {rightAddon}
            </span>
          ) : null}
        </span>
        {error ? (
          <span className="mt-1.5 block text-xs text-danger">{error}</span>
        ) : hint ? (
          <span className="mt-1.5 block text-xs text-muted dark:text-stone-300">
            {hint}
          </span>
        ) : null}
      </label>
    )
  },
)
