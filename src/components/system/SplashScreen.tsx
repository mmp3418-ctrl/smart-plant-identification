import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

const TITLE = 'نظام التعرف على النباتات الذكي'
const MIN_DISPLAY_MS = 2400

interface SplashScreenProps {
  onComplete: () => void
}

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
    }, 55)

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
      exitTimer = window.setTimeout(onComplete, 700)
    }

    function scheduleFinish() {
      const elapsed = performance.now() - started
      const wait = Math.max(0, MIN_DISPLAY_MS - elapsed)
      waitTimer = window.setTimeout(beginExit, wait)
    }

    if (document.readyState === 'complete') {
      scheduleFinish()
    } else {
      window.addEventListener('load', scheduleFinish, { once: true })
      waitTimer = window.setTimeout(scheduleFinish, MIN_DISPLAY_MS + 500)
    }

    return () => {
      window.removeEventListener('load', scheduleFinish)
      if (waitTimer) window.clearTimeout(waitTimer)
      if (exitTimer) window.clearTimeout(exitTimer)
    }
  }, [onComplete])

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center',
        'bg-brand-dark text-white',
        exiting && 'splash-fade-out',
      )}
      role="dialog"
      aria-label="شاشة الترحيب"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(197,220,196,0.18), transparent 55%)',
        }}
        aria-hidden
      />

      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="leaf-pulse mb-8">
          <svg
            viewBox="0 0 80 80"
            className="size-20 sm:size-24"
            fill="none"
            aria-hidden
          >
            <circle
              cx="40"
              cy="40"
              r="36"
              className="stroke-sage/30"
              strokeWidth="1.5"
            />
            <path
              d="M40 14c-2.8 8.5-2.8 15.5 0 22.5 3.5-7 10.5-11.5 18.5-13-7.5 2-12.5 7.5-14 15 7.5-1 14.5 1 20 6.5-8.5-2-14.5.5-18.5 6.5 0 6.5-1.2 12-4.5 15.5-3.3-3.5-4.5-9-4.5-15.5-4-6-10-8.5-18.5-6.5 5.5-5.5 12.5-7.5 20-6.5-1.5-7.5-6.5-13-14-15 8 1.5 15 6 18.5 13C42.8 29.5 42.8 22.5 40 14z"
              className="leaf-draw fill-none stroke-sage"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M40 36v22"
              className="leaf-draw stroke-sage/80"
              strokeWidth="1.8"
              strokeLinecap="round"
              style={{ animationDelay: '0.35s' }}
            />
          </svg>
        </div>

        <p className="mb-2 text-xs font-medium tracking-wide text-sage/80 sm:text-sm">
          نبْتة
        </p>

        <h1
          className={cn(
            'min-h-[2.6em] max-w-md text-xl font-extrabold leading-relaxed sm:text-2xl',
            typeDone && 'title-glow',
          )}
        >
          {typed}
          {!typeDone ? <span className="typewriter-caret" aria-hidden /> : null}
        </h1>

        <p className="mt-4 text-xs text-sage/60 sm:text-sm">
          تعريف النباتات والملاءمة البيئية
        </p>
      </div>
    </div>
  )
}
