import { cn } from '@/lib/cn'

export interface GreenLoadingOverlayProps {
  exiting?: boolean
  message?: string
  title?: string
  typedTitle?: string
  typeDone?: boolean
  blocking?: boolean
  className?: string
  zIndexClass?: string
}

/**
 * Immersive full-screen botanical green loading overlay.
 * Used for initial splash and route transitions.
 */
export function GreenLoadingOverlay({
  exiting = false,
  message = 'جارٍ التحميل…',
  title,
  typedTitle,
  typeDone = false,
  blocking = true,
  className,
  zIndexClass = 'z-[100]',
}: GreenLoadingOverlayProps) {
  const displayTitle = typedTitle ?? title

  return (
    <div
      className={cn(
        'fixed inset-0 flex flex-col items-center justify-center',
        'bg-[#142D21] text-stone-100',
        blocking ? 'pointer-events-auto' : 'pointer-events-none',
        exiting ? 'splash-fade-out' : 'loader-fade-in',
        zIndexClass,
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      aria-label={message}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(16,185,129,0.22), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(197,220,196,0.08), transparent 40%)',
        }}
        aria-hidden
      />

      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="leaf-grow mb-7">
          <svg
            viewBox="0 0 96 96"
            className="size-24 text-emerald-200 sm:size-28"
            fill="none"
            aria-hidden
          >
            <circle
              cx="48"
              cy="48"
              r="42"
              className="stroke-emerald-400/25"
              strokeWidth="1.5"
            />
            <path
              d="M48 16c-3.2 9.5-3.2 17.5 0 25.5 4-8 12-13 21-14.5-8.5 2.2-14 8.5-15.5 17 8.5-1.2 16.5 1.2 22.5 7.5-9.5-2.2-16.5.5-21 7.5 0 7.5-1.4 13.5-5.2 17.5-3.8-4-5.2-10-5.2-17.5-4.5-7-11.5-9.7-21-7.5 6-6.3 14-8.7 22.5-7.5-1.5-8.5-7-14.8-15.5-17 9 1.5 17 6.5 21 14.5C51.2 33.5 51.2 25.5 48 16z"
              className="leaf-draw fill-none stroke-emerald-200"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M48 42v26"
              className="leaf-draw stroke-emerald-100/90"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ animationDelay: '0.3s' }}
            />
          </svg>
        </div>

        <p className="mb-2 text-sm font-semibold tracking-wide text-emerald-200/90">
          نبْتة
        </p>

        {displayTitle ? (
          <h1
            className={cn(
              'min-h-[2.6em] max-w-lg text-xl font-extrabold leading-relaxed text-stone-50 sm:text-2xl',
              typeDone && 'title-glow',
            )}
          >
            {displayTitle}
            {title && typedTitle !== undefined && !typeDone ? (
              <span className="typewriter-caret" aria-hidden />
            ) : null}
          </h1>
        ) : null}

        <p
          className={cn(
            'mt-4 text-sm text-emerald-100/75 transition-opacity duration-500',
            exiting && 'opacity-0',
          )}
        >
          {message}
        </p>
      </div>
    </div>
  )
}
