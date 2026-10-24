import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'
import type { IdentifyLoadingStep } from '@/types/content'

export interface IdentifyLoadingOverlayProps {
  steps: IdentifyLoadingStep[]
  zIndexClass?: string
  className?: string
}

const FALLBACK_STEPS: IdentifyLoadingStep[] = [
  {
    id: 'scan',
    label: 'جاري فحص الخصائص الحيوية للورقة...',
    durationMs: 1800,
  },
  {
    id: 'dna',
    label: 'تحليل البصمة الوراثية للنبتة...',
    durationMs: 1900,
  },
  {
    id: 'disease',
    label: 'استخلاص التشخيص والأمراض...',
    durationMs: 1800,
  },
  {
    id: 'care',
    label: 'تجهيز دليل العناية الشامل...',
    durationMs: 1600,
  },
]

/**
 * Premium analysis theater — scanning beam, growing plant, pulsing rings,
 * and cycling Arabic status copy. GPU-friendly transforms/opacity only.
 */
export function IdentifyLoadingOverlay({
  steps,
  zIndexClass = 'z-[95]',
  className,
}: IdentifyLoadingOverlayProps) {
  const reduceMotion = useReducedMotion()
  const safeSteps = useMemo(
    () => (steps.length > 0 ? steps : FALLBACK_STEPS),
    [steps],
  )

  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(6)

  useEffect(() => {
    setStepIndex(0)
    setProgress(6)
  }, [safeSteps])

  useEffect(() => {
    const current = safeSteps[stepIndex]
    if (!current || safeSteps.length <= 1) return
    const timer = window.setTimeout(() => {
      setStepIndex((prev) => (prev < safeSteps.length - 1 ? prev + 1 : prev))
    }, current.durationMs)
    return () => window.clearTimeout(timer)
  }, [safeSteps, stepIndex])

  useEffect(() => {
    const target = ((stepIndex + 1) / safeSteps.length) * 94
    const id = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= target) return prev
        return Math.min(prev + (reduceMotion ? 4 : 1.4), target)
      })
    }, reduceMotion ? 80 : 36)
    return () => window.clearInterval(id)
  }, [stepIndex, safeSteps.length, reduceMotion])

  const active = safeSteps[stepIndex] ?? safeSteps[0]!
  const pct = Math.round(Math.min(progress, 99))

  return (
    <motion.div
      className={cn(
        'fixed inset-0 flex items-center justify-center overflow-hidden',
        'bg-[#0f1f17]/94 text-stone-50 backdrop-blur-xl',
        zIndexClass,
        className,
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
      role="status"
      aria-live="polite"
      aria-busy
      aria-label={active.label}
    >
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 35%, rgba(40,107,69,0.45), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(197,220,196,0.12), transparent 50%)',
          }}
        />
        {!reduceMotion ? (
          <>
            <motion.div
              className="absolute -top-24 start-1/4 size-64 rounded-full bg-brand/25 blur-3xl"
              animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.15, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-0 end-0 size-72 rounded-full bg-sage/15 blur-3xl"
              animate={{ opacity: [0.15, 0.35, 0.15] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </>
        ) : null}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center px-5 sm:px-8">
        {/* Stage card */}
        <div className="relative w-full overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/[0.06] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.65)] backdrop-blur-md sm:p-8">
          {/* Scanning frame */}
          <div className="relative mx-auto mb-7 aspect-square w-[min(100%,240px)] sm:w-[260px]">
            {/* Outer pulse rings */}
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border border-emerald-300/25"
                style={{ margin: i * 10 }}
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        opacity: [0.15, 0.55, 0.15],
                        scale: [0.96, 1.02, 0.96],
                      }
                }
                transition={{
                  duration: 2.4,
                  delay: i * 0.35,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                aria-hidden
              />
            ))}

            {/* Glow disc */}
            <div className="absolute inset-[18%] rounded-full bg-gradient-to-b from-emerald-400/20 to-brand/30 shadow-[0_0_60px_rgba(74,222,128,0.35)]" />

            {/* Growing plant SVG */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.svg
                viewBox="0 0 120 120"
                className="size-[58%] text-emerald-200"
                fill="none"
                aria-hidden
                animate={
                  reduceMotion
                    ? undefined
                    : { scale: [0.94, 1.06, 0.94], y: [4, -2, 4] }
                }
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.path
                  d="M60 98 V48"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
                <motion.path
                  d="M60 70 C42 62 30 48 28 32 C48 36 56 48 60 62"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="rgba(197,220,196,0.18)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.1, delay: 0.35, ease: 'easeOut' }}
                />
                <motion.path
                  d="M60 62 C78 54 92 40 94 24 C74 28 64 44 60 58"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="rgba(74,222,128,0.16)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.1, delay: 0.55, ease: 'easeOut' }}
                />
                <motion.circle
                  cx="60"
                  cy="44"
                  r="4"
                  fill="#c5dcc4"
                  animate={
                    reduceMotion
                      ? undefined
                      : { opacity: [0.5, 1, 0.5], scale: [0.9, 1.2, 0.9] }
                  }
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
              </motion.svg>
            </div>

            {/* Sleek scanning beam */}
            {!reduceMotion ? (
              <motion.div
                className="pointer-events-none absolute inset-x-[14%] top-[14%] h-[72%] overflow-hidden rounded-full"
                aria-hidden
              >
                <motion.div
                  className="absolute inset-x-0 h-10"
                  style={{
                    background:
                      'linear-gradient(180deg, transparent, rgba(197,220,196,0.55), transparent)',
                    boxShadow: '0 0 24px rgba(74,222,128,0.45)',
                  }}
                  animate={{ top: ['0%', '88%', '0%'] }}
                  transition={{
                    duration: 2.6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
            ) : null}

            {/* Corner brackets */}
            <span className="absolute start-[10%] top-[10%] h-7 w-7 border-s-2 border-t-2 border-emerald-200/70" />
            <span className="absolute end-[10%] top-[10%] h-7 w-7 border-e-2 border-t-2 border-emerald-200/70" />
            <span className="absolute start-[10%] bottom-[10%] h-7 w-7 border-s-2 border-b-2 border-emerald-200/70" />
            <span className="absolute end-[10%] bottom-[10%] h-7 w-7 border-e-2 border-b-2 border-emerald-200/70" />
          </div>

          <p className="mb-2 text-center text-[11px] font-semibold tracking-[0.22em] text-emerald-200/80">
            نبْتة · تحليل ذكي
          </p>

          <AnimatePresence mode="wait">
            <motion.p
              key={active.id}
              className="min-h-[3.2rem] text-center text-base font-bold leading-relaxed text-stone-50 sm:text-lg"
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.32 }}
            >
              {active.label}
            </motion.p>
          </AnimatePresence>

          {/* Progress */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-[11px] text-emerald-100/70">
              <span>
                المرحلة {stepIndex + 1} من {safeSteps.length}
              </span>
              <span className="tabular-nums font-semibold text-emerald-200">
                {pct}%
              </span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-emerald-950/80 ring-1 ring-white/10">
              <motion.div
                className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-l from-[#286b45] via-emerald-400 to-[#c5dcc4]"
                style={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ type: 'spring', stiffness: 80, damping: 20 }}
              />
              {!reduceMotion ? (
                <motion.div
                  className="absolute inset-y-0 w-1/3 bg-gradient-to-l from-transparent via-white/35 to-transparent"
                  animate={{ x: ['-120%', '320%'] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              ) : null}
            </div>
          </div>

          {/* Step rail */}
          <ol className="mt-6 grid grid-cols-4 gap-2">
            {safeSteps.map((step, index) => {
              const done = index < stepIndex
              const current = index === stepIndex
              return (
                <li key={step.id} className="flex flex-col items-center gap-1.5">
                  <motion.span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
                      current &&
                        'bg-emerald-300 text-[#142d21] shadow-[0_0_20px_rgba(110,231,183,0.55)]',
                      done && 'bg-brand text-white',
                      !done && !current && 'bg-white/10 text-emerald-100/40',
                    )}
                    animate={
                      current && !reduceMotion
                        ? { scale: [1, 1.08, 1] }
                        : undefined
                    }
                    transition={{ duration: 1.4, repeat: Infinity }}
                    aria-current={current ? 'step' : undefined}
                  >
                    {done ? '✓' : index + 1}
                  </motion.span>
                  <span
                    className={cn(
                      'hidden text-center text-[10px] leading-tight sm:block',
                      current ? 'text-emerald-100' : 'text-emerald-100/40',
                    )}
                  >
                    {step.label.replace(/\.\.\.$|…$/, '')}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        <p className="mt-5 text-center text-xs text-emerald-100/55">
          نحلّل صورتك بدقة — الرجاء الإبقاء على التطبيق مفتوحاً
        </p>
      </div>
    </motion.div>
  )
}
