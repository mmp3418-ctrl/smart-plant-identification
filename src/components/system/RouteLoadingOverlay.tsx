import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { GreenLoadingOverlay } from '@/components/system/GreenLoadingOverlay'
import { cn } from '@/lib/cn'

const DISPLAY_MS = 700
const FADE_MS = 450

/**
 * Full-screen green botanical loader on route changes.
 */
export function RouteLoadingOverlay() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [isFirst, setIsFirst] = useState(true)

  useEffect(() => {
    if (isFirst) {
      setIsFirst(false)
      return
    }

    setExiting(false)
    setVisible(true)

    const exitTimer = window.setTimeout(() => setExiting(true), DISPLAY_MS)
    const hideTimer = window.setTimeout(() => {
      setVisible(false)
      setExiting(false)
    }, DISPLAY_MS + FADE_MS)

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(hideTimer)
    }
  }, [location.pathname, location.search, isFirst])

  if (!visible) return null

  return (
    <div className={cn(exiting && 'pointer-events-none')}>
      <GreenLoadingOverlay
        exiting={exiting}
        message="جارٍ تحميل الصفحة…"
        blocking={!exiting}
        zIndexClass="z-[90]"
      />
    </div>
  )
}
