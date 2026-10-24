import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Leaf, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { IdentifyLoadingStep } from '@/types/content'

export interface IdentifyLoadingOverlayProps {
  steps: IdentifyLoadingStep[]
  zIndexClass?: string
  className?: string
}

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
      setStepIndex((prev) => (prev < safeSteps.length - 1 ? prev + 1 : prev))
    }, current.durationMs)
    return () => window.clearTimeout(timer)
  }, [safeSteps, stepIndex])

  useEffect(() => {
    const target =
      ((stepIndex + 1) / safeSteps.length) * 92 + (stepIndex === 0 ? 0 : 4)
    const id = window.setInterval(() => {
      setProgress((prev) => (prev >= target ? prev : Math.min(prev + 1.8, target)))
    }, 40)
    return () => window.clearInterval(id)
  }, [stepIndex, safeSteps.length])

  const active = safeSteps[stepIndex] ?? safeSteps[0]!

  return (
    <motion.div
      className={cn(
        'fixed inset-0 flex flex-col items-center justify-center',
        'bg-[#142D21]/92 text-stone-100 backdrop-blur-md',
        zIndexClass,
        className,
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="status"
      aria-live="polite"
      aria-busy
      aria-label={active.label}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(74,222,128,0.22), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(197,220,196,0.1), transparent 42%)',
        }}
        aria-hidden
      />

      <div className="relative flex w-full max-w-md flex-col items-center px-6 text-center">
        <motion.div
          className="brand-glow relative mb-8 flex size-28 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-950/40 sm:size-32"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span
            className="absolute inset-3 rounded-full border border-emerald-200/20 leaf-grow"
            aria-hidden
          />
          <Leaf
            className="size-12 text-emerald-200 leaf-pulse sm:size-14"
            strokeWidth={1.5}
            aria-hidden
          />
          <Sparkles
            className="absolute -top-1 end-2 size-5 text-sage scan-pulse"
            aria-hidden
          />
        </motion.div>

        <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-emerald-200/85">
          نبْتة · تحليل
        </p>

        <AnimatePresence mode="wait">
          <motion.p
            key={active.id}
            className="min-h-[3rem] text-lg font-bold text-stone-50 sm:text-xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            {active.label}
          </motion.p>
        </AnimatePresence>

        <div className="mt-6 w-full overflow-hidden rounded-full bg-emerald-950/70 p-1">
          <motion.div
            className="relative h-2 overflow-hidden rounded-full bg-gradient-to-l from-brand via-emerald-400 to-sage"
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <span className="progress-shimmer absolute inset-0 opacity-70" />
          </motion.div>
        </div>

        <ul className="mt-6 flex w-full flex-col gap-2 text-start">
          {safeSteps.map((step, index) => {
            const done = index < stepIndex
            const current = index === stepIndex
            return (
              <motion.li
                key={step.id}
                layout
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-300',
                  current && 'border border-emerald-300/30 bg-emerald-900/40 text-emerald-50',
                  done && 'text-emerald-200/55',
                  !done && !current && 'text-emerald-100/35',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                    current && 'bg-emerald-300 text-brand-dark',
                    done && 'bg-emerald-500/30 text-emerald-100',
                    !done && !current && 'bg-emerald-950 text-emerald-200/50',
                  )}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span className={cn(current && 'font-semibold')}>{step.label}</span>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </motion.div>
  )
}
