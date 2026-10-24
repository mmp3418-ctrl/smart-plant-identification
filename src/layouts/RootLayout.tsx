import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { RouteLoadingOverlay } from '@/components/system/RouteLoadingOverlay'
import { pageTransition } from '@/lib/motion'
import { cn } from '@/lib/cn'

export function RootLayout() {
  const location = useLocation()
  const isIdentifyCapture = location.pathname === '/identify'

  return (
    <div className="flex min-h-dvh flex-col">
      {!isIdentifyCapture ? <Header /> : null}
      <RouteLoadingOverlay />
      <main className={cn('flex-1', isIdentifyCapture && 'bg-[#142D21]')}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      {!isIdentifyCapture ? <Footer /> : null}
    </div>
  )
}
