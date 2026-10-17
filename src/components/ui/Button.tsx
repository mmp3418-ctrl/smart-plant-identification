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
    'bg-brand text-white hover:bg-brand-dark focus-visible:ring-brand',
  secondary:
    'bg-sage text-brand-dark hover:bg-[color-mix(in_srgb,#C5DCC4_80%,#286B45)] focus-visible:ring-brand',
  outline:
    'border border-brand bg-transparent text-brand hover:bg-brand-soft focus-visible:ring-brand',
  ghost:
    'bg-transparent text-ink hover:bg-[color-mix(in_srgb,#EDF1E8_70%,#D5DDD2)] focus-visible:ring-brand',
  danger:
    'bg-danger text-white hover:bg-[#912018] focus-visible:ring-danger',
  soil:
    'bg-soil text-soil-brown hover:bg-[color-mix(in_srgb,#F4E4D7_85%,#79533D)] focus-visible:ring-soil-brown',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3.5 text-sm gap-1.5 rounded-md',
  md: 'min-h-11 px-4 text-sm gap-2 rounded-md',
  lg: 'min-h-12 px-5 text-base gap-2 rounded-md',
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
          'inline-flex items-center justify-center font-semibold transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
          'disabled:pointer-events-none disabled:opacity-45',
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
