import { useEffect, useMemo, useState } from 'react'
import { Leaf, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { IdentifyLoadingStep } from '@/types/content'

export interface IdentifyLoadingOverlayProps {
  steps: IdentifyLoadingStep[]
  zIndexClass?: string
  className?: string
}

/**
 * Multi-step deluxe analysis loader with growing plant + amber glow.
 */
export function IdentifyLoadingOverlay({
  steps,
  zIndexClass = 'z-[95]',
  className,
}: IdentifyLoadingOverlayProps) {
  const safeSteps = useMemo(
    () =>
      steps.length > 0
        ? steps
        : [{ id: 'default', label: 'جارٍ التحليل…', durationMs: 2000 }],
    [steps],
  )

  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(8)

  useEffect(() => {
    setStepIndex(0)
    setProgress(8)
  }, [safeSteps])

  useEffect(() => {
    if (safeSteps.length <= 1) return
    const current = safeSteps[stepIndex]
    if (!current) return

    const timer = window.setTimeout(() => {
      setStepIndex((prev) =>
        prev < safeSteps.length - 1 ? prev + 1 : prev,
      )
    }, current.durationMs)

    return () => window.clearTimeout(timer)
  }, [safeSteps, stepIndex])

  useEffect(() => {
    const target =
      ((stepIndex + 1) / safeSteps.length) * 92 + (stepIndex === 0 ? 0 : 4)
    const id = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= target) return prev
        return Math.min(prev + 1.8, target)
      })
    }, 40)
    return () => window.clearInterval(id)
  }, [stepIndex, safeSteps.length])

  const active = safeSteps[stepIndex] ?? safeSteps[0]!

  return (
    <div
      className={cn(
        'fixed inset-0 flex flex-col items-center justify-center',
        'bg-[#070d18]/90 text-slate-100 backdrop-blur-md',
        'loader-fade-in',
        zIndexClass,
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy
      aria-label={active.label}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(245,158,11,0.22), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(59,130,246,0.12), transparent 42%)',
        }}
        aria-hidden
      />

      <div className="relative flex w-full max-w-md flex-col items-center px-6 text-center">
        <div className="amber-glow relative mb-8 flex size-28 items-center justify-center rounded-full border border-amber-400/30 bg-slate-900/50 sm:size-32">
          <span
            className="absolute inset-3 rounded-full border border-amber-300/20 leaf-grow"
            aria-hidden
          />
          <Leaf
            className="size-12 text-amber-300 leaf-pulse sm:size-14"
            strokeWidth={1.5}
            aria-hidden
          />
          <Sparkles
            className="absolute -top-1 end-2 size-5 text-amber-200/90 scan-pulse"
            aria-hidden
          />
        </div>

        <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-amber-200/80">
          نبْتة · ANALYZE
        </p>

        <p
          key={active.id}
          className="step-fade min-h-[3rem] text-lg font-bold text-slate-50 sm:text-xl"
        >
          {active.label}
        </p>

        <div className="mt-6 w-full overflow-hidden rounded-full bg-slate-800/80 p-1">
          <div
            className="relative h-2 overflow-hidden rounded-full bg-gradient-to-l from-amber-500 via-amber-400 to-yellow-300 transition-[width] duration-500 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          >
            <span className="progress-shimmer absolute inset-0 opacity-70" />
          </div>
        </div>

        <ul className="mt-6 flex w-full flex-col gap-2 text-start">
          {safeSteps.map((step, index) => {
            const done = index < stepIndex
            const current = index === stepIndex
            return (
              <li
                key={step.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-300',
                  current && 'glass-amber text-amber-100',
                  done && 'text-slate-400',
                  !done && !current && 'text-slate-500',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                    current && 'bg-amber-400 text-slate-900',
                    done && 'bg-amber-500/30 text-amber-200',
                    !done && !current && 'bg-slate-700 text-slate-400',
                  )}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span className={cn(current && 'font-semibold')}>
                  {step.label}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
