import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/cn'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'touch-target inline-flex items-center justify-center gap-2 rounded-xl',
        'border border-white/30 dark:border-stone-700/55',
        'bg-white/50 dark:bg-stone-900/50 backdrop-blur-md',
        'text-ink dark:text-stone-100 transition-all duration-200',
        'hover:border-brand/40 hover:bg-brand-soft/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        'shadow-md',
        showLabel ? 'min-h-11 px-3.5' : 'size-11',
        className,
      )}
      aria-label={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
      title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
    >
      {isDark ? (
        <Sun className="size-4 text-amber-300" aria-hidden />
      ) : (
        <Moon className="size-4 text-brand" aria-hidden />
      )}
      {showLabel ? (
        <span className="text-sm font-medium text-ink dark:text-stone-100">
          {isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
        </span>
      ) : null}
    </button>
  )
}
