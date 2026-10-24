import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Leaf } from 'lucide-react'

const TITLE = 'نظام التعرف على النباتات الذكي'
const MIN_DISPLAY_MS = 2200

interface SplashScreenProps {
  onComplete: () => void
}

/** Refined brand splash — no basic spinner; soft plant pulse + typewriter. */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [typed, setTyped] = useState('')
  const [exiting, setExiting] = useState(false)
  const [typeDone, setTypeDone] = useState(false)
  const completedRef = useRef(false)

  useEffect(() => {
    let index = 0
    const interval = window.setInterval(() => {
      index += 1
      setTyped(TITLE.slice(0, index))
      if (index >= TITLE.length) {
        window.clearInterval(interval)
        setTypeDone(true)
      }
    }, 48)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const started = performance.now()
    let exitTimer: number | undefined
    let waitTimer: number | undefined

    function beginExit() {
      if (completedRef.current) return
      completedRef.current = true
      setExiting(true)
      exitTimer = window.setTimeout(onComplete, 500)
    }

    function scheduleFinish() {
      const elapsed = performance.now() - started
      waitTimer = window.setTimeout(
        beginExit,
        Math.max(0, MIN_DISPLAY_MS - elapsed),
      )
    }

    if (document.readyState === 'complete') {
      scheduleFinish()
    } else {
      window.addEventListener('load', scheduleFinish, { once: true })
      waitTimer = window.setTimeout(scheduleFinish, MIN_DISPLAY_MS + 400)
    }

    return () => {
      window.removeEventListener('load', scheduleFinish)
      if (waitTimer) window.clearTimeout(waitTimer)
      if (exitTimer) window.clearTimeout(exitTimer)
    }
  }, [onComplete])

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#142D21] text-stone-100"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          role="status"
          aria-label="تحميل نبْتة"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 40%, rgba(16,185,129,0.22), transparent 55%)',
            }}
            aria-hidden
          />
          <motion.div
            className="relative mb-6 flex size-24 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-950/40 sm:size-28"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Leaf className="size-11 text-emerald-200 sm:size-12" strokeWidth={1.5} />
            <span className="absolute inset-0 rounded-full shadow-[0_0_40px_rgba(110,231,183,0.35)]" />
          </motion.div>
          <p className="mb-2 text-sm font-semibold tracking-wide text-emerald-200/90">
            نبْتة
          </p>
          <h1
            className={`min-h-[2.6em] max-w-lg px-6 text-center text-xl font-extrabold leading-relaxed sm:text-2xl ${typeDone ? 'title-glow' : ''}`}
          >
            {typed}
            {!typeDone ? <span className="typewriter-caret" aria-hidden /> : null}
          </h1>
          <p className="mt-3 text-sm text-emerald-100/70">
            تعريف النباتات والملاءمة البيئية
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
