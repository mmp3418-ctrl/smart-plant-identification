import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { LeafSpinner } from '@/components/system/LeafSpinner'
import { cn } from '@/lib/cn'

const DISPLAY_MS = 420

/**
 * Brief botanical loading indicator on route changes.
 * Works with HashRouter (no data-router navigation states required).
 */
export function RouteLoadingOverlay() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [isFirst, setIsFirst] = useState(true)

  useEffect(() => {
    if (isFirst) {
      setIsFirst(false)
      return
    }

    setVisible(true)
    const timer = window.setTimeout(() => setVisible(false), DISPLAY_MS)
    return () => window.clearTimeout(timer)
  }, [location.pathname, location.search, isFirst])

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center pt-20 transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      aria-hidden={!visible}
    >
      <div className="glass-strong flex items-center gap-2 rounded-full border border-line/60 px-4 py-2 shadow-sm">
        <LeafSpinner size="sm" label="جارٍ تحميل الصفحة" />
        <span className="text-xs font-medium text-muted">جارٍ التحميل…</span>
      </div>
    </div>
  )
}
