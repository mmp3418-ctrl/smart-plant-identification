import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Sleek top progress rail on route changes — replaces the old full-screen spinner.
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
    const hide = window.setTimeout(() => setVisible(false), 720)
    return () => window.clearTimeout(hide)
  }, [location.pathname, location.search, isFirst])

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden
        >
          <motion.div
            className="h-full origin-right rounded-full bg-gradient-to-l from-brand via-accent to-sage shadow-[0_0_12px_rgba(40,107,69,0.55)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'right center' }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
