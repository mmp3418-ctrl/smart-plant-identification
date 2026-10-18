import { useEffect, useRef, useState } from 'react'
import { GreenLoadingOverlay } from '@/components/system/GreenLoadingOverlay'

const TITLE = 'نظام التعرف على النباتات الذكي'
const MIN_DISPLAY_MS = 2500

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
      exitTimer = window.setTimeout(onComplete, 650)
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
    <GreenLoadingOverlay
      exiting={exiting}
      title={TITLE}
      typedTitle={typed}
      typeDone={typeDone}
      message="تعريف النباتات والملاءمة البيئية"
      zIndexClass="z-[100]"
    />
  )
}
