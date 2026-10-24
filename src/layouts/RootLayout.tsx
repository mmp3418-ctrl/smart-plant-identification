import { Outlet, useLocation } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { RouteLoadingOverlay } from '@/components/system/RouteLoadingOverlay'
import { cn } from '@/lib/cn'

export function RootLayout() {
  const location = useLocation()
  const isIdentifyCapture = location.pathname === '/identify'

  return (
    <div className="flex min-h-dvh flex-col">
      {!isIdentifyCapture ? <Header /> : null}
      <RouteLoadingOverlay />
      <main className={cn('flex-1', isIdentifyCapture && 'bg-[#070d18]')}>
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
      {!isIdentifyCapture ? <Footer /> : null}
    </div>
  )
}
