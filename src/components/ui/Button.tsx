import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'soil'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-dark dark:hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-brand shadow-sm',
  secondary:
    'bg-sage text-brand-dark dark:bg-emerald-900 dark:text-emerald-100 hover:brightness-95 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-brand',
  outline:
    'border border-brand bg-transparent text-brand dark:text-emerald-300 dark:border-emerald-400/70 hover:bg-brand-soft hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-brand',
  ghost:
    'bg-transparent text-ink dark:text-stone-100 hover:bg-brand-soft/60 focus-visible:ring-brand',
  danger:
    'bg-danger text-white hover:brightness-95 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-danger shadow-sm',
  soil:
    'bg-soil text-soil-brown dark:text-[#e7c6a5] hover:brightness-95 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-soil-brown',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'min-h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'min-h-12 px-5 text-base gap-2 rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
          'disabled:pointer-events-none disabled:opacity-45 disabled:hover:scale-100',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    )
  },
)
